import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { openSection } from './helpers/business-tab';

// Test values from playwright.config.ts; not secrets. Sen's website is read
// by itself; the developer, with no website, types one
// (docs/specs/platform/easier-to-use).
const SEN = 'test-lotus-river-sen';
const DEV = 'test-quiet-stone-dev';
const TITLE = 'What we know about Sen';

test.use({ locale: 'en-US' });

async function signIn(page: Page, password = SEN) {
  await page.goto('/enter');
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page).toHaveURL('/');
}

async function editHours(page: Page, hours: string) {
  await openSection(page, 'Where and when');
  await page.getByRole('button', { name: 'Edit Where and when' }).click();
  await page.getByLabel('Opening hours').fill(hours);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(hours)).toBeVisible();
}

test('Sen on a new phone: the password alone, then Your business, kept through a reload', async ({
  page,
}) => {
  const reads = await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page);

  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await expect(page.getByLabel('Your website')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Your business' })).toHaveAttribute(
    'aria-selected',
    'true',
  );
  await openSection(page, 'Where and when');
  await expect(page.locator('[data-field]', { hasText: 'Town' })).toContainText('Da Nang');
  await openSection(page, 'How people reach you');
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
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await openSection(page, 'Where and when');
  await expect(page.getByText('9am to midnight')).toBeVisible();
  expect(reads.count()).toBe(1);
});

test('re-read with an edit asks first', async ({ page }) => {
  const reads = await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page);
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  await editHours(page, 'Noon to midnight');

  await page.getByRole('button', { name: 'Read it again' }).click();
  await expect(page.getByText('Read your website again?')).toBeVisible();
  await expect(
    page.getByText('Your 1 change will be replaced by what your site says now.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByText('Read your website again?')).toBeHidden();
  expect(reads.count()).toBe(1);
});

test('forget empties the phone, and the website is read again on the next open', async ({
  page,
}) => {
  const reads = await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page);
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();

  await page.getByRole('button', { name: 'Forget this business' }).click();
  await expect(page.getByText('Forget Sen?')).toBeVisible();
  await page.getByRole('button', { name: 'Forget', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Read my website' })).toBeVisible();
  await expect(page.getByText('sendanangmassage.com', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Your website')).toHaveCount(0);
  expect(reads.count()).toBe(1);

  await page.reload();
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  expect(reads.count()).toBe(2);
});

test('a reload mid-read resumes once', async ({ page }) => {
  const reads = await fulfilRead(page, [
    streamBody(senProfile(), { end: 'drop' }),
    streamBody(senProfile()),
  ]);
  await signIn(page);
  await expect(page.getByText("You're offline. We'll carry on when you're back.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
  expect(reads.count()).toBe(2);
});

test('a busy model shows its message', async ({ page }) => {
  await fulfilRead(page, [streamBody(senProfile(), { end: { error: 'model_busy' } })]);
  await signIn(page);
  await expect(
    page.getByText("Shopfront has used today's free reading. Try again tomorrow."),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Read my website' })).toBeVisible();
});

test('the developer, with no website, types one', async ({ page }) => {
  await fulfilRead(page, [streamBody(senProfile())]);
  await signIn(page, DEV);
  await page.getByLabel('Your website').fill('sendanangmassage.com');
  await page.getByRole('button', { name: 'Read my website' }).click();
  await expect(page.getByRole('heading', { name: TITLE })).toBeVisible();
});
