import { expect, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';

// Test values from playwright.config.ts; not secrets. Sen is on IMAGE_OWNERS.
const SEN = 'test-lotus-river-sen';

test.use({ locale: 'en-US' });

test('images follow the captions, stay on the phone, and one is tried again', async ({ page }) => {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  const failures: Record<string, { status: number; error: string }> = {
    'post-3': { status: 502, error: 'image_blocked' },
  };
  const images = await fulfilImages(page, failures, 500);

  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(SEN);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page).toHaveURL('/');
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
  await page.getByRole('tab', { name: 'Create your posts' }).click();

  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(page.getByText('Making the image…')).toHaveCount(6);
  await expect(page.locator('article img')).toHaveCount(5);
  const third = page.locator('article').nth(2);
  await expect(
    third.getByText("This image couldn't be made. Try again for a new one."),
  ).toBeVisible();

  await page
    .locator('article')
    .first()
    .getByRole('button', { name: 'See the story image' })
    .click();
  await expect(page.getByRole('dialog').locator('img')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('article img')).toHaveCount(5);
  delete failures['post-3'];
  await page.locator('article').nth(2).getByRole('button', { name: 'Try again' }).click();
  await expect(page.locator('article img')).toHaveCount(6);
  expect(images.count()).toBe(7);
});
