import * as cheerio from 'cheerio';

// The words a page shows a visitor, for the model to read.

export const TEXT_BUDGET_CHARS = 60_000;

const DROP = [
  'script',
  'style',
  'noscript',
  'template',
  'svg',
  'iframe',
  'nav',
  'header',
  'footer',
  '[role="navigation"]',
  // Cookie banners; html, body and main sometimes carry a cookie class too.
  ':not(html, body, main)[id*="cookie" i]',
  ':not(html, body, main)[class*="cookie" i]',
].join(',');

const BLOCKS = 'p,div,section,article,li,h1,h2,h3,h4,h5,h6,td,th,br,dd,dt,blockquote,figcaption';

export function visibleText(html: string): string {
  const $ = cheerio.load(html);
  $(DROP).remove();
  $(BLOCKS).append(' ');
  const root = $('main').length > 0 ? $('main') : $('body');
  return root.text().replace(/\s+/g, ' ').trim();
}

// Shares the budget evenly between pages, in order. A page shorter than its
// share leaves the rest to the pages after it.
export function shareTextBudget(
  pages: { url: string; text: string }[],
  totalChars = TEXT_BUDGET_CHARS,
): { url: string; text: string }[] {
  let remaining = totalChars;
  return pages.map((page, i) => {
    const share = Math.floor(remaining / (pages.length - i));
    const text = page.text.slice(0, share);
    remaining -= text.length;
    return { url: page.url, text };
  });
}
