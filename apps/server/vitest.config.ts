import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "server",
    include: ["src/tests/**/*.test.ts"],
  },
});
