import { describe, expect, test } from 'vitest';
import {
  SEARCH_PROMPT_VERSION,
  searchModelAnswerSchema,
  searchPrompt,
  searchUserText,
} from '@/lib/brand/search/prompt';
import type { SearchBody } from '@/lib/brand/search/queries';

const sen: SearchBody = {
  siteUrl: 'https://sendanangmassage.com/',
  category: 'massage spa',
  town: 'Da Nang',
  area: null,
  serviceArea: null,
  country: 'VN',
  essence: {
    feeling: ['relaxing'],
    placeSymbols: ['lotus flowers'],
    senses: [],
    moments: ['after a surf at My Khe'],
    searchTerms: [],
  },
};

describe('the essence search prompt', () => {
  test('has the version search-1', () => {
    expect(SEARCH_PROMPT_VERSION).toBe('search-1');
  });

  test('heads each result by its URL', () => {
    const text = searchUserText(sen, [
      { title: 'Da Nang guide', url: 'https://vietnam.travel/da-nang', content: 'Surf at My Khe' },
    ]);
    expect(text).toContain('### Result: https://vietnam.travel/da-nang');
    expect(text).toContain('Da Nang guide');
    expect(text).toContain('Surf at My Khe');
  });

  test('lists the trade, the place and the current essence', () => {
    const text = searchUserText(sen, []);
    expect(text).toContain('massage spa');
    expect(text).toContain('Da Nang');
    expect(text).toContain('lotus flowers');
    expect(text).toContain('after a surf at My Khe');
  });

  test('asks for no business names and no people', () => {
    expect(searchPrompt()).toMatch(/business names/i);
    expect(searchPrompt()).toMatch(/people/i);
  });

  test('the answer schema takes an answer past the limits', () => {
    const long = {
      searchTerms: Array.from({ length: 12 }, (_, i) => `term ${i}`),
      moments: [{ value: 'after a hike', source: 'https://a.example/' }],
      placeSymbols: [],
    };
    expect(searchModelAnswerSchema.safeParse(long).success).toBe(true);
  });
});
