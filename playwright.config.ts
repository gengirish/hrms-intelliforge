import { defineConfig } from "@playwright/test";

// Port 3001 isolates the E2E dev server from a developer's default `next dev` on 3000.
// Run: npm run test:e2e  (starts Next on 3001 when E2E_BASE_URL is unset)
const e2ePort = 3001;
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${e2ePort}`;
const runLocalServer = !process.env.E2E_BASE_URL;
const reuseExistingServer =
  process.env.CI === "true"
    ? false
    : process.env.E2E_REUSE_SERVER === "true";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  retries: 1,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: runLocalServer
    ? {
        command: `npm run dev -- -p ${e2ePort}`,
        url: baseURL,
        reuseExistingServer,
        timeout: 120_000,
      }
    : undefined,
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
});
