import { describe, expect, test } from 'vitest';
import { codeProfile, finalise, mergeAndCheck, normaliseSource } from '@/lib/brand/checks';
import type { CodeFacts } from '@/lib/brand/extract/structured';
import type { DeepPartial, ModelProfile } from '@/lib/brand/profile';

const HOME = 'https://sen.vn/';
const ABOUT = 'https://sen.vn/about';
const PRICES = 'https://sen.vn/prices';
const pagesRead = [HOME, ABOUT, PRICES];

function facts(overrides: Partial<CodeFacts> = {}): CodeFacts {
  return {
    business: null,
    meta: {},
    contact: { whatsapp: [], phone: [], email: [], instagram: [] },
    source: HOME,
    ...overrides,
  };
}

const pages = new Map([
  [HOME, 'Sen Spa. Mobile massage in Da Nang. Call 0905 123 456. Open 9am to 11pm.'],
  [ABOUT, 'Our therapists come to your hotel. Write to book@sen.vn.'],
  [PRICES, 'Aroma massage 450.000 VND for 90 minutes. Hot stone 600,000 VND.'],
]);

const extra = {
  siteUrl: HOME,
  pagesRead,
  colours: [{ hex: '#1f6f5c', role: 'primary' as const, source: 'theme-color' }],
  logoUrl: null,
  photoUrls: ['https://sen.vn/hero.jpg'],
};

function run(
  model: DeepPartial<ModelProfile>,
  codeFacts: CodeFacts[] = [facts({ meta: { siteName: 'Sen Spa | Da Nang' } })],
  photos = 1,
) {
  const code = codeProfile(codeFacts, { ...extra, photoUrls: photos ? extra.photoUrls : [] });
  return mergeAndCheck(code, model, { facts: codeFacts, pages, pagesRead, photos });
}

describe('normaliseSource', () => {
  test.each([
    ['/about', ABOUT],
    ['https://sen.vn/about/', ABOUT],
    ['https://www.sen.vn/about?x=1', ABOUT],
    ['https://sen.vn', HOME],
    ['model', 'model'],
    ['https://other.vn/about', null],
    ['/blog', null],
  ])('%s gives %s', (source, expected) => {
    expect(normaliseSource(source, pagesRead)).toBe(expected);
  });
});

describe('codeProfile', () => {
  test('carries what code found, with sources', () => {
    const profile = codeProfile(
      [
        facts({
          business: {
            name: 'Sen Spa',
            telephone: '+84 905 123 456',
            address: { street: '12 Bach Dang', town: 'Da Nang', country: 'VN' },
            hours: 'Mo-Su 09:00-23:00',
            offers: [],
            sameAs: ['https://instagram.com/sen.spa'],
          },
          contact: { whatsapp: ['84905123456'], phone: [], email: ['book@sen.vn'], instagram: [] },
        }),
      ],
      extra,
    );
    expect(profile).toMatchObject({
      siteUrl: HOME,
      pagesRead,
      name: { value: 'Sen Spa', source: HOME },
      location: {
        town: { value: 'Da Nang', source: HOME },
        address: { value: '12 Bach Dang', source: HOME },
      },
      contact: {
        whatsapp: { value: '+84905123456', source: HOME },
        phone: { value: '+84905123456', source: HOME },
        email: { value: 'book@sen.vn', source: HOME },
        instagram: { value: 'sen.spa', source: HOME },
      },
      hours: { value: 'Mo-Su 09:00-23:00', source: HOME },
      colours: extra.colours,
    });
  });
});

