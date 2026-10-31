import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  GROUP_ID,
  expenseRows,
  groupRow,
  groupUrl,
  mockBackend,
  payerRows,
  seedRecentGroups,
  splitRows,
  type BackendWrite,
} from './fixtures/group';

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

const scrollWidth = (page: Page) => page.evaluate('document.documentElement.scrollWidth') as Promise<number>;

async function openAddExpense(page: Page) {
  await page.goto(groupUrl());
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  await page.getByTestId('add-expense-button').click();
  const dialog = page.getByRole('dialog', { name: 'Add Expense' });
  await expect(dialog).toBeVisible();
  return dialog;
}

test.describe('expense form', () => {
  test('amount fields use the decimal keypad and the split picker uses real checkboxes', async ({ page }) => {
    const dialog = await openAddExpense(page);

    const amount = dialog.getByLabel('Amount (EUR)');
    await expect(amount).toHaveAttribute('inputmode', 'decimal');
    await expect(amount).toHaveAttribute('data-testid', 'expense-amount-input');

    const anna = dialog.getByRole('checkbox', { name: 'Anna' });
    await expect(dialog.getByRole('checkbox')).toHaveCount(3);
    await expect(anna).toBeChecked();

    // The share preview follows the amount; unticking a member updates the count.
    await amount.fill('90');
    await expect(dialog.locator('.split-option-amount').first()).toHaveText('€30.00');
    await anna.uncheck();
    await expect(anna).not.toBeChecked();
    await expect(dialog.locator('.count-badge')).toHaveText('2');
    await expect(dialog.locator('.split-option-amount').first()).toHaveText('€45.00');

    // Segmented toggles expose their state.
    const equal = dialog.getByRole('button', { name: 'Equal split' });
    await expect(equal).toHaveAttribute('aria-pressed', 'true');
  });

  test('validation errors are announced and translated', async ({ page }) => {
    let dialog = await openAddExpense(page);
    await page.getByTestId('expense-submit-button').click();

    const alert = dialog.getByRole('alert');
    await expect(alert).toHaveText('Please enter an amount greater than 0');
    await expect(dialog.getByLabel('Amount (EUR)')).toBeFocused();

    await dialog.getByLabel('Amount (EUR)').fill('20');
    for (const checkbox of await dialog.getByRole('checkbox').all()) await checkbox.uncheck();
    await page.getByTestId('expense-submit-button').click();
    await expect(alert).toHaveText('Select at least one person to split with');

    // Same check in German.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    await page.getByTestId('add-expense-button').click();
    dialog = page.getByRole('dialog', { name: 'Ausgabe hinzufügen' });
    await page.getByTestId('expense-submit-button').click();
    await expect(dialog.getByRole('alert')).toHaveText('Bitte gib einen Betrag größer als 0 ein');
  });

  test('JPY: grouped whole amounts are saved exactly, decimals get whole-number guidance', async ({ page }) => {
    const writes = await mockBackend(page, { tables: { groups: [{ ...groupRow, currency: 'JPY' }] } });
    await page.goto(groupUrl());
    await expect(page.getByTestId('expense-card').first()).toBeVisible();
    await page.getByTestId('add-expense-button').click();
    const dialog = page.getByRole('dialog', { name: 'Add Expense' });
    const amount = dialog.getByLabel('Amount (JPY)');
    const alert = dialog.getByRole('alert');
    const submit = page.getByTestId('expense-submit-button');
    await expect(amount).toHaveAttribute('placeholder', '0');

    // Decimals or misplaced grouping: guidance for a currency without minor unit.
    for (const typed of ['12.5', '1,23,4', '1,500.50']) {
      await amount.fill(typed);
      await submit.click();
      await expect(alert).toHaveText(
        `"${typed}" isn't a valid amount. JPY has no decimals, so enter a whole number, e.g. 1500 or 1,500`
      );
      await expect(amount).toHaveAttribute('aria-invalid', 'true');
    }

    // The limit is shown at the currency's precision (no ".99").
    await amount.fill('10,000,000,000');
    await submit.click();
    await expect(alert).toHaveText('Amounts can be at most ¥9,999,999,999');

    // ¥1,500 is 1500 yen, split three ways.
    await amount.fill('1,500');
    await expect(dialog.locator('.split-option-amount').first()).toHaveText('¥500');
    await submit.click();
    await expect(dialog).toHaveCount(0);

    const expense = writes.find((write) => write.method === 'POST' && write.table === 'expenses');
    expect(expense?.body).toMatchObject({ total_amount: 1500 });
    const payers = writes.find((write) => write.method === 'POST' && write.table === 'expense_payers');
    expect(payers?.body).toEqual([expect.objectContaining({ member_id: 'm-anna', amount: 1500 })]);
  });

  test('custom amounts show a live remaining indicator and accept a decimal comma', async ({ page }) => {
    const dialog = await openAddExpense(page);
    await dialog.getByLabel('Amount (EUR)').fill('30');

    await dialog.getByRole('button', { name: 'Custom split amounts' }).click();
    const meter = dialog.getByTestId('amount-meter');
    await expect(meter).toContainText('€30.00 left');

    await dialog.getByRole('textbox', { name: 'Share of Anna' }).fill('12,5');
    await expect(meter).toContainText('€17.50 left');

    await dialog.getByRole('textbox', { name: 'Share of Ben' }).fill('20');
    await expect(meter).toHaveClass(/is-over/);
    await expect(meter).toContainText('€2.50 too much');

    await page.getByTestId('expense-submit-button').click();
    await expect(dialog.getByRole('alert')).toHaveText("Shares (€32.50) don't match the total (€30.00)");

    await dialog.getByRole('textbox', { name: 'Share of Ben' }).fill('17.5');
    await expect(meter).toHaveClass(/is-ok/);
    await expect(meter).toContainText('Adds up');
  });

  test('multiple payers get fluid amount rows', async ({ page }) => {
    const dialog = await openAddExpense(page);
    await dialog.getByRole('button', { name: 'Multiple payers' }).click();

    const row = dialog.getByRole('textbox', { name: 'Amount paid by Cleo' });
    await expect(row).toHaveAttribute('inputmode', 'decimal');
    await row.fill('abc4.5x');
    await expect(row).toHaveValue('4.5');
  });

  test.describe('narrow phone', () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

    test('fields are 16px or larger and custom rows fit without sideways scrolling', async ({ page }) => {
      const dialog = await openAddExpense(page);

      await expect(dialog.getByTestId('expense-description-input')).toHaveCSS('font-size', '16px');
      await expect(dialog.locator('select')).toHaveCSS('font-size', '16px');

      await dialog.getByRole('button', { name: 'Custom split amounts' }).click();
      const field = dialog.getByRole('textbox', { name: 'Share of Anna' });
      await expect(field).toHaveCSS('font-size', '16px');
      const box = (await field.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(110);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
      expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
      await expect(page.getByTestId('expense-submit-button')).toBeInViewport({ ratio: 1 });
    });
  });
});

