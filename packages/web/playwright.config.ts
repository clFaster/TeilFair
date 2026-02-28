import { defineConfig, devices, type ReporterDescription } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.systemtest.local', override: false, quiet: true });
loadEnv({ path: '.env.systemtest', override: false, quiet: true });

const baseURL = process.env.SYSTEM_TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const useExternalBaseUrl = Boolean(process.env.SYSTEM_TEST_BASE_URL);
const reporter: 'html' | ReporterDescription[] = process.env.CI
  ? [
      ['html', { open: 'never' }],
      ['json', { outputFile: 'test-results/results.json' }],
    ]
  : 'html';

export default defineConfig({
  testDir: './tests/system',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: useExternalBaseUrl
    ? undefined
    : {
        command: 'pnpm dev --host 127.0.0.1 --port 4173',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: 120_000,
      },
});
