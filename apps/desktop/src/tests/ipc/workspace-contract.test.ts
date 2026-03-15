import { describe, expect, it } from "vitest";
import desktopPackage from "../../../package.json";

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
