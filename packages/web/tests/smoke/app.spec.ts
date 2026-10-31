import { expect, test } from '@playwright/test';

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

test('production app opens forms and persists theme and language', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Split expenses, stay fair');

  await page.getByRole('button', { name: 'Create Group', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create New Group' })).toBeVisible();
  await expect(page.getByLabel('Group Name')).toBeVisible();

  await page.getByRole('button', { name: 'Theme: light', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Theme: dark', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select language', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('teilfair-theme-preference'))).toBe('dark');
});

for (const [path, heading] of [
  ['/privacy', 'Datenschutzerklärung'],
  ['/imprint', 'Impressum'],
  ['/missing-page', 'Page Not Found'],
]) {
  test(`production router loads ${path} directly`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  });
}
