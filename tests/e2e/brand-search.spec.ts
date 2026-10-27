import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, fulfilSearch, streamBody } from './helpers/brand-stream';
import { openSection } from './helpers/business-tab';

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const TITLE = 'What we know about Sen';

test.use({ locale: 'en-US' });

const answer = {
  searchTerms: ['hotel massage da nang'],
  moments: [{ value: 'after hiking Ba Na Hills', source: 'https://vietnam.travel/da-nang' }],
  placeSymbols: [],
  dropped: [],
  searchedAt: '2026-10-24T12:00:00.000Z',
  searchPromptVersion: 'search-1',
};

async function signInAndRead(page: Page) {
  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(SEN);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page).toHaveURL('/');
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
}

test('a read is followed by the search, whose additions show and stay', async ({ page }) => {
  await fulfilRead(page, [streamBody(senProfile())]);
  // Long enough to open "Your feeling", where the search shows, before it ends.
  const searches = await fulfilSearch(page, answer, 1_500);
  await signInAndRead(page);

  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await openSection(page, 'Your feeling');
  await expect(page.getByText('Looking up what people search for…')).toBeVisible();
  await expect(page.getByText('hotel massage da nang')).toBeVisible();
  await expect(page.getByRole('link', { name: 'seen on vietnam.travel' })).toHaveAttribute(
    'href',
    'https://vietnam.travel/da-nang',
  );

  await page.reload();
  await page.getByRole('tab', { name: 'Your business' }).click();
  await openSection(page, 'Your feeling');
  await expect(page.getByText('hotel massage da nang')).toBeVisible();
  expect(searches.count()).toBe(1);
});

test('a failed search keeps the panel and says so', async ({ page }) => {
  await fulfilRead(page, [streamBody(senProfile())]);
  await fulfilSearch(page, { status: 503, error: 'search_busy' });
  await signInAndRead(page);

  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await openSection(page, 'Your feeling');
  await expect(
    page.getByText("We couldn't look this up today. We'll try again next time."),
  ).toBeVisible();
  await openSection(page, 'Where and when');
  await expect(page.locator('[data-field]', { hasText: 'Town' })).toContainText('Da Nang');
});
