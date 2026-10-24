import * as cheerio from 'cheerio';

// The logo and the photos the style read looks at.

export const MAX_PHOTOS = 6;
export const MIN_PHOTO_SIDE = 400;

function resolve(href: string | undefined, base: URL): URL | null {
  if (!href) return null;
  try {
    const url = new URL(href.trim(), base);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

const saysLogo = (value: string | undefined) => /logo/i.test(value ?? '');

// The JSON-LD logo, else an image in the header that says "logo", else the
// largest apple-touch-icon or icon.
export function findLogo(html: string, pageUrl: URL, jsonLdLogo?: string): URL | null {
  const fromLd = resolve(jsonLdLogo, pageUrl);
  if (fromLd) return fromLd;
  const $ = cheerio.load(html);
  const isLogo = (el: Parameters<typeof $>[0]) => {
    const img = $(el);
    return saysLogo(img.attr('src')) || saysLogo(img.attr('alt')) || saysLogo(img.attr('class'));
  };
  const inHeader = $('header img').toArray().find(isLogo);
  const anywhere = inHeader ?? $('img').toArray().find(isLogo);
  if (anywhere) {
    const url = resolve($(anywhere).attr('src'), pageUrl);
    if (url) return url;
  }
  const icons = $('link[rel~="apple-touch-icon"], link[rel~="icon"]')
    .toArray()
    .map((el) => ({
      url: resolve($(el).attr('href'), pageUrl),
      size: Number.parseInt(($(el).attr('sizes') ?? '0').split('x')[0], 10) || 0,
      touch: ($(el).attr('rel') ?? '').includes('apple-touch-icon'),
    }))
    .filter((icon) => icon.url !== null)
    .sort((a, b) => Number(b.touch) - Number(a.touch) || b.size - a.size);
  return icons[0]?.url ?? null;
}

const SIZE_SUFFIX = /-(\d{2,5})x(\d{2,5})(?=\.[a-z]+$)/i;

// The file name without size suffixes or query, so variants count once.
function photoKey(url: URL): string {
  return `${url.host}${url.pathname.replace(SIZE_SUFFIX, '')}`.toLowerCase();
}

type Candidate = { url: URL; size: number; og: boolean; order: number };

function largestSrcset(srcset: string | undefined): { src: string; width: number } | null {
  if (!srcset) return null;
  const entries = srcset
    .split(',')
    .map((part) => part.trim().split(/\s+/))
    .filter(([src]) => src)
    .map(([src, descriptor]) => ({
      src,
      width: descriptor?.endsWith('w') ? Number.parseInt(descriptor, 10) : 0,
    }));
  return entries.sort((a, b) => b.width - a.width)[0] ?? null;
}

function declaredSize(url: URL, width?: string, height?: string, fromSrcset = 0): number {
  const sides = [Number.parseInt(width ?? '', 10), Number.parseInt(height ?? '', 10), fromSrcset];
  const suffix = url.pathname.match(SIZE_SUFFIX);
  if (suffix) sides.push(Number(suffix[1]), Number(suffix[2]));
  return Math.max(0, ...sides.filter((n) => Number.isFinite(n)));
}

function refused(url: URL, alt?: string): boolean {
  return (
    /\.svg$/i.test(url.pathname) ||
    /logo|icon|favicon|sprite/i.test(url.pathname) ||
    /logo|icon/i.test(alt ?? '')
  );
}

// Photos from the pages read: og:image first, then by declared size, then by
// order. Logos, icons, SVGs, small images and size variants are dropped.
export function photoCandidates(pages: { html: string; url: URL }[], ogImage?: string): URL[] {
  const candidates: Candidate[] = [];
  let order = 0;
  const add = (url: URL | null, size: number, og = false, alt?: string) => {
    if (!url || refused(url, alt)) return;
    if (size > 0 && size < MIN_PHOTO_SIDE) return;
    candidates.push({ url, size, og, order: order++ });
  };
  if (ogImage) add(resolve(ogImage, pages[0]?.url ?? new URL(ogImage)), 0, true);
  for (const { html, url: pageUrl } of pages) {
    const $ = cheerio.load(html);
    for (const el of $('img').toArray()) {
      const img = $(el);
      const best = largestSrcset(img.attr('srcset'));
      const url = resolve(best?.src ?? img.attr('src') ?? img.attr('data-src'), pageUrl);
      if (!url) continue;
      add(
        url,
        declaredSize(url, img.attr('width'), img.attr('height'), best?.width),
        false,
        img.attr('alt'),
      );
    }
    for (const el of $('[style*="background"]').toArray()) {
      const match = ($(el).attr('style') ?? '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
      const url = resolve(match?.[1], pageUrl);
      if (url) add(url, declaredSize(url));
    }
  }
  const byKey = new Map<string, Candidate>();
  for (const candidate of candidates) {
    const key = photoKey(candidate.url);
    const kept = byKey.get(key);
    if (!kept) byKey.set(key, candidate);
    else if (candidate.og || (!kept.og && candidate.size > kept.size)) {
      byKey.set(key, { ...candidate, order: kept.order, og: kept.og || candidate.og });
    }
  }
  return [...byKey.values()]
    .sort((a, b) => Number(b.og) - Number(a.og) || b.size - a.size || a.order - b.order)
    .slice(0, MAX_PHOTOS)
    .map((c) => c.url);
}
