import { expect, test, type Locator, type Page } from '@playwright/test';
import { GROUP_ID, READ_TOKEN, failWrites, groupUrl, manyExpenses, manyMembers, mockBackend } from './fixtures/group';

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

async function openGroup(page: Page, token?: string) {
  await page.goto(groupUrl(token));
  await expect(page.getByTestId('expense-card').first()).toBeVisible();
}

const scrollWidth = (page: Page) => page.evaluate('document.documentElement.scrollWidth') as Promise<number>;

/** Let entry animations (FAB, list reveal) finish before measuring. */
const settle = (page: Page) => page.evaluate('Promise.all(document.getAnimations().map((a) => a.finished))');

const scrollY = (page: Page) => page.evaluate('window.scrollY') as Promise<number>;

/** Instant: html uses smooth scrolling. */
const scrollToY = (page: Page, top: number) => page.evaluate(`window.scrollTo({ top: ${top}, behavior: 'instant' })`);

const LONG_LISTS = { ...manyExpenses(30), members: manyMembers(30) };

/** The element sits between the sticky header and the bottom tab bar (if any). */
async function expectInVisibleArea(page: Page, locator: Locator) {
  const header = (await page.locator('header.header').boundingBox())!;
  const tabbar = page.locator('.mobile-tabbar');
  const bar = (await tabbar.count()) > 0 ? await tabbar.boundingBox() : null;
  const bottom = bar ? bar.y : page.viewportSize()!.height;
  const box = (await locator.boundingBox())!;
  expect(box.y).toBeGreaterThanOrEqual(header.y + header.height - 1);
  expect(box.y + box.height).toBeLessThanOrEqual(bottom + 1);
}

/**
 * The page already sits at its final position when the tab is selected (no smooth
 * scroll in flight) and stays there; optionally at `expected` (±2px).
 */
async function expectScrollSettled(page: Page, expected?: number) {
  const first = await scrollY(page);
  if (expected !== undefined) expect(Math.abs(first - expected)).toBeLessThanOrEqual(2);
  await page.waitForTimeout(250);
  expect(await scrollY(page)).toBe(first);
}

