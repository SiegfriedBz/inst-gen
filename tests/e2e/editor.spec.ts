import { expect, type Page, test } from '@playwright/test';
import vi from '@/messages/vi.json' with { type: 'json' };
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';

// The editor and saving to the phone (docs/specs/posts/editor-download), at
// the phone viewport, with every route mocked. Test values from
// playwright.config.ts; not secrets. Sen is on IMAGE_OWNERS.
const SEN = 'test-lotus-river-sen';
const BASE = 'http://localhost:3000';

test.use({ locale: 'en-US' });

async function signIn(page: Page) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
}

async function readAndMake(
  page: Page,
  website: string,
  read: string,
  make: string,
  postsTab = 'Create your posts',
) {
  await page.getByLabel(website).fill('sendanangmassage.com');
  await page.getByRole('button', { name: read }).click();
  await page.getByRole('tab', { name: postsTab }).click();
  await page.getByRole('button', { name: make }).click();
}

async function sixPosts(page: Page) {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  const images = await fulfilImages(page, {});
  await signIn(page);
  await readAndMake(page, 'Your website', 'Read my website', 'Make my posts');
  await expect(page.locator('article img')).toHaveCount(6);
  return { profile, images };
}

test('the feed preview shows six tiles, and a tile goes to its card', async ({ page }) => {
  await sixPosts(page);
  await expect(page.getByText('Your feed once these are posted')).toBeVisible();
  const tiles = page.getByRole('button', { name: /^Post \d$/ });
  await expect(tiles).toHaveCount(6);
  await expect(tiles.first()).toHaveAccessibleName('Post 6');
  await page.getByRole('button', { name: 'Post 4' }).click();
  await expect(page.locator('article').nth(3)).toBeInViewport();
});

test('an edit is kept after a reload, and the automatic update leaves it alone', async ({
  page,
}) => {
  const { profile } = await sixPosts(page);
  const first = page.locator('article').first();
  await first.getByRole('button', { name: 'Edit' }).click();
  await first.getByLabel('Caption').fill('My own words about warm oil.');
  await first.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(first.getByText('Edited')).toBeVisible();

  await page.reload();
  await expect(
    page.locator('article').first().getByText('My own words about warm oil.'),
  ).toBeVisible();
  await expect(page.locator('article').first().getByText('Edited')).toBeVisible();

  const sent: number[] = [];
  await page.route('**/api/posts/rewrite', async (route) => {
    const ids = (route.request().postDataJSON() as { posts: { id: string }[] }).posts.map(
      (p) => p.id,
    );
    sent.push(ids.length);
    const body = postsBody(profile, { caption: 'Rewritten' });
    await route.fulfill({ status: 200, contentType: 'application/x-ndjson', body });
  });
  await page.getByRole('tab', { name: 'Your business' }).click();
  await page.getByRole('button', { name: 'Edit Where and when' }).click();
  await page.getByLabel('Opening hours').fill('Every day, 9am to midnight');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('tab', { name: 'Create your posts' }).click();
  await expect(page.getByText('Rewritten 2.')).toBeVisible();
  await expect(page.getByText('My own words about warm oil.')).toBeVisible();
  expect(sent).toEqual([5]);

  await page.getByRole('button', { name: 'Rewrite this one too' }).click();
  await expect(page.getByText('Rewritten 1.')).toBeVisible();
  await expect(page.getByText('My own words about warm oil.')).toHaveCount(0);
  expect(sent).toEqual([5, 1]);
});

test('a new image carries the hint', async ({ page }) => {
  const { images } = await sixPosts(page);
  const bodies: { hint?: string }[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/posts/image')) bodies.push(request.postDataJSON());
  });
  const first = page.locator('article').first();
  await first.getByRole('button', { name: 'New image' }).click();
  await first.getByLabel('What should change? (optional)').fill('more green');
  await first.getByRole('button', { name: 'Make it' }).click();
  await expect(first.getByText('Check that the image description still fits.')).toBeVisible();
  expect(bodies.map((b) => b.hint)).toEqual(['more green']);
  expect(images.count()).toBe(7);
});

test('without a share sheet, Save post image downloads the file', async ({ page }) => {
  await sixPosts(page);
  const download = page.waitForEvent('download');
  await page.locator('article').nth(1).getByRole('button', { name: 'Save post image' }).click();
  expect((await download).suggestedFilename()).toMatch(/^sen-\d{4}-\d{2}-\d{2}-2-post\.jpg$/);
});

test('two batches keep their own images after a reload', async ({ page }) => {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  const failures: Record<string, { status: number; error: string }> = {};
  await fulfilImages(page, failures);
  await signIn(page);
  await readAndMake(page, 'Your website', 'Read my website', 'Make my posts');
  await expect(page.locator('article img')).toHaveCount(6);
  failures['post-1'] = { status: 502, error: 'image_blocked' };
  await page.getByRole('button', { name: 'Make 6 more' }).click();
  await expect(page.locator('article')).toHaveCount(12);
  await expect(page.locator('article img')).toHaveCount(11);

  await page.reload();
  await expect(page.locator('article img')).toHaveCount(11);
  await expect(page.locator('article').first().locator('img')).toHaveCount(0);
  await expect(page.locator('article').nth(6).locator('img')).toHaveCount(1);
});

test.describe('a Vietnamese screen', () => {
  test.use({ locale: 'vi-VN' });

  test('Show in Tiếng Việt, kept after a reload with no new request', async ({ page, context }) => {
    await context.addCookies([{ name: 'shopfront_locale', value: 'vi', url: BASE }]);
    const profile = senProfile();
    await fulfilRead(page, [streamBody(profile)]);
    await fulfilPosts(page, 'plan', postsBody(profile));
    await fulfilImages(page, {});
    const asked: { text: string; locale: string }[] = [];
    await page.route('**/api/posts/translate', async (route) => {
      asked.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          text: 'Chú thích 1.',
          model: 'gemini-3.5-flash-lite',
          promptVersion: 'translate-1',
        },
      });
    });
    await signIn(page);
    await readAndMake(
      page,
      vi.home.websiteLabel,
      vi.brand.home.read,
      vi.posts.make,
      vi.home.tabs.posts,
    );
    const show = vi.posts.translate.show.replace('{language}', 'Tiếng Việt');
    const first = page.locator('article').first();
    await first.getByRole('button', { name: show }).click();
    await expect(first.getByText('Chú thích 1.')).toBeVisible();
    expect(asked).toEqual([{ text: 'Caption 1.', locale: 'vi' }]);

    await page.reload();
    await page.locator('article').first().getByRole('button', { name: show }).click();
    await expect(page.locator('article').first().getByText('Chú thích 1.')).toBeVisible();
    expect(asked).toHaveLength(1);
  });
});
