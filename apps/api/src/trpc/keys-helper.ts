import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { userApiKeys, type Database } from "@kubertube/db";
import { apiKeyAad, decryptSecret, type Provider } from "@kubertube/core";

/**
 * Loads, decrypts, and returns the plaintext API key for the given
 * `(user, provider)` pair. Updates `last_used_at` on success.
 *
 * Throws `PRECONDITION_FAILED` if no key is configured or the stored
 * ciphertext is unreadable (e.g., master key was rotated). The UI is
 * expected to point users at Settings → API keys in that case.
 */
export async function decryptUserKey(
  db: Database,
  userId: string,
  provider: Provider,
  masterKey: Buffer,
): Promise<string> {
  const [row] = await db
    .select()
    .from(userApiKeys)
    .where(
      and(eq(userApiKeys.userId, userId), eq(userApiKeys.provider, provider)),
    )
    .limit(1);
  if (!row) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `No ${provider} API key configured. Add one in Settings → API keys.`,
    });
  }
  let plain: string;
  try {
    plain = decryptSecret(
      row.encryptedKey,
      masterKey,
      apiKeyAad(userId, provider),
    );
  } catch {
    await db
      .update(userApiKeys)
      .set({ isValid: false, lastValidatedAt: new Date() })
      .where(eq(userApiKeys.id, row.id));
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: `${provider} key is unreadable. Re-enter it in Settings → API keys.`,
    });
  }
  await db
    .update(userApiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(userApiKeys.id, row.id));
  return plain;
}
