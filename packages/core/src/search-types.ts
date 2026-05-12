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
}
