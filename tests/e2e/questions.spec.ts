import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';

// The Questions tab (docs/specs/questions/answer-drafts), at the phone
// viewport, with every route mocked. Test values from playwright.config.ts;
// not secrets.
const SEN = 'test-lotus-river-sen';

const answer = {
  questionLanguage: 'en',
  sexual: false,
  unanswered: false,
  questionTranslation: 'Massage Thái giá bao nhiêu?',
  answer: {
    text: 'Hello!\n\nThai Massage, 60 min, $19 VND 500k 🪷',
    translation: 'Xin chào!\n\nMassage Thái, 60 phút, $19 VND 500k 🪷',
  },
  guest: { place: 'Hyatt', day: null, time: null },
  flags: [],
  model: 'gemini-3.5-flash-lite',
  promptVersion: 'answer-1',
};

test.use({ locale: 'en-US', timezoneId: 'Asia/Ho_Chi_Minh' });

test.beforeEach(async ({ page }) => {
  await page.route('**/api/posts/image', (route) =>
    route.fulfill({ status: 403, json: { error: 'images_off' } }),
  );
});

async function saveLocale(context: BrowserContext, code: string) {
  await context.addCookies([
    { name: 'shopfront_locale', value: code, url: 'http://localhost:3000' },
  ]);
}

async function signInAndRead(page: Page) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('tablist')).toBeVisible();
}

test('paste a question, get an answer, copy it, keep it through a reload', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-10T10:00:00+07:00') });
  const sent: string[] = [];
  await page.route('**/api/questions/answer', async (route) => {
    sent.push(route.request().postData() ?? '');
    await route.fulfill({ json: answer });
  });
  await fulfilRead(page, [streamBody(senProfile())]);
  await signInAndRead(page);

  await page.getByRole('tab', { name: 'Questions' }).click();
  await page
    .getByLabel("The guest's question")
    .fill('How much is a Thai massage? We are at the Hyatt. Call +84 905 123 456');
  await page.getByRole('button', { name: 'Write an answer' }).click();

  await expect(page.getByText('Thai Massage, 60 min, $19 VND 500k 🪷')).toBeVisible();
  await expect(page.getByText('Massage Thái, 60 phút, $19 VND 500k 🪷')).toBeVisible();
  await expect(page.getByText('Staying at: Hyatt')).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).not.toContain('905 123 456');

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy the answer' }).click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();

  // A trip to the chat reloads the page: the answer stays, with no request.
  await page.reload();
  await page.getByRole('tab', { name: 'Questions' }).click();
  await expect(page.getByText('Thai Massage, 60 min, $19 VND 500k 🪷')).toBeVisible();
  expect(sent).toHaveLength(1);
});

test.describe('small phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const code of ['en', 'id', 'vi']) {
    test(`four tabs fit 320px in ${code}`, async ({ page, context }) => {
      await saveLocale(context, code);
      await fulfilRead(page, [streamBody(senProfile())]);
      await signInAndRead(page);
      const tabs = page.getByRole('tab');
      await expect(tabs).toHaveCount(4);
      for (const tab of await tabs.all()) await expect(tab).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320,
      );
    });
  }
});
