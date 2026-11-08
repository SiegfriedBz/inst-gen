import { expect, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';
import { closeSuggestion, openSuggestion, tile, tileImages } from './helpers/suggestions';

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';

test.use({ locale: 'en-US' });

test('two images follow the captions, stay on the phone, and one is tried again', async ({
  page,
}) => {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  const failures: Record<string, { status: number; error: string }> = {
    'post-2': { status: 502, error: 'image_blocked' },
  };
  const images = await fulfilImages(page, failures, 500);

  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(SEN);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page).toHaveURL('/');
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
  await page.getByRole('tab', { name: 'Create Posts' }).click();

  // The posts have no set-ups, so all are days: the first two get images
  // (docs/specs/posts/two-images).
  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(page.getByText('Making the image…')).toHaveCount(2);
  await expect(tileImages(page)).toHaveCount(1);
  await expect(
    tile(page, 2).getByText("This image couldn't be made. Try again for a new one."),
  ).toBeVisible();
  for (const n of [3, 4, 5, 6]) {
    await expect(tile(page, n).getByText(`Caption ${n}.`)).toBeVisible();
  }

  const sheet = await openSuggestion(page, 1);
  await sheet.getByRole('button', { name: 'See the story image' }).click();
  const story = page.getByRole('dialog', { name: 'See the story image' });
  await expect(story.locator('img')).toBeVisible();
  await story.getByRole('button', { name: 'Close' }).click();
  await expect(story).toHaveCount(0);
  await closeSuggestion(page);

  await page.reload();
  await expect(tileImages(page)).toHaveCount(1);
  delete failures['post-2'];
  const second = await openSuggestion(page, 2);
  await second.getByRole('button', { name: 'Try again' }).click();
  await expect(tileImages(page)).toHaveCount(2);
  await closeSuggestion(page);

  const fourth = await openSuggestion(page, 4);
  await expect(
    fourth.getByText(
      'Only 2 suggestions of each attempt come with images. Create one for this suggestion, or use a photo of your own.',
    ),
  ).toBeVisible();
  await expect(fourth.getByRole('button', { name: 'Save post & story images' })).toHaveCount(0);
  await fourth.getByRole('button', { name: 'Create new image' }).click();
  await fourth.getByRole('button', { name: 'Make it' }).click();
  await expect(fourth.getByRole('button', { name: 'Save post & story images' })).toBeEnabled();
  await closeSuggestion(page);
  await expect(tile(page, 4).locator('img')).toHaveCount(1);
  await expect(tileImages(page)).toHaveCount(3);
  expect(images.count()).toBe(4);
});
