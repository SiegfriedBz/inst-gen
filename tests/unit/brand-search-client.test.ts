import { describe, expect, test, vi } from 'vitest';
import { profileSchema } from '@/lib/brand/profile';
import type { SearchAnswer } from '@/lib/brand/search/run';
import { mergeSearch, needsSearch, requestSearch, searchBody } from '@/lib/brand/search-client';
import { SEN_SITE, senProfile, svargaProfile } from './helpers/brand';

const GUIDE = 'https://vietnam.travel/da-nang';
const answer = (part: Partial<SearchAnswer> = {}): SearchAnswer => ({
  searchTerms: [],
  moments: [],
  placeSymbols: [],
  dropped: [],
  searchedAt: '2026-10-24T12:00:00.000Z',
  searchPromptVersion: 'search-1',
  ...part,
});

describe('the search body', () => {
  test('takes the trade, the place and the essence, and no name', () => {
    const body = searchBody(senProfile());
    expect(body).toEqual({
      siteUrl: SEN_SITE,
      category: 'massage spa',
      town: 'Da Nang',
      area: null,
      serviceArea: null,
      country: 'VN',
      essence: {
        feeling: ['relaxing', 'warm', 'cared for'],
        placeSymbols: ['lotus flowers', 'My Khe beach at dusk'],
        senses: ['warm natural oils', 'soft hotel lighting'],
        moments: ['after a surf at My Khe'],
        searchTerms: [],
      },
    });
  });

  test('takes the country from the WhatsApp number', () => {
    expect(searchBody(svargaProfile())?.country).toBe('ID');
  });

  test('falls back to the phone, then the site domain, then null', () => {
    const p = senProfile();
    p.contact.whatsapp = null;
    p.contact.phone = { value: '+6281234567890', source: SEN_SITE };
    expect(searchBody(p)?.country).toBe('ID');
    p.contact.phone = null;
    expect(searchBody({ ...p, siteUrl: 'https://spa.vn/' })?.country).toBe('VN');
    expect(searchBody({ ...p, siteUrl: 'https://spa.co.id/' })?.country).toBe('ID');
    expect(searchBody({ ...p, siteUrl: 'https://spa.com/' })?.country).toBeNull();
  });

  test('returns no body without a town', () => {
    const p = senProfile();
    p.location.town = null;
    expect(searchBody(p)).toBeNull();
    expect(needsSearch(p)).toBe(false);
  });

  test('a profile with a town needs a search until one succeeds', () => {
    expect(needsSearch(senProfile())).toBe(true);
    expect(needsSearch({ ...senProfile(), searchedAt: '2026-10-24T12:00:00.000Z' })).toBe(false);
  });
});

describe('merging the search answer', () => {
  test("puts search moments after the site's and the owner's", () => {
    const p = senProfile();
    p.essence.moments.push({ value: 'after a wedding', source: 'owner' });
    const merged = mergeSearch(
      p,
      answer({ moments: [{ value: 'after hiking Ba Na Hills', source: GUIDE }] }),
    );
    expect(merged.essence.moments).toEqual([
      { value: 'after a surf at My Khe', source: SEN_SITE },
      { value: 'after a wedding', source: 'owner' },
      { value: 'after hiking Ba Na Hills', source: GUIDE },
    ]);
    expect(merged.searchedAt).toBe('2026-10-24T12:00:00.000Z');
    expect(merged.searchPromptVersion).toBe('search-1');
    expect(profileSchema.safeParse(merged).success).toBe(true);
  });

  test('adds no moment when the site filled all 6, and still sets searchedAt', () => {
    const p = senProfile();
    p.essence.moments = Array.from({ length: 6 }, (_, i) => ({
      value: `site moment ${i}`,
      source: SEN_SITE,
    }));
    const merged = mergeSearch(p, answer({ moments: [{ value: 'after a hike', source: GUIDE }] }));
    expect(merged.essence.moments).toEqual(p.essence.moments);
    expect(merged.searchedAt).not.toBeNull();
  });

  test('adds no symbol when 5 are there', () => {
    const p = senProfile();
    p.essence.placeSymbols = ['a', 'b', 'c', 'd', 'e'];
    expect(
      mergeSearch(p, answer({ placeSymbols: ['marble mountains'] })).essence.placeSymbols,
    ).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  test('fills a place the owner freed', () => {
    const p = senProfile();
    p.essence.placeSymbols = ['a', 'b', 'c', 'd'];
    expect(
      mergeSearch(p, answer({ placeSymbols: ['marble mountains', 'dragon bridge'] })).essence
        .placeSymbols,
    ).toEqual(['a', 'b', 'c', 'd', 'marble mountains']);
  });

  test('keeps an owner search term and appends after it without repeats', () => {
    const p = senProfile();
    p.essence.searchTerms = ['hotel massage da nang'];
    const merged = mergeSearch(
      p,
      answer({ searchTerms: ['Hotel massage Da Nang', 'spa near my khe'] }),
    );
    expect(merged.essence.searchTerms).toEqual(['hotel massage da nang', 'spa near my khe']);
  });

  test('changes nothing else in the profile', () => {
    const p = senProfile();
    const merged = mergeSearch(p, answer({ searchTerms: ['spa da nang'] }));
    expect({ ...merged, essence: p.essence, searchedAt: null, searchPromptVersion: null }).toEqual(
      p,
    );
  });
});

describe('asking for the search', () => {
  const fetchWith = (status: number, body: unknown) =>
    vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify(body), { status }),
    );

  test('posts the body and answers what the route answered', async () => {
    const fetch = fetchWith(200, answer({ searchTerms: ['spa da nang'] }));
    const outcome = await requestSearch(senProfile(), { fetch });
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/brand/search');
    expect(JSON.parse(String(fetch.mock.calls[0]?.[1]?.body))).toEqual(searchBody(senProfile()));
    expect(outcome).toEqual({ kind: 'answered', answer: answer({ searchTerms: ['spa da nang'] }) });
  });

  test('maps an error answer, and an unknown one to search_failed', async () => {
    expect(
      await requestSearch(senProfile(), { fetch: fetchWith(503, { error: 'search_busy' }) }),
    ).toEqual({ kind: 'error', code: 'search_busy' });
    expect(await requestSearch(senProfile(), { fetch: fetchWith(500, { error: 'nope' }) })).toEqual(
      { kind: 'error', code: 'search_failed' },
    );
  });

  test('a network failure is search_failed', async () => {
    const fetch = vi.fn(async () => {
      throw new TypeError('network');
    });
    expect(await requestSearch(senProfile(), { fetch })).toEqual({
      kind: 'error',
      code: 'search_failed',
    });
  });

  test('a 401 is signedOut', async () => {
    expect(await requestSearch(senProfile(), { fetch: fetchWith(401, {}) })).toEqual({
      kind: 'signedOut',
    });
  });
});
