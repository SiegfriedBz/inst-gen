import * as cheerio from 'cheerio';

// Which pages of a site the brand read looks at, besides the home page.

export const PAGE_WORDS = [
  'about',
  'story',
  'team',
  'services',
  'treatments',
  'menu',
  'prices',
  'pricing',
  'packages',
  'booking',
  'book',
  'contact',
  'location',
  'faq',
] as const;

export const MAX_EXTRA_PAGES = 7;

const siteHost = (host: string) => host.replace(/^www\./, '');
const sameSite = (a: URL, b: URL) => siteHost(a.hostname) === siteHost(b.hostname);
const pathKey = (url: URL) => url.pathname.replace(/\/+$/, '') || '/';

function resolve(href: string | undefined, base: URL): URL | null {
  if (!href) return null;
  try {
    const url = new URL(href, base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

// A token matches a word as it is, or with or without a plural "s".
function matchCount(tokens: string[]): number {
  const matched = new Set<string>();
  for (const token of tokens) {
    for (const word of PAGE_WORDS) {
      if (token === word || `${token}s` === word || token === `${word}s`) matched.add(word);
    }
  }
  return matched.size;
}

const tokens = (text: string) =>
  text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean);

type Alternate = { lang: string; url: URL };

function alternates(html: string, homeUrl: URL): Alternate[] {
  const $ = cheerio.load(html);
  return $('link[rel="alternate"][hreflang]')
    .toArray()
    .flatMap((el) => {
      const url = resolve($(el).attr('href'), homeUrl);
      const lang = ($(el).attr('hreflang') ?? '').toLowerCase();
      return url && sameSite(url, homeUrl) ? [{ lang, url }] : [];
    });
}

const isEnglish = (lang: string) => lang === 'en' || lang.startsWith('en-');

// The English version of the home page, when the page read is another one.
export function englishHome(html: string, homeUrl: URL): URL | null {
  const english = alternates(html, homeUrl).find((a) => isEnglish(a.lang));
  if (!english || pathKey(english.url) === pathKey(homeUrl)) return null;
  return english.url;
}

// Path prefixes of the site's other languages, like `/ko/`.
export function otherLanguagePrefixes(html: string, homeUrl: URL): string[] {
  const prefixes = alternates(html, homeUrl)
    .filter((a) => !isEnglish(a.lang) && a.lang !== 'x-default')
    .map((a) => pathKey(a.url))
    .filter((path) => path !== '/')
    .map((path) => `${path}/`);
  return [...new Set(prefixes)];
}

// Internal links that look like about, services, prices, contact and the like,
// best first, at most 7.
export function choosePages(html: string, homeUrl: URL): URL[] {
  const $ = cheerio.load(html);
  const skip = otherLanguagePrefixes(html, homeUrl);
  const seen = new Set<string>([pathKey(homeUrl)]);
  const candidates: { url: URL; score: number; order: number }[] = [];
  $('a[href]').each((order, el) => {
    const url = resolve($(el).attr('href'), homeUrl);
    if (!url || !sameSite(url, homeUrl)) return;
    const key = pathKey(url);
    if (seen.has(key) || skip.some((prefix) => `${key}/`.startsWith(prefix))) return;
    const score = matchCount([...tokens(url.pathname), ...tokens($(el).text())]);
    if (score === 0) return;
    seen.add(key);
    url.hash = '';
    url.search = '';
    candidates.push({ url, score, order });
  });
  return candidates
    .sort(
      (a, b) =>
        b.score - a.score || a.url.pathname.length - b.url.pathname.length || a.order - b.order,
    )
    .slice(0, MAX_EXTRA_PAGES)
    .map((c) => c.url);
}
