import { z } from 'zod';
import { publicProcedure, router } from '../trpc';

export const readerRouter = router({
  parse: publicProcedure
    .input(z.object({ url: z.string().url() }))
    .mutation(async ({ input }) => {
      const res = await fetch(input.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; Learnspace/1.0; +https://learnspace.app)',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10_000),
        redirect: 'follow',
      });

      if (!res.ok) {
        return { ok: false as const, error: `HTTP ${res.status}` };
      }

      const html = await res.text();

      try {
        const { Readability } = await import('@mozilla/readability');
        const { JSDOM } = await import('jsdom');
        const dom = new JSDOM(html, { url: input.url });
        const reader = new Readability(dom.window.document);
        const article = reader.parse();

        if (!article) {
          return { ok: false as const, error: 'Could not parse article' };
        }

        return {
          ok: true as const,
          title: article.title,
          byline: article.byline,
          excerpt: article.excerpt,
          contentHtml: article.content,
          textContent: article.textContent,
          siteName: article.siteName,
          lang: article.lang,
        };
      } catch {
        return { ok: false as const, error: 'Parse error' };
      }
    }),
});
