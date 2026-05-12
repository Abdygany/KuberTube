import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { resources, workspaces, type Database } from "@kubertube/db";
import { canonicalUrl } from "@kubertube/core";
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

const candidateSchema = z.object({
  url: httpsUrl,
  type: z.enum(["video", "article"]),
  /** SearchProvider from @kubertube/core: youtube|brave. Mapped to DB source. */
  source: z.enum(["youtube", "brave"]),
  title: z.string().min(1).max(500),
  description: z.string().max(8000).nullable().optional(),
  thumbnailUrl: httpsUrl.nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RESOURCE_SELECT = {
  id: resources.id,
  workspaceId: resources.workspaceId,
  url: resources.url,
  type: resources.type,
  source: resources.source,
  title: resources.title,
  description: resources.description,
  thumbnailUrl: resources.thumbnailUrl,
  durationSeconds: resources.durationSeconds,
  publishedAt: resources.publishedAt,
  metadata: resources.metadataJson,
  savedAt: resources.savedAt,
  lastOpenedAt: resources.lastOpenedAt,
  progressSeconds: resources.progressSeconds,
  isCompleted: resources.isCompleted,
} as const;

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
        .select(RESOURCE_SELECT)
        .from(resources)
        .where(and(eq(resources.workspaceId, input.workspaceId), isNull(resources.deletedAt)))
        .orderBy(desc(resources.savedAt));
    }),

  /**
   * Idempotent add. If the URL exists in the workspace:
   * - and is live → returns the existing row (no scolding popup);
   * - and is soft-deleted → restores it.
   *
   * The URL is canonicalized; non-http(s) schemes are rejected upstream
   * by `httpsUrl` and would never reach this handler.
   */
  add: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid(), candidate: candidateSchema }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsWorkspace(ctx.db, ctx.user.id, input.workspaceId);
      const url = canonicalUrl(input.candidate.url);
      if (!url) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Resource URL is invalid" });
      }
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
            .returning(RESOURCE_SELECT);
          return restored!;
        }
        const [refreshed] = await ctx.db
          .select(RESOURCE_SELECT)
          .from(resources)
          .where(eq(resources.id, existing.id))
          .limit(1);
        return refreshed!;
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
        .returning(RESOURCE_SELECT);
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

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          ...RESOURCE_SELECT,
          workspaceId: resources.workspaceId,
        })
        .from(resources)
        .innerJoin(workspaces, eq(workspaces.id, resources.workspaceId))
        .where(
          and(
            eq(resources.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(resources.deletedAt),
            isNull(workspaces.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      void ctx.db
        .update(resources)
        .set({ lastOpenedAt: new Date() })
        .where(eq(resources.id, input.id));
      return row;
    }),

  /**
   * Video player heartbeat. Floor at 2 seconds between writes to
   * stop a malicious client from hammering the DB.
   */
  updateProgress: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        progressSeconds: z.number().int().nonnegative().max(86_400),
        isCompleted: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({
          workspaceId: resources.workspaceId,
          lastOpenedAt: resources.lastOpenedAt,
        })
        .from(resources)
        .where(and(eq(resources.id, input.id), isNull(resources.deletedAt)))
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      await assertOwnsWorkspace(ctx.db, ctx.user.id, row.workspaceId);

      const now = new Date();
      if (row.lastOpenedAt && now.getTime() - row.lastOpenedAt.getTime() < 2_000) {
        return { ok: true as const, throttled: true };
      }

      await ctx.db
        .update(resources)
        .set({
          progressSeconds: input.progressSeconds,
          lastOpenedAt: now,
          ...(input.isCompleted === undefined ? {} : { isCompleted: input.isCompleted }),
        })
        .where(eq(resources.id, input.id));
      return { ok: true as const, throttled: false };
    }),
});
