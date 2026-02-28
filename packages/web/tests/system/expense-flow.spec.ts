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

  page.once('dialog', (dialog) => dialog.accept());
  await createdExpenseCard.getByTestId('expense-delete-button').click();

  await expect(createdExpenseCard).toHaveCount(0);

  if (createdMember) {
    await page.getByTestId('members-tab-button').click();
    const createdMemberCard = page.getByTestId('member-card').filter({ hasText: createdMemberName });
    await expect(createdMemberCard).toHaveCount(1);
    page.once('dialog', (dialog) => dialog.accept());
    await createdMemberCard.getByTestId('member-delete-button').click();
    await expect(createdMemberCard).toHaveCount(0);
  }
});
