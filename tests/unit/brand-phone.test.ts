import { describe, expect, test } from 'vitest';
import { phoneDigitVariants, toE164 } from '@/lib/brand/phone';

describe('toE164', () => {
  test.each([
    ['+84 905 123 456', undefined, '+84905123456'],
    ['0812-3456-7890', 'ID', '+6281234567890'],
    ['6281234567890', undefined, '+6281234567890'],
    ['0062 812 3456 7890', undefined, '+6281234567890'],
    ['(0236) 3 123 456', 'VN', '+842363123456'],
  ])('%s with %s gives %s', (raw, hint, expected) => {
    expect(toE164(raw, hint)).toBe(expected);
  });

  test('a local number without a country is kept as written', () => {
    expect(toE164('0812-3456-7890')).toBe('0812-3456-7890');
  });

  test('under 6 digits is null', () => {
    expect(toE164('12-34')).toBeNull();
  });
});

describe('phoneDigitVariants', () => {
  test('gives the full digits and the national number', () => {
    expect(phoneDigitVariants('+6281234567890')).toEqual(['6281234567890', '81234567890']);
  });
});
