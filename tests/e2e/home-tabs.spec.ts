import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';

// The two tabs on the home screen (docs/specs/platform/home-tabs), at the
// phone viewport, with every route mocked. Test values from
// playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';

test.use({ locale: 'en-US' });

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
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
}

test('a first read lands on Your business, and the next open on Create your posts', async ({
  page,
}) => {
  await fulfilRead(page, [streamBody(senProfile())]);
  await signInAndRead(page);
  const business = page.getByRole('tab', { name: 'Your business' });
  const posts = page.getByRole('tab', { name: 'Create your posts' });
  await expect(business).toHaveAttribute('aria-selected', 'true');
  await expect(posts).toHaveAttribute('aria-selected', 'false');
  await expect(page.getByText(/This is what we understood about/)).toBeVisible();

  await page.reload();
  await expect(posts).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Make my posts' })).toBeVisible();
  await expect(page.getByText(/This is what we understood about/)).toBeHidden();
});

test('Re-read my website hides the tabs until it ends', async ({ page }) => {
  const profile = senProfile();
  let reads = 0;
  await page.route('**/api/brand/read', async (route) => {
    reads += 1;
    if (reads > 1) await new Promise((resolve) => setTimeout(resolve, 1_000));
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: streamBody(profile),
    });
  });
  await page.route('**/api/brand/search', (route) =>
    route.fulfill({ status: 503, json: { error: 'search_unavailable' } }),
  );
  await signInAndRead(page);
  await page.getByRole('tab', { name: 'Create your posts' }).click();
  await page.getByRole('tab', { name: 'Your business' }).click();
  await page.getByRole('button', { name: 'Re-read my website' }).click();
  await expect(page.getByText('Reading your website…')).toBeVisible();
  await expect(page.getByRole('tablist')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Your business' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  expect(reads).toBe(2);
});
