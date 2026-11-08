import { describe, expect, test } from 'vitest';
import type { CodeFacts } from '@/lib/brand/extract/structured';
import { BRAND_PROMPT_VERSION, brandPrompt, brandUserText } from '@/lib/brand/prompt';

describe('brand prompt', () => {
  test('is at brand-9', () => {
    expect(BRAND_PROMPT_VERSION).toBe('brand-9');
  });

  // docs/specs/posts/therapists-look, "What the brand read writes down".
  test('the visual style still never describes people', () => {
    expect(brandPrompt()).toContain(
      "3. The visual style describes the photos' palette, light, textures and mood, for an image model to imitate. Never describe people in it. Leave it empty when no photos are given.",
    );
  });

  test.each([
    '- staffLook: ',
    'the top (its cut, sleeves, collar and colour), the trousers or skirt and their colour',
    'then the hair',
    'at most 30 words',
    'a white short-sleeved tunic with a small stand-up collar, white trousers, dark hair in a neat low bun',
    'what most of them show',
    'never name a man',
    'the source "model"',
    'Never a face, skin, body or age',
    'or anything that suggests more than a professional treatment',
  ])('the look\'s note says "%s"', (phrase) => {
    expect(brandPrompt()).toContain(phrase);
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
    'word for word',
    'not categories',
    'think beyond the website',
    'essence.placeSymbols',
    'essence.moments',
    'never copy them for another trade',
    'Hanoi is not Hoi An',
    'essence.promise',
    "the customer's own place",
    'neighbourhoods',
    'travel rule',
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
