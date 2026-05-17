export type SearchProvider = "youtube" | "brave";

export interface ResourceCandidate {
  source: SearchProvider;
  type: "video" | "article";
  url: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  publishedAt: string | null;
  /** Provider-specific extras (channel, domain, etc.) preserved verbatim. */
  metadata: Record<string, unknown>;
}

export interface ProviderError {
  provider: SearchProvider;
  reason: string;
  /**
   * `true` for 401/403/429 — caller should back off and cache the
   * failure briefly so a Refresh click doesn't burn through quota.
   */
  persistent: boolean;
}
