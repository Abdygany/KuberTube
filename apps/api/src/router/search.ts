import { decrypt } from '@learnspace/core';
import { schema } from '@learnspace/db';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { WorkspaceFiltersSchema } from '../schemas';
import { protectedProcedure, router } from '../trpc';
import { env } from '../env';
import { cacheHash, interleave } from './search.utils';

export interface ResourceCandidate {
  url: string;
  type: 'video' | 'article';
  source: 'youtube' | 'web';
  title: string;
  description: string;
  thumbnailUrl?: string;
  durationSeconds?: number;
  publishedAt?: string;
}

async function searchYoutube(
  query: string,
  apiKey: string,
  filters: z.infer<typeof WorkspaceFiltersSchema>,
): Promise<ResourceCandidate[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: '15',
    key: apiKey,
    relevanceLanguage: 'en',
    safeSearch: 'moderate',
  });

  if (filters.freshness === '6m') params.set('publishedAfter', sixMonthsAgo());
  if (filters.freshness === '1y') params.set('publishedAfter', nYearsAgo(1));
  if (filters.freshness === '2y') params.set('publishedAfter', nYearsAgo(2));

  if (filters.duration === 'short') params.set('videoDuration', 'short');
  if (filters.duration === 'long') params.set('videoDuration', 'long');

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`YouTube API error ${res.status}`);
  const data = (await res.json()) as {
    items: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        thumbnails: { medium?: { url: string } };
        publishedAt: string;
      };
    }>;
  };
  return (data.items ?? []).map((item) => ({
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    type: 'video' as const,
    source: 'youtube' as const,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.medium?.url,
    publishedAt: item.snippet.publishedAt,
  }));
}

async function searchBrave(
  query: string,
  apiKey: string,
): Promise<ResourceCandidate[]> {
  const params = new URLSearchParams({ q: query, count: '15', search_lang: 'en' });
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?${params.toString()}`, {
    headers: { 'X-Subscription-Token': apiKey, Accept: 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Brave API error ${res.status}`);
  const data = (await res.json()) as {
    web?: {
      results: Array<{
        url: string;
        title: string;
        description?: string;
        thumbnail?: { src: string };
        page_age?: string;
      }>;
    };
  };
  return (data.web?.results ?? []).map((item) => ({
    url: item.url,
    type: 'article' as const,
    source: 'web' as const,
    title: item.title,
    description: item.description ?? '',
    thumbnailUrl: item.thumbnail?.src,
    publishedAt: item.page_age,
  }));
}

function sixMonthsAgo() {
  const d = new Date();
  d.setMonth(d.getMonth() - 6);
  return d.toISOString();
}
function nYearsAgo(n: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d.toISOString();
}

export const searchRouter = router({
  run: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        query: z.string().min(1).max(500),
        filters: WorkspaceFiltersSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const filters = input.filters ?? {};

      const getKey = async (provider: 'youtube' | 'brave') => {
        const [row] = await ctx.db
          .select()
          .from(schema.userApiKeys)
          .where(
            and(
              eq(schema.userApiKeys.userId, ctx.user.id),
              eq(schema.userApiKeys.provider, provider),
            ),
          );
        if (!row) throw new Error(`No ${provider} API key configured`);
        return decrypt(
          { ciphertext: row.encryptedKey, iv: row.keyIv, authTag: row.keyAuthTag },
          env.ENCRYPTION_KEY,
        );
      };

      const getCached = async (provider: string): Promise<ResourceCandidate[] | null> => {
        const hash = cacheHash(input.query, filters, provider);
        const [row] = await ctx.db
          .select()
          .from(schema.searchResultsCache)
          .where(
            and(
              eq(schema.searchResultsCache.queryHash, hash),
              eq(schema.searchResultsCache.provider, provider as 'youtube' | 'brave'),
              gt(schema.searchResultsCache.expiresAt, new Date()),
            ),
          );
        return row ? (row.resultsJson as ResourceCandidate[]) : null;
      };

      const setCache = async (provider: string, results: ResourceCandidate[]) => {
        const hash = cacheHash(input.query, filters, provider);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await ctx.db
          .insert(schema.searchResultsCache)
          .values({
            queryHash: hash,
            provider: provider as 'youtube' | 'brave',
            resultsJson: results,
            expiresAt,
          })
          .onConflictDoNothing();
      };

      const [youtubeKey, braveKey] = await Promise.all([getKey('youtube'), getKey('brave')]);

      const [youtubeResults, braveResults] = await Promise.all([
        (async () => {
          const cached = await getCached('youtube');
          if (cached) return cached;
          const results = await searchYoutube(input.query, youtubeKey, filters);
          await setCache('youtube', results);
          return results;
        })(),
        (async () => {
          if (filters.balance === 'video') return [];
          const cached = await getCached('brave');
          if (cached) return cached;
          const results = await searchBrave(input.query, braveKey);
          await setCache('brave', results);
          return results;
        })(),
      ]);

      await ctx.db.insert(schema.searchQueries).values({
        workspaceId: input.workspaceId,
        queryText: input.query,
        filtersJson: filters,
        resultsCount: youtubeResults.length + braveResults.length,
      });

      const merged =
        filters.balance === 'video'
          ? youtubeResults
          : filters.balance === 'text'
            ? braveResults
            : interleave(youtubeResults, braveResults);

      return merged;
    }),
});