test.describe('desktop', { tag: '@desktop' }, () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('shows tabs, add button and a sticky summary side panel without a Balances tab', async ({ page }) => {
    await openGroup(page);

    await expect(page.getByRole('heading', { level: 1, name: 'Weekend in Vienna' })).toBeVisible();
    await expect(page.getByRole('tab')).toHaveCount(2);
    await expect(page.getByTestId('expenses-tab-button')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tab', { name: 'Balances' })).toHaveCount(0);
    await expect(page.locator('.mobile-tabbar')).toHaveCount(0);
    await expect(page.locator('.fab')).toHaveCount(0);
    await expect(page.getByTestId('add-expense-button')).toBeVisible();

    const aside = page.getByRole('complementary', { name: 'Summary' });
    await expect(aside.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(aside.getByText('Total Expenses')).toBeVisible();
    await expect(aside.getByText('Individual Balances')).toBeVisible();
    expect(await page.evaluate("getComputedStyle(document.querySelector('.group-aside')).position")).toBe('sticky');

    // Main column and side panel sit side by side.
    const main = (await page.locator('.group-main').boundingBox())!;
    const side = (await page.locator('.group-aside').boundingBox())!;
    expect(side.x).toBeGreaterThanOrEqual(main.x + main.width);
    expect(Math.abs(side.y - main.y)).toBeLessThan(2);
  });

  test('viewing an expense shows its details in the side panel', async ({ page }) => {
    // Read-only links get the view action only (writers: see group-content.spec.ts).
    await openGroup(page, READ_TOKEN);

    const view = page.getByRole('button', { name: 'View details' }).first();
    await view.click();

    const aside = page.getByRole('complementary');
    const heading = aside.getByRole('heading', { name: 'Expense Details' });
    await expect(heading).toBeVisible();
    await expect(heading).toBeFocused();
    await expect(aside.getByText('Dinner at Figlmüller')).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);

    await page.keyboard.press('Escape');
    await expect(aside.getByRole('heading', { name: 'Summary' })).toBeVisible();
    await expect(view).toBeFocused();
  });

  test('tabs follow the ARIA tabs pattern', async ({ page }) => {
    await openGroup(page);

    const expensesTab = page.getByTestId('expenses-tab-button');
    await expensesTab.focus();
    await page.keyboard.press('ArrowRight');

    const membersTab = page.getByTestId('members-tab-button');
    await expect(membersTab).toBeFocused();
    await expect(membersTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Members' })).toBeVisible();
    await expect(page.getByTestId('member-card')).toHaveCount(3);
    // The add-expense action belongs to the Expenses section.
    await expect(page.getByTestId('add-expense-button')).toHaveCount(0);

    await page.keyboard.press('Home');
    await expect(expensesTab).toBeFocused();
    await expect(page.getByRole('tabpanel', { name: 'Expenses' })).toBeVisible();
  });

  test('Members keeps the inline add form and no member FAB', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('members-tab-button').click();

    const input = page.getByTestId('member-name-input');
    await expect(input).toBeVisible();
    await expect(input).toHaveAccessibleName('Add new member');
    await expect(page.getByTestId('add-member-button')).toHaveCount(0);
    await expect(page.locator('.fab')).toHaveCount(0);

    await input.fill('Dora');
    await page.getByTestId('member-submit-button').click();
    await expect(page.getByTestId('member-card').filter({ hasText: 'Dora' })).toHaveCount(1);
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('a failed inline add shows an alert and keeps the name for a retry', async ({ page }) => {
    const writes = await mockBackend(page);
    await failWrites(page, 'members', 'POST');
    await openGroup(page);
    await page.getByTestId('members-tab-button').click();

    const input = page.getByTestId('member-name-input');
    await input.fill('Dora');
    await page.getByTestId('member-submit-button').click();
    const alert = page.getByTestId('member-form-error');
    await expect(alert).toHaveRole('alert');
    await expect(alert).toHaveText('Could not add the member. Please try again.');
    await expect(input).toHaveValue('Dora');
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(input).toHaveAccessibleDescription('Could not add the member. Please try again.');
    await expect(input).toBeFocused();
    await expect(page.getByTestId('member-card')).toHaveCount(3);

    // Editing the name clears the alert; the retry goes through.
    await input.press('End');
    await input.pressSequentially('h');
    await expect(alert).toHaveCount(0);
    await expect(input).not.toHaveAttribute('aria-invalid', /.*/);
    await page.getByTestId('member-submit-button').click();
    await expect(page.getByTestId('member-card').filter({ hasText: 'Dorah' })).toHaveCount(1);
    await expect(input).toHaveValue('');
    await expect(alert).toHaveCount(0);
    expect(writes.filter((w) => w.method === 'POST' && w.table === 'members')).toHaveLength(1);
  });

  test('an empty members list keeps the desktop wording', async ({ page }) => {
    await mockBackend(page, { tables: { members: [], expenses: [], expense_payers: [], expense_splits: [] } });
    await page.goto(groupUrl());
    await page.getByTestId('members-tab-button').click();
    await expect(page.getByText('Add members to start splitting expenses')).toBeVisible();
    await expect(page.getByText('Tap + to add your first member')).toHaveCount(0);
  });

  test.describe('long lists', () => {
    test.beforeEach(async ({ page }) => {
      await mockBackend(page, { tables: LONG_LISTS });
    });

    test('tab changes open the section below the header and restore it afterwards', async ({ page }) => {
      await openGroup(page);
      await settle(page);
      const expensesTab = page.getByTestId('expenses-tab-button');
      const membersTab = page.getByTestId('members-tab-button');

      // Keyboard path: the focused tab is scrolled out of view.
      await page.evaluate("document.querySelector('[data-testid=expenses-tab-button]').focus({ preventScroll: true })");
      await scrollToY(page, 1500);
      expect(await scrollY(page)).toBe(1500);

      await page.keyboard.press('ArrowRight');
      await expect(membersTab).toHaveAttribute('aria-selected', 'true');
      await expect(membersTab).toBeFocused();
      await expectInVisibleArea(page, page.locator('.group-panel-toolbar'));
      await expectInVisibleArea(page, page.getByTestId('member-name-input'));
      await expectScrollSettled(page);

      await scrollToY(page, (await scrollY(page)) + 300);
      const membersY = await scrollY(page);

      await page.keyboard.press('ArrowLeft');
      await expect(expensesTab).toHaveAttribute('aria-selected', 'true');
      await expectScrollSettled(page, 1500);

      // Mouse path: back to where Members was left.
      await scrollToY(page, 0);
      await membersTab.click();
      await expect(membersTab).toHaveAttribute('aria-selected', 'true');
      await expectScrollSettled(page, membersY);
    });

    test('switching tabs at the top of the page does not scroll', async ({ page }) => {
      await openGroup(page);
      await page.getByTestId('members-tab-button').click();
      await expect(page.getByTestId('member-card')).toHaveCount(30);
      await expectScrollSettled(page, 0);
    });
  });
});

test.describe('wide', { tag: '@desktop' }, () => {
  test.use({ viewport: { width: 1600, height: 900 } });

  test('uses the extra width', async ({ page }) => {
    await openGroup(page);
    const shell = (await page.locator('.group-shell').boundingBox())!;
    expect(shell.width).toBeGreaterThan(1350);
    const side = (await page.locator('.group-aside').boundingBox())!;
    expect(side.width).toBeGreaterThanOrEqual(400);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('bottom tab bar switches sections and the FAB sits above it', async ({ page }) => {
    await openGroup(page);
    const viewport = page.viewportSize()!;

    const tabbar = page.getByRole('navigation', { name: 'Group sections' });
    await expect(tabbar).toBeVisible();
    const barBox = (await tabbar.boundingBox())!;
    expect(Math.round(barBox.y + barBox.height)).toBe(viewport.height);

    const tabs = tabbar.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    for (const tab of await tabs.all()) {
      const box = (await tab.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(48);
    }

    // The hero shows name, total and access.
    await expect(page.getByRole('heading', { level: 1, name: 'Weekend in Vienna' })).toBeVisible();
    await expect(page.getByTestId('group-total')).toBeVisible();
    await expect(page.locator('.group-chip-access')).toHaveText('full access');
    await expect(page.locator('.group-aside')).toHaveCount(0);

    const fab = page.getByTestId('add-expense-button');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAccessibleName('Add Expense');
    await settle(page);
    const fabBox = (await fab.boundingBox())!;
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(barBox.y);
    expect(fabBox.height).toBeGreaterThanOrEqual(48);

    // Nothing to add on Balances: no FAB and no reserved gap for it.
    await tabbar.getByRole('tab', { name: 'Balances' }).click();
    await expect(page.getByRole('tabpanel', { name: 'Balances' })).toBeVisible();
    await expect(page.getByText('Individual Balances')).toBeVisible();
    await expect(page.locator('.fab')).toHaveCount(0);
    await expect(page.locator('.app-group')).not.toHaveClass(/has-fab/);

    // Members: the FAB adds a member; the inline form is desktop-only.
    await page.getByTestId('members-tab-button').click();
    await expect(page.getByTestId('member-card')).toHaveCount(3);
    await expect(fab).toHaveCount(0);
    const memberFab = page.getByTestId('add-member-button');
    await expect(memberFab).toBeVisible();
    await expect(memberFab).toHaveAccessibleName('Add Member');
    await expect(memberFab).toHaveClass(/\bfab\b/);
    await expect(page.locator('.app-group')).toHaveClass(/has-fab/);
    await expect(page.getByTestId('member-name-input')).toHaveCount(0);
    await settle(page);
    const memberFabBox = (await memberFab.boundingBox())!;
    expect(memberFabBox.y + memberFabBox.height).toBeLessThanOrEqual(barBox.y);

    await page.getByTestId('expenses-tab-button').click();
    await expect(page.getByTestId('expense-card')).toHaveCount(2);
    await expect(fab).toBeVisible();
    await expect(memberFab).toHaveCount(0);
  });

  test('Balances leaves no FAB gap below its content', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('balances-tab-button').click();
    await expect(page.getByText('Individual Balances')).toBeVisible();
    await settle(page);
    await page.evaluate("window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");

    const barTop = (await page.locator('.mobile-tabbar').boundingBox())!.y;
    const panel = (await page.locator('.group-panel').boundingBox())!;
    const gap = barTop - (panel.y + panel.height);
    expect(gap).toBeGreaterThanOrEqual(0);
    // Only regular page spacing remains (the FAB needs ~56px + margins).
    expect(gap).toBeLessThan(48);
  });

  test('no footer band above the tab bar; content ends above the FAB', async ({ page }) => {
    await openGroup(page);
    await settle(page);
    // The legal links live in the header "More" menu instead.
    await expect(page.locator('footer.footer')).toBeHidden();
    await expect(page.getByRole('button', { name: 'More', exact: true })).toBeVisible();

    // Instant: html uses smooth scrolling.
    await page.evaluate("window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' })");

    const barTop = (await page.locator('.mobile-tabbar').boundingBox())!.y;
    const fabTop = (await page.locator('.fab').boundingBox())!.y;
    const panel = (await page.locator('.group-panel').boundingBox())!;
    const lastCard = (await page.getByTestId('expense-card').last().boundingBox())!;

    expect(lastCard.y + lastCard.height).toBeLessThanOrEqual(fabTop);
    // The page ends with the panel, clear of the FAB.
    expect(panel.y + panel.height).toBeLessThanOrEqual(fabTop - 8);
    expect(panel.y + panel.height).toBeLessThanOrEqual(barTop);
  });

  test('read-only links show the tab bar but no FAB on any tab', async ({ page }) => {
    await openGroup(page, READ_TOKEN);
    await expect(page.getByRole('navigation', { name: 'Group sections' })).toBeVisible();
    await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
    await expect(page.locator('.group-chip-access')).toHaveText('view only');
    await expect(page.getByTestId('expense-delete-button')).toHaveCount(0);

    for (const id of ['expenses-tab-button', 'balances-tab-button', 'members-tab-button']) {
      await page.getByTestId(id).click();
      await expect(page.getByTestId(id)).toHaveAttribute('aria-selected', 'true');
      await expect(page.locator('.fab'), id).toHaveCount(0);
      await expect(page.locator('.app-group'), id).not.toHaveClass(/has-fab/);
    }
    await expect(page.getByTestId('add-member-button')).toHaveCount(0);
    await expect(page.getByTestId('member-name-input')).toHaveCount(0);
  });

  test('shows a skeleton while the group loads', async ({ page }) => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route('**/rest/v1/rpc/get_group', async (route) => {
      await gate;
      await route.fallback();
    });

    await page.goto(groupUrl());
    const loading = page.getByTestId('group-loading');
    await expect(loading).toBeVisible();
    await expect(loading).toHaveAttribute('role', 'status');
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(loading).toContainText('Loading group...');

    release();
    await expect(page.getByTestId('expense-card').first()).toBeVisible();
    await expect(loading).toHaveCount(0);
  });

  test('invalid links get a friendly status card', async ({ page }) => {
    await page.goto(`/g/${GROUP_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Invalid Link' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go Home' })).toBeVisible();
    await expect(page.locator('.mobile-tabbar')).toHaveCount(0);
  });
});

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test.describe(`phone with long lists (${reducedMotion} motion)`, { tag: '@once' }, () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true, reducedMotion });

    test.beforeEach(async ({ page }) => {
      await mockBackend(page, { tables: LONG_LISTS });
    });

    test('each section opens at its heading, then where it was left', async ({ page }) => {
      await openGroup(page);
      await settle(page);
      await scrollToY(page, 2500);
      expect(await scrollY(page)).toBe(2500);

      const tabbar = page.getByRole('navigation', { name: 'Group sections' });
      const panelTitle = page.locator('.group-panel-title');

      await tabbar.getByRole('tab', { name: 'Members' }).click();
      await expect(page.getByTestId('members-tab-button')).toHaveAttribute('aria-selected', 'true');
      await expect(panelTitle).toHaveText('Members');
      await expectInVisibleArea(page, panelTitle);
      await expectInVisibleArea(page, page.getByTestId('member-card').first());
      await expect(page.getByTestId('add-member-button')).toBeInViewport();
      await expectScrollSettled(page);

      await scrollToY(page, (await scrollY(page)) + 900);
      const membersY = await scrollY(page);
      expect(membersY).toBeGreaterThan(1000);

      await tabbar.getByRole('tab', { name: 'Expenses' }).click();
      await expect(page.getByTestId('expenses-tab-button')).toHaveAttribute('aria-selected', 'true');
      await expectScrollSettled(page, 2500);

      await tabbar.getByRole('tab', { name: 'Members' }).click();
      await expect(page.getByTestId('members-tab-button')).toHaveAttribute('aria-selected', 'true');
      await expectScrollSettled(page, membersY);
    });

    test('arrow-key tab selection scrolls like a tap', async ({ page }) => {
      await openGroup(page);
      await settle(page);
      await scrollToY(page, 2500);

      const panelTitle = page.locator('.group-panel-title');
      await page.getByTestId('expenses-tab-button').focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByTestId('balances-tab-button')).toHaveAttribute('aria-selected', 'true');
      await expect(panelTitle).toHaveText('Balances');
      await expectInVisibleArea(page, panelTitle);
      await expectScrollSettled(page);

      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('expenses-tab-button')).toHaveAttribute('aria-selected', 'true');
      await expectScrollSettled(page, 2500);
    });

    test('switching tabs at the top of the page does not scroll', async ({ page }) => {
      await openGroup(page);
      expect(await scrollY(page)).toBe(0);

      for (const id of ['members-tab-button', 'balances-tab-button', 'expenses-tab-button']) {
        await page.getByTestId(id).click();
        await expect(page.getByTestId(id)).toHaveAttribute('aria-selected', 'true');
        await expectScrollSettled(page, 0);
      }
    });
  });
}

test.describe('phone keyboard path', { tag: '@once' }, () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test.beforeEach(async ({ page }) => {
    await mockBackend(page, { tables: LONG_LISTS });
  });

  const panel = (page: Page) => page.getByRole('tabpanel');
  const focusInPanel = (page: Page) =>
    page.evaluate("!!document.activeElement?.closest('[role=tabpanel]')") as Promise<boolean>;

  test('Tab moves from the selected bottom tab into its panel and Shift+Tab returns', async ({ page }) => {
    await openGroup(page);
    await settle(page);
    const balancesTab = page.getByTestId('balances-tab-button');

    await page.getByTestId('expenses-tab-button').focus();
    await page.keyboard.press('ArrowRight');
    await expect(balancesTab).toBeFocused();
    await expect(balancesTab).toHaveAttribute('aria-selected', 'true');

    // Balances has no leading control: the panel itself is the Tab stop.
    await page.keyboard.press('Tab');
    await expect(panel(page)).toBeFocused();
    await expect(panel(page)).toHaveAccessibleName('Balances');
    await expect(panel(page)).toHaveAttribute('tabindex', '0');
    // Visible focus ring (keyboard focus => :focus-visible).
    await expect(panel(page)).toHaveCSS('outline-style', 'solid');
    await expect(panel(page)).toHaveCSS('outline-width', '2px');

    await page.keyboard.press('Shift+Tab');
    await expect(balancesTab).toBeFocused();

    // Members: panel, then the first member's controls (adding is the FAB's job).
    await page.keyboard.press('ArrowRight');
    const membersTab = page.getByTestId('members-tab-button');
    await expect(membersTab).toBeFocused();
    await expect(membersTab).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('Tab');
    await expect(panel(page)).toBeFocused();
    await page.keyboard.press('Tab');
    const firstEdit = page.getByTestId('member-card').first().getByRole('button', { name: 'Edit name' });
    await expect(firstEdit).toBeFocused();
    await expect(firstEdit).toHaveAccessibleDescription('Anna');
    await expectInVisibleArea(page, firstEdit);
  });

  test('without members, Tab goes from the Members panel to the add-member FAB', async ({ page }) => {
    await mockBackend(page, { tables: { members: [], expenses: [], expense_payers: [], expense_splits: [] } });
    await page.goto(groupUrl());
    await expect(page.getByRole('heading', { name: 'Add Members First' })).toBeVisible();
    // The Expenses FAB is there but unusable until someone joins.
    await expect(page.getByTestId('add-expense-button')).toBeDisabled();

    await page.getByRole('button', { name: 'Go to Members' }).click();
    const membersTab = page.getByTestId('members-tab-button');
    await expect(membersTab).toBeFocused();
    await expect(panel(page)).toContainText('No members yet');
    await expect(panel(page)).toContainText('Tap + to add your first member');

    await page.keyboard.press('Tab');
    await expect(panel(page)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByTestId('add-member-button')).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(panel(page)).toBeFocused();
  });

  test('on Expenses, Tab reaches the list before the FAB', async ({ page }) => {
    await openGroup(page);
    await settle(page);

    await page.getByTestId('expenses-tab-button').focus();
    await page.keyboard.press('Tab');
    await expect(panel(page)).toBeFocused();
    await page.keyboard.press('Tab');
    expect(await focusInPanel(page)).toBe(true);
    await expect(page.getByTestId('add-expense-button')).not.toBeFocused();
  });

  test('tab bar stays fixed at the bottom with the FAB above it, in logical DOM order', async ({ page }) => {
    await openGroup(page);
    await settle(page);
    const viewport = page.viewportSize()!;
    const tabbar = page.locator('.mobile-tabbar');
    const fab = page.locator('.fab');

    // Navigation before the panel it controls, FAB after the panel content.
    const order = await page.evaluate(`(() => {
      const bar = document.querySelector('.mobile-tabbar');
      const panel = document.querySelector('[role=tabpanel]');
      const fab = document.querySelector('.fab');
      const footer = document.querySelector('footer.footer');
      const follows = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return {
        barBeforePanel: follows(bar, panel),
        panelBeforeFab: follows(panel, fab),
        fabBeforeFooter: follows(fab, footer),
        barInCard: !!bar.closest('.card'),
      };
    })()`);
    expect(order).toEqual({ barBeforePanel: true, panelBeforeFab: true, fabBeforeFooter: true, barInCard: false });

    for (const top of [0, 2500]) {
      await scrollToY(page, top);
      const bar = (await tabbar.boundingBox())!;
      const fabBox = (await fab.boundingBox())!;
      expect(bar.x).toBe(0);
      expect(Math.round(bar.width)).toBe(viewport.width);
      expect(Math.round(bar.y + bar.height)).toBe(viewport.height);
      expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(bar.y);
    }
  });
});

test.describe('phone add-member sheet', { tag: '@once' }, () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  async function openSheet(page: Page) {
    await openGroup(page);
    await page.getByTestId('members-tab-button').click();
    await expect(page.getByTestId('member-name-input')).toHaveCount(0);
    await page.getByTestId('add-member-button').click();
    const dialog = page.getByRole('dialog', { name: 'Add Member' });
    await expect(dialog).toBeVisible();
    await settle(page);
    return dialog;
  }

  test('adds several members in a row with a live status', async ({ page }) => {
    const writes = await mockBackend(page);
    const dialog = await openSheet(page);
    await expect(page.getByTestId('add-member-dialog')).toBeVisible();

    // One labelled, focused field; only one member input exists at a time.
    const input = dialog.getByRole('textbox', { name: 'Name' });
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('data-testid', 'member-name-input');
    await expect(page.getByTestId('member-name-input')).toHaveCount(1);
    const submit = dialog.getByTestId('member-submit-button');
    await expect(submit).toHaveAccessibleName('Add');
    await expect(submit).toBeDisabled();
    const status = dialog.getByRole('status');
    await expect(status).toHaveText('');

    // Footer actions stay inside the viewport above the home indicator.
    const viewport = page.viewportSize()!;
    for (const button of [submit, dialog.getByRole('button', { name: 'Done' })]) {
      const box = (await button.boundingBox())!;
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    await input.fill('Dora');
    await input.press('Enter');
    await expect(status).toHaveText('Dora added');
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();

    await input.fill('  Eli ');
    await submit.click();
    await expect(status).toHaveText('Eli added');
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(dialog).toBeVisible();

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('add-member-button')).toBeFocused();
    await expect(page.getByTestId('member-card')).toHaveCount(5);
    await expect(page.getByTestId('member-card').filter({ hasText: 'Dora' })).toHaveCount(1);
    await expect(page.getByTestId('member-card').filter({ hasText: 'Eli' })).toHaveCount(1);

    const added = writes
      .filter((write) => write.method === 'POST' && write.table === 'members')
      .map((write) => (write.body as { name: string }).name);
    expect(added).toEqual(['Dora', 'Eli']);
  });

  test('a failed add keeps the sheet open with an alert, then a retry succeeds', async ({ page }) => {
    const writes = await mockBackend(page);
    const dialog = await openSheet(page);
    const input = dialog.getByRole('textbox', { name: 'Name' });
    const submit = dialog.getByTestId('member-submit-button');
    const status = dialog.getByRole('status');
    const alert = dialog.getByRole('alert');

    await input.fill('Dora');
    await input.press('Enter');
    await expect(status).toHaveText('Dora added');

    // The next write fails: no false success, name kept, still in the field.
    await failWrites(page, 'members', 'POST');
    await input.fill('Eli');
    await submit.click();
    await expect(alert).toHaveText('Could not add the member. Please try again.');
    await expect(alert).toHaveAttribute('data-testid', 'member-form-error');
    await expect(status).toHaveText('');
    await expect(input).toHaveValue('Eli');
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(submit).toBeEnabled();
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('member-card').filter({ hasText: 'Eli' })).toHaveCount(0);

    // Retrying the same name succeeds and clears the alert.
    await submit.click();
    await expect(status).toHaveText('Eli added');
    await expect(alert).toHaveCount(0);
    await expect(input).toHaveValue('');
    await expect(input).toBeFocused();
    await expect(input).not.toHaveAttribute('aria-invalid', /.*/);

    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByTestId('member-card')).toHaveCount(5);
    const added = writes
      .filter((write) => write.method === 'POST' && write.table === 'members')
      .map((write) => (write.body as { name: string }).name);
    expect(added).toEqual(['Dora', 'Eli']);
  });

  test('the failure message follows the language', async ({ page }) => {
    await openGroup(page);
    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    await page.getByTestId('members-tab-button').click();
    await failWrites(page, 'members', 'POST');
    await page.getByTestId('add-member-button').click();
    const dialog = page.getByRole('dialog', { name: 'Mitglied hinzufügen' });
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Jonas');
    await dialog.getByTestId('member-submit-button').click();
    await expect(dialog.getByRole('alert')).toHaveText(
      'Das Mitglied konnte nicht hinzugefügt werden. Bitte versuche es erneut.'
    );
    await expect(dialog.getByRole('status')).toHaveText('');
  });

  test('Escape closes the sheet and returns focus to the FAB', async ({ page }) => {
    const dialog = await openSheet(page);
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByTestId('add-member-button')).toBeFocused();
    await expect(page.getByTestId('member-name-input')).toHaveCount(0);
  });

  test('German labels', async ({ page }) => {
    await openGroup(page);
    // The language button toggles EN <-> DE.
    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    await page.getByTestId('members-tab-button').click();
    await expect(page.getByTestId('add-member-button')).toHaveAccessibleName('Mitglied hinzufügen');
    await page.getByTestId('add-member-button').click();
    const dialog = page.getByRole('dialog', { name: 'Mitglied hinzufügen' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Fertig' })).toBeVisible();
    await dialog.getByRole('textbox', { name: 'Name' }).fill('Jonas');
    await dialog.getByTestId('member-submit-button').click();
    await expect(dialog.getByRole('status')).toHaveText('Jonas hinzugefügt');
  });

  test('the sheet closes when the layout switches to desktop', async ({ page }) => {
    const dialog = await openSheet(page);
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(dialog).toHaveCount(0);
    // Desktop: the inline form is the single member input.
    await expect(page.getByTestId('member-name-input')).toHaveCount(1);
    await expect(page.getByTestId('member-name-input')).toHaveAccessibleName('Add new member');
    await expect(page.getByTestId('add-member-button')).toHaveCount(0);
    // Scroll lock released.
    expect(await page.evaluate('document.body.style.overflow')).toBe('');
  });

  test('an empty members list points to the FAB', async ({ page }) => {
    await mockBackend(page, { tables: { members: [], expenses: [], expense_payers: [], expense_splits: [] } });
    await page.goto(groupUrl());
    await page.getByTestId('members-tab-button').click();
    await expect(page.getByText('Tap + to add your first member')).toBeVisible();
    await expect(page.getByText('Add members to start splitting expenses')).toHaveCount(0);
    await expect(page.getByTestId('add-member-button')).toBeEnabled();
  });
});

test.describe('narrow phone', () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  test('no horizontal overflow on any tab', async ({ page }) => {
    await openGroup(page);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(360);

    for (const id of ['balances-tab-button', 'members-tab-button']) {
      await page.getByTestId(id).click();
      expect(await scrollWidth(page)).toBeLessThanOrEqual(360);
    }
  });
});

test.describe('tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test('uses the bottom tab bar below 1024px', async ({ page }) => {
    await openGroup(page);
    await expect(page.getByRole('navigation', { name: 'Group sections' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Balances' })).toBeVisible();
    await expect(page.locator('.group-aside')).toHaveCount(0);
    expect(await scrollWidth(page)).toBeLessThanOrEqual(768);
  });
});
