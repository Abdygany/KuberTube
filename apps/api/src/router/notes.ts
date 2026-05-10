import { schema } from '@learnspace/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { protectedProcedure, router } from '../trpc';

export const notesRouter = router({
  list: protectedProcedure
    .input(z.object({ resourceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
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
      if (input.id) {
        const [updated] = await ctx.db
          .update(schema.notes)
          .set({ contentMd: input.contentMd, updatedAt: new Date() })
          .where(eq(schema.notes.id, input.id))
          .returning();
        return updated!;
      }
      const [created] = await ctx.db
        .insert(schema.notes)
        .values({
          resourceId: input.resourceId,
          contentMd: input.contentMd,
          timestampSeconds: input.timestampSeconds,
        })
        .returning();
      return created!;
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.notes)
        .set({ deletedAt: new Date() })
        .where(eq(schema.notes.id, input.id));
    }),
});
