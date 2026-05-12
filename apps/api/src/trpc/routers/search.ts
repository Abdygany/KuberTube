import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { searchQueries, searchResultsCache, workspaces, type Database } from "@kubertube/db";
import {
  buildCacheKey,
  interleaveByProvider,
  providersForBalance,
  runSearch,
  workspaceFiltersSchema,
  type ProviderError,
  type ResourceCandidate,
  type SearchProvider,
  type WorkspaceFilters,
} from "@kubertube/core";
import { decryptUserKey } from "../keys-helper";
import { protectedProcedure, router } from "../trpc";

const FRESH_TTL_MS = 24 * 60 * 60 * 1000;
const PERSISTENT_FAILURE_TTL_MS = 60 * 60 * 1000;

interface CacheRead {
  hits: Map<SearchProvider, ResourceCandidate[]>;
  persistentMisses: SearchProvider[];
}

async function readProviderCache(
  db: Database,
  cacheKey: string,
  providers: SearchProvider[],
  now: Date,
): Promise<CacheRead> {
  const rows = await db
    .select()
    .from(searchResultsCache)
    .where(
      and(eq(searchResultsCache.queryHash, cacheKey), gt(searchResultsCache.expiresAt, now)),
    );
  const hits = new Map<SearchProvider, ResourceCandidate[]>();
  const persistentMisses: SearchProvider[] = [];
  for (const row of rows) {
    if (!providers.includes(row.provider)) continue;
    const payload = row.resultsJson as { results?: ResourceCandidate[]; tombstone?: string };
    if (payload && Array.isArray(payload.results)) {
      hits.set(row.provider, payload.results);
    } else if (payload && typeof payload.tombstone === "string") {
      persistentMisses.push(row.provider);
    }
  }
  return { hits, persistentMisses };
}

async function writeProviderCache(
  db: Database,
  cacheKey: string,
  entries: Array<{
    provider: SearchProvider;
    payload: { results: ResourceCandidate[] } | { tombstone: string };
    expiresAt: Date;
  }>,
  now: Date,
) {
  if (entries.length === 0) return;
  await db
    .insert(searchResultsCache)
    .values(
      entries.map((e) => ({
        queryHash: cacheKey,
        provider: e.provider,
        resultsJson: e.payload,
        expiresAt: e.expiresAt,
      })),
    )
    .onConflictDoUpdate({
      target: [searchResultsCache.queryHash, searchResultsCache.provider],
      set: {
        resultsJson: sql`excluded.results_json`,
        expiresAt: sql`excluded.expires_at`,
        createdAt: now,
      },
    });
}

export const searchRouter = router({
  /**
   * Runs a search against YouTube + Brave per the workspace's filters.
   *
   * - `force: true` bypasses the cache on read; the upsert still happens
   *   so a refreshed result is served to the next reader.
   * - Persistent provider failures (401/403/429) are tombstoned with a
   *   1-hour TTL so a Refresh click doesn't keep burning quota.
   * - Transient failures (5xx, timeout, network) are NOT tombstoned —
   *   next call retries them.
   */
  run: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        query: z.string().min(1).max(280).optional(),
        force: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [workspace] = await ctx.db
        .select({
          id: workspaces.id,
          title: workspaces.title,
          filtersJson: workspaces.filtersJson,
        })
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, input.workspaceId),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .limit(1);
      if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });

      const filters: WorkspaceFilters = workspaceFiltersSchema.parse(workspace.filtersJson);
      const query = (input.query ?? workspace.title).trim();
      if (query.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Empty search query" });
      }
      const providers = providersForBalance(filters.balance);
      const cacheKey = buildCacheKey(query, filters);
      const now = new Date();

      const perProvider = new Map<SearchProvider, ResourceCandidate[]>(
        providers.map((p) => [p, [] as ResourceCandidate[]]),
      );
      const errors: ProviderError[] = [];
      const cacheHits: SearchProvider[] = [];

      let toFetch: SearchProvider[] = providers;
      if (!input.force) {
        const cached = await readProviderCache(ctx.db, cacheKey, providers, now);
        for (const [p, results] of cached.hits) {
          perProvider.set(p, results);
          cacheHits.push(p);
        }
        for (const p of cached.persistentMisses) {
          errors.push({
            provider: p,
            reason: "Provider failed recently — backing off. Refresh to retry.",
            persistent: true,
          });
        }
        toFetch = providers.filter(
          (p) => !cached.hits.has(p) && !cached.persistentMisses.includes(p),
        );
      }

      if (toFetch.length > 0) {
        const keys: Record<SearchProvider, string | null> = { youtube: null, brave: null };
        for (const provider of toFetch) {
          try {
            keys[provider] = await decryptUserKey(
              ctx.db,
              ctx.user.id,
              provider,
              ctx.masterKey,
            );
          } catch (err) {
            if (err instanceof TRPCError) {
              errors.push({ provider, reason: err.message, persistent: true });
            } else {
              throw err;
            }
          }
        }
        const liveProviders = toFetch.filter((p) => keys[p] !== null);
        if (liveProviders.length > 0) {
          const live = await runSearch({
            query,
            filters,
            keys: { youtube: keys.youtube, brave: keys.brave },
            providers: liveProviders,
          });
          for (const provider of liveProviders) {
            perProvider.set(provider, live.perProvider.get(provider) ?? []);
          }
          for (const err of live.errors) errors.push(err);

          const entries: Array<{
            provider: SearchProvider;
            payload: { results: ResourceCandidate[] } | { tombstone: string };
            expiresAt: Date;
          }> = [];
          for (const provider of liveProviders) {
            const err = live.errors.find((e) => e.provider === provider);
            if (err && err.persistent) {
              entries.push({
                provider,
                payload: { tombstone: err.reason },
                expiresAt: new Date(now.getTime() + PERSISTENT_FAILURE_TTL_MS),
              });
            } else if (!err) {
              entries.push({
                provider,
                payload: { results: live.perProvider.get(provider) ?? [] },
                expiresAt: new Date(now.getTime() + FRESH_TTL_MS),
              });
            }
          }
          await writeProviderCache(ctx.db, cacheKey, entries, now);
        }
      }

      const unified = interleaveByProvider(providers.map((p) => perProvider.get(p) ?? []));

      await ctx.db.insert(searchQueries).values({
        workspaceId: workspace.id,
        queryText: query,
        filtersJson: filters,
        resultsCount: unified.length,
      });

      await ctx.db
        .update(workspaces)
        .set({ lastOpenedAt: now })
        .where(eq(workspaces.id, workspace.id));

      return {
        query,
        results: unified,
        errors,
        providersQueried: providers,
        cacheHits,
      };
    }),
});
