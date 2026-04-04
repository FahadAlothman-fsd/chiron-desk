import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import desktopPackage from "../../../package.json";

const desktopPackageConfig = desktopPackage as typeof desktopPackage & {
  version?: string;
  dependencies?: Record<string, string | undefined>;
  scripts: typeof desktopPackage.scripts & {
    "package:linux"?: string;
  };
  devDependencies: typeof desktopPackage.devDependencies & {
    electron?: string;
    "electron-builder"?: string;
  };
};

describe("desktop package entrypoint contract", () => {
  it("points electron at the built desktop main entry", () => {
    expect(desktopPackageConfig.main).toBe("dist/desktop/main.js");
  });

  it("builds the preload artifact before launching the source main entry in dev", () => {
    expect(desktopPackageConfig.scripts.dev).toContain("bun run build");
    expect(desktopPackageConfig.scripts.dev).toContain("tsx");
    expect(desktopPackageConfig.scripts.dev).toContain("electron ./main.ts");
  });

  it("bundles the preload bridge as a CommonJS artifact Electron can execute", () => {
    expect(desktopPackageConfig.scripts.build).toContain("tsconfig.build.json");
    expect(desktopPackageConfig.scripts.build).toContain("bun build preload.ts");
    expect(desktopPackageConfig.scripts.build).toContain("--format=cjs");
    expect(desktopPackageConfig.scripts.build).toContain("preload.cjs");
  });

  it("exposes a local Linux packaging script", () => {
    expect(desktopPackageConfig.scripts["package:linux"]).toContain("electron-builder");
  });

  it("declares electron-builder for local packaging", () => {
    expect(desktopPackageConfig.devDependencies["electron-builder"]).toBeTruthy();
  });

  it("declares a package version for electron-builder", () => {
    expect(desktopPackageConfig.version).toBeTruthy();
  });

  it("keeps electron in devDependencies for packaging", () => {
    expect(desktopPackageConfig.devDependencies.electron).toBeTruthy();
    expect(desktopPackageConfig.dependencies?.electron).toBeUndefined();
  });

  it("uses .js-suffixed local esm imports for packaged desktop modules", () => {
    const desktopSources = ["main.ts", "src/runtime-bootstrap.ts", "src/runtime-env.ts"].map(
      (relativePath) =>
        readFileSync(join(import.meta.dirname, "..", "..", "..", relativePath), "utf8"),
    );

    expect(desktopSources[0]).toContain('from "./src/runtime-bootstrap.js"');
    expect(desktopSources[0]).toContain('from "./src/runtime-env.js"');
    expect(desktopSources[1]).toContain('from "./runtime-config.js"');
    expect(desktopSources[1]).toContain('from "./runtime-paths.js"');
    expect(desktopSources[1]).toContain('from "./runtime-secrets.js"');
    expect(desktopSources[2]).toContain('from "./runtime-config.js"');
    expect(desktopSources[2]).toContain('from "./runtime-secrets.js"');
  });
});
