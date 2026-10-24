import { describe, expect, test } from 'vitest';
import { ERROR_STATUS, profileSchema } from '@/lib/brand/profile';
import { SITE, svargaProfile } from './helpers/brand';

describe('profileSchema', () => {
  test('accepts a full Svarga-like profile', () => {
    expect(profileSchema.safeParse(svargaProfile()).success).toBe(true);
  });

  test('rejects an empty-string field', () => {
    const p = svargaProfile();
    p.name = { value: '', source: SITE };
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('rejects a sixth colour', () => {
    const p = svargaProfile();
    p.colours = Array.from({ length: 6 }, () => ({
      hex: '#123456',
      role: 'accent' as const,
      source: 'model',
    }));
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('rejects a bad hex', () => {
    const p = svargaProfile();
    p.colours = [{ hex: '#12345', role: 'primary', source: 'model' }];
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('rejects tone with 2 words', () => {
    const p = svargaProfile();
    p.tone = ['calm', 'warm'];
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('visualStyle may be null', () => {
    const p = svargaProfile();
    p.visualStyle = null;
    expect(profileSchema.safeParse(p).success).toBe(true);
  });

  test('summary over 25 words fails', () => {
    const p = svargaProfile();
    p.summary = { value: Array.from({ length: 26 }, () => 'word').join(' '), source: SITE };
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('visualStyle summary over 12 words fails', () => {
    const p = svargaProfile();
    if (!p.visualStyle) throw new Error('fixture has a style');
    p.visualStyle.summary = Array.from({ length: 13 }, () => 'soft').join(' ');
    expect(profileSchema.safeParse(p).success).toBe(false);
  });
});

describe('ERROR_STATUS', () => {
  test.each([
    ['invalid_url', 400],
    ['blocked_address', 400],
    ['unreachable', 502],
    ['robots_disallowed', 403],
    ['model_busy', 503],
    ['model_timeout', 504],
    ['model_failed', 502],
  ] as const)('%s is %i', (code, status) => {
    expect(ERROR_STATUS[code]).toBe(status);
  });

  test('has exactly the seven codes', () => {
    expect(Object.keys(ERROR_STATUS)).toHaveLength(7);
  });
});
