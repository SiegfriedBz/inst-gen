import { expect, type Page, test } from '@playwright/test';
import en from '@/messages/en.json' with { type: 'json' };
import id from '@/messages/id.json' with { type: 'json' };
import vi from '@/messages/vi.json' with { type: 'json' };
import { testEnv } from '../../playwright.config';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { languageButton, languageNav } from './helpers/language';
import { fulfilPosts, postsBody } from './helpers/posts-stream';
import { closeSuggestion, openSuggestion, tile, tileImages, tiles } from './helpers/suggestions';

// The friendlier home (docs/specs/platform/friendlier-home), at the phone
// viewport, with every route mocked. Test values from playwright.config.ts;
// not secrets.
const SEN = 'test-lotus-river-sen';
const MESSAGES = { en, id, vi };

const REVIEW = 'Lovely hot stone massage, my back feels new! Only the room was a bit cold.';
const SHORT = 'Thank you so much! 🙏 Sorry about the cold room. Hope to see you again 🪷';
const WARM = 'Dear guest, thank you so much for writing. 🙏 We would love to see you again 🪷';
const replies = {
  reviewLanguage: 'en',
  abusive: false,
  reviewTranslation: null,
  short: { text: SHORT, translation: null },
  warm: { text: WARM, translation: null },
  model: 'gemini-3.5-flash-lite',
  promptVersion: 'reply-1',
};

test.use({ locale: 'en-US' });

async function signIn(page: Page, passphrase = SEN) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(passphrase);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
}

// A business saved on the phone, opened again: a read, then a reload.
async function savedBrand(page: Page, passphrase = SEN) {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await signIn(page, passphrase);
  await page.locator('#website').fill('sendanangmassage.com');
  await page.locator('#website').press('Enter');
  await expect(page.getByRole('tablist')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('tablist')).toBeVisible();
  return profile;
}

