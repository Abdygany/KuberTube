import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { httpsUrlSchema } from "@kubertube/core/url";
import { parseArticle } from "../../lib/reader";
import { protectedProcedure, router } from "../trpc";

const READER_USER_MESSAGES: Record<string, string> = {
  fetch_blocked:
    "This URL can't be opened in reader mode (private network or unsupported protocol). Open the original instead.",
  unsupported:
    "This URL isn't an article reader mode can render. Open the original instead.",
  fetch_failed:
    "Couldn't reach this URL right now. Open the original to read it directly.",
  parse_failed:
    "Reader couldn't extract clean content from this page. Open the original instead.",
};

export const readerRouter = router({
  /**
   * Parses an article URL through Mozilla Readability.
   *
   * Protected because the call is expensive (full HTML fetch +
   * JSDOM parse). The returned HTML is server-sanitized, safe to
   * render with `dangerouslySetInnerHTML` on the client.
   *
   * User-facing messages are generic per error kind so SSRF probes
   * can't enumerate internal IPs from the response body. Server
   * logs retain detail.
   */
  parse: protectedProcedure.input(z.object({ url: httpsUrlSchema })).query(async ({ input }) => {
    const result = await parseArticle(input.url);
    if (!result.ok) {
      console.warn(
        `reader.parse failed for ${input.url}: ${result.error.kind} — ${result.error.reason}`,
      );
      const message =
        READER_USER_MESSAGES[result.error.kind] ?? "Reader is unavailable for this URL.";
      throw new TRPCError({
        code:
          result.error.kind === "fetch_blocked" || result.error.kind === "unsupported"
            ? "BAD_REQUEST"
            : "PRECONDITION_FAILED",
        message,
      });
    }
    return result.article;
  }),
});
