import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const desktopPackage = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
  name: string;
  private: boolean;
  scripts: Record<string, string>;
};

describe("desktop workspace contract", () => {
  it("declares the desktop host package scripts", () => {
    expect(desktopPackage.name).toBe("desktop");
    expect(desktopPackage.private).toBe(true);
    expect(desktopPackage.scripts.dev).toBeTruthy();
    expect(desktopPackage.scripts.start).toBeTruthy();
    expect(desktopPackage.scripts.test).toBeTruthy();
    expect(desktopPackage.scripts["check-types"]).toBeTruthy();
  });
});
