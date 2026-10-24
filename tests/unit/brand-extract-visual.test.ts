import { describe, expect, test } from 'vitest';
import { brandColours, inlineCss, linkedStylesheets, toHex } from '@/lib/brand/extract/colours';
import { findLogo, photoCandidates } from '@/lib/brand/extract/visual';

const HOME = new URL('https://x.com/');

describe('toHex', () => {
  test.each([
    ['#abc', '#aabbcc'],
    ['#1F6F5C', '#1f6f5c'],
    ['rgb(18, 52, 86)', '#123456'],
    ['rgb(18 52 86 / 50%)', '#123456'],
    ['hsl(0 100% 50%)', '#ff0000'],
    ['hsl(120, 100%, 25%)', '#008000'],
    ['white', '#ffffff'],
    ['var(--x)', null],
    ['transparent', null],
    ['#12345', null],
  ])('%s gives %s', (css, hex) => {
    expect(toHex(css)).toBe(hex);
  });
});

describe('brandColours', () => {
  test('theme-color is the primary colour', () => {
    expect(brandColours('#1F6F5C', [])).toEqual([
      { hex: '#1f6f5c', role: 'primary', source: 'theme-color' },
    ]);
  });

  test('reads brand custom properties and gives roles', () => {
    const css =
      ':root{--primary:#1f6f5c;--color-bg:#ffffff;--color-grey:#888;--color-ink:#111111;--spacing:4px}';
    expect(brandColours(undefined, [css])).toEqual([
      { hex: '#1f6f5c', role: 'primary', source: 'css:--primary' },
      { hex: '#ffffff', role: 'background', source: 'css:--color-bg' },
      { hex: '#888888', role: 'text', source: 'css:--color-grey' },
      { hex: '#111111', role: 'text', source: 'css:--color-ink' },
    ]);
  });

  test('a grey is never primary', () => {
    const colours = brandColours('#888888', []);
    expect(colours.every((c) => c.role !== 'primary')).toBe(true);
  });

  test('a second saturated colour is an accent', () => {
    const css = ':root{--brand:#1f6f5c;--accent:#e07a2f}';
    expect(brandColours(undefined, [css]).map((c) => c.role)).toEqual(['primary', 'accent']);
  });

  test("ignores Tailwind's default palette, keeps the site's own names", () => {
    const css =
      ':root,:host{--color-amber-50:oklch(98.7% .022 95.277);--color-slate-200:#e2e8f0;--color-gray-600:#4a5565;--color-white:#fff;--color-jade:#4a6b53;--color-sand-100:#efe6d6}';
    expect(brandColours(undefined, [css]).map((c) => c.source)).toEqual([
      'css:--color-jade',
      'css:--color-sand-100',
    ]);
  });

  test('keeps at most 5, without duplicates', () => {
    const css = `:root{${[
      '#111111',
      '#1f6f5c',
      '#1f6f5c',
      '#e07a2f',
      '#2f5fe0',
      '#e02f8a',
      '#7a2fe0',
    ]
      .map((c, i) => `--color-${i}:${c};`)
      .join('')}}`;
    const colours = brandColours(undefined, [css]);
    expect(colours).toHaveLength(5);
    expect(new Set(colours.map((c) => c.hex)).size).toBe(5);
  });
});

describe('stylesheets', () => {
  test('linkedStylesheets keeps the site host, at most 2', () => {
    const html = `<link rel="stylesheet" href="/a.css"><link rel="stylesheet" href="https://cdn.other.com/b.css"><link rel="stylesheet" href="/c.css"><link rel="stylesheet" href="/d.css">`;
    expect(linkedStylesheets(html, HOME).map((u) => u.pathname)).toEqual(['/a.css', '/c.css']);
  });

  test('inlineCss returns style blocks', () => {
    expect(inlineCss('<style>:root{--a:#fff}</style><p>x</p>')).toEqual([':root{--a:#fff}']);
  });
});

describe('findLogo', () => {
  test('the JSON-LD logo comes first', () => {
    const html = '<header><img class="site-logo" src="/header-logo.png"></header>';
    expect(findLogo(html, HOME, 'https://x.com/ld-logo.png')?.href).toBe(
      'https://x.com/ld-logo.png',
    );
  });

  test('then an image in the header that says logo', () => {
    const html =
      '<header><img src="/hero.jpg"><img class="site-logo" src="/logo-dark.png"></header>';
    expect(findLogo(html, HOME)?.href).toBe('https://x.com/logo-dark.png');
  });

  test('then the largest apple-touch-icon', () => {
    const html =
      '<link rel="apple-touch-icon" sizes="120x120" href="/i120.png"><link rel="apple-touch-icon" sizes="180x180" href="/i180.png">';
    expect(findLogo(html, HOME)?.href).toBe('https://x.com/i180.png');
  });

  test('none is null', () => {
    expect(findLogo('<p>no logo</p>', HOME)).toBeNull();
  });
});

describe('photoCandidates', () => {
  test('filters and ranks photos', () => {
    const html = `
      <img src="/logo-white.png" width="800">
      <img src="/icon.svg">
      <img src="data:image/png;base64,AAAA">
      <img src="/small.jpg" width="120">
      <img src="/hero-300x200.jpg" width="300" height="200">
      <img src="/hero.jpg" width="1600" height="900">
      <img srcset="/room-480.jpg 480w, /room-1200.jpg 1200w" src="/room-480.jpg">
      <img src="/massage.jpg" alt="Massage on the terrace">
      <div style="background-image: url('/bg-garden.jpg')"></div>`;
    const urls = photoCandidates([{ html, url: HOME }], 'https://x.com/og.jpg').map(
      (u) => u.pathname,
    );
    expect(urls[0]).toBe('/og.jpg');
    expect(urls).toContain('/hero.jpg');
    expect(urls).not.toContain('/hero-300x200.jpg');
    expect(urls).toContain('/room-1200.jpg');
    expect(urls).not.toContain('/room-480.jpg');
    expect(urls).not.toContain('/logo-white.png');
    expect(urls).not.toContain('/icon.svg');
    expect(urls).not.toContain('/small.jpg');
    expect(urls).toContain('/bg-garden.jpg');
    expect(urls.indexOf('/hero.jpg')).toBeLessThan(urls.indexOf('/massage.jpg'));
  });

  test('returns at most 6', () => {
    const html = Array.from({ length: 10 }, (_, i) => `<img src="/p${i}.jpg">`).join('');
    expect(photoCandidates([{ html, url: HOME }])).toHaveLength(6);
  });

  test('the same photo on two pages counts once', () => {
    const html = '<img src="/hero.jpg">';
    expect(
      photoCandidates([
        { html, url: HOME },
        { html, url: new URL('https://x.com/about') },
      ]),
    ).toHaveLength(1);
  });
});
