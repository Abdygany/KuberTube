import { eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { users } from "@kubertube/db";
import { protectedProcedure, router } from "../trpc";

export const userRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      name: ctx.user.name ?? null,
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
