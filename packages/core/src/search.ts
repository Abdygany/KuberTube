import { createHash } from "node:crypto";
import {
  durationToYouTubeParam,
  freshnessToBraveParam,
  freshnessToPublishedAfter,
  providersForBalance,
  type WorkspaceFilters,
} from "./filters";
import type { ProviderError, ResourceCandidate, SearchProvider } from "./search-types";

export type { ProviderError, ResourceCandidate, SearchProvider };

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
}

export interface SearchOutput {
  results: ResourceCandidate[];
  errors: ProviderError[];
  providersQueried: SearchProvider[];
}

/**
 * Stable hash over the inputs that actually affect provider results.
 * Excludes `level` because we deliberately do not push it to providers
 * — see PROJECT.pdf §2 ("Алгоритм только фильтрует, не ранжирует").
 */
export function buildCacheKey(query: string, filters: WorkspaceFilters): string {
  const h = createHash("sha256");
  h.update(
    JSON.stringify({
      query: query.trim().toLowerCase(),
      duration: filters.duration,
      balance: filters.balance,
      freshness: filters.freshness,
      languages: filters.languages ?? null,
    }),
  );
  return h.digest("hex");
}

/**
 * Runs the providers required by `filters.balance` in parallel and
 * unifies results round-robin. Returns whatever succeeded; never
 * throws — provider failures land in `errors` so the UI can render a
 * banner without losing the other provider's results.
 */
export async function runSearch(input: SearchInput): Promise<SearchOutput> {
  const providers = providersForBalance(input.filters.balance);

  const settled = await Promise.allSettled(
    providers.map((provider) => runProvider(provider, input)),
  );

  const perProvider = new Map<SearchProvider, ResourceCandidate[]>();
  const errors: ProviderError[] = [];

  settled.forEach((outcome, i) => {
    const provider = providers[i]!;
    if (outcome.status === "fulfilled") {
      if (outcome.value.error) errors.push(outcome.value.error);
      perProvider.set(provider, outcome.value.results);
    } else {
      const message = outcome.reason instanceof Error ? outcome.reason.message : "unknown";
      errors.push({ provider, reason: `Unexpected error: ${message}` });
      perProvider.set(provider, []);
    }
  });

  return {
    results: interleave(providers.map((p) => perProvider.get(p) ?? [])),
    errors,
    providersQueried: providers,
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
      error: { provider, reason: `No API key configured for ${provider}` },
    };
  }
  if (provider === "youtube") return searchYouTube(input.query, input.filters, key);
  return searchBrave(input.query, input.filters, key);
}

/**
 * Two-call sequence: cheap `search.list` (100 quota units) for ids +
 * `videos.list` (1 unit) for duration and to filter out
 * removed/private/age-restricted videos. The enrichment doubles as a
 * "is the video still watchable" check.
 */
export async function searchYouTube(
  query: string,
  filters: WorkspaceFilters,
  key: string,
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

  const searchResp = await safeJson(`https://www.googleapis.com/youtube/v3/search?${params}`);
  if (searchResp.error) {
    return { results: [], error: { provider: "youtube", reason: searchResp.error } };
  }
  const rawItems = Array.isArray(searchResp.data?.items) ? searchResp.data!.items : [];
  const ids: string[] = rawItems
    .map((it: unknown) => (it as { id?: { videoId?: string } }).id?.videoId)
    .filter((id: unknown): id is string => typeof id === "string");
  if (ids.length === 0) return { results: [] };

  const enrichParams = new URLSearchParams({
    part: "contentDetails,snippet",
    id: ids.join(","),
    key,
  });
  const enrichResp = await safeJson(`https://www.googleapis.com/youtube/v3/videos?${enrichParams}`);
  if (enrichResp.error) {
    return { results: [], error: { provider: "youtube", reason: enrichResp.error } };
  }

  const enrichedItems = Array.isArray(enrichResp.data?.items) ? enrichResp.data!.items : [];
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
    if (!item) continue; // dropped → unwatchable, skip
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
      description: typeof snippet.description === "string" ? decodeHtmlEntities(snippet.description) : null,
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
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": key,
      },
    },
  );
  if (resp.error) {
    return { results: [], error: { provider: "brave", reason: resp.error } };
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
    const thumb = typeof (item.thumbnail as { src?: string } | undefined)?.src === "string"
      ? (item.thumbnail as { src: string }).src
      : null;
    const age = typeof item.age === "string" ? item.age : null;
    const profile = item.profile as { name?: string } | undefined;
    const domain = new URL(url).hostname;
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

function interleave<T>(lists: T[][]): T[] {
  const out: T[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen; i++) {
    for (const list of lists) {
      if (i < list.length) out.push(list[i]!);
    }
  }
  return out;
}

interface SafeJsonResult {
  data?: { items?: unknown[]; web?: { results?: unknown[] } } & Record<string, unknown>;
  error?: string;
}

async function safeJson(url: string, init?: RequestInit): Promise<SafeJsonResult> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      const status = response.status;
      if (status === 401 || status === 403) {
        return { error: "Provider rejected the API key. Re-check it in Settings." };
      }
      if (status === 429) {
        return { error: "Provider rate-limited the search (quota exceeded)." };
      }
      return { error: `Provider returned HTTP ${status}` };
    }
    return { data: (await response.json()) as SafeJsonResult["data"] };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message.includes("aborted") || message.includes("timeout")) {
      return { error: "Provider did not respond within 5 seconds" };
    }
    return { error: `Network error: ${message}` };
  }
}

/** Strips `utm_*` and `fbclid`/`gclid`/fragments so dupes hash equally. */
export function canonicalUrl(input: string): string {
  try {
    const u = new URL(input);
    u.hash = "";
    const drop = ["fbclid", "gclid", "msclkid"];
    for (const param of [...u.searchParams.keys()]) {
      if (param.startsWith("utm_") || drop.includes(param)) {
        u.searchParams.delete(param);
      }
    }
    // Normalize: lowercase host, drop trailing slash from pathname (but keep /).
    u.hostname = u.hostname.toLowerCase();
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.toString();
  } catch {
    return input;
  }
}

/** Parses ISO 8601 duration like `PT4M13S` → 253 seconds. Returns null on garbage. */
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

const ENTITY_MAP: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  "#39": "'",
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&([a-zA-Z]+|#\d+);/g, (_, name: string) => {
    if (name.startsWith("#")) {
      const code = Number(name.slice(1));
      return Number.isFinite(code) ? String.fromCharCode(code) : `&${name};`;
    }
    return ENTITY_MAP[name] ?? `&${name};`;
  });
}

function stripHtmlTags(input: string): string {
  return input.replace(/<\/?[^>]+>/g, "");
}
