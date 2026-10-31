import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import {
  READ_TOKEN,
  expenseRows,
  groupRow,
  groupUrl,
  manyExpenses,
  memberRows,
  mockBackend,
  seedRecentGroups,
  type BackendOptions,
} from './fixtures/group';

/*
 * Visual and responsive checks on the mocked backend.
 * Untagged tests are form-factor agnostic and run in both projects (Desktop Chrome
 * and Pixel 7). `@once` tests emulate their own devices and run in the desktop
 * project only. Screenshots go to test-results/screenshots/<width>-<theme>-<screen>.png.
 */

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

// Tests are type-checked without the DOM lib, so browser-side code is passed as strings.
const CONTRAST_AUDIT = readFileSync(new URL('./fixtures/contrast-audit.js', import.meta.url), 'utf8');
const lowContrast = (page: Page, root = 'body') =>
  page.evaluate(`(${CONTRAST_AUDIT})(${JSON.stringify(root)})`) as Promise<string[]>;

const scrollWidth = (page: Page) => page.evaluate('document.documentElement.scrollWidth') as Promise<number>;

/** Waits for running (finite) animations, capped so an endless one cannot hang the test. */
const settle = (page: Page) =>
  page.evaluate(`Promise.race([
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ])`);

async function openGroup(page: Page, options?: BackendOptions, token?: string) {
  await mockBackend(page, options);
  await page.goto(groupUrl(token));
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
  await settle(page);
}

/** The Balances view: side panel on desktop, its own tab below 1024px. */
async function showBalances(page: Page, isDesktop: boolean) {
  if (isDesktop) return page.getByRole('complementary', { name: 'Summary' });
  await page.getByTestId('balances-tab-button').click();
  return page.getByRole('tabpanel', { name: 'Balances' });
}

const isDesktopViewport = (page: Page) => page.viewportSize()!.width >= 1024;

/** Every card stays inside the viewport and its amount stays inside the card. */
async function expectCardsFit(page: Page) {
  const width = page.viewportSize()!.width;
  expect(await scrollWidth(page)).toBeLessThanOrEqual(width);
  const cards = page.getByTestId('expense-card');
  for (let i = 0; i < Math.min(await cards.count(), 4); i++) {
    const card = (await cards.nth(i).boundingBox())!;
    const amount = (await cards.nth(i).locator('.expense-amount').boundingBox())!;
    expect(card.x + card.width).toBeLessThanOrEqual(width);
    expect(amount.x + amount.width).toBeLessThanOrEqual(card.x + card.width + 0.5);
  }
}

