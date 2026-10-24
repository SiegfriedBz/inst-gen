// Which language a screen uses: the owner's saved choice, then the phone's
// language, then English. Plain TypeScript with no Node-only APIs, so
// proxy.ts can use it too.

export const LOCALES = ['en', 'id', 'vi'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

// Each language in its own name, never translated.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt',
};

export const LOCALE_COOKIE = 'shopfront_locale';
export const LOCALE_COOKIE_MAX_AGE_SECONDS = 365 * 24 * 60 * 60;

// `in` is the earlier code for Indonesian; some phones still send it.
const ALIASES: Record<string, Locale> = { in: 'id' };

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

export function localeFromAcceptLanguage(header: string | null | undefined): Locale | null {
  if (!header) return null;
  const tags = header
    .split(',')
    .map((part) => {
      const [tag = '', ...params] = part.split(';').map((piece) => piece.trim());
      const q = params.find((param) => param.startsWith('q='));
      const weight = q === undefined ? 1 : Number(q.slice(2));
      return { primary: tag.split('-')[0]?.toLowerCase() ?? '', weight };
    })
    .filter(({ weight }) => Number.isFinite(weight) && weight > 0)
    // Array.prototype.sort is stable, so equal weights keep the header's order.
    .sort((a, b) => b.weight - a.weight);

  for (const { primary } of tags) {
    const locale = ALIASES[primary] ?? primary;
    if (isLocale(locale)) return locale;
  }
  return null;
}

export function pickLocale(
  cookie: string | undefined,
  acceptLanguage: string | null | undefined,
): Locale {
  if (isLocale(cookie)) return cookie;
  return localeFromAcceptLanguage(acceptLanguage) ?? DEFAULT_LOCALE;
}

// Where the language switch sends the owner back to: a path on this site only.
// `//host` and `/\host` are other sites to a browser.
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/';
  if (value[1] === '/' || value[1] === '\\') return '/';
  return value;
}
