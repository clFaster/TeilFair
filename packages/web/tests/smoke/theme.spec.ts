import { expect, test, type Page } from '@playwright/test';

const STORAGE_KEY = 'teilfair-theme-preference';
const BAR_COLORS = { light: '#ffffff', dark: '#0a1110' };

test.beforeEach(async ({ page }) => {
  // Keep these checks independent of Supabase and third-party services.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

// Tests are type-checked without the DOM lib, so browser-side code is passed as strings.
const themeColor = async (page: Page) => {
  const metas = page.locator('meta[name="theme-color"]');
  expect(await metas.count()).toBe(1);
  return metas.getAttribute('content');
};

test('dark OS setting is applied before the app mounts and nothing is persisted', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  // Record every data-theme value <html> ever gets, plus the value at DOMContentLoaded.
  await page.addInitScript({
    content: `window.__themeHistory = [];
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.target === document.documentElement) window.__themeHistory.push(r.target.getAttribute('data-theme'));
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-theme'] });
    document.addEventListener('DOMContentLoaded', () => {
      window.__themeAtDcl = document.documentElement.getAttribute('data-theme');
    });`,
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate('window.__themeAtDcl')).toBe('dark');
  // Set once by the pre-paint script, never flipped to light afterwards.
  expect(await page.evaluate('window.__themeHistory')).toEqual(['dark']);
  await expect(page.getByRole('button', { name: 'Theme: dark', exact: true })).toBeVisible();
  expect(await themeColor(page)).toBe(BAR_COLORS.dark);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();
});

test('follows OS changes until the user toggles, then keeps the explicit choice', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/');
  const html = page.locator('html');
  await expect(html).toHaveAttribute('data-theme', 'light');
  expect(await themeColor(page)).toBe(BAR_COLORS.light);

  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await expect.poll(() => themeColor(page)).toBe(BAR_COLORS.dark);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBeNull();

  await page.getByRole('button', { name: 'Theme: dark', exact: true }).click();
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => themeColor(page)).toBe(BAR_COLORS.light);
  expect(await page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe('light');

  // Explicit choice wins over later OS changes and over reloads.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(html).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'light');
  expect(await themeColor(page)).toBe(BAR_COLORS.light);
});
