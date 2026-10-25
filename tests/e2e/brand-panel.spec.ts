import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const INTRO = 'This is what we understood about Sen.';

test.use({ locale: 'en-US' });

async function signIn(page: Page) {
  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(SEN);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page).toHaveURL('/');
}

async function readSite(page: Page) {
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
}

async function editHours(page: Page, hours: string) {
  await page.getByRole('button', { name: 'Edit Where and when' }).click();
  await page.getByLabel('Opening hours').fill(hours);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(hours)).toBeVisible();
}

test('first read, edit, and reload keeps it', async ({ page }) => {
  const reads = await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page);
  await readSite(page);

  await expect(page.getByText(INTRO, { exact: false })).toBeVisible();
  await expect(page.locator('[data-field]', { hasText: 'Town' })).toContainText('Da Nang');
  const whatsapp = page.locator('[data-field]', { hasText: '+84898661224' });
  await expect(whatsapp.getByRole('link', { name: 'from /contact' })).toHaveAttribute(
    'href',
    'https://sendanangmassage.com/contact',
  );

  await editHours(page, '9am to midnight');
  await expect(
    page.locator('[data-field]', { hasText: '9am to midnight' }).getByText('added by you'),
  ).toBeVisible();

  await page.reload();
  // The app opens on the posts from then on (docs/specs/platform/home-tabs).
  await page.getByRole('tab', { name: 'Your business' }).click();
  await expect(page.getByText(INTRO, { exact: false })).toBeVisible();
  await expect(page.getByText('9am to midnight')).toBeVisible();
  expect(reads.count()).toBe(1);
});

test('re-read with an edit asks first', async ({ page }) => {
  const reads = await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page);
  await readSite(page);
  await expect(page.getByText(INTRO, { exact: false })).toBeVisible();
  await editHours(page, 'Noon to midnight');

  await page.getByRole('button', { name: 'Re-read my website' }).click();
  await expect(page.getByText('Read your website again?')).toBeVisible();
  await expect(
    page.getByText('Your 1 change will be replaced by what your site says now.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Read your website again?')).toBeHidden();
  expect(reads.count()).toBe(1);
});

test('forget empties the phone', async ({ page }) => {
  await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page);
  await readSite(page);
  await expect(page.getByText(INTRO, { exact: false })).toBeVisible();

  await page.getByRole('button', { name: 'Forget this business' }).click();
  await expect(page.getByText('Forget Sen?')).toBeVisible();
  await page.getByRole('button', { name: 'Forget', exact: true }).click();
  await expect(page.getByLabel('Your website')).toHaveValue('');

  await page.reload();
  await expect(page.getByLabel('Your website')).toBeVisible();
  await expect(page.getByText(INTRO, { exact: false })).toBeHidden();
});

test('a reload mid-read resumes once', async ({ page }) => {
  const reads = await fulfilRead(page, [
    streamBody(senProfile(), { end: 'drop' }),
    streamBody(senProfile()),
  ]);
  await signIn(page);
  await readSite(page);
  await expect(page.getByText("You're offline. We'll carry on when you're back.")).toBeVisible();

  await page.reload();
  await expect(page.getByText(INTRO, { exact: false })).toBeVisible();
  expect(reads.count()).toBe(2);
});

test('a busy model shows its message', async ({ page }) => {
  await fulfilRead(page, [streamBody(senProfile(), { end: { error: 'model_busy' } })]);
  await signIn(page);
  await readSite(page);
  await expect(
    page.getByText("Shopfront has used today's free reading. Try again tomorrow."),
  ).toBeVisible();
  await expect(page.getByLabel('Your website')).toHaveValue('sendanangmassage.com');
});
