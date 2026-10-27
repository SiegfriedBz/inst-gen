import { expect, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';
import { closeSuggestion, openSuggestion, tile, tileImages } from './helpers/suggestions';

// Test values from playwright.config.ts; not secrets.
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
  await page.getByRole('tab', { name: 'Create Posts' }).click();

  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(page.getByText('Making the image…')).toHaveCount(6);
  await expect(tileImages(page)).toHaveCount(5);
  await expect(
    tile(page, 3).getByText("This image couldn't be made. Try again for a new one."),
  ).toBeVisible();

  const sheet = await openSuggestion(page, 1);
  await sheet.getByRole('button', { name: 'See the story image' }).click();
  const story = page.getByRole('dialog', { name: 'See the story image' });
  await expect(story.locator('img')).toBeVisible();
  await story.getByRole('button', { name: 'Close' }).click();
  await expect(story).toHaveCount(0);
  await closeSuggestion(page);

  await page.reload();
  await expect(tileImages(page)).toHaveCount(5);
  delete failures['post-3'];
  const third = await openSuggestion(page, 3);
  await third.getByRole('button', { name: 'Try again' }).click();
  await expect(tileImages(page)).toHaveCount(6);
  expect(images.count()).toBe(7);
});
