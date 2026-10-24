import { expect, type Page, test } from '@playwright/test';

// Test values from playwright.config.ts; not secrets.
const SEN = 'test-lotus-river-sen';
const WRONG = 'test-lotus-river-svarga';
const THIRTY_DAYS = 30 * 24 * 60 * 60;

async function signIn(page: Page, passphrase: string) {
  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(passphrase);
  await page.getByRole('button', { name: 'Enter' }).click();
}

test('no session goes to /enter', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL('/enter');
  await expect(page.getByRole('heading', { name: 'Shopfront' })).toBeVisible();
  await expect(page.getByText('Your posts and review replies, written for you.')).toBeVisible();
  await expect(page.getByLabel('Passphrase')).toBeVisible();
});

test('Sen signs in', async ({ page, context }) => {
  await signIn(page, SEN);
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Welcome, Sen' })).toBeVisible();
  await expect(page.locator('header').getByText('Sen', { exact: true })).toBeVisible();

  const cookie = (await context.cookies()).find((c) => c.name === 'shopfront_session');
  expect(cookie).toBeDefined();
  expect(cookie?.httpOnly).toBe(true);
  expect(cookie?.secure).toBe(true);
  expect(cookie?.sameSite).toBe('Lax');
  expect(Math.abs((cookie?.expires ?? 0) - (Date.now() / 1000 + THIRTY_DAYS))).toBeLessThan(60);
});

test('wrong passphrase', async ({ page, context }) => {
  await page.goto('/enter');
  await page.getByLabel('Passphrase').fill(WRONG);
  const started = Date.now();
  await page.getByRole('button', { name: 'Enter' }).click();
  await expect(page.getByText("That passphrase isn't right. Try again.")).toBeVisible();
  expect(Date.now() - started).toBeGreaterThanOrEqual(900);
  await expect(page.getByLabel('Passphrase')).toHaveValue('');
  await expect(page.getByLabel('Passphrase')).toBeFocused();
  expect((await context.cookies()).some((c) => c.name === 'shopfront_session')).toBe(false);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('Sen signs in', async ({ page }) => {
    await signIn(page, SEN);
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('heading', { name: 'Welcome, Sen' })).toBeVisible();
  });
});

test('api health', async ({ page, request }) => {
  const anonymous = await request.get('/api/health');
  expect(anonymous.status()).toBe(401);
  expect(await anonymous.json()).toEqual({ error: 'unauthorized' });

  await signIn(page, SEN);
  await expect(page).toHaveURL('/');
  const signedIn = await page.request.get('/api/health');
  expect(signedIn.status()).toBe(200);
  expect(await signedIn.json()).toEqual({ ok: true });
});

test('not indexed', async ({ request }) => {
  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /');
  const enter = await request.get('/enter');
  expect(enter.headers()['x-robots-tag']).toBe('noindex, nofollow');
  // Responses made by proxy.ts too: the redirect and the 401.
  const redirect = await request.get('/', { maxRedirects: 0 });
  expect(redirect.status()).toBe(307);
  expect(redirect.headers()['x-robots-tag']).toBe('noindex, nofollow');
  const unauthorized = await request.get('/api/health');
  expect(unauthorized.headers()['x-robots-tag']).toBe('noindex, nofollow');
});

test.describe('dark mode', () => {
  test.use({ colorScheme: 'dark' });

  test('uses the dark tokens', async ({ page }) => {
    await page.goto('/enter');
    const background = (selector: string) =>
      page.locator(selector).evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(await background('body')).toBe('rgb(18, 22, 20)');
    expect(await background('button[type=submit]')).toBe('rgb(63, 191, 148)');
  });
});

test.describe('small phone', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('no horizontal scroll at 320px', async ({ page }) => {
    await page.goto('/enter');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  });
});
