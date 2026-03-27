import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: [
      "src/tests/**/*.test.ts",
      "src/tests/**/*.test.tsx",
      "src/tests/**/*.integration.test.tsx",
    ],
    exclude: ["**/.worktrees/**"],
    setupFiles: ["src/test/setup.ts"],
  },
});
