import { describe, expect, test } from 'vitest';
import { ERROR_CODES } from '@/lib/brand/profile';
import { LOCALES } from '@/lib/i18n/locale';
import { MESSAGES } from '@/lib/i18n/messages';

describe('read errors', () => {
  test('each error code has a message in every language', () => {
    for (const locale of LOCALES) {
      const errors = (MESSAGES[locale] as { brand: { errors: Record<string, string> } }).brand
        .errors;
      for (const code of [...ERROR_CODES, 'offline']) {
        expect(errors[code], `${locale}: ${code}`).toMatch(/\S/);
      }
    }
  });
});
