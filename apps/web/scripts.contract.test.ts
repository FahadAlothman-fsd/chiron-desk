import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const packageJsonPath = resolve(dirname(fileURLToPath(import.meta.url)), "package.json");

const webPackage = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
  scripts?: Record<string, string>;
};

describe("web package script surface", () => {
  it("does not expose retired tauri scripts", () => {
    expect(webPackage.scripts?.tauri).toBeUndefined();
    expect(webPackage.scripts?.["desktop:dev"]).toBeUndefined();
    expect(webPackage.scripts?.["desktop:dev:attach"]).toBeUndefined();
    expect(webPackage.scripts?.["desktop:build"]).toBeUndefined();
  });
});
