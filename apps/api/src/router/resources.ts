import { schema } from '@learnspace/db';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { ResourceSourceSchema, ResourceTypeSchema } from '../schemas';
import { protectedProcedure, router } from '../trpc';

export const resourcesRouter = router({
  list: protectedProcedure
    .input(z.object({ workspaceId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(schema.resources)
        .where(
          and(
            eq(schema.resources.workspaceId, input.workspaceId),
            isNull(schema.resources.deletedAt),
          ),
        )
        .orderBy(desc(schema.resources.savedAt));
    }),

  create: protectedProcedure
    .input(
      z.object({
        workspaceId: z.string().uuid(),
        url: z.string().url(),
        type: ResourceTypeSchema,
        source: ResourceSourceSchema,
        title: z.string().min(1).max(500),
        description: z.string().max(2000).optional(),
        thumbnailUrl: z.string().url().optional(),
        durationSeconds: z.number().int().positive().optional(),
        publishedAt: z.string().datetime().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [resource] = await ctx.db
        .insert(schema.resources)
        .values({
          workspaceId: input.workspaceId,
          url: input.url,
          type: input.type,
          source: input.source,
          title: input.title,
          description: input.description,
          thumbnailUrl: input.thumbnailUrl,
          durationSeconds: input.durationSeconds,
          publishedAt: input.publishedAt ? new Date(input.publishedAt) : undefined,
          metadataJson: input.metadata ?? {},
        })
        .returning();
      return resource!;
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [resource] = await ctx.db
        .select()
        .from(schema.resources)
        .where(eq(schema.resources.id, input.id));
      if (!resource) throw new Error('Resource not found');
      await ctx.db
        .update(schema.resources)
        .set({ lastOpenedAt: new Date() })
        .where(eq(schema.resources.id, input.id));
      return resource;
    }),

  updateProgress: protectedProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        progressSeconds: z.number().int().min(0),
        isCompleted: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.resources)
        .set({
          progressSeconds: input.progressSeconds,
          ...(input.isCompleted !== undefined ? { isCompleted: input.isCompleted } : {}),
        })
        .where(eq(schema.resources.id, input.id));
    }),

  softDelete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.resources)
        .set({ deletedAt: new Date() })
        .where(eq(schema.resources.id, input.id));
    }),
});
