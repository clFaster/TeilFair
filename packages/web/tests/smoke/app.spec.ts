/// <reference lib="dom" />
import { expect, test, type Page, type Route } from '@playwright/test';
import { GROUP_ID, READ_TOKEN, WRITE_TOKEN, groupRow, groupUrl, mockBackend, seedRecentGroups } from './fixtures/group';

test.beforeEach(async ({ page }) => {
  // Keep these checks independent of Supabase and third-party services.
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
});

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

/** Reads `<html lang>` as it was when React first rendered into `#root`, before that render was painted. */
async function recordLangAtFirstRender(page: Page) {
  await page.addInitScript(() => {
    const observer = new MutationObserver(() => {
      if (!document.getElementById('root')?.hasChildNodes()) return;
      observer.disconnect();
      (window as unknown as { langAtFirstRender: string }).langAtFirstRender = document.documentElement.lang;
    });
    observer.observe(document, { childList: true, subtree: true });
  });
  return () => page.evaluate(() => (window as unknown as { langAtFirstRender?: string }).langAtFirstRender);
}

test('production app opens forms and persists theme and language', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Split expenses, stay fair');

  await page.getByRole('button', { name: 'Create Group', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Create New Group' })).toBeVisible();
  await expect(page.getByLabel('Group Name')).toBeVisible();

  await page.getByRole('button', { name: 'Theme: light', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Theme: dark', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Select language', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');

  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('teilfair-theme-preference'))).toBe('dark');
});

for (const [path, heading] of [
  ['/privacy', 'Privacy notice'],
  ['/imprint', 'Impressum'],
  ['/missing-page', 'Page Not Found'],
]) {
  test(`production router loads ${path} directly`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  });
}

test('privacy notice is available in English and German', async ({ page }) => {
  await page.goto('/privacy');

  const legalContent = page.locator('main.legal-content');
  await expect(legalContent).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { name: 'Privacy notice', exact: true })).toBeVisible();
  await expect(legalContent.getByText('The German version of this privacy notice is the legally binding version.')).toBeVisible();

  await page.getByRole('button', { name: 'Select language', exact: true }).click();
  await expect(legalContent).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { name: 'Datenschutzerklärung', exact: true })).toBeVisible();
  await expect(legalContent.getByText('Stand: November 2026')).toBeVisible();
});

