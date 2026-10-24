import { describe, expect, test } from 'vitest';
import { checkSearchAnswer } from '@/lib/brand/search/checks';
import type { SearchModelAnswer } from '@/lib/brand/search/prompt';

const GUIDE = 'https://vietnam.travel/da-nang';
const results = [
  { title: 'Da Nang travel guide', url: GUIDE, content: 'Surf at My Khe, hike Ba Na Hills' },
  { title: 'Sen Massage | Da Nang', url: 'https://maps.example/sen', content: 'Massage' },
];
const essence = {
  feeling: ['relaxing'],
  placeSymbols: ['Lotus flowers'],
  senses: [],
  moments: ['after a surf at My Khe'],
  searchTerms: [],
};
const ctx = { results, essence };

const answer = (part: Partial<SearchModelAnswer>): SearchModelAnswer => ({
  searchTerms: [],
  moments: [],
  placeSymbols: [],
  ...part,
});

describe('checking the essence search answer', () => {
  test('keeps a moment whose source is a result', () => {
    const checked = checkSearchAnswer(
      answer({ moments: [{ value: 'after hiking Ba Na Hills', source: GUIDE }] }),
      ctx,
    );
    expect(checked.moments).toEqual([{ value: 'after hiking Ba Na Hills', source: GUIDE }]);
    expect(checked.dropped).toEqual([]);
  });

  test('drops a moment whose source is not a result', () => {
    const checked = checkSearchAnswer(
      answer({ moments: [{ value: 'after a long flight', source: 'https://other.example/' }] }),
      ctx,
    );
    expect(checked.moments).toEqual([]);
    expect(checked.dropped).toEqual([{ field: 'essence.moments', reason: 'source not a result' }]);
  });

  test('matches a result URL written differently', () => {
    const checked = checkSearchAnswer(
      answer({
        moments: [
          { value: 'after hiking Ba Na Hills', source: 'http://www.vietnam.travel/da-nang/#top' },
        ],
      }),
      ctx,
    );
    expect(checked.moments).toEqual([{ value: 'after hiking Ba Na Hills', source: GUIDE }]);
  });

  test('drops what the essence already holds', () => {
    const checked = checkSearchAnswer(
      answer({
        placeSymbols: ['lotus  flowers'],
        moments: [{ value: 'After a surf at My Khe!', source: GUIDE }],
      }),
      ctx,
    );
    expect(checked.placeSymbols).toEqual([]);
    expect(checked.moments).toEqual([]);
    expect(checked.dropped).toEqual([
      { field: 'essence.moments', reason: 'already in essence' },
      { field: 'essence.placeSymbols', reason: 'already in essence' },
    ]);
  });

  test("drops a term that is a result title's name part", () => {
    const checked = checkSearchAnswer(answer({ searchTerms: ['sen massage', 'spa da nang'] }), ctx);
    expect(checked.searchTerms).toEqual(['spa da nang']);
    expect(checked.dropped).toEqual([{ field: 'essence.searchTerms', reason: 'business name' }]);
  });

  test('lower-cases terms and strips a hashtag', () => {
    const checked = checkSearchAnswer(answer({ searchTerms: ['#Hotel Massage Da Nang'] }), ctx);
    expect(checked.searchTerms).toEqual(['hotel massage da nang']);
  });

  test('drops a term over 6 words', () => {
    const checked = checkSearchAnswer(
      answer({ searchTerms: ['best cheap hotel massage near my khe beach'] }),
      ctx,
    );
    expect(checked.searchTerms).toEqual([]);
    expect(checked.dropped).toEqual([{ field: 'essence.searchTerms', reason: 'too long' }]);
  });

  test('drops repeats inside the answer', () => {
    const checked = checkSearchAnswer(answer({ searchTerms: ['spa da nang', 'Spa Da Nang'] }), ctx);
    expect(checked.searchTerms).toEqual(['spa da nang']);
  });

  test('trims to 8 terms, 3 moments and 2 symbols', () => {
    const checked = checkSearchAnswer(
      answer({
        searchTerms: Array.from({ length: 10 }, (_, i) => `massage term ${i}`),
        moments: Array.from({ length: 5 }, (_, i) => ({ value: `moment ${i}`, source: GUIDE })),
        placeSymbols: ['marble mountains', 'dragon bridge', 'han river', 'ba na hills'],
      }),
      ctx,
    );
    expect(checked.searchTerms).toHaveLength(8);
    expect(checked.moments).toHaveLength(3);
    expect(checked.placeSymbols).toEqual(['marble mountains', 'dragon bridge']);
    expect(checked.dropped.filter((d) => d.reason === 'over limit')).toHaveLength(6);
  });

  test('never throws on an empty answer', () => {
    expect(checkSearchAnswer(answer({ searchTerms: ['', '  '] }), ctx)).toEqual({
      searchTerms: [],
      moments: [],
      placeSymbols: [],
      dropped: [],
    });
  });
});
