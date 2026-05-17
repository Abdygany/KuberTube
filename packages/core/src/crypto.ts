import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;

/** Version prefix on every packed ciphertext — lets us rotate algorithms later. */
export const CURRENT_KEY_VERSION = "v1";

export function parseMasterKey(input: string): Buffer {
  const trimmed = input.trim();
  const key = /^[0-9a-fA-F]{64}$/.test(trimmed)
    ? Buffer.from(trimmed, "hex")
    : Buffer.from(trimmed, "base64");
  if (key.length !== KEY_BYTES) {
    throw new Error(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes (got ${key.length})`,
    );
  }
  return key;
}

/**
 * Encrypts `plaintext` with AES-256-GCM and returns a packed string:
 *   `${version}.${iv_b64url}.${tag_b64url}.${ct_b64url}`
 *
 * `aad` is bound into the GCM auth tag, so a ciphertext from one row
 * cannot be transplanted into a different (userId, provider) row.
 */
export function encryptSecret(
  plaintext: string,
  masterKey: Buffer,
  aad: string,
): string {
  if (masterKey.length !== KEY_BYTES)
    throw new Error("master key must be 32 bytes");
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, masterKey, iv);
  cipher.setAAD(Buffer.from(aad, "utf8"));
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    CURRENT_KEY_VERSION,
    b64url(iv),
    b64url(tag),
    b64url(ciphertext),
  ].join(".");
}

export function decryptSecret(
  packed: string,
  masterKey: Buffer,
  aad: string,
): string {
  if (masterKey.length !== KEY_BYTES)
    throw new Error("master key must be 32 bytes");
  const parts = packed.split(".");
  if (parts.length !== 4) throw new Error("malformed ciphertext payload");
  const [version, ivB64, tagB64, ctB64] = parts as [
    string,
    string,
    string,
    string,
  ];
  if (version !== CURRENT_KEY_VERSION)
    throw new Error(`unsupported ciphertext version: ${version}`);
  const iv = b64urlDecode(ivB64);
  const tag = b64urlDecode(tagB64);
  const ciphertext = b64urlDecode(ctB64);
  if (iv.length !== IV_BYTES) throw new Error("invalid iv length");
  if (tag.length !== TAG_BYTES) throw new Error("invalid auth tag length");

  const decipher = createDecipheriv(ALGO, masterKey, iv);
  decipher.setAAD(Buffer.from(aad, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

/**
 * AAD format for stored API keys. Binding userId + provider into the
 * auth tag means a ciphertext stolen from one row cannot be replayed
 * into another user's or another provider's row.
 */
export function apiKeyAad(userId: string, provider: string): string {
  return `kubertube:${CURRENT_KEY_VERSION}:${userId}:${provider}`;
}

export function maskLast4(secret: string): string {
  if (secret.length <= 4) return "•".repeat(secret.length);
  return secret.slice(-4);
}

export function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

function b64url(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function b64urlDecode(input: string): Buffer {
  const pad = input.length % 4 === 0 ? "" : "=".repeat(4 - (input.length % 4));
  return Buffer.from(
    input.replace(/-/g, "+").replace(/_/g, "/") + pad,
    "base64",
  );
}
