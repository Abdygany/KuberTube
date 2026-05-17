import { describe, expect, it } from "vitest";
import {
  apiKeyAad,
  CURRENT_KEY_VERSION,
  decryptSecret,
  encryptSecret,
  maskLast4,
  parseMasterKey,
} from "./crypto";

const HEX_KEY = "a".repeat(64);
const BASE64_KEY = Buffer.alloc(32, 7).toString("base64");

function freshKey(): Buffer {
  return parseMasterKey(HEX_KEY);
}

describe("parseMasterKey", () => {
  it("accepts 64-char hex", () => {
    expect(parseMasterKey(HEX_KEY)).toHaveLength(32);
  });

  it("accepts 44-char base64", () => {
    expect(parseMasterKey(BASE64_KEY)).toHaveLength(32);
  });

  it("rejects short input", () => {
    expect(() => parseMasterKey("deadbeef")).toThrow(/32 bytes/);
  });

  it("rejects long input", () => {
    expect(() => parseMasterKey("a".repeat(130))).toThrow(/32 bytes/);
  });

  it("trims surrounding whitespace before parsing", () => {
    expect(parseMasterKey(`  ${HEX_KEY}  `)).toHaveLength(32);
  });
});

describe("encryptSecret / decryptSecret roundtrip", () => {
  it("decrypts back to the original plaintext", () => {
    const key = freshKey();
    const aad = apiKeyAad("user-1", "youtube");
    const packed = encryptSecret("AIzaSyExample-Plain-Key-Value", key, aad);
    expect(decryptSecret(packed, key, aad)).toBe(
      "AIzaSyExample-Plain-Key-Value",
    );
  });

  it("uses a different ciphertext for the same plaintext (random IV)", () => {
    const key = freshKey();
    const aad = apiKeyAad("user-1", "brave");
    const a = encryptSecret("same-input", key, aad);
    const b = encryptSecret("same-input", key, aad);
    expect(a).not.toBe(b);
  });

  it("includes the version prefix", () => {
    const key = freshKey();
    const packed = encryptSecret("x", key, apiKeyAad("u", "youtube"));
    expect(packed.startsWith(`${CURRENT_KEY_VERSION}.`)).toBe(true);
  });

  it("rejects a ciphertext whose auth tag has been tampered with", () => {
    const key = freshKey();
    const aad = apiKeyAad("user-1", "youtube");
    const packed = encryptSecret("payload", key, aad);
    const parts = packed.split(".");
    // flip a bit in the tag
    const tag = Buffer.from(
      parts[2]!.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    );
    tag[0] = tag[0]! ^ 0xff;
    parts[2] = tag
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/g, "");
    expect(() => decryptSecret(parts.join("."), key, aad)).toThrow();
  });

  it("rejects decryption with a different AAD (cross-row transplant)", () => {
    const key = freshKey();
    const packed = encryptSecret("p", key, apiKeyAad("user-A", "youtube"));
    expect(() =>
      decryptSecret(packed, key, apiKeyAad("user-B", "youtube")),
    ).toThrow();
  });

  it("rejects decryption with a different provider in AAD", () => {
    const key = freshKey();
    const packed = encryptSecret("p", key, apiKeyAad("user-A", "youtube"));
    expect(() =>
      decryptSecret(packed, key, apiKeyAad("user-A", "brave")),
    ).toThrow();
  });

  it("rejects unknown version prefix", () => {
    const key = freshKey();
    const packed = encryptSecret("p", key, apiKeyAad("u", "youtube"));
    const swapped = packed.replace(/^v1/, "v99");
    expect(() =>
      decryptSecret(swapped, key, apiKeyAad("u", "youtube")),
    ).toThrow(/unsupported ciphertext version/);
  });

  it("rejects malformed payload (wrong segment count)", () => {
    const key = freshKey();
    expect(() => decryptSecret("v1.only-three", key, "aad")).toThrow(
      /malformed ciphertext/,
    );
  });
});

describe("maskLast4", () => {
  it("returns last 4 chars for normal keys", () => {
    expect(maskLast4("AIzaSyAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA1234")).toBe("1234");
  });

  it("falls back to bullets for short inputs", () => {
    expect(maskLast4("abc")).toBe("•••");
    expect(maskLast4("")).toBe("");
  });
});
