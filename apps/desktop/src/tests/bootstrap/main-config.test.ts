import { describe, expect, it } from "vitest";
import { getBrowserWindowOptions, resolvePreloadScriptPath } from "../../../main";

describe("browser window security defaults", () => {
  it("uses secure runtime defaults", () => {
    const options = getBrowserWindowOptions();

    expect(options.webPreferences?.contextIsolation).toBe(true);
    expect(options.webPreferences?.nodeIntegration).toBe(false);
    expect(options.webPreferences?.sandbox).toBe(true);
    expect(options.webPreferences?.preload).toBeTruthy();
  });

  it("uses the source preload entry when running from TypeScript", () => {
    expect(resolvePreloadScriptPath("/repo/apps/desktop/main.ts")).toBe(
      "/repo/apps/desktop/preload.ts",
    );
  });

  it("uses the built preload entry when running from compiled output", () => {
    expect(resolvePreloadScriptPath("/repo/apps/desktop/dist/desktop/main.js")).toBe(
      "/repo/apps/desktop/dist/desktop/preload.js",
    );
  });
});
