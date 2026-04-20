import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import serverPackage from "../../../../server/package.json";

describe("server build config", () => {
  it("keeps database runtime external in the built server bundle", () => {
    const tsdownConfig = readFileSync(join(process.cwd(), "../server/tsdown.config.ts"), "utf8");

    expect(tsdownConfig).toContain('id.startsWith("@chiron/") && id !== "@chiron/db"');
    expect(tsdownConfig).toContain("noExternal: shouldInlineServerDependency");
  });

  it("defines a dedicated desktop bundle script", () => {
    expect(serverPackage.scripts["bundle:desktop"]).toBe(
      "bun ./scripts/bundle-desktop-runtime.mjs",
    );
    expect(serverPackage.scripts.compile).toContain("--outfile server");
  });

  it("ships the desktop db package tree alongside the bundle", () => {
    const bundleScript = readFileSync(
      join(process.cwd(), "../server/scripts/bundle-desktop-runtime.mjs"),
      "utf8",
    );

    expect(bundleScript).toContain(
      'copyFile(join(distDir, "index.mjs"), join(distDir, "server.mjs"))',
    );
    expect(bundleScript).toContain(
      'const desktopDbPackageDir = join(distDir, "node_modules", "@chiron", "db")',
    );
    expect(bundleScript).toContain(
      'await cp(join(workspaceRoot, "packages", "db"), desktopDbPackageDir',
    );
    expect(bundleScript).toContain(
      "for (const dependencyName of Object.keys(serverPackage.dependencies ?? {}))",
    );
    expect(bundleScript).toContain("await copyPackageDependencies(desktopDbPackageDir)");
  });
});
