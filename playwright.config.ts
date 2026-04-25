import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir:  './e2e',
  timeout:  30000,
  retries:  1,
  use: {
    baseURL:    process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace:      'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // ✅ standalone output
    command:             'node .next/standalone/server.js',
    url:                 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout:             120000,
    env: {
      PORT:     '3000',
      HOSTNAME: '0.0.0.0',
    },
  },
});
