import { describe, expect, test } from 'vitest';
import { missingFields, missingIn, sectionSummary } from '@/lib/brand/missing';
import type { Profile } from '@/lib/brand/profile';
import { senProfile, svargaProfile } from './helpers/brand';

const SITE = 'https://example.com/';

// Svarga with every field the forms can fill, filled.
function full(): Profile {
  const p = svargaProfile();
  return {
    ...p,
    location: { ...p.location, address: { value: 'Jl. Pantai 1', source: SITE } },
    contact: {
      ...p.contact,
      phone: { value: '+6281111111111', source: SITE },
      bookingUrl: { value: 'https://example.com/book', source: SITE },
    },
    essence: {
      ...p.essence,
      promise: { value: 'Calm hands at your villa', source: SITE },
      moments: [{ value: 'after a surf', source: SITE }],
      placeSymbols: ['rice fields'],
      senses: ['frangipani'],
      searchTerms: ['canggu massage'],
    },
  };
}

describe('what is missing', () => {
  test('nothing missing: no field listed, count 0', () => {
    expect(missingFields(full(), null)).toEqual({ listed: [], count: 0 });
  });

  test('the fields in panel order, with their section; logo and photos never', () => {
    const p = full();
    const r = missingFields(
      {
        ...p,
        location: { ...p.location, address: null },
        contact: { ...p.contact, phone: null, instagram: null },
        logoUrl: null,
        photoUrls: [],
      },
      null,
    );
    expect(r.listed).toEqual([
      { field: 'address', section: 'place' },
      { field: 'phone', section: 'contact' },
      { field: 'instagram', section: 'contact' },
    ]);
    expect(r.count).toBe(3);
  });

  test('WhatsApp and town are counted, not listed', () => {
    const p = full();
    const r = missingFields(
      {
        ...p,
        location: { ...p.location, town: null },
        contact: { ...p.contact, whatsapp: null, phone: null },
      },
      null,
    );
    expect(r.listed.map((m) => m.field)).toEqual(['phone']);
    expect(r.count).toBe(3);
  });

  test("the search's fields wait for the search to end", () => {
    const p = full();
    const empty = {
      ...p,
      essence: { ...p.essence, moments: [], placeSymbols: [], searchTerms: [] },
    };
    expect(missingFields(empty, 'running')).toEqual({ listed: [], count: 0 });
    expect(missingFields(empty, null).listed.map((m) => m.field)).toEqual([
      'moments',
      'placeSymbols',
      'searchTerms',
    ]);
    expect(missingFields(empty, 'failed').count).toBe(3);
  });

  test('blank text and empty lists are missing', () => {
    const p = full();
    const r = missingFields(
      { ...p, hours: { value: '  ', source: SITE }, tone: [], visualStyle: null },
      null,
    );
    expect(r.listed.map((m) => m.field)).toEqual(['hours', 'visualStyle', 'tone']);
  });

  test('missing in one section counts its warned fields too', () => {
    const p = full();
    const profile = {
      ...p,
      contact: { ...p.contact, whatsapp: null, email: null },
    };
    const { listed } = missingFields(profile, null);
    expect(missingIn(listed, 'contact', profile)).toBe(2);
    expect(missingIn(listed, 'place', profile)).toBe(0);
  });
});

describe('a line per section', () => {
  test('from the fixtures', () => {
    const sen = senProfile();
    const hours = sen.hours?.value;
    expect(sectionSummary(sen, 'place')).toBe(`${sen.location.town?.value}, ${hours}`);
    expect(sectionSummary(sen, 'contact')).toBe(sen.contact.whatsapp?.value);
    expect(sectionSummary(sen, 'look')).toBe(sen.visualStyle?.summary);
    expect(sectionSummary(svargaProfile(), 'feeling')).toBe(
      'relaxing, warm, cared for. calm, warm, caring',
    );
  });

  test('contact falls back to phone, email, Instagram', () => {
    const p = svargaProfile();
    const onlyEmail = {
      ...p,
      contact: { ...p.contact, whatsapp: null, phone: null, instagram: null },
    };
    expect(sectionSummary(onlyEmail, 'contact')).toBe('hello@svargabalimassage.com');
  });

  test('nothing to say is null', () => {
    const p = svargaProfile();
    const empty = {
      ...p,
      location: { town: null, area: null, address: null, serviceArea: null },
      hours: null,
    };
    expect(sectionSummary(empty, 'place')).toBeNull();
    expect(sectionSummary({ ...p, visualStyle: null }, 'look')).toBeNull();
  });
});
