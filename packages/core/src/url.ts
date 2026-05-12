import { z } from "zod";

/** Zod schema accepting only http/https URLs. Single source of truth. */
export const httpsUrlSchema = z
  .string()
  .url()
  .refine((value) => {
    try {
      const proto = new URL(value).protocol;
      return proto === "http:" || proto === "https:";
    } catch {
      return false;
    }
  }, "Only http(s) URLs are accepted");

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/**
 * Canonical YouTube video id extraction.
 *
 * 1. Prefer `metadata.videoId` if it matches the 11-char id shape — that's
 *    what the search engine stored at ingestion time, before URL massaging.
 * 2. Fall back to URL parsing: youtu.be/<id>, ?v=<id>, /shorts/<id>,
 *    /embed/<id>, /v/<id>.
 *
 * Returns null when nothing matches. Server and client share this so a
 * resource saved from search has the same id used by the IFrame player.
 */
export function extractYouTubeId(url: string, metadata?: unknown): string | null {
  if (typeof metadata === "object" && metadata !== null && "videoId" in metadata) {
    const candidate = (metadata as { videoId?: unknown }).videoId;
    if (typeof candidate === "string" && YOUTUBE_ID_RE.test(candidate)) return candidate;
  }
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1);
      return YOUTUBE_ID_RE.test(id) ? id : null;
    }
    const v = u.searchParams.get("v");
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    const path = u.pathname;
    const shortsMatch = /^\/(?:shorts|embed|v)\/([A-Za-z0-9_-]{11})/.exec(path);
    if (shortsMatch) return shortsMatch[1] ?? null;
    return null;
  } catch {
    return null;
  }
}

/**
 * Returns a host string with surrounding `[]` removed (for IPv6 literals).
 * `parsed.hostname` keeps the brackets but every IP/host comparator is
 * unaware of them, so strip them before validation.
 */
export function normalizeHostname(hostname: string): string {
  return hostname.toLowerCase().replace(/^\[|\]$/g, "");
}
