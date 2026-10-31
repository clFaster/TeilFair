/// <reference lib="dom" />
import { expect, test } from '@playwright/test';
import { GROUP_ID, READ_TOKEN, WRITE_TOKEN, groupUrl, mockBackend } from './fixtures/group';

test.beforeEach(async ({ page }) => { await mockBackend(page); });

test('creates a group with its write capability header and only selects metadata', async ({ page }) => {
  const creation = page.waitForRequest(request => request.method() === 'POST' && new URL(request.url()).pathname === '/rest/v1/groups');
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Group', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create New Group' });
  await dialog.getByRole('textbox').fill('Secure new group');
  await dialog.getByRole('button', { name: 'Create Group', exact: true }).click();
  const request = await creation;
  expect(request.headers()['x-group-token']).toBe(request.postDataJSON().write_token);
  expect(new URL(request.url()).searchParams.get('select')).toBe('id,name,currency,created_at');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Secure new group');
  expect(new URL(page.url()).search).toBe('');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('teilfair-storage')!));
  expect(stored.state.recentGroups[0]).toMatchObject({
    name: 'Secure new group', token: request.postDataJSON().write_token, permission: 'write',
  });
  expect(Object.keys(stored.state)).toEqual(['recentGroups']);
});

test('fragment capability stays out of document requests and reopens from recents after reload', async ({ page }) => {
  const response = await page.goto(groupUrl());
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  expect(new URL(response!.request().url()).search).toBe('');
  expect(response!.request().url()).not.toContain(WRITE_TOKEN);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('teilfair-storage')!));
  expect(stored.state.recentGroups[0]).toMatchObject({ id: GROUP_ID, token: WRITE_TOKEN, permission: 'write' });
  expect(Object.keys(stored.state)).toEqual(['recentGroups']);
  await page.locator('a.logo').click();
  await expect(page.locator('.recent-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.recent-card')).toHaveCount(1);
  await page.locator('.recent-card-open').click();
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/g/${GROUP_ID}#t=${WRITE_TOKEN}$`));
  await expect(page.getByTestId('add-expense-button')).toBeVisible();
  await page.locator('a.logo').click();
  await page.getByRole('button', { name: 'Remove Weekend in Vienna from this list' }).click();
  await page.reload();
  await expect(page.locator('.recent-card')).toHaveCount(0);
});

test('legacy links are replaced with fragments before telemetry starts', async ({ page }) => {
  await page.goto(`/g/${GROUP_ID}?t=${WRITE_TOKEN}`);
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/g/${GROUP_ID}#t=${WRITE_TOKEN}$`));
  expect(await page.evaluate(() => location.search)).toBe('');
});

test('read-only responses omit the write capability and cannot offer a write link', async ({ page }) => {
  const responses: string[] = [];
  page.on('response', async response => {
    if (response.url().includes('/rpc/get_group')) responses.push(await response.text());
  });
  await page.goto(groupUrl(READ_TOKEN));
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  expect(responses.length).toBeGreaterThan(0);
  expect(responses.join('')).not.toContain(WRITE_TOKEN);
  await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
  await page.locator('a.logo').click();
  await page.reload();
  await expect(page.locator('.recent-card')).toHaveCount(1);
  const stored = await page.evaluate(() => localStorage.getItem('teilfair-storage'));
  expect(stored).toContain(READ_TOKEN);
  expect(stored).not.toContain(WRITE_TOKEN);
  await page.locator('.recent-card-open').click();
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
});

test('deployment CSP blocks inline script injection while the app and bootstrap work', async ({ page }) => {
  const response = await page.goto(groupUrl());
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  expect(response!.headers()['content-security-policy']).toContain("script-src 'self'");
  expect(await page.locator('html').getAttribute('data-theme')).toBe('light');
  const violation = await page.evaluate(async () => {
    const blocked = new Promise<string>(resolve => {
      document.addEventListener('securitypolicyviolation', event => resolve(event.blockedURI), { once: true });
    });
    const script = document.createElement('script');
    script.textContent = 'document.documentElement.dataset.injected = "yes"';
    document.head.appendChild(script);
    return blocked;
  });
  expect(violation).toBe('inline');
  await expect(page.locator('html')).not.toHaveAttribute('data-injected');
});
