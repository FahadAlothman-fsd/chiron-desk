import { describe, expect, it } from "vitest";
import { shouldInlineServerDependency } from "../../server/tsdown.config";

describe("server build config", () => {
  it("keeps database runtime external in the built server bundle", () => {
    expect(shouldInlineServerDependency("@chiron/api")).toBe(true);
    expect(shouldInlineServerDependency("@chiron/db")).toBe(false);
  });
});
