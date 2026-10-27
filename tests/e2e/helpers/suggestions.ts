import { expect, type Page } from '@playwright/test';

// "Create Posts" as a grid per attempt (docs/specs/platform/friendlier-home,
// "'Create Posts': a grid of six"): each attempt's tiles, newest attempt
// first, and the sheet a tile opens. Only the opened suggestion's card is on
// the page.

export const grids = (page: Page) => page.getByTestId('attempt-grid');

// Every kept tile, across attempts.
export const tiles = (page: Page) => grids(page).getByRole('button');

// The post images shown on the tiles.
export const tileImages = (page: Page) => grids(page).locator('img');

// Tile `n` (from 1) of the attempt `grid` places down (0 is the newest).
export const tile = (page: Page, n: number, grid = 0) =>
  grids(page)
    .nth(grid)
    .getByRole('button')
    .nth(n - 1);

export async function openSuggestion(page: Page, n: number, grid = 0) {
  await tile(page, n, grid).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet).toBeVisible();
  return sheet;
}

export async function closeSuggestion(page: Page): Promise<void> {
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
}
