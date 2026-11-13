import { describe, expect, test } from 'vitest';
import { siteFor } from '@/lib/pilot/sites';

// docs/specs/platform/easier-to-use, "The password opens the business".
describe('siteFor', () => {
  test("gives Sen's and Svarga's websites", () => {
    expect(siteFor('sen')).toBe('https://sendanangmassage.com/');
    expect(siteFor('svarga')).toBe('https://svargabalimassage.com/');
  });

  test('gives no website to any other owner', () => {
    expect(siteFor('dev')).toBeNull();
    expect(siteFor('toString')).toBeNull();
  });
});
