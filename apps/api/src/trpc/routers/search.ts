import { and, eq, gt, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { searchQueries, searchResultsCache, workspaces } from "@kubertube/db";
import {
  buildCacheKey,
  providersForBalance,
  runSearch,
  workspaceFiltersSchema,
  type ProviderError,
  type ResourceCandidate,
  type SearchProvider,
} from "@kubertube/core";
import { decryptUserKey } from "../keys-helper";
import { protectedProcedure, router } from "../trpc";

const CACHE_TTL_HOURS = 24;

export const searchRouter = router({
  /**
   * Runs a search against YouTube + Brave per the workspace's filters.
   *
   * - `force: true` bypasses the cache on read and overwrites on write
   *   so a Refresh click costs the user quota but produces fresh results.
   * - Returns whatever succeeded; provider failures land in `errors` so
   *   the UI can render a banner without losing partial results.
   * - Writes a `search_queries` history row regardless of provider
   *   outcome (so we can later show "queries run this week" / etc.).
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

      const filters = workspaceFiltersSchema.parse(workspace.filtersJson);
      const query = (input.query ?? workspace.title).trim();
      if (query.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Empty search query" });
      }
      const providers = providersForBalance(filters.balance);
      const cacheKey = buildCacheKey(query, filters);
      const now = new Date();

      const perProviderResults = new Map<SearchProvider, ResourceCandidate[]>();
      const errors: ProviderError[] = [];
      const cacheHits = new Set<SearchProvider>();

      if (!input.force) {
        const cached = await ctx.db
          .select()
          .from(searchResultsCache)
          .where(
            and(eq(searchResultsCache.queryHash, cacheKey), gt(searchResultsCache.expiresAt, now)),
          );
        for (const row of cached) {
          if (!providers.includes(row.provider)) continue;
          perProviderResults.set(row.provider, row.resultsJson as ResourceCandidate[]);
          cacheHits.add(row.provider);
        }
      }

      const toFetch = providers.filter((p) => !cacheHits.has(p));
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
              errors.push({ provider, reason: err.message });
              perProviderResults.set(provider, []);
            } else {
              throw err;
            }
          }
        }
        const remaining = toFetch.filter((p) => keys[p] !== null);
        if (remaining.length > 0) {
          const liveBalance =
            remaining.length === 2 ? "mixed" : remaining[0] === "youtube" ? "video" : "text";
          const live = await runSearch({
            query,
            filters: { ...filters, balance: liveBalance },
            keys: { youtube: keys.youtube, brave: keys.brave },
          });
          const liveByProvider = new Map<SearchProvider, ResourceCandidate[]>(
            remaining.map((p) => [p, [] as ResourceCandidate[]]),
          );
          for (const candidate of live.results) {
            const bucket = liveByProvider.get(candidate.source);
            if (bucket) bucket.push(candidate);
          }
          for (const provider of remaining) {
            perProviderResults.set(provider, liveByProvider.get(provider) ?? []);
          }
          for (const err of live.errors) errors.push(err);

          const expiresAt = new Date(now.getTime() + CACHE_TTL_HOURS * 60 * 60 * 1000);
          for (const provider of remaining) {
            if (live.errors.some((e) => e.provider === provider)) continue;
            const results = liveByProvider.get(provider) ?? [];
            await ctx.db
              .insert(searchResultsCache)
              .values({
                queryHash: cacheKey,
                provider,
                resultsJson: results,
                expiresAt,
              })
              .onConflictDoUpdate({
                target: [searchResultsCache.queryHash, searchResultsCache.provider],
                set: { resultsJson: results, expiresAt, createdAt: now },
              });
          }
        }
      }

      const unified: ResourceCandidate[] = interleaveByProvider(
        providers.map((p) => perProviderResults.get(p) ?? []),
      );

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
        cacheHits: Array.from(cacheHits),
      };
    }),
});

function interleaveByProvider<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]!);
    }
  }
  return out;
}