test.describe('amount parsing', () => {
  test('pasted amounts with thousands grouping are read, ambiguous ones are rejected', async ({ page }) => {
    const writes = await mockBackend(page);
    const dialog = await openAddExpense(page);
    const amount = dialog.getByLabel('Amount (EUR)');
    const alert = dialog.getByRole('alert');
    const submit = page.getByTestId('expense-submit-button');

    // Ambiguous or malformed: an error, never a silently different number.
    for (const pasted of ['1,23,4', '1.234', '12.345,6.7', '1.5.0', '12 50', '10 12.50', '-5']) {
      await amount.fill(pasted);
      await submit.click();
      await expect(alert).toHaveText(`"${pasted}" isn't a valid amount. Use one decimal separator, e.g. 1234.56 or 1,234.56`);
      await expect(amount).toHaveAttribute('aria-invalid', 'true');
      await expect(amount).toBeFocused();
    }

    await amount.fill('12345678901');
    await submit.click();
    await expect(alert).toHaveText('Amounts can be at most €9,999,999,999.99');

    // EN grouping from a receipt; the share preview uses the parsed value.
    await amount.fill('1,234.56');
    await expect(dialog.locator('.split-option-amount').first()).toHaveText('€411.52');
    await amount.fill('€ 1.234,56');
    await expect(amount).toHaveValue('1.234,56');
    await expect(dialog.locator('.split-option-amount').first()).toHaveText('€411.52');
    await submit.click();
    await expect(dialog).toHaveCount(0);

    const expense = writes.find((write) => write.method === 'POST' && write.table === 'expenses');
    expect(expense?.body).toMatchObject({ total_amount: 1234.56 });
    const payers = writes.find((write) => write.method === 'POST' && write.table === 'expense_payers');
    expect(payers?.body).toEqual([expect.objectContaining({ member_id: 'm-anna', amount: 1234.56 })]);
  });

  test('an unreadable per-member amount is flagged on its own field', async ({ page }) => {
    const writes = await mockBackend(page);
    const dialog = await openAddExpense(page);
    await dialog.getByLabel('Amount (EUR)').fill('30');
    await dialog.getByRole('button', { name: 'Custom split amounts' }).click();
    const ben = dialog.getByRole('textbox', { name: 'Share of Ben' });
    await dialog.getByRole('textbox', { name: 'Share of Anna' }).fill('15');
    await ben.fill('1.5.0');
    await page.getByTestId('expense-submit-button').click();

    await expect(dialog.getByRole('alert')).toHaveText(
      `"1.5.0" isn't a valid amount. Use one decimal separator, e.g. 1234.56 or 1,234.56`
    );
    await expect(ben).toHaveAttribute('aria-invalid', 'true');
    await expect(dialog.getByRole('textbox', { name: 'Share of Anna' })).not.toHaveAttribute('aria-invalid');
    expect(writes).toEqual([]);
  });
});

