import { expect, test, type Page } from '@playwright/test';
import {
  GROUP_ID, WRITE_TOKEN, failGroupLookups, groupRow, groupUrl, mockBackend, seedRecentGroups,
  type BackendOptions,
} from './fixtures/group';

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

  test('Try again asks the backend again and keeps the alert while it still fails', async ({ page }) => {
    const lookups = countGroupLookups(page);
    await page.goto(groupUrl());
    const alert = page.getByRole('alert');
    await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Failed to load group');
    expect(lookups.count).toBe(1);

    await alert.getByRole('button', { name: 'Try again' }).click();

    await expect.poll(() => lookups.count).toBe(2);
    await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Failed to load group');
    await expect(alert).toHaveCount(1);
    await expect(alert.getByRole('button', { name: 'Try again' })).toBeVisible();
    await expect(page.getByTestId('expense-card')).toHaveCount(0);
  });
});

/** Counts the group lookups (`get_group`) the page sends. */
function countGroupLookups(page: Page) {
  const lookups = { count: 0 };
  page.on('request', (request) => {
    if (request.method() === 'POST' && request.url().endsWith('/rest/v1/rpc/get_group')) lookups.count += 1;
  });
  return lookups;
}

/** Counts document loads, to tell a retry in place from a page reload. */
function countDocuments(page: Page) {
  const documents = { count: 0 };
  page.on('request', (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.count += 1;
  });
  return documents;
}

const LOAD_FAILED_EN = 'Something went wrong while loading this group. Check your connection and try again.';
const LOAD_FAILED_DE = 'Beim Laden dieser Gruppe ist etwas schiefgelaufen. Prüfe deine Verbindung und versuche es erneut.';

