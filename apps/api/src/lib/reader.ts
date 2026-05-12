import "server-only";

import { Readability } from "@mozilla/readability";
import DOMPurify from "isomorphic-dompurify";
import { JSDOM, VirtualConsole } from "jsdom";
import { lookup as dnsLookup } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, request, type Dispatcher } from "undici";
import { normalizeHostname } from "@kubertube/core/url";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 5 * 1024 * 1024;
const USER_AGENT = "KuberTube-Reader/0.1 (+https://github.com/Abdygany/KuberTube)";

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 50;

export interface ParsedArticle {
  title: string;
  byline: string | null;
  excerpt: string | null;
  contentHtml: string;
  lengthChars: number;
}

export type ReaderError =
  | { kind: "fetch_blocked"; reason: string }
  | { kind: "fetch_failed"; reason: string }
  | { kind: "unsupported"; reason: string }
  | { kind: "parse_failed"; reason: string };

export type ReaderResult = { ok: true; article: ParsedArticle } | { ok: false; error: ReaderError };

const LOCAL_HOSTS = new Set(["localhost", "0.0.0.0", "0", "::", "::1"]);

interface CacheEntry {
  article: ParsedArticle;
  expiresAt: number;
}
const cache = new Map<string, CacheEntry>();

/**
 * Fetches `url` through a hardened pipeline and runs Mozilla
 * Readability over the body. Caches the parsed result in-process
 * (LRU 50 / TTL 5min) — PROJECT.pdf §4 forbids persisting article
 * content but in-memory caching is allowed and saves a 10s call
 * per reload.
 */
export async function parseArticle(url: string): Promise<ReaderResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: { kind: "fetch_blocked", reason: "URL is not parsable" } };
  }
  const hostCheck = checkHostSafe(parsed);
  if (hostCheck) return { ok: false, error: hostCheck };

  const cacheKey = parsed.toString();
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return { ok: true, article: cached.article };
  }

  const html = await safeFetch(parsed);
  if (!html.ok) return { ok: false, error: html.error };

  const virtualConsole = new VirtualConsole();
  let dom: JSDOM;
  try {
    dom = new JSDOM(html.body, { url: parsed.toString(), virtualConsole });
  } catch (err) {
    return {
      ok: false,
      error: { kind: "parse_failed", reason: err instanceof Error ? err.message : "JSDOM failure" },
    };
  }

  let article: ReturnType<Readability["parse"]> | null = null;
  try {
    article = new Readability(dom.window.document).parse();
  } catch (err) {
    return {
      ok: false,
      error: {
        kind: "parse_failed",
        reason: err instanceof Error ? err.message : "Readability failure",
      },
    };
  } finally {
    dom.window.close();
  }

  if (!article || !article.content) {
    return { ok: false, error: { kind: "parse_failed", reason: "Readability returned no content" } };
  }

  const clean = DOMPurify.sanitize(article.content, {
    ALLOWED_TAGS: [
      "h1", "h2", "h3", "h4", "h5", "h6",
      "p", "br", "hr",
      "ul", "ol", "li",
      "blockquote", "pre", "code",
      "em", "strong", "i", "b", "u",
      "a", "img", "figure", "figcaption",
      "table", "thead", "tbody", "tr", "th", "td",
      "div", "span",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "loading", "referrerpolicy", "target", "rel"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input", "style", "link"],
    ALLOW_DATA_ATTR: false,
  });

  const result: ParsedArticle = {
    title: article.title?.trim() ?? parsed.hostname,
    byline: article.byline?.trim() ?? null,
    excerpt: article.excerpt?.trim() ?? null,
    contentHtml: clean,
    lengthChars: clean.length,
  };

  cacheArticle(cacheKey, result, now);
  return { ok: true, article: result };
}

function cacheArticle(key: string, article: ParsedArticle, now: number) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { article, expiresAt: now + CACHE_TTL_MS });
}

