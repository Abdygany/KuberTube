import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { parseArticle } from "../../lib/reader";
import { protectedProcedure, router } from "../trpc";

const httpsUrl = z
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

export const readerRouter = router({
  /**
   * Parses an article URL through Mozilla Readability.
   *
   * `protectedProcedure` because the call is expensive (full HTML
   * fetch + JSDOM parse) and we don't want unauthenticated traffic
   * abusing it. The sanitizer strips scripts/iframes so the returned
   * HTML is safe to render with `dangerouslySetInnerHTML` on the
   * client.
   *
   * Failure detail is intentionally generic to avoid revealing
   * internal IPs on SSRF probe attempts. Server logs retain detail.
   */
  parse: protectedProcedure.input(z.object({ url: httpsUrl })).query(async ({ input }) => {
    const result = await parseArticle(input.url);
    if (!result.ok) {
      console.warn(`reader.parse failed for ${input.url}: ${result.error.kind} — ${result.error.reason}`);
      if (result.error.kind === "fetch_blocked" || result.error.kind === "unsupported") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This URL can't be parsed in reader mode. Open the original instead.",
        });
      }
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Reader couldn't extract content from this page. Open the original instead.",
      });
    }
    return result.article;
  }),
});