test.describe('content edge cases', () => {
  test('20+ expenses and a seven-digit CHF amount stay readable', async ({ page }) => {
    await openGroup(page, {
      tables: { groups: [{ ...groupRow, currency: 'CHF' }], ...manyExpenses(24, 1_234_567.89) },
    });

    await expect(page.getByTestId('expense-card')).toHaveCount(24);
    await expect(page.getByTestId('expense-card').first()).toContainText('1,234,567.89');
    await expect(page.getByTestId('group-total')).toContainText('1,235,');
    await expectCardsFit(page);

    const balances = await showBalances(page, isDesktopViewport(page));
    await expect(balances.locator('.balance-row')).toHaveCount(3);
    for (const row of await balances.locator('.balance-row').all()) {
      const box = (await row.boundingBox())!;
      const amount = (await row.locator('.balance-amount').boundingBox())!;
      expect(amount.x + amount.width).toBeLessThanOrEqual(box.x + box.width + 0.5);
    }
    expect(await scrollWidth(page)).toBeLessThanOrEqual(page.viewportSize()!.width);
  });

  test('a very long group name wraps in the header without widening the page', async ({ page }) => {
    const name = 'Interrail summer 2026 with the whole extended family and friends from university';
    await openGroup(page, {
      tables: {
        groups: [{ ...groupRow, name }],
        members: [{ ...memberRows[0], name: 'Maximiliane Alexandra von Hohenzollern-Sigmaringen' }, ...memberRows.slice(1)],
        expenses: [{ ...expenseRows[0], description: 'Night train couchette upgrade, Vienna to Venice, incl. breakfast' }, expenseRows[1]],
      },
    });

    const heading = page.getByRole('heading', { level: 1, name });
    await expect(heading).toBeVisible();
    const box = (await heading.boundingBox())!;
    expect(box.x + box.width).toBeLessThanOrEqual(page.viewportSize()!.width);
    await expectCardsFit(page);
  });

  test('read-only links offer viewing only', async ({ page }) => {
    await openGroup(page, undefined, READ_TOKEN);

    await expect(page.locator('.group-chip-access')).toHaveText('view only');
    await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await expect(page.getByTestId('expense-delete-button')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'View details' })).toHaveCount(2);

    await page.getByTestId('members-tab-button').click();
    await expect(page.getByTestId('member-card')).toHaveCount(3);
    await expect(page.getByRole('textbox', { name: 'Add new member' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit name' })).toHaveCount(0);
  });

  test('no expenses: empty state invites the first one, balances explain why they are empty', async ({ page }) => {
    await mockBackend(page, { tables: { expenses: [], expense_payers: [], expense_splits: [] } });
    await page.goto(groupUrl());

    const panel = page.getByRole('tabpanel', { name: 'Expenses' });
    await expect(panel.getByRole('heading', { name: 'No expenses yet' })).toBeVisible();
    const balances = await showBalances(page, isDesktopViewport(page));
    await expect(balances.getByText('No balances yet')).toBeVisible();

    await page.getByTestId('expenses-tab-button').click();
    await panel.getByRole('button', { name: 'Add Expense' }).click();
    await expect(page.getByRole('dialog', { name: 'Add Expense' })).toBeVisible();
  });

  test('all settled: a celebratory status instead of settlements', async ({ page }) => {
    await openGroup(page, {
      tables: {
        expenses: [{ ...expenseRows[0], total_amount: 30 }],
        expense_payers: [{ id: 'p-1', expense_id: 'e-dinner', member_id: 'm-anna', amount: 30 }],
        expense_splits: [{ id: 's-1', expense_id: 'e-dinner', member_id: 'm-anna', share: 1, share_type: 'ratio' }],
      },
    });

    const balances = await showBalances(page, isDesktopViewport(page));
    await expect(balances.getByRole('status')).toContainText('All settled up!');
    await expect(balances.locator('.settlement-card')).toHaveCount(0);
  });
});

test.describe('motion, theme and dialogs', () => {
  test('reduced motion: dialogs and lists appear without transform animations', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openGroup(page);
    await page.getByTestId('add-expense-button').click();
    await expect(page.getByRole('dialog', { name: 'Add Expense' })).toBeVisible();

    // Every animation or transition that started is (near) instant.
    const durations = (await page.evaluate(
      'document.getAnimations().map((a) => Number(a.effect?.getTiming().duration) || 0)'
    )) as number[];
    for (const duration of durations) expect(duration).toBeLessThanOrEqual(1);
    expect(await page.evaluate('getComputedStyle(document.documentElement).scrollBehavior')).toBe('auto');
  });

  test('dark OS setting is applied before the group page mounts', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.addInitScript({
      content: `document.addEventListener('DOMContentLoaded', () => {
        window.__themeAtDcl = document.documentElement.getAttribute('data-theme');
        window.__rootEmptyAtDcl = document.getElementById('root')?.childElementCount === 0;
      });`,
    });
    await openGroup(page);

    expect(await page.evaluate('window.__themeAtDcl')).toBe('dark');
    expect(await page.evaluate('window.__rootEmptyAtDcl')).toBe(true);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#0a1110');
  });

  test('add expense dialog traps Tab and returns focus to its trigger', async ({ page }) => {
    await openGroup(page);
    const trigger = page.getByTestId('add-expense-button');
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Add Expense' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('[role="dialog"]:focus-within')).toHaveCount(1);

    for (let i = 0; i < 25; i++) {
      await page.keyboard.press(i < 18 ? 'Tab' : 'Shift+Tab');
      await expect(page.locator('[role="dialog"]:focus-within')).toHaveCount(1);
    }
    // The page behind cannot scroll while the dialog is open.
    expect(await page.evaluate('document.body.style.overflow')).toBe('hidden');

    // The footer action is always reachable without scrolling the sheet.
    await expect(page.getByTestId('expense-submit-button')).toBeInViewport({ ratio: 1 });

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });
});

