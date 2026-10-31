import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: '.env.systemtest.local', override: false, quiet: true });
loadEnv({ path: '.env.systemtest', override: false, quiet: true });

const baseURL = process.env.SYSTEM_TEST_BASE_URL ?? 'http://127.0.0.1:4173';
const useExternalBaseUrl = Boolean(process.env.SYSTEM_TEST_BASE_URL);

export default defineConfig({
  testDir: './tests/system',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['./scripts/system-test-reporter.ts']],
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    // These tests use a real capability. Traces, screenshots, videos and DOM
    // snapshots can disclose it, even when GitHub masks text in workflow logs.
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  captureGitInfo: { commit: false, diff: false },
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
