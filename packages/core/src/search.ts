import "server-only";

import { createHash } from "node:crypto";
import {
  durationToYouTubeParam,
  freshnessToBraveParam,
  freshnessToPublishedAfter,
  type WorkspaceFilters,
} from "./filters";
import { decodeHtmlEntities, stripHtmlTags } from "./html";
import type { ProviderError, ResourceCandidate, SearchProvider } from "./search-types";

export type { ProviderError, ResourceCandidate, SearchProvider };

/** Bumped whenever ResourceCandidate shape changes so the cache invalidates automatically. */
export const SEARCH_CACHE_SCHEMA_VERSION = "v1";
const TIMEOUT_MS = 5000;
const PER_PROVIDER_LIMIT = 20;

export interface ProviderSearchResult {
  results: ResourceCandidate[];
  error?: ProviderError;
}

export interface SearchKeys {
  youtube?: string | null;
  brave?: string | null;
}

export interface SearchInput {
  query: string;
  filters: WorkspaceFilters;
  keys: SearchKeys;
  /** Explicit provider list. Caller decides; balance is no longer consulted here. */
  providers: SearchProvider[];
}

export interface SearchOutput {
  results: ResourceCandidate[];
  errors: ProviderError[];
  perProvider: Map<SearchProvider, ResourceCandidate[]>;
}

/**
 * Stable hash over inputs that affect provider results.
 *
 * Excludes `level` because we deliberately don't push it to providers
 * (PROJECT.pdf §2: "Алгоритм только фильтрует, не ранжирует"). Includes
 * `SEARCH_CACHE_SCHEMA_VERSION` so a deploy that changes the candidate
 * shape invalidates stale cache rows.
 */
export function buildCacheKey(query: string, filters: WorkspaceFilters): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        v: SEARCH_CACHE_SCHEMA_VERSION,
        query: query.trim().toLowerCase(),
        duration: filters.duration,
        balance: filters.balance,
        freshness: filters.freshness,
        languages: filters.languages ?? null,
      }),
    )
    .digest("hex");
}

/** Round-robin interleave so mixed-balance results don't favor one provider. */
export function interleaveByProvider<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]!);
    }
  }
  return out;
}

/**
 * Runs the providers explicitly listed in `input.providers` in parallel.
 * Never throws — provider failures land in `errors` so the UI can render
 * a partial-failure banner without losing the other provider's results.
 */
export async function runSearch(input: SearchInput): Promise<SearchOutput> {
  const settled = await Promise.allSettled(
    input.providers.map((provider) => runProvider(provider, input)),
  );

  const perProvider = new Map<SearchProvider, ResourceCandidate[]>();
  const errors: ProviderError[] = [];

  settled.forEach((outcome, i) => {
    const provider = input.providers[i]!;
    if (outcome.status === "fulfilled") {
      if (outcome.value.error) errors.push(outcome.value.error);
      perProvider.set(provider, outcome.value.results);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : "unknown";
      errors.push({ provider, reason: `Unexpected error: ${message}`, persistent: false });
      perProvider.set(provider, []);
    }
  });

  return {
    results: interleaveByProvider(input.providers.map((p) => perProvider.get(p) ?? [])),
    errors,
    perProvider,
  };
}

async function runProvider(
  provider: SearchProvider,
  input: SearchInput,
): Promise<ProviderSearchResult> {
  const key = provider === "youtube" ? input.keys.youtube : input.keys.brave;
  if (!key) {
    return {
      results: [],
      error: { provider, reason: `No API key configured for ${provider}`, persistent: true },
    };
  }
  if (provider === "youtube") return searchYouTube(input.query, input.filters, key);
  return searchBrave(input.query, input.filters, key);
}

/**
 * Two-call sequence: cheap `search.list` (100 quota units) for ids +
 * `videos.list` (1 unit) for duration and to filter out
 * removed/private/age-restricted videos. Both calls share a single
 * AbortSignal so the worst-case wall time is bounded by `TIMEOUT_MS`.
 */
