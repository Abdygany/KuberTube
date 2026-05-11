import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * Шифрование пользовательских API-ключей AES-256-GCM.
 * Инвариант (CLAUDE.md §3): plaintext-ключ никогда не уходит в JSON-ответ
 * и не пишется в логи. Хранятся только encryptedKey + iv + authTag.
 *
 * Формат хранения: всё в hex для удобства SQL/JSON.
 * IV: 96 бит (12 байт) — рекомендация NIST для GCM.
 * AuthTag: 128 бит (16 байт), отдельная колонка чтобы при апгрейде формата
 * не разбирать конкатенацию.
 */

const IV_BYTES = 12;
const KEY_BYTES = 32;
const ALGORITHM = 'aes-256-gcm';

export type EncryptedKey = {
  encryptedKey: string;
  keyIv: string;
  keyAuthTag: string;
};

/**
 * Превращает ENCRYPTION_KEY из env в стабильный 256-битный ключ через scrypt.
 * Соль фиксирована — мастер-ключ не ротируется per-user, ротация делается
 * полным re-encrypt при смене ENCRYPTION_KEY (отдельный воркфлоу).
 */
export function deriveMasterKey(secret: string): Buffer {
  if (secret.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters');
  }
  return scryptSync(secret, 'learnspace.master-key.v1', KEY_BYTES);
}

export function encryptApiKey(plaintext: string, masterKey: Buffer): EncryptedKey {
  if (masterKey.length !== KEY_BYTES) {
    throw new Error(`masterKey must be ${KEY_BYTES} bytes`);
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, masterKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    encryptedKey: ciphertext.toString('hex'),
    keyIv: iv.toString('hex'),
    keyAuthTag: authTag.toString('hex'),
  };
}

export function decryptApiKey(payload: EncryptedKey, masterKey: Buffer): string {
  if (masterKey.length !== KEY_BYTES) {
    throw new Error(`masterKey must be ${KEY_BYTES} bytes`);
  }
  const iv = Buffer.from(payload.keyIv, 'hex');
  const authTag = Buffer.from(payload.keyAuthTag, 'hex');
  const ciphertext = Buffer.from(payload.encryptedKey, 'hex');

  const decipher = createDecipheriv(ALGORITHM, masterKey, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
