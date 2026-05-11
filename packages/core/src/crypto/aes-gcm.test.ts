import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import { decryptApiKey, deriveMasterKey, encryptApiKey } from './aes-gcm.js';

const SECRET = 'test-master-secret-must-be-at-least-32-chars';

test('encrypt → decrypt round-trip восстанавливает plaintext', () => {
  const key = deriveMasterKey(SECRET);
  const original = 'AIzaSyA-fake-youtube-key-1234567890';
  const enc = encryptApiKey(original, key);
  const dec = decryptApiKey(enc, key);
  assert.equal(dec, original);
});

test('каждый encrypt даёт уникальный IV (rng работает)', () => {
  const key = deriveMasterKey(SECRET);
  const a = encryptApiKey('same-plaintext', key);
  const b = encryptApiKey('same-plaintext', key);
  assert.notEqual(a.keyIv, b.keyIv);
  assert.notEqual(a.encryptedKey, b.encryptedKey);
});

test('decrypt падает при подменённом authTag (tamper detection)', () => {
  const key = deriveMasterKey(SECRET);
  const enc = encryptApiKey('payload', key);
  const tampered = { ...enc, keyAuthTag: '0'.repeat(enc.keyAuthTag.length) };
  assert.throws(() => decryptApiKey(tampered, key));
});

test('decrypt падает при неверном мастер-ключе', () => {
  const enc = encryptApiKey('payload', deriveMasterKey(SECRET));
  const wrong = deriveMasterKey('another-master-secret-must-be-at-least-32');
  assert.throws(() => decryptApiKey(enc, wrong));
});

test('deriveMasterKey требует ≥32 символа', () => {
  assert.throws(() => deriveMasterKey('too-short'));
});