test.describe('document language', () => {
  test('html lang follows a language switch and is set before the first render after a reload', async ({ page }) => {
    const langAtFirstRender = await recordLangAtFirstRender(page);
    const html = page.locator('html');
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Split expenses, stay fair');
    await expect(html).toHaveAttribute('lang', 'en');
    expect(await langAtFirstRender()).toBe('en');

    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');
    await expect(html).toHaveAttribute('lang', 'de');

    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Ausgaben fair teilen');
    await expect(html).toHaveAttribute('lang', 'de');
    expect(await langAtFirstRender()).toBe('de');

    await page.getByRole('button', { name: 'Sprache wählen', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Split expenses, stay fair');
    await expect(html).toHaveAttribute('lang', 'en');
  });

  test('html lang stays on the app language on pages that mark their own content language', async ({ page }) => {
    const langAtFirstRender = await recordLangAtFirstRender(page);
    await page.goto('/imprint');
    await expect(page.locator('main.legal-content')).toHaveAttribute('lang', 'de');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(await langAtFirstRender()).toBe('en');
  });
});

test.describe('browser language detection', () => {
  const cases = [
    { locale: 'de-DE', language: 'de', heading: 'Ausgaben fair teilen', title: 'TeilFair - Ausgaben fair verteilen' },
    { locale: 'de-AT', language: 'de', heading: 'Ausgaben fair teilen', title: 'TeilFair - Ausgaben fair verteilen' },
    { locale: 'en-US', language: 'en', heading: 'Split expenses, stay fair', title: 'TeilFair - Split expenses fairly' },
    { locale: 'fr-FR', language: 'en', heading: 'Split expenses, stay fair', title: 'TeilFair - Split expenses fairly' },
  ] as const;

  for (const { locale, language, heading, title } of cases) {
    test.describe(locale, () => {
      test.use({ locale });

      test('detects and persists the app language on first load and reload', async ({ page }) => {
        const langAtFirstRender = await recordLangAtFirstRender(page);
        const expectDetectedLanguage = async () => {
          await expect(page.locator('html')).toHaveAttribute('lang', language);
          await expect(page).toHaveTitle(title);
          await expect(page.getByRole('heading', { level: 1 })).toHaveText(heading);
          await expect.poll(() => page.evaluate(() => localStorage.getItem('i18nextLng'))).toBe(language);
        };

        await page.goto('/');
        await expectDetectedLanguage();
        await expect.poll(langAtFirstRender).toBe(language);

        await page.reload();
        await expectDetectedLanguage();
        await expect.poll(langAtFirstRender).toBe(language);
      });
    });
  }
});

test.describe('page titles', () => {
  const TITLES = {
    en: {
      home: 'TeilFair - Split expenses fairly',
      group: 'Group · TeilFair',
      privacy: 'Privacy notice · TeilFair',
      imprint: 'Imprint · TeilFair',
      notFound: 'Page Not Found · TeilFair',
    },
    de: {
      home: 'TeilFair - Ausgaben fair verteilen',
      group: 'Gruppe · TeilFair',
      privacy: 'Datenschutzerklärung · TeilFair',
      imprint: 'Impressum · TeilFair',
      notFound: 'Seite nicht gefunden · TeilFair',
    },
  } as const;
  type TitledPage = keyof typeof TITLES.en;

  /** Reads every title the tab has shown since the last page load, starting with the one in index.html. */
  async function recordTitles(page: Page) {
    await page.addInitScript(() => {
      const titles: string[] = [];
      (window as unknown as { shownTitles: string[] }).shownTitles = titles;
      new MutationObserver(() => {
        if (document.title && titles.at(-1) !== document.title) titles.push(document.title);
      }).observe(document, { childList: true, subtree: true, characterData: true });
    });
    return () => page.evaluate(() => (window as unknown as { shownTitles: string[] }).shownTitles);
  }

  /** Legal links sit in the footer; phones hide it and list them in the header "More" menu. */
  async function openLegalPage(page: Page, name: 'Privacy' | 'Imprint') {
    const footerLink = page.locator('.footer-nav').getByRole('link', { name, exact: true });
    if (await footerLink.isVisible()) return footerLink.click();
    await page.getByRole('button', { name: 'More', exact: true }).click();
    await page.getByRole('navigation', { name: 'Legal' }).getByRole('link', { name, exact: true }).click();
  }

  for (const [path, titled] of [
    ['/', 'home'],
    ['/privacy', 'privacy'],
    ['/imprint', 'imprint'],
    ['/missing-page', 'notFound'],
  ] as [string, TitledPage][]) {
    test(`${path} has its own title in English and German`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveTitle(TITLES.en[titled]);

      await page.getByRole('button', { name: 'Select language', exact: true }).click();
      await expect(page).toHaveTitle(TITLES.de[titled]);

      await page.reload();
      await expect(page).toHaveTitle(TITLES.de[titled]);
    });
  }

  test('the group page title is generic and never names the group or its capability', async ({ page }) => {
    const shownTitles = await recordTitles(page);
    await mockBackend(page);
    await page.goto(groupUrl());
    await expect(page.getByRole('heading', { level: 1, name: groupRow.name })).toBeVisible();
    await expect(page).toHaveTitle(TITLES.en.group);

    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    await expect(page).toHaveTitle(TITLES.de.group);

    // A second capability reloads the group in place; the title stays generic throughout.
    await page.evaluate((token) => { location.hash = `t=${token}`; }, READ_TOKEN);
    await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1, name: groupRow.name })).toBeVisible();

    const titles = await shownTitles();
    expect(titles).toEqual([TITLES.en.home, TITLES.en.group, TITLES.de.group]);
    for (const secret of [groupRow.name, GROUP_ID, READ_TOKEN, WRITE_TOKEN]) {
      expect(titles.join('\n')).not.toContain(secret);
    }
  });

  test('group status pages keep the generic group title', async ({ page }) => {
    await mockBackend(page);
    await page.goto(`/g/${GROUP_ID}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Invalid Link' })).toBeVisible();
    await expect(page).toHaveTitle(TITLES.en.group);

    await page.goto(groupUrl('not-a-token-of-this-group'));
    await expect(page.getByRole('alert').getByRole('heading', { name: 'Group Not Found' })).toBeVisible();
    await expect(page).toHaveTitle(TITLES.en.group);
  });

  test('the title follows client-side navigation in both directions', async ({ page }) => {
    const shownTitles = await recordTitles(page);
    await mockBackend(page);
    await seedRecentGroups(page);
    await page.goto('/');
    await expect(page).toHaveTitle(TITLES.en.home);

    await page.locator('.recent-card-open').first().click();
    await expect(page.getByRole('heading', { level: 1, name: groupRow.name })).toBeVisible();
    await expect(page).toHaveTitle(TITLES.en.group);

    await page.goBack();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Split expenses, stay fair');
    await expect(page).toHaveTitle(TITLES.en.home);

    await openLegalPage(page, 'Privacy');
    await expect(page).toHaveTitle(TITLES.en.privacy);
    await openLegalPage(page, 'Imprint');
    await expect(page).toHaveTitle(TITLES.en.imprint);

    await page.goBack();
    await expect(page).toHaveTitle(TITLES.en.privacy);
    await page.goBack();
    await expect(page).toHaveTitle(TITLES.en.home);

    // No page load happened in between, so the record covers the whole journey.
    expect(await shownTitles()).toEqual([
      TITLES.en.home, TITLES.en.group, TITLES.en.home, TITLES.en.privacy, TITLES.en.imprint, TITLES.en.privacy, TITLES.en.home,
    ]);
  });
});

/** Text of every browser console message, in the order they were logged. */
function recordConsole(page: Page) {
  const messages: string[] = [];
  page.on('console', (message) => messages.push(message.text()));
  return messages;
}

test('reading and writing with the read and write link reuses the Supabase clients', async ({ page }) => {
  const messages = recordConsole(page);
  const writes = await mockBackend(page);
  await page.goto(groupUrl());
  await expect(page.getByTestId('expense-card')).toHaveCount(2);

  await page.getByTestId('add-expense-button').click();
  const dialog = page.getByRole('dialog', { name: 'Add Expense' });
  await dialog.getByTestId('expense-description-input').fill('Client reuse');
  await dialog.getByLabel('Amount (EUR)').fill('12');
  await page.getByTestId('expense-submit-button').click();
  await expect(dialog).toHaveCount(0);

  const card = page.getByTestId('expense-card').filter({ hasText: 'Client reuse' });
  await card.getByTestId('expense-delete-button').click();
  await page.getByTestId('confirm-dialog-confirm-button').click();
  await expect(card).toHaveCount(0);
  expect(writes.map((write) => `${write.method} ${write.table}`)).toEqual(['POST save_expense', 'DELETE expenses']);

  // A second capability gets its own client; returning to the first one creates none.
  await page.evaluate((token) => { location.hash = `t=${token}`; }, READ_TOKEN);
  await expect(page.getByTestId('add-expense-button')).toHaveCount(0);
  await expect(page.getByTestId('expense-card')).toHaveCount(2);
  await page.evaluate((token) => { location.hash = `t=${token}`; }, WRITE_TOKEN);
  await expect(page.getByTestId('add-expense-button')).toBeVisible();

  expect(messages.filter((text) => text.includes('GoTrueClient'))).toEqual([]);
});

test.describe('route chunk missing after a deploy', () => {
  // File name pattern of the lazy group page chunk in the build output (dist/assets).
  const GROUP_CHUNK = /\/assets\/GroupPage-[\w-]+\.js$/;
  const RELOAD_KEY = 'teilfair-chunk-reload';

  /**
   * A deployment that no longer has the file answers 404, or with the app's HTML page
   * where a catch-all rewrite covers `/assets/`; a dropped connection aborts the request.
   */
  type ChunkFailure = 'aborted' | 'not found' | 'answered with the HTML page';
  const FAILURES: Record<ChunkFailure, (route: Route) => Promise<void>> = {
    'aborted': (route) => route.abort(),
    'not found': (route) => route.fulfill({ status: 404, contentType: 'text/plain', body: 'Not Found' }),
    'answered with the HTML page': (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>TeilFair</title>' }),
  };

  /** Fails requests for the group page chunk while `broken` is set and counts page loads. */
  async function breakGroupChunk(page: Page, failure: ChunkFailure) {
    const chunk = { broken: true, failures: 0, documents: 0 };
    page.on('request', (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame()) chunk.documents += 1;
    });
    await page.route(GROUP_CHUNK, (route) => {
      if (!chunk.broken) return route.fallback();
      chunk.failures += 1;
      return FAILURES[failure](route);
    });
    return chunk;
  }

  async function openRecentGroupFromHome(page: Page) {
    await page.goto('/');
    await page.locator('.recent-card-open').first().click();
  }

  for (const failure of Object.keys(FAILURES) as ChunkFailure[]) {
    test(`a chunk that is ${failure} once reloads the page once and renders the group`, async ({ page }) => {
      const messages = recordConsole(page);
      await mockBackend(page);
      await seedRecentGroups(page);
      const chunk = await breakGroupChunk(page, failure);
      // Hold the reload until the error boundary has handled the failed import. Playwright cannot
      // query a page whose navigation is pending, so the page logs what it shows on every change.
      let release = () => {};
      const inspected = new Promise<void>((resolve) => { release = resolve; });
      await page.route(`**/g/${GROUP_ID}`, async (route) => {
        chunk.broken = false;
        await inspected;
        await route.fallback();
      });
      await page.addInitScript(() => {
        new MutationObserver(() => {
          const count = (selector: string) => document.querySelectorAll(selector).length;
          console.debug(`shown: loading=${count('.route-loading')} alerts=${count('[role="alert"]')}`);
        }).observe(document, { childList: true, subtree: true });
      });
      const shown = (from = 0) => messages.slice(from).filter((text) => text.startsWith('shown:'));

      await openRecentGroupFromHome(page);

      // The error boundary caught and logged the failed import, but keeps the loading state.
      await expect.poll(() => chunk.documents).toBe(2);
      await expect.poll(() => {
        const caught = messages.findIndex((text) => text.includes('Unhandled application error:'));
        return caught >= 0 && shown(caught).length > 0;
      }).toBe(true);
      expect(shown().at(-1)).toBe('shown: loading=1 alerts=0');
      release();

      await expect(page.getByTestId('expense-card')).toHaveCount(2);
      await expect(page).toHaveURL(new RegExp(`/g/${GROUP_ID}#t=${WRITE_TOKEN}$`));
      expect(chunk.failures).toBeGreaterThan(0);
      expect(chunk.documents).toBe(2);
      // The error screen never appeared, not even briefly.
      expect(shown().filter((text) => !text.endsWith('alerts=0'))).toEqual([]);
      // The reload guard is a timestamp only, and nothing logged names the capability.
      expect(await page.evaluate((key) => sessionStorage.getItem(key), RELOAD_KEY)).toMatch(/^\d{13}$/);
      expect(messages.join('\n')).not.toContain(WRITE_TOKEN);
    });
  }

  test('a chunk that stays missing reloads the page once, then shows the error screen', async ({ page }) => {
    const messages = recordConsole(page);
    await mockBackend(page);
    await seedRecentGroups(page);
    const chunk = await breakGroupChunk(page, 'not found');

    await openRecentGroupFromHome(page);

    const alert = page.getByRole('alert');
    await expect(alert.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    expect(chunk.documents).toBe(2);
    // Render errors are logged in the production build, without the capability.
    expect(messages.filter((text) => text.includes('Unhandled application error:')).length).toBeGreaterThan(0);
    expect(messages.join('\n')).not.toContain(WRITE_TOKEN);

    // Reloading by hand fails the same way and does not start a reload loop.
    await Promise.all([page.waitForEvent('load'), alert.getByRole('button', { name: 'Reload page' }).click()]);
    await expect(alert.getByRole('heading', { name: 'Something went wrong' })).toBeVisible();
    await expect(page.locator('.route-loading')).toHaveCount(0);
    expect(chunk.documents).toBe(3);
  });
});
