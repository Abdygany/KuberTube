import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { userApiKeys } from "@kubertube/db";
import {
  apiKeyAad,
  CURRENT_KEY_VERSION,
  encryptSecret,
  maskLast4,
  providerSchema,
  validateKey,
} from "@kubertube/core";
import { protectedProcedure, router } from "../trpc";
import { decryptUserKey } from "../keys-helper";

export const keysRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
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
      const now = new Date();
      const values = {
        userId: ctx.user.id,
        provider: input.provider,
        encryptedKey: encryptSecret(
          input.key,
          ctx.masterKey,
          apiKeyAad(ctx.user.id, input.provider),
        ),
        keyLast4: maskLast4(input.key),
        keyVersion: CURRENT_KEY_VERSION,
        isValid: true,
        lastValidatedAt: now,
      };
      await ctx.db
        .insert(userApiKeys)
        .values(values)
        .onConflictDoUpdate({
          target: [userApiKeys.userId, userApiKeys.provider],
          set: {
            encryptedKey: values.encryptedKey,
            keyLast4: values.keyLast4,
            keyVersion: values.keyVersion,
            isValid: values.isValid,
            lastValidatedAt: values.lastValidatedAt,
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
          and(
            eq(userApiKeys.userId, ctx.user.id),
            eq(userApiKeys.provider, input.provider),
          ),
        );
      return { ok: true as const };
    }),

  revalidate: protectedProcedure
    .input(z.object({ provider: providerSchema }))
    .mutation(async ({ ctx, input }) => {
      const plain = await decryptUserKey(
        ctx.db,
        ctx.user.id,
        input.provider,
        ctx.masterKey,
      );
      const validation = await validateKey(input.provider, plain);
      await ctx.db
        .update(userApiKeys)
        .set({ isValid: validation.valid, lastValidatedAt: new Date() })
        .where(
          and(
            eq(userApiKeys.userId, ctx.user.id),
            eq(userApiKeys.provider, input.provider),
          ),
        );
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.reason ?? "Key is no longer valid",
        });
      }
      return { ok: true as const };
    }),
});
