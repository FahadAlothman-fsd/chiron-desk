import { describe, expect, it } from "vitest";

import { createSecrets, readSecrets } from "./runtime-secrets";

describe("runtime secrets", () => {
  it("creates a better auth secret once", () => {
    const secrets = createSecrets();

    expect(secrets.betterAuthSecret).toMatch(/^[0-9a-f]{64}$/);
  });

  it("accepts an existing persisted secret", () => {
    expect(readSecrets({ betterAuthSecret: "fixed" })).toEqual({
      betterAuthSecret: "fixed",
    });
  });

  it("normalizes persisted secrets into a fresh object", () => {
    const persisted = { betterAuthSecret: "fixed" };

    expect(readSecrets(persisted)).toEqual({ betterAuthSecret: "fixed" });
    expect(readSecrets(persisted)).not.toBe(persisted);
  });

  it("rejects malformed persisted secrets", () => {
    expect(() => readSecrets({})).toThrow("Invalid runtime secrets payload");
    expect(() => readSecrets({ betterAuthSecret: "" })).toThrow("Invalid runtime secrets payload");
    expect(() => readSecrets({ betterAuthSecret: 123 })).toThrow("Invalid runtime secrets payload");
    expect(() => readSecrets("fixed")).toThrow("Invalid runtime secrets payload");
  });
});
