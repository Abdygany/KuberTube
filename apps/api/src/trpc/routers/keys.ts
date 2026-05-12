import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { userApiKeys } from "@kubertube/db";
import {
  decryptSecret,
  encryptSecret,
  maskLast4,
  validateKey,
  type Provider,
} from "@kubertube/core";
import { protectedProcedure, router } from "../trpc";

const providerSchema = z.enum(["youtube", "brave", "anthropic"]);

function aad(userId: string, provider: Provider): string {
  return `kubertube:v1:${userId}:${provider}`;
}

export const keysRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: userApiKeys.id,
        provider: userApiKeys.provider,
        keyLast4: userApiKeys.keyLast4,
        isValid: userApiKeys.isValid,
        lastUsedAt: userApiKeys.lastUsedAt,
        lastValidatedAt: userApiKeys.lastValidatedAt,
        createdAt: userApiKeys.createdAt,
      })
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, ctx.user.id));
    return rows;
  }),

  set: protectedProcedure
    .input(
      z.object({
        provider: providerSchema,
        key: z.string().min(10).max(512),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const validation = await validateKey(input.provider, input.key);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason ?? "Key validation failed",
        });
      }
      const encrypted = encryptSecret(input.key, ctx.masterKey, aad(ctx.user.id, input.provider));
      const now = new Date();
      await ctx.db
        .insert(userApiKeys)
        .values({
          userId: ctx.user.id,
          provider: input.provider,
          encryptedKey: encrypted,
          keyLast4: maskLast4(input.key),
          keyVersion: "v1",
          isValid: true,
          lastValidatedAt: now,
        })
        .onConflictDoUpdate({
          target: [userApiKeys.userId, userApiKeys.provider],
          set: {
            encryptedKey: encrypted,
            keyLast4: maskLast4(input.key),
            keyVersion: "v1",
            isValid: true,
            lastValidatedAt: now,
          },
        });
      return { ok: true as const };
    }),

  delete: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(userApiKeys)
        .where(
          and(eq(userApiKeys.userId, ctx.user.id), eq(userApiKeys.provider, input.provider)),
        );
      return { ok: true as const };
    }),

  revalidate: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(userApiKeys)
        .where(
          and(eq(userApiKeys.userId, ctx.user.id), eq(userApiKeys.provider, input.provider)),
        )
        .limit(1);
      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Key not configured" });
      }
      let plain: string;
      try {
        plain = decryptSecret(
          row.encryptedKey,
          ctx.masterKey,
          aad(ctx.user.id, input.provider),
        );
      } catch {
        await ctx.db
          .update(userApiKeys)
          .set({ isValid: false, lastValidatedAt: new Date() })
          .where(eq(userApiKeys.id, row.id));
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Stored key is unreadable; please re-enter it",
        });
      }
      const validation = await validateKey(input.provider, plain);
      await ctx.db
        .update(userApiKeys)
        .set({ isValid: validation.valid, lastValidatedAt: new Date() })
        .where(eq(userApiKeys.id, row.id));
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason ?? "Key is no longer valid",
        });
      }
      return { ok: true as const };
    }),
});
