import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 1,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://hrms.intelliforge.tech",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
