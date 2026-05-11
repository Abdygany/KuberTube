import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';

import { schema } from '@learnspace/db';
import type { Database } from '@learnspace/db';

import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

const filtersInput = z
  .object({
    level: z.enum(['beginner', 'intermediate', 'advanced']),
    duration: z.enum(['short', 'medium', 'long']),
    balance: z.enum(['video', 'text', 'mixed']),
    freshness: z.enum(['any', '6m', '1y', '2y']),
  })
  .partial();

async function ownedWorkspace(db: Database, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.workspaces)
    .where(
      and(
        eq(schema.workspaces.id, id),
        eq(schema.workspaces.userId, userId),
        isNull(schema.workspaces.deletedAt),
      ),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace не найден' });
  }
  return row;
}

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.workspaces)
      .where(and(eq(schema.workspaces.userId, ctx.user.id), isNull(schema.workspaces.deletedAt)))
      .orderBy(desc(schema.workspaces.lastOpenedAt));
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1).max(200),
        goal: z.string().trim().min(1).max(2000),
        filters: filtersInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.workspaces)
        .values({
          userId: ctx.user.id,
          title: input.title,
          goal: input.goal,
          filtersJson: input.filters ?? {},
        })
        .returning();
      return row!;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const row = await ownedWorkspace(ctx.db, ctx.user.id, input.id);
      // Тач last_opened_at, чтобы сортировка списка отражала недавнее.
      await ctx.db
        .update(schema.workspaces)
        .set({ lastOpenedAt: new Date() })
        .where(eq(schema.workspaces.id, row.id));
      return row;
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        goal: z.string().trim().min(1).max(2000).optional(),
        filters: filtersInput.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ownedWorkspace(ctx.db, ctx.user.id, input.id);
      const patch: Partial<typeof schema.workspaces.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.title) patch.title = input.title;
      if (input.goal) patch.goal = input.goal;
      if (input.filters) patch.filtersJson = { ...existing.filtersJson, ...input.filters };

      const [row] = await ctx.db
        .update(schema.workspaces)
        .set(patch)
        .where(eq(schema.workspaces.id, existing.id))
        .returning();
      return row!;
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ownedWorkspace(ctx.db, ctx.user.id, input.id);
      await ctx.db
        .update(schema.workspaces)
        .set({ deletedAt: new Date(), updatedAt: new Date() })
        .where(eq(schema.workspaces.id, existing.id));
      return { ok: true };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.workspaces)
        .set({ deletedAt: null, updatedAt: new Date() })
        .where(and(eq(schema.workspaces.id, input.id), eq(schema.workspaces.userId, ctx.user.id)))
        .returning();
      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Workspace не найден' });
      }
      return row;
    }),
});
