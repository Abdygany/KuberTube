import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

import { crypto as cryptoCore, providers as providersCore } from '@learnspace/core';
import { schema } from '@learnspace/db';

import { TRPCError } from '@trpc/server';

import { protectedProcedure, router } from '../trpc.js';

const providerEnum = z.enum(['anthropic', 'youtube', 'brave']);

/**
 * Никогда не возвращает plaintext-ключ. Только метаданные.
 * Plaintext живёт ровно одну итерацию в памяти при save/validate.
 */
function asPublicKey(row: typeof schema.userApiKeys.$inferSelect) {
  return {
    id: row.id,
    provider: row.provider,
    isValid: row.isValid,
    lastUsedAt: row.lastUsedAt,
    lastValidatedAt: row.lastValidatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function getMasterKey(env: { ENCRYPTION_KEY: string }) {
  return cryptoCore.deriveMasterKey(env.ENCRYPTION_KEY);
}

export const apiKeysRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select()
      .from(schema.userApiKeys)
      .where(eq(schema.userApiKeys.userId, ctx.user.id));
    return rows.map(asPublicKey);
  }),

  save: protectedProcedure
    .input(z.object({ provider: providerEnum, key: z.string().min(8).max(512) }))
    .mutation(async ({ ctx, input }) => {
      const masterKey = getMasterKey(ctx.env);
      const encrypted = cryptoCore.encryptApiKey(input.key, masterKey);
      const now = new Date();

      const [row] = await ctx.db
        .insert(schema.userApiKeys)
        .values({
          userId: ctx.user.id,
          provider: input.provider,
          encryptedKey: encrypted.encryptedKey,
          keyIv: encrypted.keyIv,
          keyAuthTag: encrypted.keyAuthTag,
          isValid: false,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [schema.userApiKeys.userId, schema.userApiKeys.provider],
          set: {
            encryptedKey: encrypted.encryptedKey,
            keyIv: encrypted.keyIv,
            keyAuthTag: encrypted.keyAuthTag,
            isValid: false,
            lastValidatedAt: null,
            updatedAt: now,
          },
        })
        .returning();
      return asPublicKey(row!);
    }),

  delete: protectedProcedure
    .input(z.object({ provider: providerEnum }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.userApiKeys)
        .where(
          and(
            eq(schema.userApiKeys.userId, ctx.user.id),
            eq(schema.userApiKeys.provider, input.provider),
          ),
        );
      return { ok: true };
    }),

  validate: protectedProcedure
    .input(z.object({ provider: providerEnum }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.userApiKeys)
        .where(
          and(
            eq(schema.userApiKeys.userId, ctx.user.id),
            eq(schema.userApiKeys.provider, input.provider),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Ключ не сохранён' });
      }

      const masterKey = getMasterKey(ctx.env);
      let plaintext: string;
      try {
        plaintext = cryptoCore.decryptApiKey(
          {
            encryptedKey: row.encryptedKey,
            keyIv: row.keyIv,
            keyAuthTag: row.keyAuthTag,
          },
          masterKey,
        );
      } catch {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Не удалось расшифровать ключ. Возможно, изменился ENCRYPTION_KEY.',
        });
      }

      const result = await providersCore.validateProviderKey(input.provider, plaintext);
      const now = new Date();

      await ctx.db
        .update(schema.userApiKeys)
        .set({
          isValid: result.valid,
          lastValidatedAt: now,
          updatedAt: now,
        })
        .where(eq(schema.userApiKeys.id, row.id));

      return result;
    }),
});
