import { decrypt, encrypt } from '@learnspace/core';
import { schema } from '@learnspace/db';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { ProviderSchema } from '../schemas';
import { protectedProcedure, router } from '../trpc';
import { env } from '../env';

async function validateProviderKey(provider: string, key: string): Promise<boolean> {
  try {
    if (provider === 'youtube') {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?part=snippet&q=test&maxResults=1&key=${key}`,
        { signal: AbortSignal.timeout(5000) },
      );
      return res.status !== 400 && res.status !== 403;
    }
    if (provider === 'brave') {
      const res = await fetch('https://api.search.brave.com/res/v1/web/search?q=test&count=1', {
        headers: { 'X-Subscription-Token': key },
        signal: AbortSignal.timeout(5000),
      });
      return res.status !== 401 && res.status !== 403;
    }
    if (provider === 'anthropic') {
      const res = await fetch('https://api.anthropic.com/v1/models', {
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01' },
        signal: AbortSignal.timeout(5000),
      });
      return res.status !== 401 && res.status !== 403;
    }
    return false;
  } catch {
    return false;
  }
}

export const keysRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({
        id: schema.userApiKeys.id,
        provider: schema.userApiKeys.provider,
        isValid: schema.userApiKeys.isValid,
        lastUsedAt: schema.userApiKeys.lastUsedAt,
        lastValidatedAt: schema.userApiKeys.lastValidatedAt,
        createdAt: schema.userApiKeys.createdAt,
      })
      .from(schema.userApiKeys)
      .where(eq(schema.userApiKeys.userId, ctx.user.id));
    return rows;
  }),

  upsert: protectedProcedure
    .input(z.object({ provider: ProviderSchema, key: z.string().min(10) }))
    .mutation(async ({ ctx, input }) => {
      const { ciphertext, iv, authTag } = encrypt(input.key, env.ENCRYPTION_KEY);
      await ctx.db
        .insert(schema.userApiKeys)
        .values({
          userId: ctx.user.id,
          provider: input.provider,
          encryptedKey: ciphertext,
          keyIv: iv,
          keyAuthTag: authTag,
          isValid: false,
        })
        .onConflictDoUpdate({
          target: [schema.userApiKeys.userId, schema.userApiKeys.provider],
          set: {
            encryptedKey: ciphertext,
            keyIv: iv,
            keyAuthTag: authTag,
            isValid: false,
            lastValidatedAt: null,
          },
        });
    }),

  delete: protectedProcedure
    .input(z.object({ provider: ProviderSchema }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(schema.userApiKeys)
        .where(
          and(
            eq(schema.userApiKeys.userId, ctx.user.id),
            eq(schema.userApiKeys.provider, input.provider),
          ),
        );
    }),

  validate: protectedProcedure
    .input(z.object({ provider: ProviderSchema }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.userApiKeys)
        .where(
          and(
            eq(schema.userApiKeys.userId, ctx.user.id),
            eq(schema.userApiKeys.provider, input.provider),
          ),
        );
      if (!row) throw new Error('Key not found');

      const plainKey = decrypt(
        { ciphertext: row.encryptedKey, iv: row.keyIv, authTag: row.keyAuthTag },
        env.ENCRYPTION_KEY,
      );
      const isValid = await validateProviderKey(input.provider, plainKey);

      await ctx.db
        .update(schema.userApiKeys)
        .set({ isValid, lastValidatedAt: new Date() })
        .where(eq(schema.userApiKeys.id, row.id));

      return { isValid };
    }),

  getDecrypted: protectedProcedure
    .input(z.object({ provider: ProviderSchema }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.userApiKeys)
        .where(
          and(
            eq(schema.userApiKeys.userId, ctx.user.id),
            eq(schema.userApiKeys.provider, input.provider),
          ),
        );
      if (!row) return null;
      await ctx.db
        .update(schema.userApiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.userApiKeys.id, row.id));
      return decrypt(
        { ciphertext: row.encryptedKey, iv: row.keyIv, authTag: row.keyAuthTag },
        env.ENCRYPTION_KEY,
      );
    }),
});
