import { expect, test } from '@playwright/test';

const groupId = process.env.SYSTEM_TEST_GROUP_ID;
const token = process.env.SYSTEM_TEST_TOKEN;

test('add and remove expense for configured group', async ({ page }) => {
  if (!groupId || !token) {
    throw new Error(
      'Missing SYSTEM_TEST_GROUP_ID or SYSTEM_TEST_TOKEN. Add them to packages/web/.env.systemtest.local or packages/web/.env.systemtest.'
    );
  }

  const description = `System test expense ${Date.now()}`;
  const createdMemberName = `System test member ${Date.now()}`;
  let createdMember = false;

  await page.goto(`/g/${groupId}?t=${token}`);

  const addExpenseButton = page.getByTestId('add-expense-button');
  await expect(addExpenseButton).toBeVisible({ timeout: 30_000 });

  if (await addExpenseButton.isDisabled()) {
    await page.getByTestId('members-tab-button').click();
    await page.getByTestId('member-name-input').fill(createdMemberName);
    await page.getByTestId('member-submit-button').click();
    await expect(page.getByTestId('member-card').filter({ hasText: createdMemberName })).toHaveCount(1);
    createdMember = true;

    await page.getByTestId('expenses-tab-button').click();
    await expect(addExpenseButton).toBeEnabled();
  }

  await addExpenseButton.click();

  await page.getByTestId('expense-description-input').fill(description);
  await page.getByTestId('expense-amount-input').fill('12.34');
  await page.getByTestId('expense-submit-button').click();

  const createdExpenseCard = page.getByTestId('expense-card').filter({ hasText: description });
  await expect(createdExpenseCard).toHaveCount(1);

  await createdExpenseCard.getByTestId('expense-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();

  await expect(createdExpenseCard).toHaveCount(0);

  if (createdMember) {
    await page.getByTestId('members-tab-button').click();
    const createdMemberCard = page.getByTestId('member-card').filter({ hasText: createdMemberName });
    await expect(createdMemberCard).toHaveCount(1);
    await createdMemberCard.getByTestId('member-delete-button').click();
    await page.getByTestId('confirm-dialog-confirm-button').click();
    await expect(createdMemberCard).toHaveCount(0);
  }
});

test('member-in-use dialog is fully visible and not clipped by scroll containers', async ({
  page,
}) => {
  if (!groupId || !token) {
    throw new Error(
      'Missing SYSTEM_TEST_GROUP_ID or SYSTEM_TEST_TOKEN. Add them to packages/web/.env.systemtest.local or packages/web/.env.systemtest.'
    );
  }

  const description = `System test expense ${Date.now()}`;
  const memberName = `System test in-use member ${Date.now()}`;

  await page.goto(`/g/${groupId}?t=${token}`);

  await page.getByTestId('members-tab-button').click();
  await page.getByTestId('member-name-input').fill(memberName);
  await page.getByTestId('member-submit-button').click();
  const memberCard = page.getByTestId('member-card').filter({ hasText: memberName });
  await expect(memberCard).toHaveCount(1);

  // Add an expense so the new member is referenced by a split, making them non-deletable.
  await page.getByTestId('expenses-tab-button').click();
  const addExpenseButton = page.getByTestId('add-expense-button');
  await expect(addExpenseButton).toBeEnabled();
  await addExpenseButton.click();
  await page.getByTestId('expense-description-input').fill(description);
  await page.getByTestId('expense-amount-input').fill('9.99');
  await page.getByTestId('expense-submit-button').click();
  const createdExpenseCard = page.getByTestId('expense-card').filter({ hasText: description });
  await expect(createdExpenseCard).toHaveCount(1);

  // Attempt to delete the in-use member; expect the info dialog, not a native alert.
  await page.getByTestId('members-tab-button').click();
  await memberCard.getByTestId('member-delete-button').click();

  const dialog = page.getByTestId('confirm-dialog');
  await expect(dialog).toBeVisible();

  const okButton = page.getByTestId('confirm-dialog-ok-button');
  await expect(okButton).toBeVisible();

  // Regression check: the dialog must be rendered via a portal so it isn't
  // clipped by any scrollable ancestor (e.g. the tab content scroll area).
  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();
  const dialogBox = await dialog.boundingBox();
  expect(dialogBox).not.toBeNull();
  const okButtonBox = await okButton.boundingBox();
  expect(okButtonBox).not.toBeNull();

  if (viewport && dialogBox && okButtonBox) {
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height);
    // The confirm/OK button must be fully within the viewport, not cut off.
    expect(okButtonBox.y).toBeGreaterThanOrEqual(0);
    expect(okButtonBox.y + okButtonBox.height).toBeLessThanOrEqual(viewport.height);
  }

  await okButton.click();
  await expect(dialog).toHaveCount(0);

  // Clean up: remove the expense, then the member becomes deletable.
  await page.getByTestId('expenses-tab-button').click();
  await createdExpenseCard.getByTestId('expense-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();
  await expect(createdExpenseCard).toHaveCount(0);

  await page.getByTestId('members-tab-button').click();
  await memberCard.getByTestId('member-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();
  await expect(memberCard).toHaveCount(0);
});