describe('mergeAndCheck', () => {
  test('code beats the model on phone', () => {
    const codeFacts = [
      facts({
        business: { name: 'Sen Spa', telephone: '+84 905 123 456', offers: [], sameAs: [] },
        source: ABOUT,
      }),
    ];
    const { profile } = run(
      { contact: { phone: { value: '+84 999 999 999', source: HOME } } },
      codeFacts,
    );
    expect(profile.contact?.phone).toEqual({ value: '+84905123456', source: ABOUT });
  });

  test("the model's town beats a district from JSON-LD", () => {
    const codeFacts = [
      facts({
        business: {
          name: 'Sen Spa',
          address: { town: 'Son Tra District' },
          offers: [],
          sameAs: [],
        },
      }),
    ];
    const { profile } = run({ location: { town: { value: 'Da Nang', source: HOME } } }, codeFacts);
    expect(profile.location?.town).toEqual({ value: 'Da Nang', source: HOME });
    expect(run({}, codeFacts).profile.location?.town?.value).toBe('Son Tra District');
  });

  test("the model's service area beats JSON-LD's", () => {
    const codeFacts = [
      facts({
        business: {
          name: 'Svarga',
          areaServed: 'Canggu, Pererenan, Seminyak, Kerobokan',
          offers: [],
          sameAs: [],
        },
      }),
    ];
    const value = 'Canggu (Batu Bolong, Echo Beach, Berawa, Nelayan); Pererenan';
    const { profile } = run({ location: { serviceArea: { value, source: HOME } } }, codeFacts);
    expect(profile.location?.serviceArea).toEqual({ value, source: HOME });
    const jsonLd = { value: 'Canggu, Pererenan, Seminyak, Kerobokan', source: HOME };
    expect(run({}, codeFacts).profile.location?.serviceArea).toEqual(jsonLd);
    const unknown = { serviceArea: { value, source: 'https://elsewhere.com/' } };
    expect(run({ location: unknown }, codeFacts).profile.location?.serviceArea).toEqual(jsonLd);
  });

  test('a model phone that is on its page is kept; without a country it stays as written', () => {
    const { profile } = run({ contact: { phone: { value: '0905 123 456', source: HOME } } });
    expect(profile.contact?.phone?.value).toBe('0905 123 456');
  });

  test('a model WhatsApp number not on its page is dropped', () => {
    const { profile, dropped } = run({
      contact: { whatsapp: { value: '+84 911 222 333', source: HOME } },
    });
    expect(profile.contact?.whatsapp ?? null).toBeNull();
    expect(dropped).toContainEqual({ field: 'contact.whatsapp', reason: 'not_on_page' });
  });

  test('a model email is checked ignoring case', () => {
    const { profile } = run({ contact: { email: { value: 'Book@Sen.vn', source: ABOUT } } });
    expect(profile.contact?.email?.value).toBe('Book@Sen.vn');
  });

  test('a price not on its page is dropped', () => {
    const { profile, dropped } = run({
      offerings: [
        { name: 'Aroma massage', price: '450,000 VND', source: PRICES },
        { name: 'Hot stone', price: 'VND 600.000', source: PRICES },
        { name: 'Hot stone', price: '900,000 VND', source: PRICES },
      ],
    });
    expect(profile.offerings?.map((o) => o?.price)).toEqual([
      '450,000 VND',
      'VND 600.000',
      undefined,
    ]);
    expect(dropped).toContainEqual({ field: 'offerings[2].price', reason: 'not_on_page' });
  });

  test('an offering whose name is not on its page is dropped', () => {
    const { profile, dropped } = run({
      offerings: [
        { name: 'Aroma Massage', source: PRICES },
        { name: 'Bamboo massage', source: PRICES },
      ],
    });
    expect(profile.offerings?.map((o) => o?.name)).toEqual(['Aroma Massage']);
    expect(dropped).toContainEqual({ field: 'offerings[1]', reason: 'not_on_page' });
  });

  test('a fact with an unknown source is dropped', () => {
    const { profile, dropped } = run({
      hours: { value: 'Open 24 hours', source: 'https://sen.vn/blog' },
    });
    expect(profile.hours ?? null).toBeNull();
    expect(dropped).toContainEqual({ field: 'hours', reason: 'unknown_source' });
  });

  test('a relative source with a trailing slash is kept', () => {
    const { profile } = run({
      highlights: [{ value: 'Therapists come to you', source: '/about/' }],
    });
    expect(profile.highlights).toEqual([{ value: 'Therapists come to you', source: ABOUT }]);
  });

  describe('name', () => {
    const ld = [facts({ business: { name: 'Svarga Bali Massage', offers: [], sameAs: [] } })];

    test('a short name inside the JSON-LD name is kept', () => {
      expect(run({ name: { value: 'Svarga', source: HOME } }, ld).profile.name).toEqual({
        value: 'Svarga',
        source: HOME,
      });
    });

    test('a name not in the page names gives way to the JSON-LD name', () => {
      const { profile, dropped } = run({ name: { value: 'Svarga Luxury', source: HOME } }, ld);
      expect(profile.name).toEqual({ value: 'Svarga Bali Massage', source: HOME });
      expect(dropped).toContainEqual({ field: 'name', reason: 'not_in_page_names' });
    });

    test('without JSON-LD, og:site_name is cut at the separator', () => {
      expect(run({}).profile.name).toEqual({ value: 'Sen Spa', source: HOME });
    });
  });

  test('model colours are kept only when code found under 2', () => {
    const model = { colours: [{ hex: '#e07a2f', role: 'accent' as const, source: '/x' }] };
    expect(run(model).profile.colours).toEqual([
      extra.colours[0],
      { hex: '#e07a2f', role: 'accent', source: 'model' },
    ]);
    const twoColours = codeProfile([facts()], {
      ...extra,
      colours: [...extra.colours, { hex: '#ffffff', role: 'background', source: 'css:--bg' }],
    });
    const merged = mergeAndCheck(twoColours, model, {
      facts: [facts()],
      pages,
      pagesRead,
      photos: 1,
    });
    expect(merged.profile.colours).toHaveLength(2);
  });

  test('no photos means no visual style', () => {
    const style = {
      summary: 'soft light',
      palette: 'green',
      light: 'soft',
      textures: 'linen',
      mood: 'calm',
    };
    expect(run({ visualStyle: style }, undefined, 0).profile.visualStyle).toBeNull();
    expect(run({ visualStyle: style }).profile.visualStyle).toEqual(style);
  });

  test('a half-streamed model object does not throw and keeps what is checked', () => {
    const { profile } = run({
      summary: { value: 'Mobile massage in Da' },
      offerings: [{ name: 'Aroma massage', price: '450,000 VND', source: PRICES }, { name: 'Hot' }],
      tone: ['calm'],
    });
    expect(profile.summary ?? null).toBeNull();
    expect(profile.offerings).toHaveLength(1);
    expect(profile.tone).toEqual(['calm']);
  });
});

