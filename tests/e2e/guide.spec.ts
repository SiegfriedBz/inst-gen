import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import en from '@/messages/en.json' with { type: 'json' };
import id from '@/messages/id.json' with { type: 'json' };
import vi from '@/messages/vi.json' with { type: 'json' };

// The owner guide (docs/specs/guide/owner-guide), at the phone viewport.

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const BASE = 'http://localhost:3000';
const MESSAGES = { en, id, vi };

async function signIn(page: Page) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
}

const saveLocale = (context: BrowserContext, value: string) =>
  context.addCookies([{ name: 'shopfront_locale', value, url: BASE }]);

test.use({ locale: 'en-US' });

test('opens from the home screen', async ({ page }) => {
  await signIn(page);
  await page.locator('header').getByRole('link', { name: en.guide.link }).click();
  await expect(page).toHaveURL('/guide');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.guide.title);
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(8);
});

test('switches language and stays', async ({ page }) => {
  await signIn(page);
  await page.goto('/guide');
  await page.getByRole('button', { name: 'Tiếng Việt' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(vi.guide.title);
  await expect(page).toHaveURL('/guide');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('switches language and comes back to the guide', async ({ page }) => {
    await signIn(page);
    await page.goto('/guide');
    await page.getByRole('button', { name: 'Bahasa Indonesia' }).click();
    await expect(page).toHaveURL('/guide');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(id.guide.title);
  });
});

test('back to Shopfront', async ({ page }) => {
  await signIn(page);
  await page.goto('/guide');
  await page.getByRole('link', { name: en.guide.back }).click();
  await expect(page).toHaveURL('/');
});

test('the guide is private', async ({ page }) => {
  await page.goto('/guide');
  await expect(page).toHaveURL('/enter');
});

test('no sideways scroll at 320px', async ({ page, context }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await signIn(page);
  for (const locale of ['en', 'id', 'vi'] as const) {
    await saveLocale(context, locale);
    for (const path of ['/guide', '/']) {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      if (path === '/guide') {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(
          MESSAGES[locale].guide.title,
        );
      }
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `${path} in ${locale}`).toBeLessThanOrEqual(320);
    }
  }
});

test('prints plain, even in dark mode', async ({ page }) => {
  await signIn(page);
  await page.goto('/guide');
  await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
  await expect(page.getByRole('navigation', { name: 'Language' })).toBeHidden();
  await expect(page.getByRole('link', { name: en.guide.back })).toBeHidden();
  await expect(page.getByRole('button', { name: en.guide.print })).toBeHidden();
  const colours = await page.evaluate(() => ({
    page: getComputedStyle(document.body).backgroundColor,
    heading: getComputedStyle(document.querySelector('h1') as Element).color,
    // The page's fade-in would freeze at its first, invisible frame on paper.
    animation: getComputedStyle(document.querySelector('main') as Element).animationName,
  }));
  expect(colours).toEqual({
    page: 'rgb(255, 255, 255)',
    heading: 'rgb(0, 0, 0)',
    animation: 'none',
  });
});