test.describe('failed group load', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
  });

  for (const failure of ['server', 'network'] as const) {
    test(`after a ${failure} failure, Try again loads the group in place`, async ({ page }) => {
      const documents = countDocuments(page);
      await failGroupLookups(page, 1, failure);
      await page.goto(groupUrl());

      const alert = page.getByRole('alert');
      await expect(alert).toHaveCount(1);
      await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Failed to load group');
      await expect(alert.locator('.state-card-text')).toHaveText(LOAD_FAILED_EN);
      await expect(alert.getByRole('link', { name: 'Go Home' })).toBeVisible();
      // What the backend or the browser reported stays out of the page.
      await expect(page.locator('body')).not.toContainText(/Simulated|Failed to fetch/);
      await expect(page.getByTestId('add-expense-button')).toHaveCount(0);

      await alert.getByRole('button', { name: 'Try again' }).click();

      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekend in Vienna');
      await expect(page.getByTestId('expense-card')).toHaveCount(2);
      await expect(page.getByTestId('add-expense-button')).toBeVisible();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page).toHaveURL(new RegExp(`/g/${GROUP_ID}#t=${WRITE_TOKEN}$`));
      expect(documents.count).toBe(1);
    });
  }

  test('the failure is shown in German when German is selected, and follows a language switch', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');

    await failGroupLookups(page);
    await page.goto(groupUrl());
    const alert = page.getByRole('alert');
    await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Gruppe konnte nicht geladen werden');
    await expect(alert.locator('.state-card-text')).toHaveText(LOAD_FAILED_DE);
    await expect(alert.getByRole('link', { name: 'Startseite' })).toBeVisible();
    await expect(alert.getByRole('button', { name: 'Erneut versuchen' })).toBeVisible();

    await page.getByRole('button', { name: 'Sprache wählen', exact: true }).click();
    await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Failed to load group');
    await expect(alert.locator('.state-card-text')).toHaveText(LOAD_FAILED_EN);
    await page.getByRole('button', { name: 'Select language', exact: true }).click();

    await alert.getByRole('button', { name: 'Erneut versuchen' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weekend in Vienna');
    await expect(page.getByTestId('expense-card')).toHaveCount(2);
  });

  const DENIED: Array<[reason: string, token: string, options: BackendOptions]> = [
    ['a token the group does not accept', 'invalid-token', {}],
    ['a group that no longer exists', WRITE_TOKEN, { tables: { groups: [] } }],
  ];
  for (const [reason, token, options] of DENIED) {
    test(`${reason} shows Group Not Found with a way home and nothing to retry`, async ({ page }) => {
      await mockBackend(page, options);
      const lookups = countGroupLookups(page);
      await page.goto(groupUrl(token));

      const alert = page.getByRole('alert');
      await expect(alert).toHaveCount(1);
      await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Group Not Found');
      await expect(alert.locator('.state-card-text')).toHaveText("This group doesn't exist or you don't have access.");
      await expect(alert.getByRole('link', { name: 'Go Home' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(/Invalid token|Cannot coerce/);
      await expect(page.getByTestId('expense-card')).toHaveCount(0);
      // The lookup was answered: nothing is retried in the background.
      expect(lookups.count).toBe(1);

      await page.getByRole('button', { name: 'Select language', exact: true }).click();
      await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Gruppe nicht gefunden');
      await expect(alert.getByRole('link', { name: 'Startseite' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Erneut versuchen' })).toHaveCount(0);
    });
  }

  test('a group ID that is not a UUID shows Group Not Found without Try again', async ({ page }) => {
    const lookups = countGroupLookups(page);
    await page.goto(`/g/${GROUP_ID.slice(0, 13)}#t=${WRITE_TOKEN}`);

    const alert = page.getByRole('alert');
    await expect(alert).toHaveCount(1);
    await expect(alert.getByRole('heading', { level: 1 })).toHaveText('Group Not Found');
    await expect(alert.getByRole('link', { name: 'Go Home' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText(/invalid input syntax|22P02/);
    // The malformed ID was sent once and answered, so the page does not retry it.
    expect(lookups.count).toBe(1);
  });
});

test.describe('failed group load from the home page', () => {
  test.beforeEach(async ({ page }) => {
    await mockBackend(page);
    await seedRecentGroups(page);
  });

  async function submitJoinLink(page: Page, link: string) {
    await page.getByRole('button', { name: 'Join Group', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Join Existing Group' });
    await dialog.getByLabel('Group Link').fill(link);
    await dialog.getByLabel('Group Link').press('Enter');
    return dialog;
  }

  for (const failure of ['server', 'network'] as const) {
    test(`joining during a ${failure} failure reports a failed load, not an invalid link`, async ({ page, baseURL }) => {
      await failGroupLookups(page, 1, failure);
      await page.goto('/');
      const dialog = await submitJoinLink(page, `${baseURL}${groupUrl()}`);

      await expect(dialog.getByRole('alert')).toHaveText('Failed to load group');
      await expect(page).toHaveURL(/\/$/);

      // The link is still in the field, so the same dialog joins once the backend answers.
      await dialog.getByLabel('Group Link').press('Enter');
      await expect(page).toHaveURL(new RegExp(`/g/${GROUP_ID}#t=${WRITE_TOKEN}$`));
      await expect(page.getByTestId('expense-card')).toHaveCount(2);
    });
  }

  test('joining with a token the group does not accept keeps the invalid link message', async ({ page, baseURL }) => {
    await page.goto('/');
    const dialog = await submitJoinLink(page, `${baseURL}${groupUrl('invalid-token')}`);

    await expect(dialog.getByRole('alert')).toHaveText('Could not access group. Invalid link or token.');
    await expect(page).toHaveURL(/\/$/);
  });

  test('joining with a truncated group ID keeps the invalid link message and does not offer a retry', async ({ page, baseURL }) => {
    const lookups = countGroupLookups(page);
    await page.goto('/');
    const dialog = await submitJoinLink(page, `${baseURL}/g/${GROUP_ID.slice(0, 13)}#t=${WRITE_TOKEN}`);

    await expect(dialog.getByRole('alert')).toHaveText('Could not access group. Invalid link or token.');
    await expect(dialog.getByRole('button', { name: 'Try again' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    expect(lookups.count).toBe(1);
  });

  test('reopening a recent group during a backend failure reports a failed load', async ({ page }) => {
    await failGroupLookups(page);
    await page.goto('/');
    const open = page.locator('.recent-card-open').first();
    await open.click();

    const alert = page.locator('.home-alert').getByRole('alert');
    await expect(alert).toHaveText('Failed to load group');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.recent-card')).toHaveCount(2);

    await open.click();
    await expect(page).toHaveURL(new RegExp(`/g/${GROUP_ID}#t=${WRITE_TOKEN}$`));
    await expect(page.getByTestId('expense-card')).toHaveCount(2);
  });

  test('reopening a recent group whose link stopped working says it is no longer accessible', async ({ page }) => {
    await mockBackend(page, {
      tables: { groups: [{ ...groupRow, read_token: 'rotated-read-token', write_token: 'rotated-write-token' }] },
    });
    await page.goto('/');
    await page.locator('.recent-card-open').first().click();

    await expect(page.locator('.home-alert').getByRole('alert')).toHaveText('This group is no longer accessible');
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.recent-card')).toHaveCount(2);
  });

  test('removing a recent group while it opens shows no error for the abandoned load', async ({ page }) => {
    let release = () => {};
    const gate = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/rest/v1/rpc/get_group', async (route) => {
      await gate;
      await route.fallback();
    });
    await page.goto('/');
    const lookup = page.waitForResponse((response) =>
      response.request().method() === 'POST' && response.url().endsWith('/rest/v1/rpc/get_group'));
    await page.locator('.recent-card-open').first().click();
    await page.getByRole('button', { name: 'Remove Weekend in Vienna from this list' }).click();
    await expect(page.locator('.recent-card')).toHaveCount(1);

    release();
    await (await lookup).finished();
    // Give the abandoned load a few frames to (wrongly) report something.
    await page.evaluate(`new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done())))`);

    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator('.recent-card')).toHaveCount(1);
  });
});
