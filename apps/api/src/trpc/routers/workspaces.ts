import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { workspaces } from "@kubertube/db";
import { workspaceFiltersSchema } from "@kubertube/core";
import { protectedProcedure, router } from "../trpc";

const createInput = z.object({
  title: z.string().min(1).max(140),
  goal: z.string().min(1).max(4000),
  filters: workspaceFiltersSchema,
});

const updateInput = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(140).optional(),
  goal: z.string().min(1).max(4000).optional(),
  filters: workspaceFiltersSchema.optional(),
});

export const workspacesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: workspaces.id,
        title: workspaces.title,
        goal: workspaces.goal,
        filtersJson: workspaces.filtersJson,
        createdAt: workspaces.createdAt,
        lastOpenedAt: workspaces.lastOpenedAt,
      })
      .from(workspaces)
      .where(and(eq(workspaces.userId, ctx.user.id), isNull(workspaces.deletedAt)))
      .orderBy(desc(workspaces.lastOpenedAt));
    return rows;
  }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(workspaces)
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .limit(1);
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const [created] = await ctx.db
      .insert(workspaces)
      .values({
        userId: ctx.user.id,
        title: input.title,
        goal: input.goal,
        filtersJson: input.filters,
      })
      .returning();
    if (!created) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    }
    return created;
  }),

  update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const { id, ...rest } = input;
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (rest.title !== undefined) patch.title = rest.title;
    if (rest.goal !== undefined) patch.goal = rest.goal;
    if (rest.filters !== undefined) patch.filtersJson = rest.filters;
    const [updated] = await ctx.db
      .update(workspaces)
      .set(patch)
      .where(
        and(
          eq(workspaces.id, id),
          eq(workspaces.userId, ctx.user.id),
          isNull(workspaces.deletedAt),
        ),
      )
      .returning();
    if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
    return updated;
  }),

  touch: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(workspaces)
        .set({ lastOpenedAt: new Date() })
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        );
      return { ok: true as const };
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(workspaces)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(workspaces.id, input.id),
            eq(workspaces.userId, ctx.user.id),
            isNull(workspaces.deletedAt),
          ),
        )
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return { ok: true as const };
    }),

  restore: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(workspaces)
        .set({ deletedAt: null })
        .where(and(eq(workspaces.id, input.id), eq(workspaces.userId, ctx.user.id)))
        .returning();
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),
});
