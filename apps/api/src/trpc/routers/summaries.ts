import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { resources, resourceSummaries, workspaces, type Database } from "@kubertube/db";
import { callAnthropicMessages, DEFAULT_SUMMARY_MODEL } from "../../lib/anthropic";
import { parseArticle } from "../../lib/reader";
import { htmlToPlainText, truncateAtBoundary } from "../../lib/text";
import { decryptUserKey } from "../keys-helper";
import { protectedProcedure, router } from "../trpc";

const MAX_INPUT_CHARS = 30_000;

const SHORT_PROMPT_INSTRUCTIONS = `Summarize for a learner. Three or four short paragraphs.
Strictly faithful to the source — do not invent facts.
Output: markdown only, no preamble.
Respond in the same language as the source content.`;

const DETAILED_PROMPT_INSTRUCTIONS = `Summarize for a learner studying the topic deeply.
Cover key concepts, supporting examples, and the structure of the argument.
Strictly faithful to the source — do not invent facts.
Output: well-structured markdown with H2/H3 headings as appropriate.
Respond in the same language as the source content.`;

interface ResourceForSummary {
  id: string;
  url: string;
  type: "video" | "article";
  title: string;
  description: string | null;
  metadata: unknown;
  workspaceId: string;
  workspaceGoal: string;
}

async function loadResource(
  db: Database,
  userId: string,
  resourceId: string,
): Promise<ResourceForSummary> {
  const [row] = await db
    .select({
      id: resources.id,
      url: resources.url,
      type: resources.type,
      title: resources.title,
      description: resources.description,
      metadata: resources.metadataJson,
      workspaceId: resources.workspaceId,
      workspaceGoal: workspaces.goal,
    })
    .from(resources)
    .innerJoin(workspaces, eq(workspaces.id, resources.workspaceId))
    .where(
      and(
        eq(resources.id, resourceId),
        eq(workspaces.userId, userId),
        isNull(resources.deletedAt),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
  return row;
}

async function buildPrompt(resource: ResourceForSummary): Promise<{
  userMessage: string;
  truncated: boolean;
}> {
  if (resource.type === "article") {
    const parsed = await parseArticle(resource.url);
    if (!parsed.ok) {
      // Fall back to title + description if reader can't extract.
      return {
        userMessage: `# ${resource.title}\n\n${resource.description ?? ""}`,
        truncated: false,
      };
    }
    const plain = htmlToPlainText(parsed.article.contentHtml);
    const { text, truncated } = truncateAtBoundary(plain, MAX_INPUT_CHARS);
    return {
      userMessage: `# ${parsed.article.title}\n\n${parsed.article.byline ? `By ${parsed.article.byline}\n\n` : ""}${text}`,
      truncated,
    };
  }
  // video — we can't reach the transcript without YT CC API; summarize from title/desc/channel
  const channelTitle =
    typeof resource.metadata === "object" &&
    resource.metadata !== null &&
    "channelTitle" in resource.metadata &&
    typeof (resource.metadata as { channelTitle?: unknown }).channelTitle === "string"
      ? (resource.metadata as { channelTitle: string }).channelTitle
      : null;
  const message = `# ${resource.title}\n\n${channelTitle ? `Channel: ${channelTitle}\n\n` : ""}${resource.description ?? "(no description)"}\n\nNote: this is a YouTube video. You're only seeing the title, channel, and description — there is no transcript.`;
  return { userMessage: message, truncated: false };
}

export const summariesRouter = router({
  byResource: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await loadResource(ctx.db, ctx.user.id, input.resourceId);
      return ctx.db
        .select({
          id: resourceSummaries.id,
          summaryType: resourceSummaries.summaryType,
          contentMd: resourceSummaries.contentMd,
          modelUsed: resourceSummaries.modelUsed,
          tokensUsed: resourceSummaries.tokensUsed,
          createdAt: resourceSummaries.createdAt,
        })
        .from(resourceSummaries)
        .where(eq(resourceSummaries.resourceId, input.resourceId))
        .orderBy(desc(resourceSummaries.createdAt));
    }),

  /**
   * Generates an Anthropic-backed summary for a resource. Each call
   * produces a new row — re-running is treated as "try again because
   * the previous output was unsatisfying", not as a retry-with-cache.
   * Input is hard-capped at 30k chars (~7k tokens) and truncated at a
   * paragraph/sentence boundary.
   */
  create: protectedProcedure
    .input(
      z.object({
        resourceId: z.string().uuid(),
        type: z.enum(["short", "detailed"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resource = await loadResource(ctx.db, ctx.user.id, input.resourceId);
      const apiKey = await decryptUserKey(ctx.db, ctx.user.id, "anthropic", ctx.masterKey);
      const { userMessage, truncated } = await buildPrompt(resource);
      const system = `You are a concise study aid. The learner's goal for this workspace is: "${resource.workspaceGoal}". ${
        input.type === "short" ? SHORT_PROMPT_INSTRUCTIONS : DETAILED_PROMPT_INSTRUCTIONS
      }`;
      const messages = [{ role: "user" as const, content: userMessage }];
      const response = await callAnthropicMessages({
        apiKey,
        model: DEFAULT_SUMMARY_MODEL,
        maxTokens: input.type === "short" ? 800 : 2000,
        system,
        messages,
      });
      const totalTokens = response.inputTokens + response.outputTokens;
      const contentMd = truncated
        ? `_⚠ Source truncated to ${MAX_INPUT_CHARS} chars before summarization._\n\n${response.text}`
        : response.text;
      const [row] = await ctx.db
        .insert(resourceSummaries)
        .values({
          resourceId: input.resourceId,
          contentMd,
          summaryType: input.type,
          modelUsed: DEFAULT_SUMMARY_MODEL,
          tokensUsed: totalTokens,
        })
        .returning();
      return row!;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ resourceId: resourceSummaries.resourceId })
        .from(resourceSummaries)
        .where(eq(resourceSummaries.id, input.id))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await loadResource(ctx.db, ctx.user.id, row.resourceId);
      await ctx.db.delete(resourceSummaries).where(eq(resourceSummaries.id, input.id));
      return { ok: true as const };
    }),
});
