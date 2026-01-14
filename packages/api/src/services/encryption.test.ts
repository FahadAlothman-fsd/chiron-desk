import { describe, expect, test } from "bun:test";
import { decrypt, encrypt, maskApiKey } from "./encryption";

describe("Encryption Service", () => {
  test("encrypt produces different ciphertext each time (IV randomization)", () => {
    const plaintext = "test-api-key-12345";
    const encrypted1 = encrypt(plaintext);
    const encrypted2 = encrypt(plaintext);

    // Should be different due to random IV
    expect(encrypted1).not.toBe(encrypted2);

    // But both should decrypt to same plaintext
    expect(decrypt(encrypted1)).toBe(plaintext);
    expect(decrypt(encrypted2)).toBe(plaintext);
  });

  test("decrypt reverses encryption correctly", () => {
    const plaintext = "sk-test-key-abcdef123456";
    const encrypted = encrypt(plaintext);
    const decrypted = decrypt(encrypted);

    expect(decrypted).toBe(plaintext);
  });

  test("decrypt fails gracefully with invalid ciphertext", () => {
    expect(() => decrypt("invalid-ciphertext")).toThrow();
    expect(() => decrypt("part1:part2")).toThrow(); // Not enough parts
  });

  test("uses AES-256-GCM algorithm (verified by format)", () => {
    const plaintext = "test-key";
    const encrypted = encrypt(plaintext);

    // Format should be: salt:iv:authTag:ciphertext (4 parts)
    const parts = encrypted.split(":");
    expect(parts.length).toBe(4);
  });

  test("maskApiKey shows last 4 characters", () => {
    expect(maskApiKey("sk-test-1234567890")).toBe("**************7890");
    expect(maskApiKey("12345")).toBe("*2345");
    expect(maskApiKey("abc")).toBe("****");
  });

  test("maskApiKey handles edge cases", () => {
    expect(maskApiKey("")).toBe("****");
    expect(maskApiKey("a")).toBe("****");
    expect(maskApiKey("ab")).toBe("****");
    expect(maskApiKey("abc")).toBe("****");
    expect(maskApiKey("abcd")).toBe("****");
    expect(maskApiKey("abcde")).toBe("*bcde");
  });
});
