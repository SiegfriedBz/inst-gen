import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

// The spec's "Look": every text pair passes WCAG AA (4.5:1), field borders and
// focus rings 3:1, in both colour modes.
const css = readFileSync('app/globals.css', 'utf8');

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map(([, name, value]) => [name, value]),
  );
}

const light = tokens(
  css.slice(css.indexOf(':root {'), css.indexOf('@media (prefers-color-scheme')),
);
const dark = {
  ...light,
  ...tokens(css.slice(css.indexOf('@media (prefers-color-scheme'), css.indexOf('@theme'))),
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const TEXT: [string, string][] = [
  ['ink', 'page'],
  ['ink-secondary', 'page'],
  ['ink', 'field'],
  ['ink-secondary', 'field-muted'],
  ['on-accent', 'accent'],
  ['accent-tint-ink', 'accent-tint'],
  ['error', 'page'],
];
const NON_TEXT: [string, string][] = [
  ['edge', 'page'],
  ['edge', 'field'],
  ['accent', 'page'],
  ['error', 'page'],
  ['error', 'field'],
];

for (const [mode, t] of [
  ['light', light],
  ['dark', dark],
] as const) {
  describe(`${mode} tokens`, () => {
    for (const [fg, bg] of TEXT) {
      test(`${fg} on ${bg} is at least 4.5:1`, () => {
        expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(4.5);
      });
    }
    for (const [fg, bg] of NON_TEXT) {
      test(`${fg} against ${bg} is at least 3:1`, () => {
        expect(contrast(t[fg], t[bg])).toBeGreaterThanOrEqual(3);
      });
    }
  });
}

test('focus rings are solid colours, not faded ones', () => {
  for (const file of ['components/ui/button.tsx', 'components/ui/input.tsx']) {
    const source = readFileSync(file, 'utf8');
    expect(source).toMatch(/focus-visible:ring-/);
    expect(source).not.toMatch(/ring-(accent|error)\/\d+/);
  }
});
