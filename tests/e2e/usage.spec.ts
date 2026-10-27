import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';

// The usage bar and a limit reached (docs/specs/platform/usage-counters), at
// the phone viewport, with every route mocked. Test values from
// playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';

const answer = (attempts: number) => ({
  resetsAt: '2026-11-15T08:00:00.000Z',
  limited: true,
  left: { reads: 2, attempts, newImages: 10, replies: 20 },
  limits: { reads: 3, attempts: 3, newImages: 10, replies: 20 },
  poolEmpty: false,
  images: { on: true, monthFull: false, backAt: '2026-12-01T00:00:00.000Z' },
});

test.use({ locale: 'en-US', timezoneId: 'Asia/Ho_Chi_Minh' });

async function signInAndRead(page: Page) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
  await page.locator('#website').fill('sendanangmassage.com');
  await page.locator('#website').press('Enter');
  await expect(page.getByRole('tablist')).toBeVisible();
}

test('the bar on each tab, and the last attempt used up', async ({ page }) => {
  let attempts = 1;
  await page.route('**/api/usage', (route) => route.fulfill({ json: answer(attempts) }));
  await page.route('**/api/posts/image', (route) =>
    route.fulfill({ status: 403, json: { error: 'images_off' } }),
  );
  await page.route('**/api/posts/plan', (route) => {
    attempts = 0;
    return route.fulfill({
      status: 429,
      json: { error: 'limit_reached', resetsAt: '2026-11-15T08:00:00.000Z' },
    });
  });
  await fulfilRead(page, [streamBody(senProfile())]);
  await signInAndRead(page);

  // The first line of the open tab (docs/specs/platform/friendlier-home).
  const bar = page.getByRole('tabpanel').getByTestId('usage-bar');
  await page.getByRole('tab', { name: 'Create Posts' }).click();
  await expect(bar).toHaveText('Left today: 1 attempt, 10 new images · Resets at 15:00');
  await page.getByRole('tab', { name: 'Reviews' }).click();
  await expect(bar).toHaveText('Left today: 20 replies · Resets at 15:00');
  await page.getByRole('tab', { name: 'Your business' }).click();
  await expect(bar).toHaveText('Left today: 2 website reads · Resets at 15:00');

  await page.getByRole('tab', { name: 'Create Posts' }).click();
  await page.getByRole('button', { name: /Make 6 suggestions/ }).click();
  await expect(page.getByText("You've made today's 3 attempts. More at 15:00.")).toBeVisible();
  await expect(bar).toHaveText('Left today: 0 attempts, 10 new images · Resets at 15:00');
  await expect(page.getByRole('button', { name: /Make 6 suggestions/ })).toBeDisabled();
});

test('the bar fits a 320px phone in Vietnamese', async ({ page, context }) => {
  await context.addCookies([
    { name: 'shopfront_locale', value: 'vi', url: 'http://localhost:3000' },
  ]);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.route('**/api/usage', (route) => route.fulfill({ json: answer(3) }));
  await page.route('**/api/posts/image', (route) =>
    route.fulfill({ status: 403, json: { error: 'images_off' } }),
  );
  await fulfilRead(page, [streamBody(senProfile())]);
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
  await page.locator('#website').fill('sendanangmassage.com');
  await page.locator('#website').press('Enter');
  await page.getByRole('tab', { name: 'Tạo bài đăng' }).click();
  await expect(page.getByRole('tabpanel').getByTestId('usage-bar')).toHaveText(
    'Còn lại hôm nay: 3 lần thử, 10 hình mới · Làm mới lúc 15:00',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});