test.describe('edit expense', () => {
  const groceries = {
    id: 'e-groceries',
    group_id: GROUP_ID,
    description: 'Groceries',
    total_amount: 50.5,
    expense_date: '2026-10-04T09:15:00.000Z',
    created_at: '2026-10-04T09:16:00.000Z',
  };
  const taxi = {
    id: 'e-taxi',
    group_id: GROUP_ID,
    description: 'Taxi home',
    total_amount: 18,
    expense_date: '2026-10-01T22:40:00.000Z',
    created_at: '2026-10-01T22:41:00.000Z',
  };
  const tables = {
    expenses: [groceries, ...expenseRows, taxi],
    expense_payers: [
      ...payerRows,
      { id: 'p-g1', expense_id: 'e-groceries', member_id: 'm-anna', amount: 30 },
      { id: 'p-g2', expense_id: 'e-groceries', member_id: 'm-ben', amount: 20.5 },
      { id: 'p-t1', expense_id: 'e-taxi', member_id: 'm-cleo', amount: 18 },
    ],
    expense_splits: [
      ...splitRows,
      { id: 's-g1', expense_id: 'e-groceries', member_id: 'm-anna', share: 10.5, share_type: 'fixed' },
      { id: 's-g2', expense_id: 'e-groceries', member_id: 'm-ben', share: 20, share_type: 'fixed' },
      { id: 's-g3', expense_id: 'e-groceries', member_id: 'm-cleo', share: 20, share_type: 'fixed' },
      { id: 's-t1', expense_id: 'e-taxi', member_id: 'm-anna', share: 1, share_type: 'ratio' },
      { id: 's-t2', expense_id: 'e-taxi', member_id: 'm-cleo', share: 1, share_type: 'ratio' },
    ],
  };

  let writes: BackendWrite[];
  test.beforeEach(async ({ page }) => {
    writes = await mockBackend(page, { tables });
    await page.goto(groupUrl());
    await expect(page.getByTestId('expense-card')).toHaveCount(4);
  });

  async function openEdit(page: Page, description: string) {
    const card = page.getByTestId('expense-card').filter({ hasText: description });
    await card.hover();
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Expense' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  const writesTo = (table: string, method: string) =>
    writes.filter((write) => write.table === table && write.method === method);

  test('several payers and fixed shares are prefilled and saved as edited', async ({ page }) => {
    const dialog = await openEdit(page, 'Groceries');

    await expect(dialog.getByTestId('expense-description-input')).toHaveValue('Groceries');
    await expect(dialog.getByTestId('expense-amount-input')).toHaveValue('50.5');
    await expect(dialog.getByRole('button', { name: 'Multiple payers' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('button', { name: 'Custom split amounts' })).toHaveAttribute('aria-pressed', 'true');

    const paid = (name: string) => dialog.getByRole('textbox', { name: `Amount paid by ${name}` });
    const share = (name: string) => dialog.getByRole('textbox', { name: `Share of ${name}` });
    await expect(paid('Anna')).toHaveValue('30');
    await expect(paid('Ben')).toHaveValue('20.5');
    await expect(paid('Cleo')).toHaveValue('');
    await expect(share('Anna')).toHaveValue('10.5');
    await expect(share('Ben')).toHaveValue('20');
    await expect(share('Cleo')).toHaveValue('20');
    for (const meter of await dialog.getByTestId('amount-meter').all()) await expect(meter).toContainText('Adds up');

    await share('Ben').fill('15');
    await share('Cleo').fill('25');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog).toHaveCount(0);

    await expect.poll(() => writes.length).toBe(5);
    const [update] = writesTo('expenses', 'PATCH');
    expect(update.query).toMatchObject({ id: 'eq.e-groceries' });
    expect(update.body).toEqual({
      description: 'Groceries',
      total_amount: 50.5,
      expense_date: groceries.expense_date,
    });
    expect(writesTo('expense_payers', 'DELETE')[0].query).toMatchObject({ expense_id: 'eq.e-groceries' });
    expect(writesTo('expense_splits', 'DELETE')[0].query).toMatchObject({ expense_id: 'eq.e-groceries' });
    expect(writesTo('expense_payers', 'POST')[0].body).toEqual([
      { expense_id: 'e-groceries', member_id: 'm-anna', amount: 30 },
      { expense_id: 'e-groceries', member_id: 'm-ben', amount: 20.5 },
    ]);
    expect(writesTo('expense_splits', 'POST')[0].body).toEqual([
      { expense_id: 'e-groceries', member_id: 'm-anna', share: 10.5, share_type: 'fixed' },
      { expense_id: 'e-groceries', member_id: 'm-ben', share: 15, share_type: 'fixed' },
      { expense_id: 'e-groceries', member_id: 'm-cleo', share: 25, share_type: 'fixed' },
    ]);
  });

  test('an equal split prefills the payer and the ticked members', async ({ page }) => {
    const dialog = await openEdit(page, 'Taxi home');

    await expect(dialog.getByTestId('expense-amount-input')).toHaveValue('18');
    await expect(dialog.getByRole('button', { name: 'Single payer' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('button', { name: 'Equal split' })).toHaveAttribute('aria-pressed', 'true');
    await expect(dialog.getByRole('combobox', { name: 'Who paid?' })).toHaveValue('m-cleo');
    await expect(dialog.getByRole('checkbox', { name: 'Anna' })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Ben' })).not.toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: 'Cleo' })).toBeChecked();
    await expect(dialog.locator('.count-badge')).toHaveText('2');

    // A German-formatted paste is read as 1234.56, not 1.23456.
    await dialog.getByTestId('expense-amount-input').fill('1.234,56');
    await dialog.getByRole('checkbox', { name: 'Ben' }).check();
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog).toHaveCount(0);

    await expect.poll(() => writes.length).toBe(5);
    expect(writesTo('expenses', 'PATCH')[0].body).toMatchObject({ total_amount: 1234.56 });
    expect(writesTo('expense_payers', 'POST')[0].body).toEqual([
      { expense_id: 'e-taxi', member_id: 'm-cleo', amount: 1234.56 },
    ]);
    expect(writesTo('expense_splits', 'POST')[0].body).toEqual(
      ['m-anna', 'm-ben', 'm-cleo'].map((member_id) => ({ expense_id: 'e-taxi', member_id, share: 1, share_type: 'ratio' }))
    );
    await expect(page.getByTestId('expense-card').filter({ hasText: 'Taxi home' })).toContainText('1,234.56');
  });
});

test.describe('edit legacy fractional JPY expense', () => {
  // Older clients accepted fractional yen; the DECIMAL(12, 2) columns kept them.
  const ramen = {
    id: 'e-ramen',
    group_id: GROUP_ID,
    description: 'Ramen night',
    total_amount: 96.6,
    expense_date: '2026-10-05T12:00:00.000Z',
    created_at: '2026-10-05T12:01:00.000Z',
  };
  const sushi = {
    id: 'e-sushi',
    group_id: GROUP_ID,
    description: 'Sushi lunch',
    total_amount: 96.6,
    expense_date: '2026-10-04T12:00:00.000Z',
    created_at: '2026-10-04T12:01:00.000Z',
  };
  const tables = {
    groups: [{ ...groupRow, currency: 'JPY' }],
    expenses: [ramen, sushi, ...expenseRows],
    expense_payers: [
      ...payerRows,
      { id: 'p-r1', expense_id: 'e-ramen', member_id: 'm-anna', amount: 50.3 },
      { id: 'p-r2', expense_id: 'e-ramen', member_id: 'm-ben', amount: 46.3 },
      { id: 'p-s1', expense_id: 'e-sushi', member_id: 'm-cleo', amount: 96.6 },
    ],
    expense_splits: [
      ...splitRows,
      { id: 's-r1', expense_id: 'e-ramen', member_id: 'm-anna', share: 1, share_type: 'ratio' },
      { id: 's-r2', expense_id: 'e-ramen', member_id: 'm-ben', share: 1, share_type: 'ratio' },
      { id: 's-s1', expense_id: 'e-sushi', member_id: 'm-anna', share: 48.3, share_type: 'fixed' },
      { id: 's-s2', expense_id: 'e-sushi', member_id: 'm-ben', share: 48.3, share_type: 'fixed' },
    ],
  };

  let writes: BackendWrite[];
  test.beforeEach(async ({ page }) => {
    writes = await mockBackend(page, { tables });
    await page.goto(groupUrl());
    await expect(page.getByTestId('expense-card')).toHaveCount(4);
  });

  async function openEdit(page: Page, description: string) {
    const card = page.getByTestId('expense-card').filter({ hasText: description });
    await card.hover();
    await card.getByRole('button', { name: 'Edit', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Edit Expense' });
    await expect(dialog).toBeVisible();
    return dialog;
  }

  /** Changes only the description, saves and waits for the five update writes. */
  async function saveDescriptionOnly(dialog: Locator, description: string) {
    await dialog.getByTestId('expense-description-input').fill(description);
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog).toHaveCount(0);
    await expect.poll(() => writes.length).toBe(5);
  }

  const writesTo = (table: string, method: string) =>
    writes.filter((write) => write.table === table && write.method === method);
  const paid = (dialog: Locator, name: string) =>
    dialog.getByRole('textbox', { name: `Amount paid by ${name}` });
  const share = (dialog: Locator, name: string) =>
    dialog.getByRole('textbox', { name: `Share of ${name}` });
  const ratioSplits = (expenseId: string, memberIds: string[]) =>
    memberIds.map((member_id) => ({ expense_id: expenseId, member_id, share: 1, share_type: 'ratio' }));

  test('single payer: a description-only save keeps the stored total and payment', async ({ page }) => {
    const dialog = await openEdit(page, 'Dinner at Figlmüller');
    await expect(dialog.getByTestId('expense-amount-input')).toHaveValue('96.6');

    await saveDescriptionOnly(dialog, 'Dinner with friends');
    expect(writesTo('expenses', 'PATCH')[0].body).toEqual({
      description: 'Dinner with friends',
      total_amount: 96.6,
      expense_date: expenseRows[0].expense_date,
    });
    expect(writesTo('expense_payers', 'POST')[0].body).toEqual([
      { expense_id: 'e-dinner', member_id: 'm-anna', amount: 96.6 },
    ]);
    expect(writesTo('expense_splits', 'POST')[0].body).toEqual(ratioSplits('e-dinner', ['m-anna', 'm-ben', 'm-cleo']));
  });

  test('multiple payers: a description-only save keeps untouched stored payments', async ({ page }) => {
    const dialog = await openEdit(page, 'Ramen night');
    await expect(dialog.getByTestId('expense-amount-input')).toHaveValue('96.6');
    await expect(paid(dialog, 'Anna')).toHaveValue('50.3');
    await expect(paid(dialog, 'Ben')).toHaveValue('46.3');

    await saveDescriptionOnly(dialog, 'Ramen with friends');
    expect(writesTo('expenses', 'PATCH')[0].body).toMatchObject({
      description: 'Ramen with friends',
      total_amount: 96.6,
    });
    expect(writesTo('expense_payers', 'POST')[0].body).toEqual([
      { expense_id: 'e-ramen', member_id: 'm-anna', amount: 50.3 },
      { expense_id: 'e-ramen', member_id: 'm-ben', amount: 46.3 },
    ]);
  });

  test('multiple payers: stored payments add up and are saved unchanged', async ({ page }) => {
    const dialog = await openEdit(page, 'Ramen night');
    await expect(dialog.getByTestId('expense-amount-input')).toHaveValue('96.6');
    await expect(paid(dialog, 'Anna')).toHaveValue('50.3');
    await expect(paid(dialog, 'Ben')).toHaveValue('46.3');
    const meter = dialog.getByTestId('amount-meter');
    await expect(meter).toHaveClass(/is-ok/);
    await expect(meter).toContainText('Adds up');

    // Switching modes clears the fields; typing the stored text again still counts as unchanged.
    await dialog.getByRole('button', { name: 'Single payer' }).click();
    await dialog.getByRole('button', { name: 'Multiple payers' }).click();
    await expect(paid(dialog, 'Anna')).toHaveValue('');
    await paid(dialog, 'Anna').fill('50.3');
    await paid(dialog, 'Ben').fill('46.3');
    await expect(meter).toHaveClass(/is-ok/);

    await saveDescriptionOnly(dialog, 'Ramen night out');
    expect(writesTo('expenses', 'PATCH')[0].body).toMatchObject({ description: 'Ramen night out', total_amount: 96.6 });
    expect(writesTo('expense_payers', 'POST')[0].body).toEqual([
      { expense_id: 'e-ramen', member_id: 'm-anna', amount: 50.3 },
      { expense_id: 'e-ramen', member_id: 'm-ben', amount: 46.3 },
    ]);
    expect(writesTo('expense_splits', 'POST')[0].body).toEqual(ratioSplits('e-ramen', ['m-anna', 'm-ben']));
  });

  test('fixed split: stored shares add up and are saved unchanged', async ({ page }) => {
    const dialog = await openEdit(page, 'Sushi lunch');
    await expect(dialog.getByRole('button', { name: 'Custom split amounts' })).toHaveAttribute('aria-pressed', 'true');
    await expect(share(dialog, 'Anna')).toHaveValue('48.3');
    await expect(share(dialog, 'Ben')).toHaveValue('48.3');
    await expect(share(dialog, 'Cleo')).toHaveValue('');
    const meter = dialog.getByTestId('amount-meter');
    await expect(meter).toHaveClass(/is-ok/);
    await expect(meter).toContainText('Adds up');

    await saveDescriptionOnly(dialog, 'Sushi lunch downtown');
    expect(writesTo('expenses', 'PATCH')[0].body).toMatchObject({ total_amount: 96.6 });
    expect(writesTo('expense_payers', 'POST')[0].body).toEqual([
      { expense_id: 'e-sushi', member_id: 'm-cleo', amount: 96.6 },
    ]);
    expect(writesTo('expense_splits', 'POST')[0].body).toEqual([
      { expense_id: 'e-sushi', member_id: 'm-anna', share: 48.3, share_type: 'fixed' },
      { expense_id: 'e-sushi', member_id: 'm-ben', share: 48.3, share_type: 'fixed' },
    ]);
  });

  test('edited amounts are still checked for whole yen', async ({ page }) => {
    const whole = (typed: string) =>
      `"${typed}" isn't a valid amount. JPY has no decimals, so enter a whole number, e.g. 1500 or 1,500`;

    let dialog = await openEdit(page, 'Dinner at Figlmüller');
    const amount = dialog.getByTestId('expense-amount-input');
    await amount.fill('100.5');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog.getByRole('alert')).toHaveText(whole('100.5'));
    await expect(amount).toHaveAttribute('aria-invalid', 'true');
    await expect(amount).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);

    // An edited payment is flagged on its own field while the untouched one passes.
    dialog = await openEdit(page, 'Ramen night');
    await paid(dialog, 'Anna').fill('50.5');
    await dialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(dialog.getByRole('alert')).toHaveText(whole('50.5'));
    await expect(paid(dialog, 'Anna')).toHaveAttribute('aria-invalid', 'true');
    await expect(paid(dialog, 'Ben')).not.toHaveAttribute('aria-invalid');
    expect(writes).toEqual([]);
  });
});

test.describe('home page', () => {
  test('create and join open in accessible dialogs that keep the header usable', async ({ page }) => {
    await page.goto('/');
    const createTrigger = page.getByRole('button', { name: 'Create Group', exact: true });
    await createTrigger.click();

    const create = page.getByRole('dialog', { name: 'Create New Group' });
    await expect(create).toHaveAttribute('aria-modal', 'true');
    await expect(create.getByLabel('Group Name')).toBeFocused();
    await expect(create.getByRole('button', { name: 'Create Group' })).toBeDisabled();
    await create.getByLabel('Group Name').fill('Ski trip');
    await expect(create.getByRole('button', { name: 'Create Group' })).toBeEnabled();

    // The header stays above the backdrop.
    const headerBox = (await page.locator('header.header').boundingBox())!;
    const overlayBox = (await page.locator('.modal-overlay').boundingBox())!;
    expect(overlayBox.y).toBeGreaterThanOrEqual(Math.floor(headerBox.y + headerBox.height));

    await page.keyboard.press('Escape');
    await expect(create).toHaveCount(0);
    await expect(createTrigger).toBeFocused();

    await page.getByRole('button', { name: 'Join Group', exact: true }).click();
    const join = page.getByRole('dialog', { name: 'Join Existing Group' });
    const link = join.getByLabel('Group Link');
    await expect(link).toHaveAccessibleDescription(/Ask your friend/);
    await link.fill('not a link');
    await link.press('Enter');
    await expect(join.getByRole('alert')).toHaveText('Invalid link format');
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

    test('hero, recent groups and steps fit a 375px screen', async ({ page }) => {
      await seedRecentGroups(page);
      await page.goto('/');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Split expenses, stay fair');
      const cards = page.locator('.recent-card');
      await expect(cards).toHaveCount(2);
      await expect(cards.first()).toContainText('Opened today');
      await expect(cards.first()).toContainText('full access');
      await expect(cards.first()).toContainText('3 members');
      await expect(cards.nth(1)).toContainText('Opened yesterday');
      await expect(cards.nth(1)).toContainText('view only');

      // The name keeps most of the card; actions stay 44px.
      const name = (await cards.nth(1).locator('.recent-card-name').boundingBox())!;
      const card = (await cards.nth(1).boundingBox())!;
      expect(name.width / card.width).toBeGreaterThan(0.5);
      for (const action of await cards.first().locator('.recent-card-actions button').all()) {
        const box = (await action.boundingBox())!;
        expect(Math.round(box.width)).toBeGreaterThanOrEqual(44);
      }

      await expect(page.getByRole('button', { name: 'Remove Weekend in Vienna from this list' })).toBeVisible();
      await expect(page.locator('.step')).toHaveCount(4);
      expect(await scrollWidth(page)).toBeLessThanOrEqual(375);

      await page.getByRole('button', { name: 'Remove Weekend in Vienna from this list' }).click();
      await expect(cards).toHaveCount(1);
    });

    test('create dialog is a bottom sheet below the header', async ({ page }) => {
      await page.goto('/');
      await page.getByRole('button', { name: 'Create Group', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Create New Group' });
      await expect(dialog).toBeVisible();
      await expect(page.getByRole('button', { name: 'Theme: light', exact: true })).toBeInViewport();
      await expect(dialog.getByRole('button', { name: 'Create Group' })).toBeInViewport({ ratio: 1 });
    });
  });
});
