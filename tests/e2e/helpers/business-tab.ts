import { expect, type Page } from '@playwright/test';

// "Your business" on the home screen (docs/specs/platform/friendlier-home,
// "What's missing first"): five sections in one card, "Your business" open,
// the others rows that open in place. A row's name starts with its title,
// followed by its summary line while it's closed.
export async function openSection(page: Page, title: string): Promise<void> {
  const row = page.getByRole('button', { name: new RegExp(`^${title}`) });
  if ((await row.getAttribute('aria-expanded')) !== 'true') await row.click();
  await expect(row).toHaveAttribute('aria-expanded', 'true');
}
