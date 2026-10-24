import type { SearchResult } from '@/lib/search/search-tool';
import { type Dropped, normaliseSource } from '../checks';
import { normaliseText } from '../normalise';
import { LIMITS } from '../profile';
import type { SearchModelAnswer } from './prompt';
import type { SearchBody } from './queries';

// The model's search answer, checked and trimmed by code
// (docs/specs/brand/search-essence, "The model step"). One bad item is
// dropped and recorded; the answer is never refused whole.

export type CheckedSearch = {
  searchTerms: string[];
  moments: { value: string; source: string }[];
  placeSymbols: string[];
  dropped: Dropped[];
};

const FIELD = {
  searchTerms: 'essence.searchTerms',
  moments: 'essence.moments',
  placeSymbols: 'essence.placeSymbols',
} as const;

// "Sen Massage | Da Nang" → "sen massage": the part of a title that is most
// often the business's name.
const TITLE_SEPARATOR = / [|\-–—·] |: /;
// Words that, with the trade and the place, make a title part generic rather
// than a name ("Best Ubud Spa").
const COMMON_WORDS = ['best', 'top', 'the', 'a', 'in', 'near', 'and', 'of'];

const words = (value: string) => value.split(/\s+/).filter(Boolean).length;

export function checkSearchAnswer(
  answer: SearchModelAnswer,
  ctx: { results: SearchResult[]; body: SearchBody },
): CheckedSearch {
  const { essence } = ctx.body;
  const dropped: Dropped[] = [];
  const drop = (field: keyof typeof FIELD, reason: string) =>
    dropped.push({ field: FIELD[field], reason });

  const known = new Set(
    [
      ...essence.feeling,
      ...essence.placeSymbols,
      ...essence.senses,
      ...essence.moments,
      ...essence.searchTerms,
    ].map(normaliseText),
  );
  const generic = new Set(
    [
      ctx.body.category,
      ctx.body.town,
      ctx.body.area ?? '',
      ctx.body.serviceArea ?? '',
      ...COMMON_WORDS,
    ]
      .flatMap((text) => normaliseText(text).split(' '))
      .filter(Boolean),
  );
  // Title parts with a word that is neither trade, place nor common: names.
  const names = [
    ...new Set(
      ctx.results
        .map((r) => normaliseText(r.title.split(TITLE_SEPARATOR)[0] ?? ''))
        .filter((part) => part.split(' ').some((word) => word && !generic.has(word))),
    ),
  ];
  const holdsName = (term: string) => {
    const padded = ` ${normaliseText(term)} `;
    return names.some((name) => padded.includes(` ${name} `));
  };
  const resultUrls = ctx.results.map((r) => r.url);

  // Drops a repeat of the essence or of an item kept earlier in this answer.
  const fresh = (field: keyof typeof FIELD, value: string, seen: Set<string>) => {
    const key = normaliseText(value);
    if (!key) return false;
    if (known.has(key)) {
      drop(field, 'already in essence');
      return false;
    }
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  };

  const momentsSeen = new Set<string>();
  const moments: CheckedSearch['moments'] = [];
  for (const moment of answer.moments) {
    const value = moment.value.trim();
    if (!value) continue;
    const source = moment.source === 'model' ? null : normaliseSource(moment.source, resultUrls);
    if (!source) {
      drop('moments', 'source not a result');
      continue;
    }
    if (fresh('moments', value, momentsSeen)) moments.push({ value, source });
  }

  const symbolsSeen = new Set<string>();
  const placeSymbols = answer.placeSymbols
    .map((s) => s.trim())
    .filter((s) => fresh('placeSymbols', s, symbolsSeen));

  const termsSeen = new Set<string>();
  const searchTerms: string[] = [];
  for (const raw of answer.searchTerms) {
    const term = raw.trim().replace(/^#+/, '').toLowerCase().replace(/\s+/g, ' ');
    if (!term) continue;
    if (holdsName(term)) {
      drop('searchTerms', 'business name');
      continue;
    }
    if (words(term) > LIMITS.searchTermWords) {
      drop('searchTerms', 'too long');
      continue;
    }
    if (fresh('searchTerms', term, termsSeen)) searchTerms.push(term);
  }

  const cut = <T>(field: keyof typeof FIELD, items: T[], max: number): T[] => {
    for (let i = max; i < items.length; i++) drop(field, 'over limit');
    return items.slice(0, max);
  };

  return {
    searchTerms: cut('searchTerms', searchTerms, LIMITS.searchTerms),
    moments: cut('moments', moments, LIMITS.searchMoments),
    placeSymbols: cut('placeSymbols', placeSymbols, LIMITS.searchSymbols),
    dropped,
  };
}
