import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';

// Suggestions last until 3am on the phone's clock
// (docs/specs/posts/suggestions), at the phone viewport, with every route
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

test("today's suggestions stay through a reload, and 3am clears them", async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-26T20:00:00+07:00') });
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  await fulfilImages(page, {});
  await signInAndRead(page);

  await expect(page.getByText(/Each suggestion is 2 images/)).toBeVisible();
  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toBeVisible();
  await expect(page.locator('article img')).toHaveCount(6);

  // 02:30 the same night: still today's.
  await page.clock.setSystemTime(new Date('2026-10-27T02:30:00+07:00'));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Attempt 1' })).toBeVisible();
  await expect(page.locator('article img')).toHaveCount(6);

  // 03:05: a new day starts empty.
  await page.clock.setSystemTime(new Date('2026-10-27T03:05:00+07:00'));
  await page.reload();
  await expect(page.getByText(/Each suggestion is 2 images/)).toBeVisible();
  await expect(page.locator('article')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Make 6 suggestions' })).toBeVisible();
});
