import { eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { userSettings, users } from "@kubertube/db";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name ?? null,
    };
  }),

  /**
   * Single-roundtrip fetch for the authenticated app shell:
   * profile identity + the settings row (auto-created if missing).
   * Callers should prefer this over separate user.me + settings.get
   * to avoid two sequential DB hits per page render.
   */
  bootstrap: protectedProcedure.query(async ({ ctx }) => {
    const existing = await ctx.db
      .select()
      .from(userSettings)
      .where(eq(userSettings.userId, ctx.user.id))
      .limit(1);
    let settings = existing[0];
    if (!settings) {
      const [created] = await ctx.db
        .insert(userSettings)
        .values({ userId: ctx.user.id })
        .onConflictDoNothing({ target: userSettings.userId })
        .returning();
      if (created) {
        settings = created;
      } else {
        const [row] = await ctx.db
          .select()
          .from(userSettings)
          .where(eq(userSettings.userId, ctx.user.id))
          .limit(1);
        settings = row!;
      }
    }
    return {
      me: {
        id: ctx.user.id,
        email: ctx.user.email,
        name: ctx.user.name ?? null,
      },
      settings,
    };
  }),

  updateProfile: protectedProcedure
    .input(z.object({ displayName: z.string().min(1).max(120) }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({ displayName: input.displayName, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id))
        .returning();
      if (!updated) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "user not found" });
      }
      return { ok: true as const };
    }),
});
