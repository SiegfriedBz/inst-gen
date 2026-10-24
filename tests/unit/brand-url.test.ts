import { describe, expect, test } from 'vitest';
import { cleanUrl, samePath } from '@/lib/brand/url';

describe('cleanUrl', () => {
  test.each([
    [' svargabalimassage.com ', 'https://svargabalimassage.com/'],
    ['http://x.com/#a', 'http://x.com/'],
    ['https://X.COM/Path', 'https://x.com/Path'],
    ['https://x.com:443/a?b=1', 'https://x.com/a?b=1'],
  ])('%j gives %s', (input, expected) => {
    expect(cleanUrl(input)?.href).toBe(expected);
  });

  test.each([
    ['ftp://x.com'],
    ['https://x.com:8443'],
    ['https://u:p@x.com'],
    [''],
    ['javascript:alert(1)'],
    ['mailto:a@b.com'],
    ['https://'],
  ])('%j is refused', (input) => {
    expect(cleanUrl(input)).toBeNull();
  });
});

describe('samePath', () => {
  test('ignores the query and a trailing slash', () => {
    expect(samePath('https://x.com/about', 'https://x.com/about/?ref=nav')).toBe(true);
  });

  test('different paths differ', () => {
    expect(samePath('https://x.com/about', 'https://x.com/contact')).toBe(false);
  });

  test('different hosts differ', () => {
    expect(samePath('https://x.com/about', 'https://y.com/about')).toBe(false);
  });
});