test.describe('narrow phone (360px)', { tag: '@once' }, () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  for (const path of ['/', '/privacy', '/imprint', '/missing-page']) {
    test(`${path} does not scroll sideways`, async ({ page }) => {
      await mockBackend(page);
      await seedRecentGroups(page);
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    });
  }

  test('create and join sheets fit', async ({ page }) => {
    await mockBackend(page);
    await page.goto('/');
    for (const [trigger, title, action] of [
      ['Create Group', 'Create New Group', 'Create Group'],
      ['Join Group', 'Join Existing Group', 'Join Group'],
    ]) {
      await page.getByRole('button', { name: trigger, exact: true }).click();
      const dialog = page.getByRole('dialog', { name: title });
      await expect(dialog).toBeVisible();
      await settle(page);
      await expect(dialog.getByRole('button', { name: action, exact: true })).toBeInViewport({ ratio: 1 });
      expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
      await page.keyboard.press('Escape');
      await expect(dialog).toHaveCount(0);
    }
  });
});

/* ---------- Contrast audit: every visible text run meets WCAG AA ---------- */

for (const theme of ['light', 'dark'] as const) {
  for (const width of [375, 1280]) {
    test.describe(`contrast ${theme} ${width}`, { tag: '@once' }, () => {
      const phone = width < 1024;
      test.use({
        colorScheme: theme,
        viewport: { width, height: phone ? 812 : 800 },
        hasTouch: phone,
        isMobile: phone,
      });

      test('home and group views meet AA', async ({ page }) => {
        await seedRecentGroups(page);
        await mockBackend(page, { tables: manyExpenses(6, 96.6) });
        const findings: Record<string, string[]> = {};

        await page.goto('/');
        await expect(page.locator('.recent-card').first()).toBeVisible();
        await settle(page);
        findings.home = await lowContrast(page);

        await page.goto(groupUrl());
        await expect(page.getByTestId('expense-card').first()).toBeVisible();
        await settle(page);
        findings.expenses = await lowContrast(page);

        if (phone) {
          await page.getByTestId('balances-tab-button').click();
          await settle(page);
          findings.balances = await lowContrast(page);
        }
        await page.getByTestId('members-tab-button').click();
        await settle(page);
        findings.members = await lowContrast(page);

        if (phone) {
          await page.getByTestId('add-member-button').click();
          const sheet = page.getByRole('dialog', { name: 'Add Member' });
          await sheet.getByRole('textbox', { name: 'Name' }).fill('Dora');
          await sheet.getByTestId('member-submit-button').click();
          await expect(sheet.getByRole('status')).toHaveText('Dora added');
          await settle(page);
          findings.addMember = await lowContrast(page, '[role="dialog"]');
          await page.keyboard.press('Escape');
          await expect(sheet).toHaveCount(0);
        }

        await page.getByTestId('expenses-tab-button').click();
        await page.getByTestId('add-expense-button').click();
        await expect(page.getByRole('dialog', { name: 'Add Expense' })).toBeVisible();
        await settle(page);
        findings.addExpense = await lowContrast(page, '[role="dialog"]');

        expect(findings).toEqual({
          home: [],
          expenses: [],
          ...(phone ? { balances: [] } : {}),
          members: [],
          ...(phone ? { addMember: [] } : {}),
          addExpense: [],
        });
      });
    });
  }
}