/**
 * Pre-flight host validation. Catches scheme, loopback name aliases,
 * and any IP literal that would slip past the DNS-pinning Agent
 * (Agent's `connect.lookup` is skipped when the host is already an IP).
 * Brackets around IPv6 literals are stripped before comparison.
 */
function checkHostSafe(parsed: URL): ReaderError | null {
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { kind: "fetch_blocked", reason: "Only http(s) URLs are allowed" };
  }
  const host = normalizeHostname(parsed.hostname);
  if (LOCAL_HOSTS.has(host)) {
    return { kind: "fetch_blocked", reason: "Loopback hosts are blocked" };
  }
  if (isIP(host) && isPrivateIp(host)) {
    return { kind: "fetch_blocked", reason: "Private/loopback IP literals are blocked" };
  }
  return null;
}

const SAFE_AGENT = new Agent({
  connect: {
    lookup: async (hostname, _options, callback) => {
      try {
        const addrs = await dnsLookup(hostname, { all: true });
        const safe = addrs.find((a) => !isPrivateIp(a.address));
        if (!safe) {
          callback(new Error(`Hostname ${hostname} resolves to a private IP`));
          return;
        }
        callback(null, safe.address, safe.family);
      } catch (err) {
        callback(err instanceof Error ? err : new Error(String(err)));
      }
    },
  },
  headersTimeout: 5_000,
  bodyTimeout: FETCH_TIMEOUT_MS,
  maxRedirections: 0,
});

async function safeFetch(
  initial: URL,
): Promise<{ ok: true; body: string } | { ok: false; error: ReaderError }> {
  let current = initial;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const hostError = checkHostSafe(current);
    if (hostError) return { ok: false, error: hostError };

    let response: Dispatcher.ResponseData;
    try {
      response = await request(current.toString(), {
        method: "GET",
        dispatcher: SAFE_AGENT,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      return { ok: false, error: { kind: "fetch_failed", reason: `Network: ${message}` } };
    }

    const status = response.statusCode;
    if (status >= 300 && status < 400) {
      await response.body.dump();
      const location = response.headers["location"];
      const locStr = Array.isArray(location) ? location[0] : location;
      if (!locStr) {
        return { ok: false, error: { kind: "fetch_failed", reason: `Redirect ${status} with no Location` } };
      }
      try {
        current = new URL(locStr, current);
      } catch {
        return { ok: false, error: { kind: "fetch_failed", reason: "Redirect Location is malformed" } };
      }
      continue;
    }
    if (status >= 400) {
      await response.body.dump();
      return { ok: false, error: { kind: "fetch_failed", reason: `Upstream returned HTTP ${status}` } };
    }
    const contentType = String(response.headers["content-type"] ?? "");
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      await response.body.dump();
      return {
        ok: false,
        error: { kind: "unsupported", reason: `Content-Type ${contentType || "unknown"} not supported` },
      };
    }
    return readCappedBody(response);
  }
  return { ok: false, error: { kind: "fetch_failed", reason: "Too many redirects" } };
}

async function readCappedBody(
  response: Dispatcher.ResponseData,
): Promise<{ ok: true; body: string } | { ok: false; error: ReaderError }> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of response.body) {
    const buf = chunk as Buffer;
    total += buf.length;
    if (total > MAX_BODY_BYTES) {
      try {
        await response.body.dump();
      } catch {
        /* already partially consumed */
      }
      return { ok: false, error: { kind: "unsupported", reason: "Body exceeds 5 MB" } };
    }
    chunks.push(buf);
  }
  return { ok: true, body: Buffer.concat(chunks).toString("utf8") };
}

function isPrivateIp(addr: string): boolean {
  const version = isIP(addr);
  if (version === 4) return isPrivateIPv4(addr);
  if (version === 6) return isPrivateIPv6(addr);
  return false;
}

function isPrivateIPv4(addr: string): boolean {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isFinite(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
  if (lower.startsWith("ff")) return true;
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    if (isIP(mapped) === 4) return isPrivateIPv4(mapped);
  }
  if (lower.startsWith("64:ff9b:")) return true; // NAT64
  return false;
}
