import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function showBalances(page: Page) {
  await expect(page.getByTestId('expenses-tab-button')).toBeVisible();
  const tab = page.getByTestId('balances-tab-button');
  if (await tab.isVisible()) await tab.click();
}

test('a group with more split rows than the API row cap shows correct balances', async ({ page, backend, group }) => {
  // 11 expenses of €100.00 shared by 100 members: 1,100 split rows, above max_rows = 1000.
  // Everyone owes €1.00 per expense; Anna paid six of them and Ben five.
  const members = await backend.members(group, 100);
  await backend.expenses(group, members, 11, 100);

  await page.goto(`/g/${group.id}#t=${group.readToken}`);
  await expect(page.getByTestId('expense-card')).toHaveCount(11);
  await expect(page.locator('.group-chip').filter({ hasText: 'expenses' })).toHaveText('11 expenses');
  await expect(page.locator('.group-chip').filter({ hasText: 'members' })).toHaveText('100 members');
  await expect(page.getByTestId('group-total')).toHaveText('€1,100.00');

  await showBalances(page);
  const row = (name: string) => page.locator('.balance-row').filter({ hasText: name }).locator('.balance-amount');
  await expect(page.locator('.balance-row')).toHaveCount(100);
  await expect(row('Anna')).toHaveText('+€589.00');
  await expect(row('Ben')).toHaveText('+€489.00');
  await expect(row('Member 003')).toHaveText('€11.00');
  await expect(row('Member 100')).toHaveText('€11.00');
  await expect(page.locator('.balance-row.is-negative .balance-amount')).toHaveText(Array.from({ length: 98 }, () => '€11.00'));
});
