import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/smoke',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  // Mocked backend: every test is fast, so a hung one should fail early.
  timeout: 20_000,
  expect: { timeout: 5_000 },
  use: {
    baseURL: 'http://127.0.0.1:4174',
    locale: 'en-US',
    colorScheme: 'light',
    trace: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
      // Tests pinned to a desktop viewport (@desktop) and tests that emulate their own
      // device matrix (@once: screenshots, contrast audit) only run in the desktop project.
      grepInvert: /@desktop|@once/,
    },
  ],
  webServer: {
    command: 'pnpm build --outDir dist-smoke && pnpm preview --outDir dist-smoke --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174',
    timeout: 120_000,
    env: {
      VITE_SUPABASE_URL: 'https://smoke-test.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'smoke-test-anon-key',
    },
  },
});
