import "server-only";

import { TRPCError } from "@trpc/server";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION = "2023-06-01";
const TIMEOUT_MS = 30_000;
export const DEFAULT_SUMMARY_MODEL = "claude-haiku-4-5-20251001";

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface MessagesRequest {
  apiKey: string;
  model: string;
  maxTokens: number;
  system?: string;
  messages: AnthropicMessage[];
}

export interface MessagesResponse {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Single-turn /v1/messages call. Surfaces auth/rate-limit/quota
 * errors as user-facing PRECONDITION_FAILED so the UI can point at
 * Settings → API keys instead of leaking the raw provider body.
 */
export async function callAnthropicMessages(
  req: MessagesRequest,
): Promise<MessagesResponse> {
  const body = {
    model: req.model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: req.messages,
  };
  let response: Response;
  try {
    response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": req.apiKey,
        "anthropic-version": ANTHROPIC_API_VERSION,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    if (message.includes("aborted") || message.includes("timeout")) {
      throw new TRPCError({
        code: "TIMEOUT",
        message:
          "Anthropic did not respond within 30 seconds. Try again or shorten the input.",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Network error talking to Anthropic.",
    });
  }
  if (!response.ok) {
    const status = response.status;
    if (status === 401 || status === 403) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Anthropic rejected the API key. Re-check it in Settings.",
      });
    }
    if (status === 429) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: "Anthropic rate limit hit. Wait a minute and try again.",
      });
    }
    if (status === 400) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Anthropic rejected the request (model or input).",
      });
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Anthropic returned HTTP ${status}`,
    });
  }
  const parsed = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  const text = (parsed.content ?? [])
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text!)
    .join("\n")
    .trim();
  if (!text) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Anthropic returned an empty response.",
    });
  }
  return {
    text,
    inputTokens: parsed.usage?.input_tokens ?? 0,
    outputTokens: parsed.usage?.output_tokens ?? 0,
  };
}
