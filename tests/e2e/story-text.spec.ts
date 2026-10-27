import { expect, type Page, test } from '@playwright/test';
import vi from '@/messages/vi.json' with { type: 'json' };
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';
import { closeSuggestion, openSuggestion, tile, tileImages } from './helpers/suggestions';

// The story text and the sheet in three parts (docs/specs/posts/story-text),
// at the phone viewport, with every route mocked. Test values from
// playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const BASE = 'http://localhost:3000';

async function signIn(page: Page) {
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
}

async function sixWithStories(
  page: Page,
  words = {
    website: 'Your website',
    read: 'Read my website',
    tab: 'Create Posts',
    make: 'Make 6 suggestions',
  },
) {
  const profile = senProfile();
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile, { stories: true }));
  await fulfilImages(page, {});
  await signIn(page);
  await page.getByLabel(words.website).fill('sendanangmassage.com');
  await page.getByRole('button', { name: words.read }).click();
  await page.getByRole('tab', { name: words.tab }).click();
  await page.getByRole('button', { name: words.make }).click();
  await expect(tileImages(page)).toHaveCount(6);
}

test.describe('an English screen', () => {
  test.use({ locale: 'en-US' });

  test('the sheet in three parts; copying the story text ticks nothing', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await sixWithStories(page);
    const sheet = await openSuggestion(page, 2);
    const parts = sheet.getByRole('region');
    await expect(parts).toHaveCount(3);
    await expect(parts.nth(0)).toHaveAccessibleName('Images');
    await expect(parts.nth(1)).toHaveAccessibleName('Post text');
    await expect(parts.nth(2)).toHaveAccessibleName('Story text (optional)');
    await expect(
      parts.nth(0).getByRole('button', { name: 'Save post & story images' }),
    ).toBeVisible();
    await expect(parts.nth(1).getByRole('button', { name: 'Copy post text' })).toBeVisible();
    await expect(parts.nth(2).getByText('Story 2. 🌸')).toBeVisible();

    await parts.nth(2).getByRole('button', { name: 'Copy optional story text' }).click();
    await expect(parts.nth(2).getByRole('button', { name: 'Copied' })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('Story 2. 🌸');
    await closeSuggestion(page);
    await expect(tile(page, 2)).toHaveAccessibleName('Suggestion 2 of 6, Caption 2.');
  });
});

test.describe('a Vietnamese screen', () => {
  test.use({ locale: 'vi-VN' });

  test('one request translates the caption and the story text', async ({ page, context }) => {
    await context.addCookies([{ name: 'shopfront_locale', value: 'vi', url: BASE }]);
    const asked: unknown[] = [];
    await page.route('**/api/posts/translate', async (route) => {
      asked.push(route.request().postDataJSON());
      await route.fulfill({
        json: {
          text: 'Chú thích 2.',
          story: 'Câu chuyện 2. 🌸',
          model: 'gemini-3.5-flash-lite',
          promptVersion: 'translate-2',
        },
      });
    });
    await sixWithStories(page, {
      website: vi.home.websiteLabel,
      read: vi.brand.home.read,
      tab: vi.home.tabs.posts,
      make: vi.posts.make,
    });
    const show = vi.posts.translate.show.replace('{language}', 'Tiếng Việt');
    const sheet = await openSuggestion(page, 2);
    const story = sheet.getByRole('region', {
      name: `${vi.posts.parts.storyText} ${vi.posts.parts.optional}`,
    });
    await story.getByRole('button', { name: show }).click();
    await expect(story.getByText('Câu chuyện 2. 🌸')).toBeVisible();
    const text = sheet.getByRole('region', { name: vi.posts.parts.postText });
    await text.getByRole('button', { name: show }).click();
    await expect(text.getByText('Chú thích 2.')).toBeVisible();
    expect(asked).toEqual([{ text: 'Caption 2.', story: 'Story 2. 🌸', locale: 'vi' }]);
  });
});
