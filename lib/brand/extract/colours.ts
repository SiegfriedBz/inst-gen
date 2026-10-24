import * as cheerio from 'cheerio';
import type { COLOUR_ROLES } from '../profile';

// Brand colours read in code: the theme-color meta tag and CSS custom
// properties whose names suggest a brand colour.

export type CodeColour = { hex: string; role: (typeof COLOUR_ROLES)[number]; source: string };

export const MAX_COLOURS = 5;
export const MAX_STYLESHEETS = 2;

const NAMED: Record<string, string> = {
  white: '#ffffff',
  black: '#000000',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  navy: '#000080',
  teal: '#008080',
  orange: '#ffa500',
  gold: '#ffd700',
  purple: '#800080',
  pink: '#ffc0cb',
  brown: '#a52a2a',
  gray: '#808080',
  grey: '#808080',
  beige: '#f5f5dc',
  ivory: '#fffff0',
};

const hex2 = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0');

function channel(value: string): number {
  return value.endsWith('%') ? (Number.parseFloat(value) / 100) * 255 : Number.parseFloat(value);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

// A CSS colour as lower-case #rrggbb, or null when it isn't a plain colour.
export function toHex(css: string): string | null {
  const value = css.trim().toLowerCase();
  if (NAMED[value]) return NAMED[value];
  const short = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (/^#[0-9a-f]{6}$/.test(value)) return value;
  const fn = value.match(/^(rgba?|hsla?)\(([^)]*)\)$/);
  if (!fn) return null;
  const parts = fn[2]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .slice(0, 3);
  if (parts.length < 3) return null;
  if (fn[1].startsWith('rgb')) {
    const rgb = parts.map(channel);
    if (rgb.some(Number.isNaN)) return null;
    return `#${rgb.map(hex2).join('')}`;
  }
  const [h, s, l] = [
    Number.parseFloat(parts[0]),
    Number.parseFloat(parts[1]) / 100,
    Number.parseFloat(parts[2]) / 100,
  ];
  if ([h, s, l].some(Number.isNaN)) return null;
  return `#${hslToRgb(((h % 360) + 360) % 360, s, l)
    .map(hex2)
    .join('')}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

function lightnessSaturation(hex: string): { l: number; s: number } {
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  return { l, s };
}

const BRAND_PROPERTY = /(--(?:primary|brand|accent|color-[\w-]+)[\w-]*)\s*:\s*([^;}]+)/gi;

// Tailwind v4 declares its whole default palette as --color-* variables; they
// say nothing about the brand.
const TAILWIND_PALETTE =
  /^--color-(?:(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|mauve|olive|mist|taupe)-\d+|black|white)$/;

// Near-white, near-black and greys are background or text, never primary.
export function brandColours(themeColor: string | undefined, css: string[]): CodeColour[] {
  const found: { hex: string; source: string }[] = [];
  const theme = themeColor ? toHex(themeColor) : null;
  if (theme) found.push({ hex: theme, source: 'theme-color' });
  for (const sheet of css) {
    for (const match of sheet.matchAll(BRAND_PROPERTY)) {
      const property = match[1].toLowerCase();
      if (TAILWIND_PALETTE.test(property)) continue;
      const hex = toHex(match[2].replace(/!important/i, ''));
      if (hex) found.push({ hex, source: `css:${property}` });
    }
  }
  const colours: CodeColour[] = [];
  let saturated = 0;
  for (const { hex, source } of found) {
    if (colours.some((c) => c.hex === hex)) continue;
    const { l, s } = lightnessSaturation(hex);
    let role: CodeColour['role'];
    if (l > 0.95) role = 'background';
    else if (l < 0.08) role = 'text';
    else if (s < 0.1) role = l > 0.8 ? 'background' : 'text';
    else role = saturated++ === 0 ? 'primary' : 'accent';
    colours.push({ hex, role, source });
    if (colours.length === MAX_COLOURS) break;
  }
  return colours;
}

const sameSite = (a: URL, b: URL) =>
  a.hostname.replace(/^www\./, '') === b.hostname.replace(/^www\./, '');

export function linkedStylesheets(html: string, pageUrl: URL): URL[] {
  const $ = cheerio.load(html);
  const urls: URL[] = [];
  for (const el of $('link[rel~="stylesheet"][href]').toArray()) {
    try {
      const url = new URL($(el).attr('href') ?? '', pageUrl);
      if (sameSite(url, pageUrl) && !urls.some((u) => u.href === url.href)) urls.push(url);
    } catch {}
    if (urls.length === MAX_STYLESHEETS) break;
  }
  return urls;
}

export function inlineCss(html: string): string[] {
  const $ = cheerio.load(html);
  return $('style')
    .toArray()
    .map((el) => $(el).text())
    .filter((css) => css.trim().length > 0);
}
