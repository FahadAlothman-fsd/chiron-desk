import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type ContractsPackage = {
  scripts?: {
    build?: string;
  };
  exports?: {
    "."?: {
      bun?: string;
      types?: string;
      default?: string;
    };
    "./desktop-runtime"?: {
      bun?: string;
      types?: string;
      default?: string;
    };
    "./*"?: {
      bun?: string;
      types?: string;
      default?: string;
    };
  };
};

const packagePath = join(process.cwd(), "package.json");
const contractsPackage = JSON.parse(readFileSync(packagePath, "utf8")) as ContractsPackage;

describe("contracts package entrypoints", () => {
  it("builds a runtime-safe desktop bridge entrypoint", () => {
    expect(contractsPackage.scripts?.build).toBe("tsc -p tsconfig.json");
    expect(contractsPackage.exports?.["."]).toEqual({
      bun: "./src/index.ts",
      types: "./src/index.ts",
      default: "./dist/src/index.js",
    });
    expect(contractsPackage.exports?.["./desktop-runtime"]).toEqual({
      bun: "./src/desktop-runtime.ts",
      types: "./src/desktop-runtime.ts",
      default: "./dist/src/desktop-runtime.js",
    });
    expect(contractsPackage.exports?.["./*"]).toEqual({
      bun: "./src/*.ts",
      types: "./src/*.ts",
      default: "./dist/src/*.js",
    });
  });
});
