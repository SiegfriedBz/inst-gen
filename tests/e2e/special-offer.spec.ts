import { expect, type Page, test } from '@playwright/test';
import { senProfile } from '../unit/helpers/brand';
import { fulfilRead, streamBody } from './helpers/brand-stream';
import { pickLanguage } from './helpers/language';
import { postsBody } from './helpers/posts-stream';
import { tiles } from './helpers/suggestions';

// The special offer (docs/specs/posts/special-offer), at the phone viewport,
// with every route mocked. Test passphrase from playwright.config.ts; not a
// secret.
const SEN = 'test-lotus-river-sen';

test.use({ locale: 'en-US' });

async function savedBrand(page: Page) {
  await fulfilRead(page, [streamBody(senProfile())]);
  await page.goto('/enter');
  await page.locator('#passphrase').fill(SEN);
  await page.locator('button[type=submit]:not([name=locale])').click();
  await expect(page).toHaveURL('/');
  await page.locator('#website').fill('sendanangmassage.com');
  await page.locator('#website').press('Enter');
  await expect(page.getByRole('tablist')).toBeVisible();
  await page.getByRole('tab', { name: 'Create Posts' }).click();
}

const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth);

test('an offer set in the sheet goes with the plan, and its two posts show the badge', async ({
  page,
}) => {
  await savedBrand(page);
  await page.getByRole('button', { name: '+ Special offer' }).click();
  const sheet = page.getByRole('dialog', { name: 'Special offer' });
  await sheet.getByRole('checkbox', { name: 'Vietnamese Traditional Massage' }).check();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /^10% off · 1 treatment · until / })).toBeVisible();

  let sent: { offer?: { percent: number; until: string; lastDay: string } } = {};
  await page.route('**/api/posts/plan', async (route) => {
    sent = route.request().postDataJSON();
    const offer = sent.offer;
    await route.fulfill({
      status: 200,
      contentType: 'application/x-ndjson',
      body: postsBody(senProfile(), { offer: offer as never }),
    });
  });
  await page.getByRole('button', { name: 'Make 6 suggestions' }).click();
  await expect(tiles(page)).toHaveCount(6);
  expect(sent.offer?.percent).toBe(10);
  await expect(page.getByTestId('attempt-grid').getByText('10% off')).toHaveCount(2);
});

test('no sideways scroll at 320px in vi with the sheet open', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await savedBrand(page);
  await pickLanguage(page, 'Tiếng Việt');
  await page.getByRole('button', { name: '+ Ưu đãi đặc biệt' }).click();
  await expect(page.getByRole('dialog', { name: 'Ưu đãi đặc biệt' })).toBeVisible();
  expect(await scrollWidth(page)).toBeLessThanOrEqual(320);
});
