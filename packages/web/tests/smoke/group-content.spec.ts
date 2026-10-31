import { expect, test, type Page } from '@playwright/test';
import { expenseRows, groupUrl, memberRows, mockBackend, type BackendOptions } from './fixtures/group';

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

async function openGroup(page: Page, options?: BackendOptions) {
  await mockBackend(page, options);
  await page.goto(groupUrl());
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
}

const scrollWidth = (page: Page) => page.evaluate('document.documentElement.scrollWidth') as Promise<number>;

const LONG_WORD = 'Donaudampfschifffahrtsgesellschaftskapitaensmuetze'.repeat(3);
const longText: BackendOptions = {
  tables: {
    members: [
      { ...memberRows[0], name: `Annabella${'-Konstantinopolous'.repeat(4)}` },
      ...memberRows.slice(1),
    ],
    expenses: [{ ...expenseRows[0], description: LONG_WORD }, expenseRows[1]],
  },
};

/** Anna pays only for herself, so nobody owes anything. */
const settled: BackendOptions = {
  tables: {
    expenses: [{ ...expenseRows[0], total_amount: 30 }],
    expense_payers: [{ id: 'p-1', expense_id: 'e-dinner', member_id: 'm-anna', amount: 30 }],
    expense_splits: [{ id: 's-1', expense_id: 'e-dinner', member_id: 'm-anna', share: 1, share_type: 'ratio' }],
  },
};

