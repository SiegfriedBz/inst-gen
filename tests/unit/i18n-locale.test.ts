import { describe, expect, test } from 'vitest';
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE_SECONDS,
  localeFromAcceptLanguage,
  pickLocale,
  safeReturnPath,
} from '@/lib/i18n/locale';

describe('localeFromAcceptLanguage', () => {
  test.each([
    ['id-ID,id;q=0.9,en;q=0.8', 'id'],
    ['fr-FR,fr;q=0.9', null],
    ['fr;q=1, vi;q=0.8, en;q=0.5', 'vi'],
    ['en-GB', 'en'],
    ['in', 'id'],
    ['ID-id', 'id'],
    [' vi-VN ; q=0.7 , id ; q=0.6', 'vi'],
    ['vi;q=0, id;q=0.5', 'id'],
    ['*', null],
    ['vi;q=abc, id', 'id'],
    // Equal weights keep the header's order.
    ['id;q=0.5, vi;q=0.5', 'id'],
    ['', null],
    [undefined, null],
    [null, null],
  ])('%j gives %j', (header, expected) => {
    expect(localeFromAcceptLanguage(header)).toBe(expected);
  });
});

describe('pickLocale', () => {
  test('a valid cookie beats the header', () => {
    expect(pickLocale('en', 'vi-VN')).toBe('en');
  });

  test('a bad cookie is ignored', () => {
    expect(pickLocale('fr', 'id')).toBe('id');
  });

  test('nothing matches: English', () => {
    expect(pickLocale(undefined, 'fr')).toBe('en');
    expect(pickLocale(undefined, undefined)).toBe('en');
  });
});

describe('isLocale', () => {
  test('only the three codes', () => {
    expect(['en', 'id', 'vi'].every(isLocale)).toBe(true);
    expect(['fr', 'EN', '', undefined, 1].some(isLocale)).toBe(false);
  });
});

describe('the cookie', () => {
  test('is named shopfront_locale and lasts one year', () => {
    expect(LOCALE_COOKIE).toBe('shopfront_locale');
    expect(LOCALE_COOKIE_MAX_AGE_SECONDS).toBe(365 * 24 * 60 * 60);
  });
});

describe('safeReturnPath', () => {
  test.each([
    ['/enter', '/enter'],
    ['/', '/'],
    ['https://example.com/', '/'],
    ['//example.com/', '/'],
    ['/\\example.com', '/'],
    ['enter', '/'],
    [undefined, '/'],
    [42, '/'],
  ])('%j gives %j', (value, expected) => {
    expect(safeReturnPath(value)).toBe(expected);
  });
});
