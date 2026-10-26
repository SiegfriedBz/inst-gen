import { type BrowserContext, expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';

// The Reviews tab (docs/specs/reviews/reply-drafts), at the phone viewport,
// with every route mocked. Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const REVIEW =
  'Lovely hot stone massage, my back feels new! Only thing: the room was a bit cold and we waited about 20 minutes past our booking.';

const answer = {
  reviewLanguage: 'en',
  abusive: false,
  reviewTranslation: 'Massage đá nóng tuyệt vời, lưng tôi như mới!',
  short: {
    text: 'Thank you, {name}! 🙏 Sorry about the cold room and the wait. Hope to see you again 🪷',
    translation: 'Cảm ơn {name}! 🙏 Xin lỗi vì phòng lạnh và phải chờ. 🪷',
  },
  warm: {
    text: 'Dear {name}, thank you so much for writing. 🙏 We would love to see you again at Sen 🪷',
    translation: 'Thân mến {name}, cảm ơn bạn rất nhiều. 🙏 🪷',
  },
  model: 'gemini-3.5-flash-lite',
  promptVersion: 'reply-1',
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
  await page.locator('#website').fill('sendanangmassage.com');
  await page.locator('#website').press('Enter');
  await expect(page.getByRole('tablist')).toBeVisible();
}

test('paste a review, get two replies, keep them through a reload, lose them at the reset', async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-26T10:00:00+07:00') });
  const sent: string[] = [];
  await page.route('**/api/reviews/reply', async (route) => {
    sent.push(route.request().postData() ?? '');
    await route.fulfill({ json: answer });
  });
  await fulfilRead(page, [streamBody(senProfile())]);
  await signInAndRead(page);

  await page.getByRole('tab', { name: 'Reviews' }).click();
  await page.getByLabel("Guest's name (optional)").fill('Anna K.');
  await page.getByLabel('The review').fill(REVIEW);
  await page.getByRole('button', { name: 'Write 2 replies' }).click();

  const short =
    'Thank you, Anna K.! 🙏 Sorry about the cold room and the wait. Hope to see you again 🪷';
  await expect(page.getByText(short)).toBeVisible();
  await expect(
    page.getByText('Cảm ơn Anna K.! 🙏 Xin lỗi vì phòng lạnh và phải chờ. 🪷'),
  ).toBeVisible();
  await expect(page.getByText(/^Anna K\.'s review · in English$/)).toBeVisible();
  expect(sent).toHaveLength(1);
  expect(sent[0]).not.toContain('Anna');

  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.getByRole('button', { name: 'Copy the text' }).first().click();
  await expect(page.getByRole('button', { name: 'Copied' })).toBeVisible();

  // A trip to Google Maps reloads the page: the replies stay, with no request.
  await page.reload();
  await page.getByRole('tab', { name: 'Reviews' }).click();
  await expect(page.getByText(short)).toBeVisible();
  expect(sent).toHaveLength(1);

  // 14:05 the same afternoon, past Google's reset: the tab is empty.
  await page.clock.setSystemTime(new Date('2026-10-26T14:05:00+07:00'));
  await page.reload();
  await page.getByRole('tab', { name: 'Reviews' }).click();
  await expect(page.getByRole('button', { name: 'Write 2 replies' })).toBeVisible();
  await expect(page.getByText(short)).toHaveCount(0);
});

test.describe('small phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  for (const code of ['en', 'vi']) {
    test(`three tabs fit 320px in ${code}`, async ({ page, context }) => {
      await saveLocale(context, code);
      await fulfilRead(page, [streamBody(senProfile())]);
      await signInAndRead(page);
      const tabs = page.getByRole('tab');
      await expect(tabs).toHaveCount(3);
      for (const tab of await tabs.all()) await expect(tab).toBeInViewport({ ratio: 1 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        320,
      );
    });
  }
});
