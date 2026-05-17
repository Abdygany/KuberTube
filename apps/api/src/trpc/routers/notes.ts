import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { notes, resources, workspaces, type Database } from "@kubertube/db";
import { sanitizeNoteHtml } from "../../lib/markdown";
import { protectedProcedure, router } from "../trpc";

async function assertOwnsResource(
  db: Database,
  userId: string,
  resourceId: string,
) {
  const [row] = await db
    .select({ id: resources.id })
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
}

async function assertOwnsNote(db: Database, userId: string, noteId: string) {
  const [row] = await db
    .select({ id: notes.id })
    .from(notes)
    .innerJoin(resources, eq(resources.id, notes.resourceId))
    .innerJoin(workspaces, eq(workspaces.id, resources.workspaceId))
    .where(
      and(
        eq(notes.id, noteId),
        eq(workspaces.userId, userId),
        isNull(notes.deletedAt),
        isNull(resources.deletedAt),
        isNull(workspaces.deletedAt),
      ),
    )
    .limit(1);
  if (!row) throw new TRPCError({ code: "NOT_FOUND" });
}

export const notesRouter = router({
  listByResource: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertOwnsResource(ctx.db, ctx.user.id, input.resourceId);
      return ctx.db
        .select({
          id: notes.id,
          resourceId: notes.resourceId,
          contentMd: notes.contentMd,
          timestampSeconds: notes.timestampSeconds,
          createdAt: notes.createdAt,
          updatedAt: notes.updatedAt,
        })
        .from(notes)
        .where(
          and(eq(notes.resourceId, input.resourceId), isNull(notes.deletedAt)),
        )
        .orderBy(asc(notes.timestampSeconds), asc(notes.createdAt));
    }),

  /**
   * Creates a note OR updates the main note in place (when id is
   * omitted and timestamp is null). Timecode notes are always
   * created fresh — each Insert-timecode click produces a new row.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        resourceId: z.string().uuid(),
        contentMd: z.string().max(50_000),
        timestampSeconds: z.number().int().nonnegative().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // TipTap sanitizes client-side, but a malicious client can POST raw
      // HTML directly. Sanitize on the server so storage is trustworthy.
      const sanitized = sanitizeNoteHtml(input.contentMd);

      if (input.id) {
        await assertOwnsNote(ctx.db, ctx.user.id, input.id);
        const [updated] = await ctx.db
          .update(notes)
          .set({ contentMd: sanitized, updatedAt: new Date() })
          .where(eq(notes.id, input.id))
          .returning();
        if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
        return updated;
      }

      await assertOwnsResource(ctx.db, ctx.user.id, input.resourceId);
      const timestampSeconds = input.timestampSeconds ?? null;

      if (timestampSeconds === null) {
        const [existing] = await ctx.db
          .select()
          .from(notes)
          .where(
            and(
              eq(notes.resourceId, input.resourceId),
              isNull(notes.timestampSeconds),
              isNull(notes.deletedAt),
            ),
          )
          .limit(1);
        if (existing) {
          const [updated] = await ctx.db
            .update(notes)
            .set({ contentMd: sanitized, updatedAt: new Date() })
            .where(eq(notes.id, existing.id))
            .returning();
          return updated!;
        }
      }

      const [created] = await ctx.db
        .insert(notes)
        .values({
          resourceId: input.resourceId,
          contentMd: sanitized,
          timestampSeconds,
        })
        .returning();
      return created!;
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertOwnsNote(ctx.db, ctx.user.id, input.id);
      await ctx.db
        .update(notes)
        .set({ deletedAt: new Date() })
        .where(eq(notes.id, input.id));
      return { ok: true as const };
    }),
});
