import { schema } from '@learnspace/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { BalanceSchema, DurationSchema, FreshnessSchema, LevelSchema, ThemeSchema } from '../schemas';
import { protectedProcedure, publicProcedure, router } from '../trpc';

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name,
      image: ctx.user.image,
      emailVerified: ctx.user.emailVerified,
      createdAt: ctx.user.createdAt,
    };
  }),

  updateMe: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.users)
        .set({ name: input.name, updatedAt: new Date() })
        .where(eq(schema.users.id, ctx.user.id));
    }),

  settings: protectedProcedure.query(async ({ ctx }) => {
    const [settings] = await ctx.db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, ctx.user.id));

    if (!settings) {
      const [created] = await ctx.db
        .insert(schema.userSettings)
        .values({ userId: ctx.user.id })
        .returning();
      return created;
    }
    return settings;
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        defaultLevel: LevelSchema.optional(),
        defaultDuration: DurationSchema.optional(),
        defaultBalance: BalanceSchema.optional(),
        defaultFreshness: FreshnessSchema.optional(),
        uiTheme: ThemeSchema.optional(),
        uiLanguage: z.string().min(2).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(schema.userSettings)
        .values({ userId: ctx.user.id, ...input, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.userSettings.userId,
          set: { ...input, updatedAt: new Date() },
        });
    }),

  completeOnboarding: protectedProcedure
    .input(
      z.object({
        defaultLevel: LevelSchema,
        defaultDuration: DurationSchema,
        defaultBalance: BalanceSchema,
        defaultFreshness: FreshnessSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(schema.userSettings)
        .values({ userId: ctx.user.id, ...input, onboardingCompleted: true, updatedAt: new Date() })
        .onConflictDoUpdate({
          target: schema.userSettings.userId,
          set: { ...input, onboardingCompleted: true, updatedAt: new Date() },
        });
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db.delete(schema.users).where(eq(schema.users.id, ctx.user.id));
  }),

  health: publicProcedure.query(() => ({ ok: true, ts: new Date().toISOString() })),
});
