export type Provider = "youtube" | "brave" | "anthropic";

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const TIMEOUT_MS = 5000;

/**
 * Validates a YouTube Data API v3 key with a 1-unit-quota call
 * (`videos.list` with a known public video id). `search.list` would
 * cost 100 units per validation — never use it for a ping.
 */
export async function validateYouTubeKey(key: string): Promise<ValidationResult> {
  if (!/^[A-Za-z0-9_-]{20,60}$/.test(key)) {
    return { valid: false, reason: "Key format does not look like a Google API key" };
  }
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "id");
  url.searchParams.set("id", "dQw4w9WgXcQ");
  url.searchParams.set("key", key);
  return pingJson(url, { method: "GET" });
}

/**
 * Validates a Brave Search API key with a 1-result web search.
 * Brave's free tier allows 2k requests/month; this consumes 1.
 */
export async function validateBraveKey(key: string): Promise<ValidationResult> {
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(key)) {
    return { valid: false, reason: "Key format does not look like a Brave subscription token" };
  }
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", "test");
  url.searchParams.set("count", "1");
  return pingJson(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": key,
    },
  });
}

/**
 * Validates an Anthropic API key via `GET /v1/models` — free, zero
 * tokens consumed, returns 200 with a valid key and 401 with invalid.
 */
export async function validateAnthropicKey(key: string): Promise<ValidationResult> {
  if (!/^sk-ant-[A-Za-z0-9_-]{20,}$/.test(key)) {
    return { valid: false, reason: "Anthropic keys start with sk-ant-" };
  }
  return pingJson(new URL("https://api.anthropic.com/v1/models"), {
    method: "GET",
    headers: {
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
  });
}

export async function validateKey(
  provider: Provider,
  key: string,
): Promise<ValidationResult> {
  switch (provider) {
    case "youtube":
      return validateYouTubeKey(key);
    case "brave":
      return validateBraveKey(key);
    case "anthropic":
      return validateAnthropicKey(key);
  }
}

async function pingJson(
  url: URL,
  init: RequestInit,
): Promise<ValidationResult> {
  try {
    const response = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (response.ok) return { valid: true };
    if (response.status === 401 || response.status === 403) {
      return { valid: false, reason: "Provider rejected the key (unauthorized)" };
    }
    if (response.status === 400 || response.status === 422) {
      return { valid: false, reason: "Provider rejected the request (bad key)" };
    }
    if (response.status === 429) {
      return { valid: false, reason: "Provider rate-limited the validation request" };
    }
    return { valid: false, reason: `Provider returned HTTP ${response.status}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message.includes("aborted") || message.includes("timeout")) {
      return { valid: false, reason: "Provider did not respond within 5 seconds" };
    }
    return { valid: false, reason: `Network error: ${message}` };
  }
}
