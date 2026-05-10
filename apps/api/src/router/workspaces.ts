import { schema } from '@learnspace/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { WorkspaceFiltersSchema } from '../schemas';
import { protectedProcedure, router } from '../trpc';

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: schema.workspaces.id,
        title: schema.workspaces.title,
        goal: schema.workspaces.goal,
        filtersJson: schema.workspaces.filtersJson,
        createdAt: schema.workspaces.createdAt,
        updatedAt: schema.workspaces.updatedAt,
        lastOpenedAt: schema.workspaces.lastOpenedAt,
      })
      .from(schema.workspaces)
      .where(
        and(
          eq(schema.workspaces.userId, ctx.user.id),
          isNull(schema.workspaces.deletedAt),
        ),
      )
      .orderBy(desc(schema.workspaces.lastOpenedAt));

    const withProgress = await Promise.all(
      rows.map(async (ws) => {
        const resources = await ctx.db
          .select({
            isCompleted: schema.resources.isCompleted,
          })
          .from(schema.resources)
          .where(
            and(
              eq(schema.resources.workspaceId, ws.id),
              isNull(schema.resources.deletedAt),
            ),
          );
        const total = resources.length;
        const completed = resources.filter((r) => r.isCompleted).length;
        return { ...ws, progress: { total, completed } };
      }),
    );

    return withProgress;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        goal: z.string().min(1).max(1000),
        filters: WorkspaceFiltersSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [ws] = await ctx.db
        .insert(schema.workspaces)
        .values({
          userId: ctx.user.id,
          title: input.title,
          goal: input.goal,
          filtersJson: input.filters ?? {},
        })
        .returning();
      return ws!;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [ws] = await ctx.db
        .select()
        .from(schema.workspaces)
        .where(
          and(
            eq(schema.workspaces.id, input.id),
            eq(schema.workspaces.userId, ctx.user.id),
          ),
        );
      if (!ws) throw new Error('Workspace not found');

      await ctx.db
        .update(schema.workspaces)
        .set({ lastOpenedAt: new Date() })
        .where(eq(schema.workspaces.id, ws.id));

      const resources = await ctx.db
        .select()
        .from(schema.resources)
        .where(
          and(
            eq(schema.resources.workspaceId, ws.id),
            isNull(schema.resources.deletedAt),
          ),
        )
        .orderBy(desc(schema.resources.savedAt));

      return { ...ws, resources };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(200).optional(),
        goal: z.string().min(1).max(1000).optional(),
        filters: WorkspaceFiltersSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await ctx.db
        .update(schema.workspaces)
        .set({
          ...(data.title ? { title: data.title } : {}),
          ...(data.goal ? { goal: data.goal } : {}),
          ...(data.filters ? { filtersJson: data.filters } : {}),
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.workspaces.id, id),
            eq(schema.workspaces.userId, ctx.user.id),
          ),
        );
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.workspaces)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(schema.workspaces.id, input.id),
            eq(schema.workspaces.userId, ctx.user.id),
          ),
        );
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.workspaces)
        .set({ deletedAt: null })
        .where(
          and(
            eq(schema.workspaces.id, input.id),
            eq(schema.workspaces.userId, ctx.user.id),
          ),
        );
    }),

  listDeleted: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(schema.workspaces)
      .where(
        and(
          eq(schema.workspaces.userId, ctx.user.id),
          // not null deletedAt
        ),
      )
      .orderBy(desc(schema.workspaces.deletedAt));
    return rows.filter((r) => r.deletedAt !== null);
  }),
});
