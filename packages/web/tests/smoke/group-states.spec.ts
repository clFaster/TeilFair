import { expect, test } from '@playwright/test';
import { groupUrl, mockBackend } from './fixtures/group';

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

const noMembers = {
  tables: { members: [], expenses: [], expense_payers: [], expense_splits: [] },
};

test.describe('zero members', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page, noMembers);
  });

  test.describe('desktop', { tag: '@desktop' }, () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('add expense is disabled and the CTA moves focus to the Members tab', async ({ page }) => {
      await page.goto(groupUrl());

      const cta = page.getByRole('button', { name: 'Go to Members' });
      await expect(cta).toBeVisible();
      await expect(page.getByTestId('expense-card')).toHaveCount(0);
      await expect(page.getByTestId('add-expense-button')).toBeDisabled();

      await cta.click();

      const membersTab = page.getByTestId('members-tab-button');
      await expect(membersTab).toHaveAttribute('aria-selected', 'true');
      await expect(membersTab).toBeFocused();
      await expect(page.getByRole('tabpanel', { name: 'Members' })).toBeVisible();

      // Roving tabindex keeps working from the tab that received focus.
      await page.keyboard.press('ArrowLeft');
      await expect(page.getByTestId('expenses-tab-button')).toBeFocused();
      await expect(page.getByTestId('expenses-tab-button')).toHaveAttribute('aria-selected', 'true');
    });
  });

  test.describe('phone', () => {
    test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

    test('floating add button is disabled and the CTA moves focus to the Members tab', async ({ page }) => {
      await page.goto(groupUrl());

      const cta = page.getByRole('button', { name: 'Go to Members' });
      await expect(cta).toBeVisible();
      await expect(page.getByTestId('add-expense-button')).toBeDisabled();

      await cta.click();

      const membersTab = page.getByTestId('members-tab-button');
      await expect(membersTab).toHaveAttribute('aria-selected', 'true');
      await expect(membersTab).toBeFocused();
      await expect(page.getByRole('tabpanel', { name: 'Members' })).toBeVisible();
      await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
    });
  });
});

test.describe('backend failure', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page, { failTables: ['groups'] });
  });

  test('shows an alert card with a way home and no group chrome', async ({ page }) => {
    await page.goto(groupUrl());

    const alert = page.getByRole('alert');
    await expect(alert).toHaveCount(1);
    await expect(alert).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
    await expect(page.locator('.mobile-tabbar')).toHaveCount(0);
    // Legal links stay reachable: the footer, or the header "More" menu on phones.
    const phone = page.viewportSize()!.width < 640;
    await expect(page.locator('footer.footer')).toBeVisible({ visible: !phone });
    await expect(page.getByRole('button', { name: 'More', exact: true })).toBeVisible({ visible: phone });
  });

  test('the Go Home action navigates away from the failed group', async ({ page }) => {
    await page.goto(groupUrl());
    await expect(page.getByRole('alert')).toBeVisible();

    await page.getByRole('link', { name: 'Go Home' }).click();
    await expect(page).toHaveURL(/\/$/);
  });
});
