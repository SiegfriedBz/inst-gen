import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import id from '@/messages/id.json' with { type: 'json' };
import vi from '@/messages/vi.json' with { type: 'json' };
import { senProfile } from '../unit/helpers/brand';
import { languageButton, languageNav, pickLanguage } from './helpers/language';

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const SVARGA = 'test-blue-wave-svarga';
const ONE_YEAR = 365 * 24 * 60 * 60;
const BASE = 'http://localhost:3000';

async function signIn(page: Page, passphrase = SEN) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(passphrase);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
}

const saveLocale = (context: BrowserContext, value: string) =>
  context.addCookies([{ name: 'shopfront_locale', value, url: BASE }]);

const localeCookie = async (context: BrowserContext) =>
  (await context.cookies()).find((c) => c.name === 'shopfront_locale');

test.describe('phone in Indonesian', () => {
  test.use({ locale: 'id-ID' });

  test('sees Indonesian, and nothing is saved', async ({ page, context }) => {
    await page.goto('/enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'id');
    await expect(page.getByLabel(id.enter.label)).toBeVisible();
    expect(await localeCookie(context)).toBeUndefined();
  });

  test('a bad cookie is ignored', async ({ page, context }) => {
    await saveLocale(context, 'fr');
    await page.goto('/enter');
    await expect(page.getByLabel(id.enter.label)).toBeVisible();
  });
});

test.describe('phone in French', () => {
  test.use({ locale: 'fr-FR' });

  test('sees English', async ({ page }) => {
    await page.goto('/enter');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.getByLabel('Passphrase')).toBeVisible();
  });
});

test.describe('phone in Vietnamese', () => {
  test.use({ locale: 'vi-VN' });

  test('the saved choice beats the phone', async ({ page, context }) => {
    await saveLocale(context, 'en');
    await page.goto('/enter');
    await expect(page.getByLabel('Passphrase')).toBeVisible();
  });
});

test.describe('phone in English', () => {
  test.use({ locale: 'en-US' });

  test('switching on / keeps the owner there', async ({ page, context }) => {
    await signIn(page);
    // One button, at the top right, showing the current code
    // (docs/specs/platform/friendlier-home, "The language button").
    await expect(page.getByRole('navigation', { name: 'Language' })).toHaveCount(1);
    const nav = page.locator('header').getByRole('navigation', { name: 'Language' });
    const button = languageButton(page);
    await expect(button).toHaveAccessibleName('Language: English');
    await expect(button).toHaveText('EN');
    await button.click();
    await expect(nav.locator('[aria-current="true"]')).toHaveText('English');
    const names = await nav
      .locator('button, [aria-current]')
      .evaluateAll((items) => items.map((item) => item.textContent?.trim() ?? ''));
    expect(names).toEqual(['English', 'Tiếng Việt', 'Bahasa Indonesia']);
    await expect(nav.getByRole('button', { name: 'Tiếng Việt' })).toHaveAttribute('lang', 'vi');
    await nav.getByRole('button', { name: 'Tiếng Việt' }).click();

    await expect(page).toHaveURL('/');
    await expect(button).toHaveAccessibleName('Ngôn ngữ: Tiếng Việt');
    await expect(button).toHaveText('VI');
    await expect(
      page.getByRole('heading', { name: vi.home.welcome.replace('{name}', 'Sen') }),
    ).toBeVisible();
    await expect(page.locator('header').getByText('Sen', { exact: true })).toBeVisible();

    // Saved in the background once the screen has switched.
    await expect.poll(async () => (await localeCookie(context))?.value).toBe('vi');
    const cookie = await localeCookie(context);
    expect(cookie?.value).toBe('vi');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    expect(Math.abs((cookie?.expires ?? 0) - (Date.now() / 1000 + ONE_YEAR))).toBeLessThan(60);
  });

  test.describe('without JavaScript', () => {
    test.use({ javaScriptEnabled: false });

    test('the switch works', async ({ page }) => {
      await page.goto('/enter');
      await pickLanguage(page, 'Bahasa Indonesia');
      await expect(page).toHaveURL('/enter');
      await expect(page.getByLabel(id.enter.label)).toBeVisible();
    });
  });
});

test.describe('small phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const code of ['en', 'id', 'vi']) {
    test(`${code} fits 320px`, async ({ page, context }) => {
      await saveLocale(context, code);
      await page.goto('/enter');
      await expectFits(page);
      await signIn(page);
      await expectFits(page);
    });
  }

  test('vi fits 320px with the name Svarga', async ({ page, context }) => {
    await saveLocale(context, 'vi');
    await signIn(page, SVARGA);
    await expectFits(page);
  });
});

async function expectFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await expect(languageButton(page)).toBeInViewport({ ratio: 1 });
  // Open, the three languages fit too, with still no sideways scroll.
  await languageButton(page).click();
  const entries = languageNav(page).locator('button, [aria-current]');
  await expect(entries).toHaveCount(3);
  for (const entry of await entries.all()) await expect(entry).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await languageButton(page).click();
}

test.describe('switching with JavaScript', () => {
  test.use({ locale: 'en-US' });

  test('keeps the open tab, and the choice after a reload', async ({ page, context }) => {
    await signIn(page);
    await page.getByLabel('Your website').fill('sendanangmassage.com');
    await page.route('**/api/brand/read', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/x-ndjson',
        body: `${JSON.stringify({ type: 'final', profile: senProfile() })}\n`,
      }),
    );
    await page.route('**/api/brand/search', (route) =>
      route.fulfill({ status: 503, json: { error: 'search_unavailable' } }),
    );
    await page.getByRole('button', { name: 'Read my website' }).click();
    await expect(page.getByRole('tab', { name: 'Your business' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await pickLanguage(page, 'Tiếng Việt');
    await expect(page.getByRole('tab', { name: vi.home.tabs.business })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await expect(page.locator('html')).toHaveAttribute('lang', 'vi');
    await expect.poll(async () => (await localeCookie(context))?.value).toBe('vi');
    await page.reload();
    await expect(page.getByRole('tab', { name: vi.home.tabs.posts })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });
});
