import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { schema } from '@learnspace/db';

import { protectedProcedure, router } from '../trpc.js';

const levelEnum = z.enum(['beginner', 'intermediate', 'advanced']);
const durationEnum = z.enum(['short', 'medium', 'long']);
const balanceEnum = z.enum(['video', 'text', 'mixed']);
const freshnessEnum = z.enum(['any', '6m', '1y', '2y']);
const themeEnum = z.enum(['light', 'dark', 'system']);

const updateInput = z
  .object({
    defaultLevel: levelEnum,
    defaultDuration: durationEnum,
    defaultBalance: balanceEnum,
    defaultFreshness: freshnessEnum,
    uiTheme: themeEnum,
    uiLanguage: z.string().min(2).max(10),
  })
  .partial();

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const existing = await ctx.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, ctx.user.id))
      .limit(1);

    if (existing[0]) return existing[0];

    const [created] = await ctx.db
      .insert(schema.userSettings)
      .values({ userId: ctx.user.id })
      .returning();
    return created!;
  }),

  update: protectedProcedure.input(updateInput).mutation(async ({ ctx, input }) => {
    const [updated] = await ctx.db
      .insert(schema.userSettings)
      .values({ userId: ctx.user.id, ...input })
      .onConflictDoUpdate({
        target: schema.userSettings.userId,
        set: { ...input, updatedAt: new Date() },
      })
      .returning();
    return updated!;
  }),

  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const [updated] = await ctx.db
      .insert(schema.userSettings)
      .values({ userId: ctx.user.id, onboardingCompleted: true })
      .onConflictDoUpdate({
        target: schema.userSettings.userId,
        set: { onboardingCompleted: true, updatedAt: new Date() },
      })
      .returning();
    return updated!;
  }),
});
