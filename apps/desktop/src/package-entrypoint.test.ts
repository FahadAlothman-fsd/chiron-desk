import { describe, expect, it } from "vitest";
import desktopPackage from "../package.json";

describe("desktop package entrypoint contract", () => {
  it("points electron at the built desktop main entry", () => {
    expect(desktopPackage.main).toBe("dist/desktop/main.js");
  });

  it("uses a source entry for dev instead of building first", () => {
    expect(desktopPackage.scripts.dev).not.toContain("bun run build");
    expect(desktopPackage.scripts.dev).toContain("tsx");
    expect(desktopPackage.scripts.dev).toContain("electron ./main.ts");
  });
});
