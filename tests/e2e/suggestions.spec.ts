import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';
import { tileImages, tiles } from './helpers/suggestions';

// Suggestions last until Google's reset, 14:00 in Da Nang in US summer time
// (docs/specs/posts/suggestions, docs/specs/platform/one-daily-reset), at the
// phone viewport, with every route
// mocked. Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';

test.use({ locale: 'en-US', timezoneId: 'Asia/Ho_Chi_Minh' });

async function signInAndRead(page: Page) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
  await page.getByRole('tab', { name: 'Create Posts' }).click();
}

// Since docs/specs/posts/two-days, a day's suggestions stay one more day,
// under "Yesterday", and go at the reset after that.
test('suggestions stay through a reload, a day under Yesterday, then go', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-26T10:00:00+07:00') });
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  await fulfilImages(page, {});
  await signInAndRead(page);

  await expect(page.getByText(/Each suggestion is 2 images/)).toBeVisible();
  await page.getByRole('button', { name: 'Make 2 suggestions' }).click();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toBeVisible();
  await expect(tileImages(page)).toHaveCount(2);

  // 13:55: still today's.
  await page.clock.setSystemTime(new Date('2026-10-26T13:55:00+07:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toBeVisible();
  await expect(tileImages(page)).toHaveCount(2);

  // 14:05 the same afternoon, past the reset: they stay, under Yesterday.
  await page.clock.setSystemTime(new Date('2026-10-26T14:05:00+07:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toHaveCount(1);
  await expect(tileImages(page)).toHaveCount(2);
  await expect(page.getByText(/Each suggestion is 2 images/)).toHaveCount(0);

  // A new attempt is the new day's Attempt 1, on top under Today.
  await page.getByRole('button', { name: 'Make 2 new suggestions' }).click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toHaveCount(2);

  // Past the next reset: the first attempt is gone, the second is yesterday's.
  await page.clock.setSystemTime(new Date('2026-10-27T14:05:00+07:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Yesterday' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Today' })).toHaveCount(0);
  await expect(tiles(page)).toHaveCount(2);
});
