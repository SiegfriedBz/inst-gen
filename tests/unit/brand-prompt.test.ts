import { describe, expect, test } from 'vitest';
import type { CodeFacts } from '@/lib/brand/extract/structured';
import { BRAND_PROMPT_VERSION, brandPrompt, brandUserText } from '@/lib/brand/prompt';

describe('brand prompt', () => {
  test('is at brand-2', () => {
    expect(BRAND_PROMPT_VERSION).toBe('brand-2');
  });

  test.each([
    'leave the field empty',
    'URL of the page',
    'exactly as written',
    'never describe people',
    'how the site talks',
    'in English',
    'never a district',
    'says is on WhatsApp',
    'Start with the core ones',
  ])('the rules mention "%s"', (phrase) => {
    expect(brandPrompt().toLowerCase()).toContain(phrase.toLowerCase());
  });

  test('heads each page with its URL, in order, then the code facts', () => {
    const facts: CodeFacts[] = [
      {
        business: { name: 'Sen Spa', offers: [], sameAs: [] },
        meta: {},
        contact: { whatsapp: [], phone: [], email: [], instagram: [] },
        source: 'https://sen.vn/',
      },
    ];
    const text = brandUserText(
      [
        { url: 'https://sen.vn/', text: 'Home text' },
        { url: 'https://sen.vn/about', text: 'About text' },
      ],
      facts,
    );
    const home = text.indexOf('### Page: https://sen.vn/\n');
    const about = text.indexOf('### Page: https://sen.vn/about\n');
    const codeFacts = text.indexOf('### Facts found in code');
    expect(home).toBeGreaterThanOrEqual(0);
    expect(about).toBeGreaterThan(home);
    expect(codeFacts).toBeGreaterThan(about);
    expect(text).toContain('"name": "Sen Spa"');
  });
});
