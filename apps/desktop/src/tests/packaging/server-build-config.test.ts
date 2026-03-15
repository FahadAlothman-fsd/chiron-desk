import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import serverPackage from "../../../../server/package.json";
import { shouldInlineServerDependency } from "../../../../server/tsdown.config";

describe("server build config", () => {
  it("keeps database runtime external in the built server bundle", () => {
    expect(shouldInlineServerDependency("@chiron/api")).toBe(true);
    expect(shouldInlineServerDependency("@chiron/db")).toBe(false);
  });

  it("defines a dedicated desktop bundle script", () => {
    expect(serverPackage.scripts["bundle:desktop"]).toBe(
      "bun ./scripts/bundle-desktop-runtime.mjs",
    );
    expect(serverPackage.scripts.compile).toContain("--outfile server");
  });

  it("ships the desktop db package tree alongside the bundle", () => {
    const bundledServer = readFileSync(join(process.cwd(), "../server/dist/server.mjs"), "utf8");
    const bundledDbPackage = readFileSync(
      join(process.cwd(), "../server/dist/node_modules/@chiron/db/package.json"),
      "utf8",
    );
    const bundledBetterAuthPackage = readFileSync(
      join(process.cwd(), "../server/dist/node_modules/better-auth/package.json"),
      "utf8",
    );
    const bundledBetterAuthCorePackage = readFileSync(
      join(process.cwd(), "../server/dist/node_modules/@better-auth/core/package.json"),
      "utf8",
    );

    expect(bundledServer).toContain('from "@chiron/db"');
    expect(bundledServer).toContain('from "better-auth"');
    expect(bundledDbPackage).toContain('"name": "@chiron/db"');
    expect(bundledBetterAuthPackage).toContain('"name": "better-auth"');
    expect(bundledBetterAuthCorePackage).toContain('"name": "@better-auth/core"');
  });
});
