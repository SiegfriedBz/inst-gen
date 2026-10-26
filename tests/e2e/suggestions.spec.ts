import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';

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
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
  await page.getByRole('tab', { name: 'Create Posts' }).click();
}

test("today's suggestions stay through a reload, and Google's reset clears them", async ({
  page,
}) => {
  await page.clock.install({ time: new Date('2026-10-26T10:00:00+07:00') });
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  await fulfilImages(page, {});
  await signInAndRead(page);

  await expect(page.getByText(/Each suggestion is 2 images/)).toBeVisible();
  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toBeVisible();
  await expect(page.locator('article img')).toHaveCount(6);

  // 13:55: still today's.
  await page.clock.setSystemTime(new Date('2026-10-26T13:55:00+07:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toBeVisible();
  await expect(page.locator('article img')).toHaveCount(6);

  // 14:05 the same afternoon, past the reset: a new day starts empty.
  await page.clock.setSystemTime(new Date('2026-10-26T14:05:00+07:00'));
  await page.reload();
  await expect(page.getByText(/Each suggestion is 2 images/)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Make 6 suggestions' })).toBeVisible();
});
