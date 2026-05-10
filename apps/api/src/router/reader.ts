import { lookup as dnsLookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 10_000;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p))) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('::ffff:')) {
    const v4 = lower.slice('::ffff:'.length);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const blockedHosts = new Set([
    'localhost',
    'metadata.google.internal',
    'metadata.goog',
    'instance-data',
  ]);
  if (blockedHosts.has(hostname.toLowerCase())) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Blocked host' });
  }
  const literal = isIP(hostname);
  if (literal === 4 && isPrivateIPv4(hostname)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Private IP not allowed' });
  }
  if (literal === 6 && isPrivateIPv6(hostname)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Private IP not allowed' });
  }
  if (literal !== 0) return;

  const addresses = await dnsLookup(hostname, { all: true });
  for (const { address, family } of addresses) {
    if (family === 4 && isPrivateIPv4(address)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Resolves to private IP' });
    }
    if (family === 6 && isPrivateIPv6(address)) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Resolves to private IP' });
    }
  }
}

async function safeFetchHtml(initialUrl: string): Promise<{ html: string; finalUrl: string }> {
  let currentUrl = initialUrl;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid URL' });
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only http/https are allowed' });
    }
    await assertPublicHostname(parsed.hostname);

    const res = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Learnspace/1.0; +https://learnspace.app)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: 'manual',
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      if (!location) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Redirect without Location' });
      currentUrl = new URL(location, parsed).toString();
      continue;
    }
    if (!res.ok) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Upstream HTTP ${res.status}` });
    }

    const reader = res.body?.getReader();
    if (!reader) return { html: await res.text(), finalUrl: parsed.toString() };

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Response too large' });
      }
      chunks.push(value);
    }
    return {
      html: new TextDecoder('utf-8').decode(Buffer.concat(chunks.map((c) => Buffer.from(c)))),
      finalUrl: parsed.toString(),
    };
  }
  throw new TRPCError({ code: 'BAD_REQUEST', message: 'Too many redirects' });
}

export const readerRouter = router({
  parse: protectedProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      let fetched: { html: string; finalUrl: string };
      try {
        fetched = await safeFetchHtml(input.url);
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        return { ok: false as const, error: 'Fetch failed' };
      }

      try {
        const [{ Readability }, { JSDOM }, createDOMPurify] = await Promise.all([
          import('@mozilla/readability'),
          import('jsdom'),
          import('dompurify').then((m) => m.default),
        ]);
        const dom = new JSDOM(fetched.html, { url: fetched.finalUrl });
        const article = new Readability(dom.window.document).parse();
        if (!article) return { ok: false as const, error: 'Could not parse article' };

        const purifyWindow = new JSDOM('').window;
        const purify = createDOMPurify(purifyWindow as unknown as Parameters<typeof createDOMPurify>[0]);
        const cleanHtml = purify.sanitize(article.content ?? '', {
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style', 'form', 'input'],
          FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick'],
          ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|#)/i,
        });

        return {
          ok: true as const,
          title: article.title,
          byline: article.byline,
          excerpt: article.excerpt,
          contentHtml: cleanHtml,
          textContent: article.textContent,
          siteName: article.siteName,
          lang: article.lang,
        };
      } catch {
        return { ok: false as const, error: 'Parse error' };
      }
    }),
});
