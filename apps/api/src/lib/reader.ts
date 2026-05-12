import "server-only";

import { Readability } from "@mozilla/readability";
import DOMPurify from "isomorphic-dompurify";
import { JSDOM, VirtualConsole } from "jsdom";
import { lookup as dnsLookup, type LookupAddress } from "node:dns/promises";
import { isIP } from "node:net";
import { Agent, request } from "undici";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // 5 MB
const USER_AGENT = "KuberTube-Reader/0.1 (+https://github.com/Abdygany/KuberTube)";

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

/**
 * Fetches `url` and runs Mozilla Readability over the body.
 *
 * SSRF defenses:
 *   - http(s) only.
 *   - DNS-resolved at request time via custom undici Agent so it
 *     can't be defeated by DNS rebinding (rebinder returns public
 *     IP at validation, private IP at connect).
 *   - Private/loopback/link-local/CGNAT IP ranges are rejected at
 *     socket connect.
 *   - Redirect target re-validated against the same rules.
 *
 * Content defenses:
 *   - Body capped at MAX_BODY_BYTES (5 MB).
 *   - Total deadline FETCH_TIMEOUT_MS (10 s).
 *   - Returned HTML is DOMPurify-sanitized with a strict allowlist.
 */
export async function parseArticle(url: string): Promise<ReaderResult> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { ok: false, error: { kind: "fetch_blocked", reason: "URL is not parsable" } };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: { kind: "fetch_blocked", reason: "Only http(s) URLs are allowed" } };
  }
  if (LOCAL_HOSTS.has(parsed.hostname.toLowerCase())) {
    return { ok: false, error: { kind: "fetch_blocked", reason: "Loopback hosts are blocked" } };
  }

  const html = await safeFetch(parsed);
  if (!html.ok) return { ok: false, error: html.error };

  const virtualConsole = new VirtualConsole(); // swallow CSS / script warnings
  let dom: JSDOM;
  try {
    dom = new JSDOM(html.body, { url: parsed.toString(), virtualConsole });
  } catch (err) {
    return {
      ok: false,
      error: { kind: "parse_failed", reason: err instanceof Error ? err.message : "JSDOM failure" },
    };
  }

  const reader = new Readability(dom.window.document);
  const article = reader.parse();
  dom.window.close();

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

  return {
    ok: true,
    article: {
      title: article.title?.trim() ?? parsed.hostname,
      byline: article.byline?.trim() ?? null,
      excerpt: article.excerpt?.trim() ?? null,
      contentHtml: clean,
      lengthChars: clean.length,
    },
  };
}

const LOCAL_HOSTS = new Set(["localhost", "0.0.0.0", "::", "::1"]);

const SAFE_AGENT = new Agent({
  connect: {
    lookup: async (hostname, options, callback) => {
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
  maxRedirections: 0, // we follow redirects manually so each hop is SSRF-checked
});

async function safeFetch(
  initial: URL,
): Promise<{ ok: true; body: string } | { ok: false; error: ReaderError }> {
  let current = initial;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    if (LOCAL_HOSTS.has(current.hostname.toLowerCase())) {
      return { ok: false, error: { kind: "fetch_blocked", reason: "Redirect to loopback blocked" } };
    }
    if (isIP(current.hostname) && isPrivateIp(current.hostname)) {
      return { ok: false, error: { kind: "fetch_blocked", reason: "Direct private-IP target blocked" } };
    }
    try {
      const response = await request(current.toString(), {
        method: "GET",
        dispatcher: SAFE_AGENT,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      const status = response.statusCode;
      if (status >= 300 && status < 400) {
        const location = response.headers["location"];
        const locStr = Array.isArray(location) ? location[0] : location;
        if (!locStr) {
          return { ok: false, error: { kind: "fetch_failed", reason: `Redirect ${status} with no Location` } };
        }
        await response.body.dump();
        try {
          current = new URL(locStr, current);
        } catch {
          return { ok: false, error: { kind: "fetch_failed", reason: "Redirect Location is malformed" } };
        }
        if (current.protocol !== "http:" && current.protocol !== "https:") {
          return { ok: false, error: { kind: "fetch_blocked", reason: "Redirect target is non-http" } };
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
      const chunks: Buffer[] = [];
      let total = 0;
      for await (const chunk of response.body) {
        const buf = chunk as Buffer;
        total += buf.length;
        if (total > MAX_BODY_BYTES) {
          return { ok: false, error: { kind: "unsupported", reason: "Body exceeds 5 MB" } };
        }
        chunks.push(buf);
      }
      return { ok: true, body: Buffer.concat(chunks).toString("utf8") };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      return { ok: false, error: { kind: "fetch_failed", reason: `Network: ${message}` } };
    }
  }
  return { ok: false, error: { kind: "fetch_failed", reason: "Too many redirects" } };
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
    return true; // malformed → treat as unsafe
  }
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast + reserved
  if (a === 0) return true;
  return false;
}

function isPrivateIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA fc00::/7
  if (lower.startsWith("ff")) return true; // multicast
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice(7);
    if (isIP(mapped) === 4) return isPrivateIPv4(mapped);
  }
  return false;
}
