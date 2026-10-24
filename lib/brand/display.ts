import { OWNER_SOURCE } from './profile';

// How the brand panel shows a fact's source and the last read
// (docs/specs/brand/brand-panel, "The panel").

export type SourceKind = 'fact' | 'guess' | 'suggestion';

export type SourceShown =
  | { kind: 'page'; path: string; href: string }
  | { kind: 'home'; href: string }
  | { kind: 'owner' }
  | { kind: 'model'; as: 'guess' | 'suggestion' }
  | { kind: 'site' }
  // A page on another site, as for a moment from the essence search.
  | { kind: 'elsewhere'; host: string; href: string };

function pageUrl(source: string): URL | null {
  try {
    const url = new URL(source);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

// Null when there is no source yet, as in a partial line. A source that is
// neither a page, "model" nor "owner" (code's "theme-color", "css:…") is
// shown as from the website, without a link. Given the site's URL, a page on
// another host is shown as "seen on" that host.
export function sourceOf(
  source: string | undefined,
  kind: SourceKind,
  siteUrl?: string,
): SourceShown | null {
  if (!source) return null;
  if (source === OWNER_SOURCE) return { kind: 'owner' };
  if (source === 'model')
    return { kind: 'model', as: kind === 'suggestion' ? 'suggestion' : 'guess' };
  const url = pageUrl(source);
  if (!url) return { kind: 'site' };
  const site = siteUrl ? pageUrl(siteUrl) : null;
  const host = (u: URL) => u.hostname.replace(/^www\./, '');
  if (site && host(site) !== host(url))
    return { kind: 'elsewhere', host: host(url), href: url.href };
  if (url.pathname === '/' || url.pathname === '') return { kind: 'home', href: url.href };
  return { kind: 'page', path: url.pathname, href: url.href };
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// "3 days ago", in the screen's language.
export function lastReadLabel(readAt: string, now: Date, locale: string): string {
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const ago = Math.max(0, now.getTime() - new Date(readAt).getTime());
  if (ago < HOUR) return format.format(-Math.round(ago / MINUTE), 'minute');
  if (ago < DAY) return format.format(-Math.round(ago / HOUR), 'hour');
  return format.format(-Math.round(ago / DAY), 'day');
}
