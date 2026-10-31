import { expect, test, type Page } from '@playwright/test';
import { groupUrl, mockBackend } from './fixtures/group';

test.beforeEach(async ({ page }) => {
  await mockBackend(page);
});

test.afterEach(async ({ page }) => {
  expect(await page.pageErrors()).toEqual([]);
});

const moreButton = (page: Page) => page.getByRole('button', { name: 'More', exact: true });
const legalMenu = (page: Page) => page.getByRole('navigation', { name: 'Legal' });
const footer = (page: Page) => page.locator('footer.footer');

async function open(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
}

/** Let the popover's entry animation finish before measuring. */
const settle = (page: Page) => page.evaluate('Promise.all(document.getAnimations().map((a) => a.finished))');

test.describe('phone', { tag: '@once' }, () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });

  for (const path of ['/', '/privacy', groupUrl()]) {
    test(`${path} hides the footer and shows the More button`, async ({ page }) => {
      await open(page, path);
      await expect(footer(page)).toBeHidden();

      const button = moreButton(page);
      await expect(button).toBeVisible();
      await expect(button).toHaveAttribute('aria-expanded', 'false');
      await expect(legalMenu(page)).toBeHidden();
      const box = (await button.boundingBox())!;
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);

      // It follows the language and theme controls.
      const order = await page.evaluate(`(() => {
        const names = [...document.querySelectorAll('.header-actions button')].map((b) => b.getAttribute('aria-label'));
        return names;
      })()`);
      expect(order).toEqual(['Select language', 'Theme: light', 'More']);
    });
  }

  test('choosing a link navigates there and closes the menu', async ({ page }) => {
    await open(page, '/');
    const button = moreButton(page);
    await button.click();
    await expect(button).toHaveAttribute('aria-expanded', 'true');

    const menu = legalMenu(page);
    await expect(menu).toBeVisible();
    await expect(button).toHaveAttribute('aria-controls', (await menu.getAttribute('id'))!);
    await expect(menu.getByRole('link')).toHaveText(['Privacy', 'Imprint']);
    await expect(menu.getByText('TeilFair · Split expenses fairly')).toBeVisible();
    await settle(page);
    for (const link of await menu.getByRole('link').all()) {
      expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }

    await menu.getByRole('link', { name: 'Privacy' }).click();
    await expect(page).toHaveURL(/\/privacy$/);
    await expect(page.getByRole('heading', { name: 'Datenschutzerklärung', exact: true })).toBeVisible();
    await expect(moreButton(page)).toHaveAttribute('aria-expanded', 'false');
    await expect(legalMenu(page)).toBeHidden();
  });

  test('marks the current page and follows the language', async ({ page }) => {
    await open(page, '/privacy');
    await moreButton(page).click();
    const menu = legalMenu(page);
    await expect(menu.getByRole('link', { name: 'Privacy' })).toHaveAttribute('aria-current', 'page');
    await expect(menu.getByRole('link', { name: 'Imprint' })).not.toHaveAttribute('aria-current', /.*/);

    // Switching language from the header keeps the menu usable in German.
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Select language', exact: true }).click();
    const mehr = page.getByRole('button', { name: 'Mehr', exact: true });
    await mehr.click();
    const deMenu = page.getByRole('navigation', { name: 'Rechtliches' });
    await expect(deMenu.getByRole('link')).toHaveText(['Datenschutz', 'Impressum']);
  });

  test('Escape, Tab and outside taps close it', async ({ page }) => {
    await open(page, groupUrl());
    const button = moreButton(page);
    const menu = legalMenu(page);

    // Escape returns focus to the button.
    await button.click();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(button).toBeFocused();
    await expect(button).toHaveAttribute('aria-expanded', 'false');

    // Keyboard: Enter opens, Tab walks the links in order, leaving the menu closes it.
    await page.keyboard.press('Enter');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Privacy' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu.getByRole('link', { name: 'Imprint' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(button).toBeFocused();
    await expect(menu).toBeVisible();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(menu).toBeHidden();

    // Tapping outside closes it without navigating.
    await button.click();
    await expect(menu).toBeVisible();
    // The heading's left edge: its center lies under the popover.
    await page.getByRole('heading', { level: 1, name: 'Weekend in Vienna' }).click({ position: { x: 8, y: 8 } });
    await expect(menu).toBeHidden();
    await expect(page).toHaveURL(/\/g\//);
  });

  test('the popover stays inside the viewport above the tab bar', async ({ page }) => {
    await open(page, groupUrl());
    await moreButton(page).click();
    const menu = legalMenu(page);
    await expect(menu).toBeVisible();
    await settle(page);

    await expect(menu).toBeInViewport({ ratio: 1 });
    // Above the FAB and tab bar, so taps on it land on the links.
    const link = menu.getByRole('link', { name: 'Imprint' });
    const box = (await link.boundingBox())!;
    const hit = await page.evaluate(
      `document.elementFromPoint(${box.x + box.width / 2}, ${box.y + box.height / 2})?.textContent`
    );
    expect(hit).toBe('Imprint');
  });
});