/* ---------- Screenshot matrix for manual UI/UX review ---------- */

const SIZES = [
  { width: 375, height: 812, touch: true },
  { width: 768, height: 1024, touch: true },
  { width: 1280, height: 800, touch: false },
  { width: 1600, height: 900, touch: false },
];

for (const theme of ['light', 'dark'] as const) {
  for (const size of SIZES) {
    test.describe(`screenshots ${size.width} ${theme}`, { tag: '@once' }, () => {
      test.use({
        colorScheme: theme,
        viewport: { width: size.width, height: size.height },
        hasTouch: size.touch,
        isMobile: size.width < 640,
      });

      const shot = async (page: Page, screen: string, fullPage = false) => {
        await settle(page);
        await page.screenshot({
          path: join(test.info().project.outputDir, 'screenshots', `${size.width}-${theme}-${screen}.png`),
          fullPage,
          animations: 'disabled',
          caret: 'hide',
        });
      };

      test('home', async ({ page }) => {
        await mockBackend(page);
        await seedRecentGroups(page);
        await page.goto('/');
        await expect(page.locator('.recent-card').first()).toBeVisible();
        await shot(page, 'home', true);

        await page.getByRole('button', { name: 'Create Group', exact: true }).click();
        await expect(page.getByRole('dialog', { name: 'Create New Group' })).toBeVisible();
        await shot(page, 'home-create');
      });

      test('group', async ({ page }) => {
        await openGroup(page, { tables: manyExpenses(6, 96.6) });
        const desktop = size.width >= 1024;
        await shot(page, 'group-expenses');
        await shot(page, 'group-expenses-full', true);

        if (!desktop) {
          await page.getByTestId('balances-tab-button').click();
          await shot(page, 'group-balances', true);
        }
        await page.getByTestId('members-tab-button').click();
        await shot(page, 'group-members', true);

        if (!desktop) {
          // Below 1024px the Members FAB opens the add-member sheet.
          await page.getByTestId('add-member-button').click();
          const sheet = page.getByRole('dialog', { name: 'Add Member' });
          await expect(sheet).toBeVisible();
          await sheet.getByRole('textbox', { name: 'Name' }).fill('Dora');
          await shot(page, 'add-member');
          await sheet.getByTestId('member-submit-button').click();
          await expect(sheet.getByRole('status')).toHaveText('Dora added');
          await shot(page, 'add-member-added');
          await sheet.getByRole('button', { name: 'Done' }).click();
          await expect(sheet).toHaveCount(0);

          // Legal links live in the header "More" menu where the tab bar shows.
          await page.getByRole('button', { name: 'More', exact: true }).click();
          await expect(page.getByRole('navigation', { name: 'Legal' })).toBeVisible();
          await shot(page, 'more-menu');
          await page.keyboard.press('Escape');
        }
        await page.getByTestId('expenses-tab-button').click();

        await page.getByTestId('add-expense-button').click();
        const dialog = page.getByRole('dialog', { name: 'Add Expense' });
        await expect(dialog).toBeVisible();
        await shot(page, 'add-expense');
        await dialog.getByRole('button', { name: 'Custom split amounts' }).click();
        await dialog.getByLabel('Amount (EUR)').fill('90');
        await shot(page, 'add-expense-custom');
        await page.keyboard.press('Escape');
        await expect(dialog).toHaveCount(0);

        const card = page.getByTestId('expense-card').first();
        await card.hover();
        await card.getByTestId('expense-delete-button').click();
        await expect(page.getByTestId('confirm-dialog')).toBeVisible();
        await shot(page, 'confirm');
        await page.getByTestId('confirm-dialog-cancel-button').click();

        if (desktop) {
          await card.hover();
          await card.getByRole('button', { name: 'View details' }).click();
          await expect(page.getByRole('complementary').getByRole('heading', { name: 'Expense Details' })).toBeVisible();
          await shot(page, 'group-details');
        }
      });
    });
  }
}
