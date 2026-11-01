import { defineConfig, devices } from '@playwright/test';
import { assertLocalUrl, localEnvironment } from '../../scripts/lib/local-environment.mjs';

// Configuration comes from CLI local status, never production .env files.
Object.assign(process.env, localEnvironment());
const external = process.env.LOCAL_TEST_BASE_URL;
const baseURL = assertLocalUrl(external ?? 'http://127.0.0.1:4175');

export default defineConfig({
  testDir: './tests/local',
  outputDir: './test-results-local',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-local', open: 'never' }]],
  use: {
    baseURL,
    locale: 'en-US',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'api', testMatch: '**/*.api.spec.ts' },
    { name: 'chromium', testMatch: '**/*.e2e.spec.ts', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chrome', testMatch: '**/*.e2e.spec.ts', use: { ...devices['Pixel 7'] } },
  ],
  webServer: external ? undefined : {
    command: 'node ../../scripts/local-web.mjs build-preview',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { PORT: '4175' },
  },
});
