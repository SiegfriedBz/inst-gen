import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  imageMonthMax,
  isLimited,
  OWNER_LIMITS,
  searchesPerMonth,
  textPools,
} from '@/lib/usage/limits';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('per-owner limits', () => {
  test('the spec numbers', () => {
    expect(OWNER_LIMITS).toEqual({
      reads: 3,
      attempts: 3,
      rewrites: 5,
      translations: 30,
      newImages: 10,
      replies: 20,
    });
  });

  test('dev has none', () => {
    expect(isLimited('dev')).toBe(false);
    expect(isLimited('sen')).toBe(true);
  });
});

describe('text pools', () => {
  test('the default', () => {
    const pools = textPools({});
    expect(pools.get('gemini-3.5-flash-lite')).toBe(500);
    expect(pools.get('gemini-3.8-flash')).toBe(20);
    expect(textPools({ TEXT_DAILY_REQUESTS: '' })).toEqual(pools);
  });

  test('a custom list, with spaces', () => {
    expect(textPools({ TEXT_DAILY_REQUESTS: ' a=5 , b=7 ' })).toEqual(
      new Map([
        ['a', 5],
        ['b', 7],
      ]),
    );
  });

  test('bad entries are skipped and logged', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(textPools({ TEXT_DAILY_REQUESTS: 'a=5,b=x,=3,c' })).toEqual(new Map([['a', 5]]));
    expect(error).toHaveBeenCalled();
  });
});

describe('monthly caps', () => {
  test('158 images at $0.0504 under $8', () => {
    expect(imageMonthMax({})).toBe(158);
    expect(imageMonthMax({ IMAGE_PRICE_USD: '0.1', IMAGE_MONTH_CAP_USD: '8' })).toBe(80);
    expect(imageMonthMax({ IMAGE_PRICE_USD: 'cheap' })).toBe(158);
  });

  test('300 searches', () => {
    expect(searchesPerMonth({})).toBe(300);
    expect(searchesPerMonth({ SEARCHES_PER_MONTH: '12' })).toBe(12);
  });
});