test.describe('narrow phone (360px)', { tag: '@once' }, () => {
  test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true });

  for (const lang of ['en', 'de']) {
    test(`group header fits back, logo and three controls (${lang})`, async ({ page }) => {
      await open(page, groupUrl());
      if (lang === 'de') await page.getByRole('button', { name: 'Select language', exact: true }).click();

      const button = page.locator('.header-more-button');
      await button.click();
      await expect(page.locator('.header-menu')).toBeVisible();
      await settle(page);
      await expect(page.locator('.header-menu')).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate('document.documentElement.scrollWidth')).toBeLessThanOrEqual(360);

      // Every control is fully visible, none overlap, and the wordmark is not cut off.
      const boxes = await page.evaluate(`(() => {
        const els = [...document.querySelectorAll('.header-left > *, .header-actions button')];
        return els.map((el) => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right }; });
      })()`) as Array<{ left: number; right: number }>;
      expect(boxes).toHaveLength(5);
      for (const [i, box] of boxes.entries()) {
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(360);
        if (i > 0) expect(box.left).toBeGreaterThanOrEqual(boxes[i - 1].right - 0.5);
      }
      const clipped = await page.evaluate(
        "(() => { const t = document.querySelector('.logo-text'); return t.scrollWidth > t.clientWidth; })()"
      );
      expect(clipped).toBe(false);
    });
  }
});

test.describe('tablet', { tag: '@once' }, () => {
  test.use({ viewport: { width: 768, height: 1024 }, hasTouch: true });

  test('home keeps the footer and has no More button', async ({ page }) => {
    await open(page, '/');
    await expect(footer(page)).toBeVisible();
    await expect(footer(page).getByRole('link', { name: 'Privacy' })).toBeVisible();
    await expect(moreButton(page)).toBeHidden();
  });

  test('the group page hides the footer behind the More button', async ({ page }) => {
    await open(page, groupUrl());
    await expect(page.locator('.mobile-tabbar')).toBeVisible();
    await expect(footer(page)).toBeHidden();
    await expect(moreButton(page)).toBeVisible();

    await moreButton(page).click();
    await legalMenu(page).getByRole('link', { name: 'Imprint' }).click();
    await expect(page.getByRole('heading', { name: 'Impressum', exact: true })).toBeVisible();
    // Back on a regular page: footer again, no More button.
    await expect(footer(page)).toBeVisible();
    await expect(moreButton(page)).toBeHidden();
  });
});

test.describe('desktop', { tag: '@desktop' }, () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const path of ['/', groupUrl()]) {
    test(`${path} shows the footer and no More button`, async ({ page }) => {
      await open(page, path);
      await expect(footer(page)).toBeVisible();
      await expect(footer(page).getByRole('link', { name: 'Imprint' })).toBeVisible();
      await expect(moreButton(page)).toBeHidden();
      await expect(legalMenu(page)).toBeHidden();
    });
  }
});