describe('the essence', () => {
  const essence = {
    feeling: ['relaxing', 'warm', 'cared for'],
    placeSymbols: ['lotus flowers', 'Hoi An lanterns'],
    senses: ['warm natural oils', 'fresh linens'],
    moments: [
      { value: 'after a long flight', source: ABOUT },
      { value: 'after a wedding', source: 'https://sen.vn/blog' },
    ],
  };

  test('keeps a promise from a page read, cut to 20 words', () => {
    const long = Array.from({ length: 25 }, (_, i) => `w${i}`).join(' ');
    const { profile } = run({
      essence: { ...essence, promise: { value: long, source: '/about' } },
    });
    expect(profile.essence?.promise).toEqual({
      value: long.split(' ').slice(0, 20).join(' '),
      source: ABOUT,
    });
  });

  test('drops a promise whose page was not read', () => {
    const { profile, dropped } = run({
      essence: { ...essence, promise: { value: 'We come to you', source: 'https://sen.vn/blog' } },
    });
    expect(profile.essence?.promise ?? null).toBeNull();
    expect(dropped).toContainEqual({ field: 'essence.promise', reason: 'unknown_source' });
  });

  test('keeps interpretation, and moments whose page was read', () => {
    const { profile, dropped } = run({ essence });
    expect(profile.essence).toEqual({
      promise: null,
      feeling: ['relaxing', 'warm', 'cared for'],
      placeSymbols: ['lotus flowers', 'Hoi An lanterns'],
      senses: ['warm natural oils', 'fresh linens'],
      moments: [{ value: 'after a long flight', source: ABOUT }],
    });
    expect(dropped).toContainEqual({ field: 'essence.moments[1]', reason: 'unknown_source' });
  });

  test('is trimmed to its limits', () => {
    const many = (n: number) => Array.from({ length: n }, (_, i) => `item ${i}`);
    const { profile } = run({
      essence: {
        feeling: many(6),
        placeSymbols: many(8),
        senses: many(8),
        moments: Array.from({ length: 9 }, () => ({ value: 'after a surf', source: HOME })),
      },
    });
    expect(profile.essence?.feeling).toHaveLength(4);
    expect(profile.essence?.placeSymbols).toHaveLength(5);
    expect(profile.essence?.senses).toHaveLength(5);
    expect(profile.essence?.moments).toHaveLength(6);
  });

  test('finalise gives an empty essence when the model gave none', () => {
    const { profile } = run({ category: 'spa', tone: ['calm'] });
    const final = finalise(profile, {
      readAt: '2026-10-24T09:00:00.000Z',
      promptVersion: 'p',
      thin: false,
      dropped: [],
    });
    expect(final.essence).toEqual({
      promise: null,
      feeling: [],
      placeSymbols: [],
      senses: [],
      moments: [],
    });
  });
});

