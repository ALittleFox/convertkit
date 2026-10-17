import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    // Pin the UI language. The app negotiates locale from Accept-Language, and
    // headless Chrome sends en-US by default, which made every Chinese-text
    // assertion fail. Desktop Chrome defaults are applied per-project below.
    locale: "zh-CN",
    extraHTTPHeaders: { "Accept-Language": "zh-Hans,zh-CN;q=0.9,zh;q=0.8" },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120000,
  },
});
