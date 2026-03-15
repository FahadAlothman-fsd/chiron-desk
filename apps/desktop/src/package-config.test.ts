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
        expect.objectContaining({ from: "../server/dist" }),
        expect.objectContaining({ from: "../server/server" }),
      ]),
    );
  });

  it("builds release prerequisites before packaging", () => {
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun --filter web build");
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun --filter server build");
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun --filter server compile");
    expect(desktopPackageConfig.scripts["build:release"]).toContain("bun run build");
  });

  it("writes packaged artifacts to dist-electron", () => {
    expect(requireBuilder().directories.output).toBe("dist-electron");
  });
});
