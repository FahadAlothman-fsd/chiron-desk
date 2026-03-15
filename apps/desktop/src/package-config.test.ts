import { describe, expect, it } from "vitest";
import desktopPackage from "../package.json";

type DesktopPackageConfig = {
  scripts: Record<string, string | undefined>;
  build?: {
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
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun --filter web build");
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

  it("writes packaged artifacts to dist-electron", () => {
    expect(requireBuilder().directories.output).toBe("dist-electron");
  });
});