const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test('a saved business opens on Create Posts, the tabs in a bar at the bottom', async ({
  page,
}) => {
  await savedBrand(page);
  await expect(page.getByRole('tab', { name: 'Create Posts' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  const bar = page.locator('[data-tab-bar]');
  await expect(bar.getByRole('tablist', { name: 'Home' })).toBeVisible();
  await expect(bar).toBeInViewport({ ratio: 1 });
  const box = await bar.boundingBox();
  const viewport = page.viewportSize();
  expect(Math.abs((box?.y ?? 0) + (box?.height ?? 0) - (viewport?.height ?? 0))).toBeLessThan(1);
  // The header's name says it once a business is saved.
  await expect(page.locator('header').getByText('Sen', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Welcome, Sen' })).toHaveCount(0);
});

test('a suggestion saved and copied says so on its tile, after a reload too', async ({
  page,
  context,
}) => {
  // A share sheet that saves: each call counted.
  await page.addInitScript(() => {
    const shared = window as unknown as { shared: number };
    shared.shared = 0;
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => {
        shared.shared += 1;
      },
    });
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const profile = await savedBrand(page);
  await fulfilPosts(page, 'plan', postsBody(profile));
  await fulfilImages(page, {});
  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(tileImages(page)).toHaveCount(6);
  await expect(tile(page, 2)).toHaveAccessibleName('Suggestion 2 of 6, Caption 2.');

  const sheet = await openSuggestion(page, 2);
  await expect(sheet).toHaveAccessibleName('Attempt 1, suggestion 2 of 6');
  await sheet.getByRole('button', { name: 'Save the 2 images' }).click();
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { shared: number }).shared))
    .toBe(1);
  await sheet.getByRole('button', { name: 'Copy the text' }).click();
  await expect(sheet.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Caption 2.');
  await closeSuggestion(page);
  await expect(tile(page, 2)).toBeFocused();

  await expect(tile(page, 2)).toHaveAccessibleName(
    'Suggestion 2 of 6, Caption 2., Saved and copied',
  );
  for (const n of [1, 3, 4, 5, 6]) {
    await expect(tile(page, n)).not.toHaveAccessibleName(/Saved and copied/);
  }

  await page.reload();
  await expect(tile(page, 2)).toHaveAccessibleName(
    'Suggestion 2 of 6, Caption 2., Saved and copied',
  );
  await expect(tiles(page)).toHaveCount(6);

  // The back gesture closes a suggestion too, and stays on the home screen.
  await openSuggestion(page, 3);
  await page.goBack();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL('/');
});

test("Your business shows what's missing first, and Add Phone opens its form", async ({ page }) => {
  await savedBrand(page);
  await page.getByRole('tab', { name: 'Your business' }).click();
  await expect(page.getByRole('heading', { name: 'What we know about Sen' })).toBeVisible();
  const missing = page.getByRole('region', { name: /^\d+ things? we couldn't find$/ });
  await expect(missing).toBeVisible();
  const sections = page.getByRole('button', { name: /^Your business/ });
  await expect(sections).toHaveAttribute('aria-expanded', 'true');
  const missingBox = await missing.boundingBox();
  const sectionsBox = await sections.boundingBox();
  expect(missingBox?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(sectionsBox?.y ?? 0);

  await missing.getByRole('button', { name: 'Add Phone' }).click();
  const form = page.getByRole('dialog', { name: 'How people reach you' });
  await expect(form).toBeVisible();
  await expect(form.getByLabel('Phone', { exact: true })).toBeFocused();
});

test('Reviews: two replies, one at a time, the warmer one copied', async ({ page, context }) => {
  await page.route('**/api/reviews/reply', (route) => route.fulfill({ json: replies }));
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await savedBrand(page);
  await page.getByRole('tab', { name: 'Reviews' }).click();
  await page.getByLabel('The review').fill(REVIEW);
  await page.getByRole('button', { name: 'Write 2 replies' }).click();

  const which = page.getByRole('radiogroup', { name: 'Which reply' });
  await expect(which.getByRole('radio', { name: 'Short' })).toBeChecked();
  await expect(page.getByText(SHORT)).toBeVisible();
  await expect(page.getByText(WARM)).toHaveCount(0);

  await which.getByRole('radio', { name: 'Warmer' }).click();
  await expect(which.getByRole('radio', { name: 'Warmer' })).toBeChecked();
  await expect(page.getByText(WARM)).toBeVisible();
  await expect(page.getByText(SHORT)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Copy the reply' })).toHaveCount(1);
  await page.getByRole('button', { name: 'Copy the reply' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(WARM);
});

test('the language button switches the open tab to Vietnamese', async ({ page }) => {
  await savedBrand(page);
  await page.getByRole('tab', { name: 'Reviews' }).click();
  await expect(languageButton(page)).toHaveText('EN');
  await languageButton(page).click();
  await expect(languageNav(page).locator('[aria-current="true"]')).toHaveText('English');
  await languageNav(page).getByRole('button', { name: 'Tiếng Việt' }).click();

  await expect(page.getByRole('tab', { name: vi.home.tabs.reviews })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await expect(page.getByRole('textbox', { name: vi.reviews.reviewLabel })).toBeVisible();
  await expect(languageButton(page)).toHaveText('VI');
  await expect(page).toHaveURL('/');
});

test('the tab bar hides while typing with the keyboard up', async ({ page }) => {
  await savedBrand(page);
  await page.getByRole('tab', { name: 'Reviews' }).click();
  const bar = page.locator('[data-tab-bar]');
  const field = page.getByLabel('The review');
  await expect(bar).toBeVisible();

  // Focus brings the on-screen keyboard up, here half the screen; the bar
  // hides on focus, since Android Chrome shrinks the window with it and
  // sizes can't tell.
  const viewport = page.viewportSize() ?? { width: 412, height: 839 };
  await field.focus();
  await page.setViewportSize({ width: viewport.width, height: Math.round(viewport.height / 2) });
  await field.pressSequentially('Lovely');
  await expect(bar).toBeHidden();

  await page.setViewportSize(viewport);
  await field.blur();
  await expect(bar).toBeVisible();
});

test.describe('small phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const code of ['en', 'id', 'vi'] as const) {
    test(`no sideways scroll at 320px in ${code}, on /enter and each tab`, async ({
      page,
      context,
      baseURL,
    }) => {
      const m = MESSAGES[code];
      await context.addCookies([{ name: 'shopfront_locale', value: code, url: baseURL }]);
      await page.goto('/enter');
      await expect(page.locator('html')).toHaveAttribute('lang', code);
      expect(await scrollWidth(page), `/enter in ${code}`).toBeLessThanOrEqual(320);

      const profile = await savedBrand(page);
      await fulfilPosts(page, 'plan', postsBody(profile));
      await fulfilImages(page, {});
      await page.route('**/api/reviews/reply', (route) => route.fulfill({ json: replies }));

      await page.getByRole('tab', { name: m.home.tabs.posts }).click();
      await page.getByRole('button', { name: m.posts.make }).click();
      await expect(tileImages(page)).toHaveCount(6);
      expect(await scrollWidth(page), `Create Posts in ${code}`).toBeLessThanOrEqual(320);

      await page.getByRole('tab', { name: m.home.tabs.business }).click();
      await expect(
        page.getByRole('heading', { name: m.brand.home.title.replace('{name}', 'Sen') }),
      ).toBeVisible();
      expect(await scrollWidth(page), `Your business in ${code}`).toBeLessThanOrEqual(320);

      await page.getByRole('tab', { name: m.home.tabs.reviews }).click();
      await page.getByRole('textbox', { name: m.reviews.reviewLabel }).fill(REVIEW);
      await page.getByRole('button', { name: m.reviews.write }).click();
      await expect(page.getByText(SHORT)).toBeVisible();
      expect(await scrollWidth(page), `Reviews in ${code}`).toBeLessThanOrEqual(320);

      for (const tab of await page.getByRole('tab').all()) {
        await expect(tab).toBeInViewport({ ratio: 1 });
      }
    });
  }

  // The longest owner name among the test passphrases (lib/pilot/config.ts:
  // the owner id ends each passphrase, its first letter capitalised).
  const owners = testEnv.PILOT_PASSPHRASES.split(',').map((p) => p.trim());
  const longest = owners.reduce((a, b) =>
    b.slice(b.lastIndexOf('-') + 1).length > a.slice(a.lastIndexOf('-') + 1).length ? b : a,
  );
  const LONG_NAME = 16;

  test('a long spa name leaves the Guide link and the language button in view', async ({
    page,
  }) => {
    const name = longest.slice(longest.lastIndexOf('-') + 1);
    test.skip(
      name.length < LONG_NAME,
      `No test owner has a name of ${LONG_NAME} letters or more (the longest is "${name}").`,
    );
    await signIn(page, longest);
    await expect(page.locator('header').getByRole('link', { name: 'Guide' })).toBeInViewport({
      ratio: 1,
    });
    await expect(languageButton(page)).toBeInViewport({ ratio: 1 });
    expect(await scrollWidth(page)).toBeLessThanOrEqual(320);
  });
});