export async function searchYouTube(
  query: string,
  filters: WorkspaceFilters,
  key: string,
): Promise<ProviderSearchResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await searchYouTubeImpl(query, filters, key, controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function searchYouTubeImpl(
  query: string,
  filters: WorkspaceFilters,
  key: string,
  signal: AbortSignal,
): Promise<ProviderSearchResult> {
  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: String(PER_PROVIDER_LIMIT),
    q: query,
    key,
    videoDuration: durationToYouTubeParam(filters.duration),
    videoEmbeddable: "true",
    safeSearch: "moderate",
  });
  const publishedAfter = freshnessToPublishedAfter(filters.freshness);
  if (publishedAfter) params.set("publishedAfter", publishedAfter);
  const language = filters.languages?.[0];
  if (language) params.set("relevanceLanguage", language);

  const searchResp = await safeJson(
    `https://www.googleapis.com/youtube/v3/search?${params}`,
    { signal },
  );
  if (!searchResp.ok) {
    return { results: [], error: { provider: "youtube", ...searchResp.error } };
  }
  const rawItems = Array.isArray(searchResp.data?.items) ? searchResp.data.items : [];
  const ids: string[] = rawItems
    .map((it: unknown) => (it as { id?: { videoId?: string } }).id?.videoId)
    .filter((id: unknown): id is string => typeof id === "string");
  if (ids.length === 0) return { results: [] };

  const enrichParams = new URLSearchParams({
    part: "contentDetails,snippet",
    id: ids.join(","),
    key,
  });
  const enrichResp = await safeJson(
    `https://www.googleapis.com/youtube/v3/videos?${enrichParams}`,
    { signal },
  );
  if (!enrichResp.ok) {
    return { results: [], error: { provider: "youtube", ...enrichResp.error } };
  }

  const enrichedItems = Array.isArray(enrichResp.data?.items) ? enrichResp.data.items : [];
  const enrichedById = new Map<string, unknown>(
    enrichedItems
      .map((it: unknown) => {
        const id = (it as { id?: string }).id;
        return typeof id === "string" ? ([id, it] as const) : null;
      })
      .filter((entry): entry is readonly [string, unknown] => entry !== null),
  );

  const results: ResourceCandidate[] = [];
  for (const id of ids) {
    const item = enrichedById.get(id);
    if (!item) continue; // dropped by enrichment → unwatchable, skip
    const snippet = (item as { snippet?: Record<string, unknown> }).snippet ?? {};
    const contentDetails = (item as { contentDetails?: { duration?: string } }).contentDetails;
    const channelTitle = typeof snippet.channelTitle === "string" ? snippet.channelTitle : null;
    const channelId = typeof snippet.channelId === "string" ? snippet.channelId : null;
    const thumb =
      (snippet.thumbnails as Record<string, { url?: string }> | undefined)?.medium?.url ??
      (snippet.thumbnails as Record<string, { url?: string }> | undefined)?.default?.url ??
      null;
    const publishedAt = typeof snippet.publishedAt === "string" ? snippet.publishedAt : null;
    results.push({
      source: "youtube",
      type: "video",
      url: `https://www.youtube.com/watch?v=${id}`,
      title: decodeHtmlEntities(String(snippet.title ?? "Untitled")),
      description:
        typeof snippet.description === "string" ? decodeHtmlEntities(snippet.description) : null,
      thumbnailUrl: thumb,
      durationSeconds: parseIsoDuration(contentDetails?.duration),
      publishedAt,
      metadata: { videoId: id, channelTitle, channelId },
    });
  }
  return { results };
}

