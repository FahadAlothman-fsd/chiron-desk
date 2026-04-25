import { describe, expect, it } from "vitest";
import desktopPackage from "../../../package.json";

type DesktopPackageConfig = {
  productName?: string;
  scripts: Record<string, string | undefined>;
  build?: {
    appId?: string;
    artifactName?: string;
    afterSign?: string;
    mac?: {
      category?: string;
      gatekeeperAssess?: boolean;
      hardenedRuntime?: boolean;
      icon?: string;
      entitlements?: string;
      entitlementsInherit?: string;
      target: string[];
    };
    linux: {
      target: string[];
    };
    extraResources: Array<{
      from: string;
      to: string;
    }>;
    directories: {
      output: string;
    };
  };
};

const desktopPackageConfig = desktopPackage as unknown as DesktopPackageConfig;

describe("desktop builder config", () => {
  const builder = desktopPackageConfig.build;

  const requireBuilder = () => {
    expect(builder).toBeTruthy();
    return builder!;
  };

  it("targets local Linux artifacts", () => {
    expect(requireBuilder().linux.target).toContain("AppImage");
  });

  it("declares public mac identity metadata", () => {
    expect(desktopPackageConfig.productName).toBe("Chiron");
    expect(requireBuilder().appId).toBe("com.fahadalothman.chiron");
    expect(requireBuilder().artifactName).toBe("Chiron-${version}-${arch}.${ext}");
    expect(requireBuilder().afterSign).toBe("scripts/notarize.mjs");
  });

  it("includes built web and server outputs in extraResources", () => {
    expect(requireBuilder().extraResources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "../web/dist" }),
        expect.objectContaining({ from: "../server/dist/bun", to: "server-dist/bun" }),
        expect.objectContaining({
          from: "../server/dist/server.mjs",
          to: "server-dist/server.mjs",
        }),
        expect.objectContaining({
          from: "../server/dist/node_modules",
          to: "server-dist/node_modules",
        }),
        expect.objectContaining({
          from: "build/runtime-template/chiron.db",
          to: "runtime-template/chiron.db",
        }),
      ]),
    );
    expect(requireBuilder().extraResources).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ from: "../server/dist" }),
        expect.objectContaining({ from: "../server/server" }),
      ]),
    );
  });

  it("builds release prerequisites before packaging", () => {
    expect(desktopPackageConfig.scripts.build).toContain('bun --filter "@chiron/contracts" build');
    expect(desktopPackageConfig.scripts["build:release"]).toContain("CHIRON_DESKTOP_BUILD=true");
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun --filter web build");
    expect(desktopPackageConfig.scripts["build:release"]).toContain(
      "bun run build:runtime-db-template",
    );
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun --filter server build");
    expect(desktopPackageConfig.scripts["build:release"]).toContain(
      "bun --filter server bundle:desktop",
    );
    expect(desktopPackageConfig.scripts["build:release"]).not.toContain(
      "bun --filter server compile",
    );
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun run build");
  });

  it("packages without requiring shell-provided bootstrap env vars", () => {
    expect(desktopPackageConfig.scripts["package:linux"]).not.toContain("DATABASE_URL=");
    expect(desktopPackageConfig.scripts["package:linux"]).not.toContain("BETTER_AUTH_SECRET=");
    expect(desktopPackageConfig.scripts["package:linux"]).not.toContain("BETTER_AUTH_URL=");
    expect(desktopPackageConfig.scripts["package:linux"]).not.toContain("CORS_ORIGIN=");
  });

  it("defines a local mac packaging script", () => {
    expect(desktopPackageConfig.scripts["build:icon:mac"]).toContain("build-mac-icon.mjs");
    expect(desktopPackageConfig.scripts["package:mac"]).toContain("bun run build:icon:mac");
    expect(desktopPackageConfig.scripts["package:mac:dmg"]).toContain("bun run package:mac");
    expect(desktopPackageConfig.scripts["package:mac"]).toContain("electron-builder --mac dmg zip");
    expect(desktopPackageConfig.scripts["package:mac:dir"]).toContain("electron-builder --mac dir");
    expect(desktopPackageConfig.scripts["package:mac:public"]).toContain("bun run package:mac");
    expect(requireBuilder().mac?.icon).toBe("build/icon.png");
    expect(requireBuilder().mac?.category).toBe("public.app-category.developer-tools");
    expect(requireBuilder().mac?.gatekeeperAssess).toBe(false);
    expect(requireBuilder().mac?.hardenedRuntime).toBe(true);
    expect(requireBuilder().mac?.entitlements).toBe("build/entitlements.mac.plist");
    expect(requireBuilder().mac?.entitlementsInherit).toBe("build/entitlements.mac.inherit.plist");
    expect(requireBuilder().mac?.target).toEqual(expect.arrayContaining(["dmg", "zip"]));
  });

  it("writes packaged artifacts to dist-electron", () => {
    expect(requireBuilder().directories.output).toBe("dist-electron");
  });
});
