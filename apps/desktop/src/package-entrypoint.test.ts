import { describe, expect, it } from "vitest";
import desktopPackage from "../package.json";

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

  it("uses a source entry for dev instead of building first", () => {
    expect(desktopPackageConfig.scripts.dev).not.toContain("bun run build");
    expect(desktopPackageConfig.scripts.dev).toContain("tsx");
    expect(desktopPackageConfig.scripts.dev).toContain("electron ./main.ts");
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
});