export async function searchBrave(
  query: string,
  filters: WorkspaceFilters,
  key: string,
): Promise<ProviderSearchResult> {
  const params = new URLSearchParams({
    q: query,
    count: String(PER_PROVIDER_LIMIT),
    safesearch: "moderate",
  });
  const freshness = freshnessToBraveParam(filters.freshness);
  if (freshness) params.set("freshness", freshness);
  const language = filters.languages?.[0];
  if (language) params.set("search_lang", language);

  const resp = await safeJson(
    `https://api.search.brave.com/res/v1/web/search?${params}`,
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!resp.ok) {
    return { results: [], error: { provider: "brave", ...resp.error } };
  }

  const web = (resp.data?.web as { results?: unknown[] } | undefined)?.results ?? [];
  const seen = new Set<string>();
  const results: ResourceCandidate[] = [];
  for (const raw of web) {
    const item = raw as Record<string, unknown>;
    const url = typeof item.url === "string" ? canonicalUrl(item.url) : null;
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const titleRaw = typeof item.title === "string" ? item.title : "Untitled";
    const descRaw = typeof item.description === "string" ? item.description : null;
    const thumb =
      typeof (item.thumbnail as { src?: string } | undefined)?.src === "string"
        ? (item.thumbnail as { src: string }).src
        : null;
    const age = typeof item.age === "string" ? item.age : null;
    const profile = item.profile as { name?: string } | undefined;
    let domain: string | null = null;
    try {
      domain = new URL(url).hostname;
    } catch {
      /* canonicalUrl already sanitized; leave domain null */
    }
    results.push({
      source: "brave",
      type: "article",
      url,
      title: stripHtmlTags(decodeHtmlEntities(titleRaw)),
      description: descRaw ? stripHtmlTags(decodeHtmlEntities(descRaw)) : null,
      thumbnailUrl: thumb,
      durationSeconds: null,
      publishedAt: null,
      metadata: { domain, ageHint: age, profileName: profile?.name ?? null },
    });
  }
  return { results };
}

type SafeJsonResult =
  | { ok: true; data: { items?: unknown[]; web?: { results?: unknown[] } } & Record<string, unknown> }
  | {
      ok: false;
      error: { reason: string; persistent: boolean };
    };

async function safeJson(url: string, init?: RequestInit): Promise<SafeJsonResult> {
  try {
    const response = await fetch(url, init);
    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        return {
          ok: false,
          error: {
            reason: "Provider rejected the API key. Re-check it in Settings.",
            persistent: true,
          },
        };
      }
      if (status === 429) {
        return {
          ok: false,
          error: {
            reason: "Provider rate-limited the search (quota exceeded).",
            persistent: true,
          },
        };
      }
      return {
        ok: false,
        error: { reason: `Provider returned HTTP ${status}`, persistent: status < 500 },
      };
    }
    return { ok: true, data: (await response.json()) as never };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message.includes("aborted") || message.includes("timeout")) {
      return {
        ok: false,
        error: { reason: "Provider did not respond within 5 seconds", persistent: false },
      };
    }
    return { ok: false, error: { reason: `Network error: ${message}`, persistent: false } };
  }
}

/**
 * Strips tracking params + fragments and rejects non-`http(s)` schemes
 * (returns empty string so callers can drop the item). Prevents
 * `javascript:` / `data:` URLs leaking from a provider into a saved
 * resource and later executing on click.
 */
export function canonicalUrl(input: string): string {
  try {
    const u = new URL(input);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    u.hash = "";
    const drop = ["fbclid", "gclid", "msclkid"];
    for (const param of [...u.searchParams.keys()]) {
      if (param.startsWith("utm_") || drop.includes(param)) {
        u.searchParams.delete(param);
      }
    }
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return "";
  }
}

export function parseIsoDuration(value: string | undefined | null): number | null {
  if (!value) return null;
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(value);
  if (!match) return null;
  const [, d, h, m, s] = match;
  const days = Number(d ?? 0);
  const hours = Number(h ?? 0);
  const minutes = Number(m ?? 0);
  const seconds = Number(s ?? 0);
  const total = days * 86400 + hours * 3600 + minutes * 60 + seconds;
  return Number.isFinite(total) && total > 0 ? total : null;
}

