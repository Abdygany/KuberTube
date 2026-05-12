import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { resources, workspaces, type Database } from "@kubertube/db";
import { canonicalUrl } from "@kubertube/core";
import { protectedProcedure, router } from "../trpc";

const candidateSchema = z.object({
  url: z.string().url(),
  type: z.enum(["video", "article"]),
  /** SearchProvider from @kubertube/core: youtube|brave. Mapped to DB source. */
  source: z.enum(["youtube", "brave"]),
  title: z.string().min(1).max(500),
  description: z.string().max(8000).nullable().optional(),
  thumbnailUrl: z.string().url().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

function toResourceSource(provider: "youtube" | "brave"): "youtube" | "web" {
  return provider === "youtube" ? "youtube" : "web";
}

async function assertOwnsWorkspace(db: Database, userId: string, workspaceId: string) {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(workspaces.userId, userId),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);
  if (!workspace) throw new TRPCError({ code: "NOT_FOUND" });
}

export const resourcesRouter = router({
  listByWorkspace: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsWorkspace(ctx.db, ctx.user.id, input.workspaceId);
      return ctx.db
        .select({
          id: resources.id,
          url: resources.url,
          type: resources.type,
          source: resources.source,
          title: resources.title,
          description: resources.description,
          thumbnailUrl: resources.thumbnailUrl,
          durationSeconds: resources.durationSeconds,
          publishedAt: resources.publishedAt,
          savedAt: resources.savedAt,
          lastOpenedAt: resources.lastOpenedAt,
          progressSeconds: resources.progressSeconds,
          isCompleted: resources.isCompleted,
        })
        .from(resources)
        .where(
          and(eq(resources.workspaceId, input.workspaceId), isNull(resources.deletedAt)),
        )
        .orderBy(desc(resources.savedAt));
    }),

  /**
   * Idempotent add. If the URL exists in the workspace:
   * - and is live → returns the existing row (no scolding popup);
   * - and is soft-deleted → restores it.
   */
  add: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid(), candidate: candidateSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsWorkspace(ctx.db, ctx.user.id, input.workspaceId);
      const url = canonicalUrl(input.candidate.url);
      const publishedAt = input.candidate.publishedAt
        ? new Date(input.candidate.publishedAt)
        : null;

      const [existing] = await ctx.db
        .select()
        .from(resources)
        .where(and(eq(resources.workspaceId, input.workspaceId), eq(resources.url, url)))
        .limit(1);

      if (existing) {
        if (existing.deletedAt) {
          const [restored] = await ctx.db
            .update(resources)
            .set({
              deletedAt: null,
              title: input.candidate.title,
              description: input.candidate.description ?? null,
              thumbnailUrl: input.candidate.thumbnailUrl ?? null,
              durationSeconds: input.candidate.durationSeconds ?? null,
              publishedAt,
              metadataJson: input.candidate.metadata ?? {},
              savedAt: new Date(),
            })
            .where(eq(resources.id, existing.id))
            .returning();
          return restored!;
        }
        return existing;
      }

      const [created] = await ctx.db
        .insert(resources)
        .values({
          workspaceId: input.workspaceId,
          url,
          type: input.candidate.type,
          source: toResourceSource(input.candidate.source),
          title: input.candidate.title,
          description: input.candidate.description ?? null,
          thumbnailUrl: input.candidate.thumbnailUrl ?? null,
          durationSeconds: input.candidate.durationSeconds ?? null,
          publishedAt,
          metadataJson: input.candidate.metadata ?? {},
        })
        .returning();
      return created!;
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ workspaceId: resources.workspaceId })
        .from(resources)
        .where(and(eq(resources.id, input.id), isNull(resources.deletedAt)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await assertOwnsWorkspace(ctx.db, ctx.user.id, row.workspaceId);
      await ctx.db
        .update(resources)
        .set({ deletedAt: new Date() })
        .where(eq(resources.id, input.id));
      return { ok: true as const };
    }),

  markCompleted: protectedProcedure
    .input(z.object({ id: z.string().uuid(), isCompleted: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ workspaceId: resources.workspaceId })
        .from(resources)
        .where(and(eq(resources.id, input.id), isNull(resources.deletedAt)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await assertOwnsWorkspace(ctx.db, ctx.user.id, row.workspaceId);
      await ctx.db
        .update(resources)
        .set({ isCompleted: input.isCompleted })
        .where(eq(resources.id, input.id));
      return { ok: true as const };
    }),
});
