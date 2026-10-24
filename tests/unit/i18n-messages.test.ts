import { describe, expect, test } from 'vitest';
import { LOCALES } from '@/lib/i18n/locale';
import { MESSAGES, messagesFor } from '@/lib/i18n/messages';
import en from '@/messages/en.json';

// Every string in a message file, by its dotted key.
function flatten(value: unknown, prefix = ''): Map<string, unknown> {
  const out = new Map<string, unknown>();
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (child && typeof child === 'object') {
        for (const [k, v] of flatten(child, path)) out.set(k, v);
      } else {
        out.set(path, child);
      }
    }
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)/g)].map((m) => m[1]).sort();
const files = LOCALES.map((locale) => [locale, flatten(MESSAGES[locale])] as const);

describe('the message files', () => {
  test('every file has the same keys as en.json', () => {
    const keys = new Set(files.flatMap(([, flat]) => [...flat.keys()]));
    const problems = [...keys].flatMap((key) => {
      const missing = files.filter(([, flat]) => !flat.has(key)).map(([l]) => `${l}.json`);
      return missing.length ? [`${key} is missing from ${missing.join(', ')}`] : [];
    });
    expect(problems).toEqual([]);
  });

  test('placeholders match English', () => {
    const english = flatten(en);
    const problems = files.flatMap(([locale, flat]) =>
      [...flat].flatMap(([key, text]) => {
        const want = english.get(key);
        if (typeof want !== 'string' || typeof text !== 'string') return [];
        const [got, expected] = [placeholders(text), placeholders(want)];
        return got.join() === expected.join()
          ? []
          : [`${locale}.json ${key}: {${got}} instead of {${expected}}`];
      }),
    );
    expect(problems).toEqual([]);
  });

  test('no string is empty and none has an em dash', () => {
    const problems = files.flatMap(([locale, flat]) =>
      [...flat].flatMap(([key, text]) =>
        typeof text !== 'string' || text.trim() === '' || text.includes('—')
          ? [`${locale}.json ${key}`]
          : [],
      ),
    );
    expect(problems).toEqual([]);
  });
});

describe('messagesFor', () => {
  test('lays the language over English', () => {
    const overlay = { home: { welcome: 'Chào mừng, {name}' } };
    const messages = messagesFor('vi', overlay);
    expect(messages.home.welcome).toBe('Chào mừng, {name}');
    expect(messages.home.signedIn).toBe(en.home.signedIn);
    expect(messages.enter.label).toBe(en.enter.label);
  });

  test('keeps English where the overlay has a non-string', () => {
    expect(messagesFor('id', { enter: { label: 3 } }).enter.label).toBe(en.enter.label);
  });

  test('Vietnamese is not English', () => {
    expect(messagesFor('vi').enter.label).not.toBe(en.enter.label);
  });

  test('English stays English', () => {
    expect(messagesFor('en')).toEqual(en);
  });
});
