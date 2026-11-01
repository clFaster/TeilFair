import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function showBalances(page: Page) {
  await expect(page.getByTestId('expenses-tab-button')).toBeVisible();
  const tab = page.getByTestId('balances-tab-button');
  if (await tab.isVisible()) await tab.click();
}

test('create a group and members, persist an expense, edit it and delete it', async ({ page, backend, isMobile }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Create Group', exact: true }).click();
  const name = `Browser group ${randomUUID()}`;
  await page.getByLabel('Group Name').fill(name);
  const creation = page.waitForResponse(response => response.request().method() === 'POST'
    && new URL(response.url()).pathname === '/rest/v1/groups');
  await page.getByRole('dialog').getByRole('button', { name: 'Create Group', exact: true }).click();
  const response = await creation;
  expect(response.ok()).toBe(true);
  const created = await response.json();
  const { write_token: writeToken, read_token: readToken } = response.request().postDataJSON();
  const id: string = created.id;
  backend.track({ id, name, writeToken, readToken });
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();

  await page.getByTestId('members-tab-button').click();
  if (isMobile) await page.getByRole('button', { name: 'Add Member', exact: true }).click();
  for (const member of ['Anna', 'Ben']) {
    await page.getByTestId('member-name-input').fill(member);
    await page.getByTestId('member-submit-button').click();
    await expect(page.getByTestId('member-card').filter({ hasText: member })).toBeVisible();
  }
  if (isMobile) await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByTestId('expenses-tab-button').click();
  await page.getByTestId('add-expense-button').click();
  await page.getByTestId('expense-description-input').fill('Dinner');
  await page.getByTestId('expense-amount-input').fill('30');
  await page.getByTestId('expense-submit-button').click();
  const card = page.getByTestId('expense-card').filter({ hasText: 'Dinner' });
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toContainText('€30.00');
  await showBalances(page);
  await expect(page.locator('.balance-row').filter({ hasText: 'Anna' })).toContainText('+€15.00');
  await expect(page.locator('.settlement-card')).toContainText('€15.00');
  await page.getByTestId('expenses-tab-button').click();
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByTestId('expense-amount-input').fill('40');
  await page.getByTestId('expense-submit-button').click();
  await expect(card).toContainText('€40.00');
  await page.reload();
  await expect(card).toContainText('€40.00');
  const [stored] = await backend.rows('GET', `expenses?group_id=eq.${id}`, writeToken);
  expect(stored.total_amount).toBe(40);
  await card.getByTestId('expense-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();
  await expect(card).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByTestId('expense-card')).toHaveCount(0);
  expect(await backend.rows('GET', `expenses?group_id=eq.${id}`, writeToken)).toEqual([]);
});

test('custom split amounts persist and calculate the expected debt', async ({ page, group, members }) => {
  expect(members).toHaveLength(2);
  await page.goto(`/g/${group.id}#t=${group.writeToken}`);
  await page.getByTestId('add-expense-button').click();
  await page.getByTestId('expense-description-input').fill('Custom dinner');
  await page.getByTestId('expense-amount-input').fill('30');
  await page.getByRole('button', { name: 'Custom split amounts' }).click();
  await page.getByRole('textbox', { name: 'Share of Anna' }).fill('10');
  await page.getByRole('textbox', { name: 'Share of Ben' }).fill('20');
  await page.getByTestId('expense-submit-button').click();
  await expect(page.getByTestId('expense-card')).toBeVisible();
  await page.reload();
  await showBalances(page);
  await expect(page.locator('.balance-row').filter({ hasText: 'Anna' })).toContainText('+€20.00');
  await expect(page.locator('.settlement-card')).toContainText('€20.00');
});

for (const mode of ['ratio', 'fixed', 'percentage']) {
  test(`${mode} splits from the real API render correct balances after reload`, async ({ page, backend, group, members }) => {
    await backend.expense(group, members, mode);
    await page.goto(`/g/${group.id}#t=${group.writeToken}`);
    await expect(page.getByTestId('expense-card')).toContainText('Seeded dinner');
    await page.reload();
    await showBalances(page);
    const debt = mode === 'ratio' ? '€15.00' : mode === 'fixed' ? '€20.00' : '€22.50';
    await expect(page.locator('.balance-row').filter({ hasText: 'Ben' })).toContainText(debt);
    await expect(page.locator('.settlement-card')).toContainText(debt);
  });
}

test('read-only capability loads data without exposing editing controls', async ({ page, backend, group, members }) => {
  await backend.expense(group, members);
  await page.goto(`/g/${group.id}#t=${group.readToken}`);
  await expect(page.getByTestId('expense-card')).toContainText('Seeded dinner');
  await expect(page.getByText('view only', { exact: true })).toBeVisible();
  await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
  await expect(page.getByTestId('expense-delete-button')).toHaveCount(0);
  await page.getByTestId('members-tab-button').click();
  await expect(page.getByTestId('member-card')).toHaveCount(2);
  await expect(page.getByTestId('member-submit-button')).toHaveCount(0);
  await expect(page.getByTestId('member-delete-button')).toHaveCount(0);
});

test('invalid capability cannot load an existing group', async ({ page, group }) => {
  await page.goto(`/g/${group.id}#t=${'invalid'.repeat(8)}`);
  await expect(page.getByRole('heading', { name: 'Error', exact: true })).toBeVisible();
  await expect(page.getByTestId('expense-card')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: group.name, exact: true })).toHaveCount(0);
});
