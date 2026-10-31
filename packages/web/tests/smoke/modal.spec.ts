import { expect, test, type Locator, type Page } from '@playwright/test';
import { READ_TOKEN, groupUrl, mockBackend } from './fixtures/group';

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

async function expectLabelledBy(dialog: Locator, title: string) {
  const labelId = await dialog.getAttribute('aria-labelledby');
  expect(labelId).toBeTruthy();
  await expect(dialog.page().locator(`[id="${labelId}"]`)).toHaveText(title);
  await expect(dialog).toHaveAccessibleName(title);
}

const bodyOverflow = (page: Page) => page.evaluate('document.body.style.overflow');

test.describe('desktop', { tag: '@desktop' }, () => {
  test('confirm dialog is an accessible, focus-trapped alertdialog', async ({ page }) => {
    await openGroup(page);

    const deleteButton = page.getByTestId('expense-delete-button').first();
    await deleteButton.click();

    const overlay = page.getByTestId('confirm-dialog');
    const dialog = page.getByRole('alertdialog');
    await expect(overlay).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expectLabelledBy(dialog, 'Delete Expense');
    await expect(dialog).toHaveAccessibleDescription('Are you sure you want to delete this expense?');

    // Focus starts on the primary action and the page behind is scroll-locked.
    await expect(page.getByTestId('confirm-dialog-confirm-button')).toBeFocused();
    expect(await bodyOverflow(page)).toBe('hidden');

    // Tab and Shift+Tab never leave the dialog.
    for (const key of ['Tab', 'Tab', 'Tab', 'Tab', 'Shift+Tab', 'Shift+Tab', 'Shift+Tab']) {
      await page.keyboard.press(key);
      await expect(page.locator('[role="alertdialog"]:focus-within')).toHaveCount(1);
    }

    // Escape closes, focus returns to the trigger and scrolling is restored.
    await page.keyboard.press('Escape');
    await expect(overlay).toHaveCount(0);
    await expect(deleteButton).toBeFocused();
    expect(await bodyOverflow(page)).toBe('');
    await expect(page.getByTestId('expense-card')).toHaveCount(2);
  });

  test('cancel and backdrop click close the confirm dialog without deleting', async ({ page }) => {
    await openGroup(page);

    await page.getByTestId('expense-delete-button').first().click();
    await page.getByTestId('confirm-dialog-cancel-button').click();
    await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);

    await page.getByTestId('expense-delete-button').first().click();
    await page.getByTestId('confirm-dialog').click({ position: { x: 8, y: 8 } });
    await expect(page.getByTestId('confirm-dialog')).toHaveCount(0);
    await expect(page.getByTestId('expense-card')).toHaveCount(2);
  });

  test('add expense opens a labelled dialog that closes on Escape', async ({ page }) => {
    await openGroup(page);

    const addButton = page.getByTestId('add-expense-button');
    await addButton.click();

    const dialog = page.getByRole('dialog', { name: 'Add Expense' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute('aria-modal', 'true');
    await expectLabelledBy(dialog, 'Add Expense');
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeVisible();
    // Focus moves into the dialog (the panel itself, so the phone keyboard stays down).
    await expect(page.locator('[role="dialog"]:focus-within')).toHaveCount(1);

    // Centered card on desktop: not glued to the bottom edge.
    const viewport = page.viewportSize()!;
    const box = (await dialog.boundingBox())!;
    expect(box.y).toBeGreaterThan(0);
    expect(box.y + box.height).toBeLessThan(viewport.height);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(addButton).toBeFocused();
  });

  test('Escape during IME composition does not close the dialog', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('add-expense-button').click();

    const dialog = page.getByRole('dialog', { name: 'Add Expense' });
    await expect(dialog).toBeVisible();
    await page.evaluate(
      "document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true, cancelable: true }))"
    );
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('share dialog closes from its footer button', async ({ page }) => {
    await openGroup(page);

    await page.getByRole('button', { name: 'Share', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Share Group' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByLabel('View-only Link')).toHaveValue(/\/g\/.+#t=smoke-read-token$/);

    await dialog.locator('.modal-footer').getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
  });
});

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  test('add expense is a bottom sheet with its submit button in view', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('add-expense-button').click();

    const dialog = page.getByRole('dialog', { name: 'Add Expense' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.modal-handle')).toBeVisible();

    const viewport = page.viewportSize()!;
    // Let the slide-up animation finish before measuring.
    await expect.poll(async () => {
      const box = (await dialog.boundingBox())!;
      return Math.round(box.y + box.height);
    }).toBe(viewport.height);

    const box = (await dialog.boundingBox())!;
    expect(box.x).toBe(0);
    expect(Math.round(box.width)).toBe(viewport.width);

    const submit = page.getByTestId('expense-submit-button');
    await expect(submit).toBeInViewport({ ratio: 1 });
  });

  test('confirm dialog sheet keeps its actions inside the viewport', async ({ page }) => {
    await openGroup(page);
    await page.getByTestId('expense-delete-button').first().click();

    const confirm = page.getByTestId('confirm-dialog-confirm-button');
    await expect(confirm).toBeInViewport({ ratio: 1 });
    await expect(page.getByTestId('confirm-dialog-cancel-button')).toBeInViewport({ ratio: 1 });
  });

  test('read-only expense details open in a sheet', async ({ page }) => {
    await openGroup(page, READ_TOKEN);
    await expect(page.getByTestId('add-expense-button')).toHaveCount(0);

    await page.getByRole('button', { name: 'View details' }).first().click();
    const dialog = page.getByRole('dialog', { name: 'Expense Details' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Dinner at Figlmüller')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('header is compact and the page does not scroll sideways', async ({ page }) => {
    await page.goto('/privacy');
    const header = page.locator('header.header');
    const headerBox = (await header.boundingBox())!;
    expect(Math.round(headerBox.height)).toBeLessThanOrEqual(57);

    for (const name of ['Select language', 'Theme: light']) {
      const box = (await page.getByRole('button', { name, exact: true }).boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.width).toBeGreaterThanOrEqual(44);
    }

    expect(await page.evaluate('document.documentElement.scrollWidth')).toBeLessThanOrEqual(375);
  });
});

test.describe('tablet', () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test('footer links meet the 44px tap target minimum', async ({ page }) => {
    await page.goto('/privacy');

    for (const name of ['Privacy', 'Imprint']) {
      const link = page.getByRole('link', { name });
      await expect(link).toBeVisible();
      const box = (await link.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
  });
});
