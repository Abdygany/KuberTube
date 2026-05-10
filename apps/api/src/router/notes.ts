import { schema } from '@learnspace/db';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';
import { assertNoteOwned, assertResourceOwned } from './_authz';

export const notesRouter = router({
  list: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await assertResourceOwned(ctx, input.resourceId);
      return ctx.db
        .select()
        .from(schema.notes)
        .where(
          and(eq(schema.notes.resourceId, input.resourceId), isNull(schema.notes.deletedAt)),
        )
        .orderBy(desc(schema.notes.createdAt));
    }),

  upsert: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid().optional(),
        resourceId: z.string().uuid(),
        contentMd: z.string(),
        timestampSeconds: z.number().int().min(0).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertResourceOwned(ctx, input.resourceId);
      if (input.id) {
        await assertNoteOwned(ctx, input.id);
        const [updated] = await ctx.db
          .update(schema.notes)
          .set({ contentMd: input.contentMd, updatedAt: new Date() })
          .where(eq(schema.notes.id, input.id))
          .returning();
        if (!updated) throw new TRPCError({ code: 'NOT_FOUND' });
        return updated;
      }
      const [created] = await ctx.db
        .insert(schema.notes)
        .values({
          resourceId: input.resourceId,
          contentMd: input.contentMd,
          timestampSeconds: input.timestampSeconds,
        })
        .returning();
      if (!created) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });
      return created;
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await assertNoteOwned(ctx, input.id);
      await ctx.db
        .update(schema.notes)
        .set({ deletedAt: new Date() })
        .where(eq(schema.notes.id, input.id));
    }),
});
