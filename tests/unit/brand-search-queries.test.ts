import { describe, expect, test } from 'vitest';
import {
  buildQueries,
  type SearchBody,
  searchBodySchema,
  searchOptions,
} from '@/lib/brand/search/queries';

const sen: SearchBody = {
  siteUrl: 'https://www.sendanangmassage.com/',
  category: 'massage spa',
  town: 'Da Nang',
  area: 'Son Tra',
  serviceArea: null,
  country: 'VN',
  essence: { feeling: [], placeSymbols: [], senses: [], moments: [], searchTerms: [] },
};

describe('the essence search queries', () => {
  test('builds three queries that hold the trade or the town', () => {
    const q = buildQueries(sen);
    expect(q).toHaveLength(3);
    expect(q[0]).toContain('massage spa');
    expect(q[0]).toContain('Da Nang');
    expect(q[1]).toContain('Da Nang');
    expect(q[2]).toContain('Son Tra');
    expect(q[2]).toContain('Da Nang');
  });

  test('uses the first service area when there is no area', () => {
    const q = buildQueries({
      ...sen,
      town: 'Canggu',
      area: null,
      serviceArea: 'Pererenan (Batu Bolong, Echo Beach); Seminyak',
    });
    expect(q[2]).toContain('Pererenan');
    expect(q[2]).not.toContain('Batu Bolong');
  });

  test('uses the town alone when there is no area at all', () => {
    const q = buildQueries({ ...sen, area: null });
    expect(q[2]).toContain('Da Nang');
    expect(q[2]).not.toContain('null');
  });

  test('never aims at reviews', () => {
    for (const query of buildQueries(sen)) {
      expect(query).not.toMatch(/review|tripadvisor|rating/i);
    }
  });

  test('maps the country and excludes the site domain', () => {
    expect(searchOptions(sen)).toEqual({
      country: 'vietnam',
      excludeDomains: ['sendanangmassage.com'],
    });
    expect(searchOptions({ ...sen, country: 'ID' }).country).toBe('indonesia');
    expect(searchOptions({ ...sen, country: null }).country).toBeNull();
  });

  test('refuses a body without a town or a category', () => {
    expect(searchBodySchema.safeParse({ ...sen, town: '' }).success).toBe(false);
    expect(searchBodySchema.safeParse({ ...sen, category: ' ' }).success).toBe(false);
    expect(searchBodySchema.safeParse(sen).success).toBe(true);
  });

  test('refuses a body that carries the business name', () => {
    expect(searchBodySchema.safeParse({ ...sen, name: 'Sen' }).success).toBe(false);
  });
});
