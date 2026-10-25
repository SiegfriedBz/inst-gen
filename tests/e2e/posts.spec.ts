import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilPosts, postsBody } from './helpers/posts-stream';

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';

test.use({ locale: 'en-US' });

// Sen is on IMAGE_OWNERS: no test here may reach Google with the fake key.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/posts/image', (route) =>
    route.fulfill({ status: 403, json: { error: 'images_off' } }),
  );
});

async function signInAndRead(page: Page) {
  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(SEN);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page).toHaveURL('/');
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
  await page.getByRole('tab', { name: 'Create your posts' }).click();
}

test('posts stream in, stay, and follow a brand edit by themselves', async ({ page }) => {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await page.route('**/api/posts/plan', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: postsBody(profile),
    });
  });
  await signInAndRead(page);

  await page.getByRole('button', { name: 'Make my posts' }).click();
  await expect(
    page.getByText('Keep this page open for about a minute while your posts are made.'),
  ).toBeVisible();
  await expect(page.getByText('Caption 6.')).toBeVisible();
  await expect(page.locator('article')).toHaveCount(6);

  await page.reload();
  await expect(page.locator('article')).toHaveCount(6);
  await expect(page.getByRole('button', { name: 'Make 6 more' })).toBeVisible();

  const rewrites = await fulfilPosts(page, 'rewrite', postsBody(profile, { caption: 'Rewritten' }));
  await page.getByRole('tab', { name: 'Your business' }).click();
  await page.getByRole('button', { name: 'Edit Where and when' }).click();
  await page.getByLabel('Opening hours').fill('Every day, 9am to midnight');
  await page.getByRole('button', { name: 'Save' }).click();
  expect(rewrites.count()).toBe(0);
  await page.getByRole('tab', { name: 'Create your posts' }).click();
  await expect(page.getByText('Rewritten 1.')).toBeVisible();
  // The mocked answer carries the old details' hash, so the posts stay out of
  // date: one request all the same, never a second by itself.
  await expect(page.getByRole('button', { name: 'Update captions' })).toBeVisible();
  expect(rewrites.count()).toBe(1);
});

test('a busy model says so and gives the button back', async ({ page }) => {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile, { error: 'model_busy' }));
  await signInAndRead(page);

  await page.getByRole('button', { name: 'Make my posts' }).click();
  await expect(
    page.getByText("Shopfront has used today's free writing. Try again tomorrow."),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Make my posts' })).toBeEnabled();
});
