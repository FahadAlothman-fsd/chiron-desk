import { defineConfig } from "@playwright/test";

const docsBaseURL = process.env.DOCS_BASE_URL ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/docs",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/docs" }],
    ["junit", { outputFile: "test-results/docs/junit.xml" }],
  ],
  use: {
    baseURL: docsBaseURL,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  outputDir: "test-results/docs/artifacts",
  webServer: {
    command: "bun run preview:test",
    cwd: "apps/docs",
    url: docsBaseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
});
