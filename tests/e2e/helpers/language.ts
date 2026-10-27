import type { Page } from '@playwright/test';

// The one language button at the top right of every screen
// (docs/specs/platform/friendlier-home, "The language button"): a <details>
// in the header's navigation, its <summary> showing the current code, the
// three languages by name once it opens. The same steps work with and
// without JavaScript.
export function languageNav(page: Page) {
  return page.locator('header').getByRole('navigation');
}

export function languageButton(page: Page) {
  return languageNav(page).locator('summary');
}

// Opens the list and picks a language by its own name ("Tiếng Việt").
export async function pickLanguage(page: Page, name: string): Promise<void> {
  await languageButton(page).click();
  await languageNav(page).getByRole('button', { name, exact: true }).click();
}