describe('a model answer past the limits', () => {
  test('is accepted by the model schema', async () => {
    const { modelProfileSchema } = await import('@/lib/brand/profile');
    const long = {
      name: { value: 'Sen Spa', source: HOME },
      summary: { value: Array.from({ length: 30 }, () => 'calm').join(' '), source: HOME },
      category: 'massage spa',
      offerings: Array.from({ length: 25 }, (_, i) => ({ name: `Massage ${i}`, source: HOME })),
      highlights: Array.from({ length: 10 }, (_, i) => ({ value: `Claim ${i}`, source: HOME })),
      location: { town: null, area: null, address: null, serviceArea: null },
      contact: { whatsapp: null, phone: null, email: null, instagram: null, bookingUrl: null },
      hours: null,
      tone: ['calm', 'warm', 'kind', 'gentle', 'quiet', 'soft', 'local'],
      colours: [],
      essence: null,
      visualStyle: {
        summary: Array.from({ length: 15 }, () => 'soft').join(' '),
        palette: 'green',
        light: 'soft',
        textures: 'linen',
        mood: 'calm',
      },
    };
    expect(modelProfileSchema.safeParse(long).success).toBe(true);
  });

  test('is trimmed to the limits before the final profile', () => {
    const { profile, dropped } = run({
      summary: { value: Array.from({ length: 30 }, (_, i) => `w${i}`).join(' '), source: HOME },
      offerings: Array.from({ length: 25 }, () => ({ name: 'Aroma massage', source: PRICES })),
      highlights: Array.from({ length: 10 }, () => ({
        value: 'Therapists come to you',
        source: ABOUT,
      })),
      tone: ['calm', 'warm', 'kind', 'gentle', 'quiet', 'soft', 'local'],
      visualStyle: {
        summary: Array.from({ length: 15 }, () => 'soft').join(' '),
        palette: 'green',
        light: 'soft',
        textures: 'linen',
        mood: 'calm',
      },
    });
    expect(profile.summary?.value?.split(' ')).toHaveLength(25);
    expect(profile.offerings).toHaveLength(20);
    expect(profile.highlights).toHaveLength(8);
    expect(profile.tone).toHaveLength(5);
    expect(profile.visualStyle?.summary?.split(' ')).toHaveLength(12);
    expect(dropped).toEqual([]);
  });

  test('two tone words still give a final profile', () => {
    const { profile } = run({ category: 'spa', tone: ['calm', 'warm'] });
    const final = finalise(profile, {
      readAt: '2026-10-24T09:00:00.000Z',
      promptVersion: 'brand-1',
      thin: false,
      dropped: [],
    });
    expect(final.tone).toEqual(['calm', 'warm']);
  });
});

describe('finalise', () => {
  const meta = {
    readAt: '2026-10-24T09:00:00.000Z',
    promptVersion: 'brand-1',
    thin: false,
    dropped: [],
  };

  test('fills the meta fields and passes the schema', () => {
    const { profile } = run({ category: 'massage spa', tone: ['calm', 'warm', 'caring'] });
    const final = finalise(profile, meta);
    expect(final).toMatchObject({
      schemaVersion: 1,
      promptVersion: 'brand-1',
      thin: false,
      name: { value: 'Sen Spa' },
      offerings: [],
      summary: null,
      contact: { whatsapp: null },
    });
  });

  test('rejects a profile with no name', () => {
    const code = codeProfile([facts()], extra);
    const { profile } = mergeAndCheck(
      code,
      { category: 'spa', tone: ['a', 'b', 'c'] },
      {
        facts: [facts()],
        pages,
        pagesRead,
        photos: 1,
      },
    );
    expect(() => finalise(profile, meta)).toThrow();
  });
});
