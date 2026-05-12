import { eq } from "drizzle-orm";
import { z } from "zod";
import { userSettings } from "@kubertube/db";
import { userDefaultsSchema } from "@kubertube/core";
import { protectedProcedure, router } from "../trpc";

const themeSchema = z.enum(["light", "dark", "system"]);
const languageSchema = z.string().min(2).max(8);

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);
    if (rows.length === 0) {
      await ctx.db
        .insert(userSettings)
        .values({ userId: ctx.user.id })
        .onConflictDoNothing({ target: userSettings.userId });
      const fresh = await ctx.db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, ctx.user.id))
        .limit(1);
      return fresh[0]!;
    }
    return rows[0]!;
  }),

  updateDefaults: protectedProcedure
    .input(userDefaultsSchema)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userSettings)
        .values({ userId: ctx.user.id, ...input })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { ...input, updatedAt: new Date() },
        });
      return { ok: true as const };
    }),

  updateTheme: protectedProcedure
    .input(z.object({ uiTheme: themeSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userSettings)
        .values({ userId: ctx.user.id, uiTheme: input.uiTheme })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { uiTheme: input.uiTheme, updatedAt: new Date() },
        });
      return { ok: true as const };
    }),

  updateLanguage: protectedProcedure
    .input(z.object({ uiLanguage: languageSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(userSettings)
        .values({ userId: ctx.user.id, uiLanguage: input.uiLanguage })
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { uiLanguage: input.uiLanguage, updatedAt: new Date() },
        });
      return { ok: true as const };
    }),

  completeOnboarding: protectedProcedure
    .input(userDefaultsSchema.extend({ uiLanguage: languageSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const values = {
        userId: ctx.user.id,
        defaultLevel: input.defaultLevel,
        defaultDuration: input.defaultDuration,
        defaultBalance: input.defaultBalance,
        defaultFreshness: input.defaultFreshness,
        ...(input.uiLanguage ? { uiLanguage: input.uiLanguage } : {}),
        onboardingCompleted: true,
      };
      await ctx.db
        .insert(userSettings)
        .values(values)
        .onConflictDoUpdate({
          target: userSettings.userId,
          set: { ...values, updatedAt: new Date() },
        });
      return { ok: true as const };
    }),
});
