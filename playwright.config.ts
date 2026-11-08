import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 180_000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4174', headless: process.env.CI_HEADED !== '1' },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
    { name: 'firefox', use: { browserName: 'firefox' } },
    { name: 'webkit', use: { browserName: 'webkit' } },
  ],
  webServer: {
    command:
      process.env.PLAYWRIGHT_PREVIEW === '1'
        ? 'npm run preview -- --host 127.0.0.1 --port 4174'
        : 'npm run dev -- --host 127.0.0.1 --port 4174',
    url: 'http://127.0.0.1:4174',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
