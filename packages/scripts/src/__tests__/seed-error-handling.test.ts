import { describe, expect, it } from "vitest";

import { classifySeedError, shouldSkipSeedError } from "../seed-error-handling";

describe("seed error handling", () => {
  it("classifies missing table errors", () => {
    const error = new Error("SQLITE_ERROR: no such table: verification");

    expect(classifySeedError(error)).toBe("missing_tables");
  });

  it("classifies sqlite constraint errors as already seeded", () => {
    const error = new Error("SQLITE_CONSTRAINT_PRIMARYKEY: UNIQUE constraint failed");

    expect(classifySeedError(error)).toBe("already_seeded");
  });

  it("does not skip when reset mode is enabled", () => {
    const error = new Error("SQLITE_CONSTRAINT_PRIMARYKEY");

    expect(shouldSkipSeedError(error, true)).toBe(false);
  });

  it("skips only non-reset already seeded errors", () => {
    const error = new Error("SQLITE_CONSTRAINT_UNIQUE");

    expect(shouldSkipSeedError(error, false)).toBe(true);
  });

  it("classifies nested sqlite constraint codes from wrapped errors", () => {
    const error = new Error("Failed query", {
      cause: { code: "SQLITE_CONSTRAINT_PRIMARYKEY" },
    });

    expect(classifySeedError(error)).toBe("already_seeded");
    expect(shouldSkipSeedError(error, false)).toBe(true);
  });
});
