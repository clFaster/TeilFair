import { expect, test, type Page } from '@playwright/test';
import {
  GROUP_ID, MAX_ROWS, expenseRows, failReadAt, groupUrl, manyExpenses, memberRows, mockBackend, payerRows,
  type BackendOptions,
} from './fixtures/group';

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

/** GET requests to the mocked API, by table, in the order they were sent. */
function recordReads(page: Page) {
  const reads: { table: string; query: URLSearchParams; prefer: string }[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (request.method() !== 'GET' || !url.pathname.startsWith('/rest/v1/')) return;
    reads.push({
      table: url.pathname.replace('/rest/v1/', ''),
      query: url.searchParams,
      prefer: request.headers()['prefer'] ?? '',
    });
  });
  return {
    of: (table: string) => reads.filter((read) => read.table === table),
    offsets: (table: string) => reads.filter((read) => read.table === table).map((read) => read.query.get('offset')),
  };
}

/** Phones show balances in their own tab; the desktop side panel always shows them. */
async function showBalances(page: Page) {
  const tab = page.getByTestId('balances-tab-button');
  if (await tab.isVisible()) await tab.click();
}

test.describe('expense loading', () => {
  const euros = (cents: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  /** 450 expenses split equally by the three members: 1,350 split rows, more than one response may carry. */
  const large = manyExpenses(450);
  const amounts = (large.expenses as typeof expenseRows).map((expense) => Math.round(expense.total_amount * 100));
  const totalCents = amounts.reduce((sum, cents) => sum + cents, 0);
  const netCents = (memberId: string) => (large.expense_payers as typeof payerRows)
    .filter((payer) => payer.member_id === memberId)
    .reduce((sum, payer) => sum + Math.round(payer.amount * 100), 0) - totalCents / memberRows.length;

  async function expectCompleteLargeGroup(page: Page) {
    await expect(page.getByTestId('expense-card')).toHaveCount(450);
    await expect(page.locator('.group-chip').filter({ hasText: 'expenses' })).toHaveText('450 expenses');
    await expect(page.getByTestId('group-total')).toHaveText(euros(totalCents));

    await showBalances(page);
    await expect(page.locator('.balance-row')).toHaveCount(memberRows.length);
    for (const member of memberRows) {
      const net = netCents(member.id);
      await expect(page.locator('.balance-row').filter({ hasText: member.name }).locator('.balance-amount'))
        .toHaveText(`${net > 0 ? '+' : ''}${euros(Math.abs(net))}`);
    }
  }

  test('a group with more split rows than the API row cap shows every expense and correct balances', async ({ page }) => {
    expect(large.expense_splits.length).toBeGreaterThan(MAX_ROWS);
    await mockBackend(page, { tables: large });
    const reads = recordReads(page);
    await page.goto(groupUrl());

    await expectCompleteLargeGroup(page);
    // One request per 200 expenses, each carrying its payers and splits.
    expect(reads.offsets('expenses')).toEqual(['0', '200', '400']);
    expect(reads.of('expense_payers')).toEqual([]);
    expect(reads.of('expense_splits')).toEqual([]);
  });

  test('an API row cap below the page size still loads every expense', async ({ page }) => {
    await mockBackend(page, { tables: large, maxRows: 120 });
    const reads = recordReads(page);
    await page.goto(groupUrl());

    await expectCompleteLargeGroup(page);
    // Paging continues from the rows received, not from the rows asked for.
    expect(reads.offsets('expenses')).toEqual(['0', '120', '240', '360']);
  });

  test('a failed later page fails the load instead of showing partial data', async ({ page }) => {
    await mockBackend(page, { tables: large });
    await failReadAt(page, 'expenses', 200);
    await page.goto(groupUrl());

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByTestId('expense-card')).toHaveCount(0);
    await expect(page.getByTestId('group-total')).toHaveCount(0);
  });

  test('a typical group loads its expenses, payers and splits with a single request', async ({ page }) => {
    await mockBackend(page);
    const reads = recordReads(page);
    await page.goto(groupUrl());
    await expect(page.getByTestId('expense-card')).toHaveCount(expenseRows.length);
    await expect(page.getByTestId('group-total')).toHaveText(euros(14160));

    const [read, ...others] = reads.of('expenses');
    expect(others).toEqual([]);
    expect(Object.fromEntries(read.query)).toEqual({
      select: '*,expense_payers(*),expense_splits(*)',
      group_id: `eq.${GROUP_ID}`,
      order: 'expense_date.desc,id.desc',
      offset: '0',
      limit: '200',
    });
    expect(read.prefer).toContain('count=exact');
    expect(reads.of('expense_payers')).toEqual([]);
    expect(reads.of('expense_splits')).toEqual([]);

    await showBalances(page);
    // Anna paid 96.60 and Ben 45.00; each of the three owes a third of 141.60.
    for (const [name, amount] of [['Anna', '+€49.40'], ['Ben', '€2.20'], ['Cleo', '€47.20']]) {
      await expect(page.locator('.balance-row').filter({ hasText: name }).locator('.balance-amount')).toHaveText(amount);
    }
  });
});

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