test.describe('desktop', { tag: '@desktop' }, () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('expenses are grouped by day under sticky date headers', async ({ page }) => {
    await openGroup(page);

    const days = page.locator('.expense-day');
    await expect(days).toHaveCount(2);
    await expect(days.first().getByRole('heading', { level: 3 })).toBeVisible();
    await expect(days.first().getByTestId('expense-card')).toContainText('Dinner at Figlmüller');
    await expect(days.first().locator('.expense-day-header')).toHaveCSS('position', 'sticky');
    // Each card names the payer next to its initial avatar.
    await expect(days.first().getByTestId('expense-card')).toContainText('Paid by Anna');
    await expect(days.first().locator('.avatar')).toHaveText('A');
  });

  test('writers can open details in the side panel and actions appear on hover or focus', async ({ page }) => {
    await openGroup(page);

    const card = page.getByTestId('expense-card').first();
    const actions = card.locator('.expense-actions');
    await expect(actions).toHaveCSS('opacity', '0');
    await card.hover();
    await expect(actions).toHaveCSS('opacity', '1');
    await page.mouse.move(0, 0);
    await expect(actions).toHaveCSS('opacity', '0');

    const view = card.getByRole('button', { name: 'View details' });
    await view.focus();
    await expect(actions).toHaveCSS('opacity', '1');
    await expect(card.getByRole('button', { name: 'Edit' })).toHaveAccessibleDescription('Dinner at Figlmüller');
    await expect(card.getByTestId('expense-delete-button')).toHaveAccessibleName('Delete');

    await view.press('Enter');
    const aside = page.getByRole('complementary');
    await expect(aside.getByRole('heading', { name: 'Expense Details' })).toBeFocused();
    await expect(aside.getByText('Dinner at Figlmüller')).toBeVisible();
    await expect(card).toHaveClass(/is-selected/);

    await page.keyboard.press('Escape');
    await expect(view).toBeFocused();
    await expect(card).not.toHaveClass(/is-selected/);
  });

  test('balances show proportional bars and gold settlements in the side panel', async ({ page }) => {
    await openGroup(page);
    const aside = page.getByRole('complementary', { name: 'Summary' });

    const rows = aside.locator('.balance-row');
    await expect(rows).toHaveCount(3);
    // Creditors first: Anna paid the most.
    await expect(rows.first()).toHaveClass(/is-positive/);
    await expect(rows.first()).toContainText('Anna');
    await expect(rows.last()).toHaveClass(/is-negative/);
    await expect(rows.first().locator('.balance-bar-fill')).toHaveCount(1);

    const settlement = aside.locator('.settlement-card').first();
    await expect(settlement).toBeVisible();
    await expect(settlement).toContainText('pays');
    // Within the panel: the amount never spills out of the card.
    const card = (await settlement.boundingBox())!;
    const amount = (await settlement.locator('.settlement-amount').boundingBox())!;
    expect(amount.x + amount.width).toBeLessThanOrEqual(card.x + card.width);
  });

  test('an all-settled group gets a celebratory state', async ({ page }) => {
    await openGroup(page, settled);
    const aside = page.getByRole('complementary', { name: 'Summary' });

    const status = aside.getByRole('status');
    await expect(status).toContainText('All settled up!');
    await expect(status).toContainText('No payments needed');
    await expect(aside.locator('.settlement-card')).toHaveCount(0);
    // A one-person split names that person instead of "1 people".
    await expect(page.getByTestId('expense-card').locator('.expense-chip')).toHaveText('Only Anna');
  });

  test('member names are edited inline and focus returns to the edit button', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('members-tab-button').click();

    const card = page.getByTestId('member-card').first();
    await expect(card.locator('.avatar')).toHaveText('A');
    await expect(card).toContainText('gets back');

    const edit = card.getByRole('button', { name: 'Edit name' });
    await expect(edit).toHaveAccessibleDescription('Anna');
    await edit.click();

    const input = card.getByRole('textbox', { name: 'Edit name' });
    await expect(input).toBeFocused();
    await expect(input).toHaveValue('Anna');
    await page.keyboard.press('Escape');

    await expect(input).toHaveCount(0);
    await expect(edit).toBeFocused();
    await expect(page.getByRole('textbox', { name: 'Add new member' })).toBeVisible();
  });

  test('a group without expenses invites the first one', async ({ page }) => {
    await mockBackend(page, { tables: { expenses: [], expense_payers: [], expense_splits: [] } });
    await page.goto(groupUrl());

    const panel = page.getByRole('tabpanel', { name: 'Expenses' });
    await expect(panel.getByRole('heading', { name: 'No expenses yet' })).toBeVisible();
    await expect(page.getByRole('complementary').getByText('No balances yet')).toBeVisible();

    await panel.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByRole('dialog', { name: 'Add Expense' })).toBeVisible();
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('touch screens always show expense actions with 44px targets', async ({ page }) => {
    await openGroup(page);

    const card = page.getByTestId('expense-card').first();
    await expect(card.locator('.expense-actions')).toHaveCSS('opacity', '1');
    // Round away float noise from the tab panel's enter transform (e.g. 43.99997).
    const px = (value: number) => Math.round(value * 100) / 100;
    for (const button of await card.getByRole('button').all()) {
      const box = (await button.boundingBox())!;
      expect(px(box.width)).toBeGreaterThanOrEqual(44);
      expect(px(box.height)).toBeGreaterThanOrEqual(44);
    }

    await card.getByRole('button', { name: 'View details' }).click();
    await expect(page.getByRole('dialog', { name: 'Expense Details' })).toBeVisible();
  });

  test('settlements stack and balances tab lists every member', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('balances-tab-button').click();

    await expect(page.locator('.balance-row')).toHaveCount(3);
    await expect(page.locator('.settlement-card').first()).toHaveCSS('flex-direction', 'column');
  });
});

test.describe('narrow phone with long text', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('unbreakable descriptions and names never widen the page', async ({ page }) => {
    await openGroup(page, longText);
    const viewport = page.viewportSize()!;

    for (const id of ['expenses-tab-button', 'balances-tab-button', 'members-tab-button']) {
      await page.getByTestId(id).click();
      await expect(page.getByTestId(id)).toHaveAttribute('aria-selected', 'true');
      expect(await scrollWidth(page), id).toBeLessThanOrEqual(viewport.width);
    }

    // The bottom tab bar is not pushed off screen either.
    for (const tab of await page.getByRole('navigation', { name: 'Group sections' }).getByRole('tab').all()) {
      const box = (await tab.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
    }

    await page.getByTestId('expenses-tab-button').click();
    const card = (await page.getByTestId('expense-card').first().boundingBox())!;
    const amount = (await page.locator('.expense-amount').first().boundingBox())!;
    expect(card.x + card.width).toBeLessThanOrEqual(viewport.width);
    expect(amount.x + amount.width).toBeLessThanOrEqual(card.x + card.width);
  });
});
