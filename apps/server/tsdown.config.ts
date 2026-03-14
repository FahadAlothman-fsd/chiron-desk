import { defineConfig } from "tsdown";

export const shouldInlineServerDependency = (id: string) =>
  id.startsWith("@chiron/") && id !== "@chiron/db";

export default defineConfig({
  entry: "./src/index.ts",
  format: "esm",
  outDir: "./dist",
  clean: true,
  noExternal: shouldInlineServerDependency,
});
