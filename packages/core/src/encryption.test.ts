import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './encryption';

const masterKey = () => randomBytes(32).toString('hex');

describe('encryption', () => {
  it('round-trips an ASCII plaintext', () => {
    const key = masterKey();
    const payload = encrypt('AIzaSyExampleApiKey', key);
    expect(decrypt(payload, key)).toBe('AIzaSyExampleApiKey');
  });

  it('round-trips multibyte unicode', () => {
    const key = masterKey();
    const text = 'привет мир — 🔐 ключ';
    expect(decrypt(encrypt(text, key), key)).toBe(text);
  });

  it('produces a fresh IV per call (non-deterministic)', () => {
    const key = masterKey();
    const a = encrypt('same plaintext', key);
    const b = encrypt('same plaintext', key);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('rejects a wrong master key', () => {
    const payload = encrypt('secret', masterKey());
    expect(() => decrypt(payload, masterKey())).toThrow();
  });

  it('rejects a tampered authTag', () => {
    const key = masterKey();
    const payload = encrypt('secret', key);
    const tampered = { ...payload, authTag: Buffer.alloc(16, 0).toString('base64') };
    expect(() => decrypt(tampered, key)).toThrow();
  });

  it('rejects a tampered ciphertext', () => {
    const key = masterKey();
    const payload = encrypt('secret', key);
    const flipped = Buffer.from(payload.ciphertext, 'base64');
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;
    expect(() => decrypt({ ...payload, ciphertext: flipped.toString('base64') }, key)).toThrow();
  });

  it('rejects malformed master keys', () => {
    expect(() => encrypt('x', 'too-short')).toThrow(/64 hex/);
    expect(() => encrypt('x', 'z'.repeat(64))).toThrow(/64 hex/);
  });
});
