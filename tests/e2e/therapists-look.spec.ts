import { expect, test } from '@playwright/test';
import type { Profile } from '@/lib/brand/profile';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { openSection } from './helpers/business-tab';
import { fulfilImages } from './helpers/images';
import { fulfilPosts, postsBody } from './helpers/posts-stream';
import { openSuggestion, tileImages } from './helpers/suggestions';

// The therapists' look (docs/specs/posts/therapists-look), at the phone
// viewport, with every route mocked. Test values from playwright.config.ts;
// not secrets.
const SEN = 'test-lotus-river-sen';
const WHITE = 'a white short-sleeved tunic, white trousers, dark hair in a neat low bun';
const GREEN = 'a pale green tunic, white trousers, hair in a low bun';

test.use({ locale: 'en-US' });

test("the look read from the site dresses every new image, and the owner's change follows", async ({
  page,
}) => {
  const profile: Profile = { ...senProfile(), staffLook: { value: WHITE, source: 'model' } };
  await fulfilRead(page, [streamBody(profile)]);
  await fulfilPosts(page, 'plan', postsBody(profile));
  const rewrites = await fulfilPosts(page, 'rewrite', postsBody(profile, { caption: 'Rewritten' }));
  await fulfilImages(page, {});
  const looks: (string | undefined)[] = [];
  page.on('request', (request) => {
    if (request.url().endsWith('/api/posts/image')) {
      looks.push((request.postDataJSON() as { staffLook?: string }).staffLook);
    }
  });

  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();

  await openSection(page, 'Your look');
  const row = page.locator('[data-field]', { hasText: "Your therapists' look" });
  await expect(row.getByText(WHITE)).toBeVisible();
  await expect(row.getByText('our guess from your photos')).toBeVisible();

  await page.getByRole('tab', { name: 'Create Posts' }).click();
  await page.getByRole('button', { name: 'Make 2 suggestions' }).click();
  await expect(tileImages(page)).toHaveCount(2);
  expect(looks).toEqual([WHITE, WHITE]);

  await page.getByRole('tab', { name: 'Your business' }).click();
  await openSection(page, 'Your look');
  await page.getByRole('button', { name: 'Edit Your look' }).click();
  await page.getByLabel("Your therapists' look").fill(GREEN);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(row.getByText(GREEN)).toBeVisible();
  await expect(row.getByText('added by you')).toBeVisible();

  await page.getByRole('tab', { name: 'Create Posts' }).click();
  const sheet = await openSuggestion(page, 1);
  await sheet.getByRole('button', { name: 'Create new image' }).click();
  await sheet.getByRole('button', { name: 'Make it' }).click();
  await expect(sheet.getByText('Making the image…')).toBeHidden();
  expect(looks).toEqual([WHITE, WHITE, GREEN]);
  // The look never reaches the captions (docs/specs/posts/therapists-look).
  expect(rewrites.count()).toBe(0);
});
