import { eq } from "drizzle-orm";
import { z } from "zod";
import { userSettings } from "@kubertube/db";
import { userDefaultsSchema } from "@kubertube/core";
import type { Database } from "@kubertube/db";
import { protectedProcedure, router } from "../trpc";

const themeSchema = z.enum(["light", "dark", "system"]);
const languageSchema = z.string().min(2).max(8);

type SettingsPatch = Partial<typeof userSettings.$inferInsert>;

async function upsertUserSettings(db: Database, userId: string, patch: SettingsPatch) {
  await db
    .insert(userSettings)
    .values({ userId, ...patch })
    .onConflictDoUpdate({
      target: userSettings.userId,
      set: { ...patch, updatedAt: new Date() },
    });
}

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const existing = await ctx.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);
    if (existing[0]) return existing[0];

    const [created] = await ctx.db
      .insert(userSettings)
      .values({ userId: ctx.user.id })
      .onConflictDoNothing({ target: userSettings.userId })
      .returning();
    if (created) return created;

    const [row] = await ctx.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);
    return row!;
  }),

  updateDefaults: protectedProcedure
    .input(userDefaultsSchema)
    .mutation(async ({ ctx, input }) => {
      await upsertUserSettings(ctx.db, ctx.user.id, input);
      return { ok: true as const };
    }),

  updateTheme: protectedProcedure
    .input(z.object({ uiTheme: themeSchema }))
    .mutation(async ({ ctx, input }) => {
      await upsertUserSettings(ctx.db, ctx.user.id, { uiTheme: input.uiTheme });
      return { ok: true as const };
    }),

  updateLanguage: protectedProcedure
    .input(z.object({ uiLanguage: languageSchema }))
    .mutation(async ({ ctx, input }) => {
      await upsertUserSettings(ctx.db, ctx.user.id, { uiLanguage: input.uiLanguage });
      return { ok: true as const };
    }),

  completeOnboarding: protectedProcedure
    .input(userDefaultsSchema.extend({ uiLanguage: languageSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const { uiLanguage, ...defaults } = input;
      await upsertUserSettings(ctx.db, ctx.user.id, {
        ...defaults,
        ...(uiLanguage ? { uiLanguage } : {}),
        onboardingCompleted: true,
      });
      return { ok: true as const };
    }),
});
