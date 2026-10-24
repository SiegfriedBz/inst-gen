import { describe, expect, test } from 'vitest';
import {
  applySection,
  type BusinessValues,
  type ContactValues,
  changedUnsourced,
  countOwnerEdits,
  type LookValues,
  type PlaceValues,
  sectionValues,
} from '@/lib/brand/edit';
import type { Profile } from '@/lib/brand/profile';
import { ABOUT, SITE, svargaProfile } from './helpers/brand';

const p = svargaProfile();

function withTwoOfferings(): Profile {
  return {
    ...p,
    offerings: [
      ...p.offerings,
      { name: 'Foot reflexology', price: 'IDR 250,000', source: ABOUT },
      { name: 'Four-hands massage', source: ABOUT },
    ],
  };
}

const place = (profile: Profile, change: Partial<PlaceValues>) =>
  applySection(profile, 'place', {
    ...(sectionValues(profile, 'place') as PlaceValues),
    ...change,
  });
const contact = (profile: Profile, change: Partial<ContactValues>) =>
  applySection(profile, 'contact', {
    ...(sectionValues(profile, 'contact') as ContactValues),
    ...change,
  });
const business = (profile: Profile, change: Partial<BusinessValues>) =>
  applySection(profile, 'business', {
    ...(sectionValues(profile, 'business') as BusinessValues),
    ...change,
  });
const look = (profile: Profile, change: Partial<LookValues>) =>
  applySection(profile, 'look', { ...(sectionValues(profile, 'look') as LookValues), ...change });

function ok(result: ReturnType<typeof applySection>): Profile {
  if (!result.ok) throw new Error(`expected ok, got ${JSON.stringify(result.errors)}`);
  return result.profile;
}

describe('applying a section edit', () => {
  test("a changed field becomes the owner's", () => {
    expect(ok(place(p, { hours: '9am to midnight' })).hours).toEqual({
      value: '9am to midnight',
      source: 'owner',
    });
  });

  test('saving a field unchanged, or with extra spaces, keeps its source', () => {
    const saved = ok(place(p, { hours: '  Every day, 9am to 10pm ' }));
    expect(saved.hours).toEqual(p.hours);
    expect(countOwnerEdits(saved)).toBe(0);
  });

  test('saving every section unchanged is no edit', () => {
    for (const section of ['business', 'place', 'contact', 'look', 'feeling'] as const) {
      const saved = ok(applySection(p, section, sectionValues(p, section)));
      expect(saved).toEqual(p);
    }
  });

  test('reordering and removing offerings are not edits', () => {
    const profile = withTwoOfferings();
    const values = sectionValues(profile, 'business') as BusinessValues;
    const saved = ok(
      business(profile, {
        offerings: [values.offerings[2], values.offerings[0]].flatMap((o) => (o ? [o] : [])),
      }),
    );
    expect(saved.offerings).toEqual([profile.offerings[2], profile.offerings[0]]);
    expect(countOwnerEdits(saved)).toBe(0);
  });

  test("a changed offering becomes the owner's", () => {
    const values = sectionValues(p, 'business') as BusinessValues;
    const first = values.offerings[0];
    if (!first) throw new Error('no offering');
    const saved = ok(business(p, { offerings: [{ ...first, price: 'IDR 500,000' }] }));
    expect(saved.offerings[0]).toMatchObject({ price: 'IDR 500,000', source: 'owner' });
  });

  test('an emptied field becomes null', () => {
    expect(ok(place(p, { area: '' })).location.area).toBeNull();
  });

  test("a WhatsApp number without a country code takes the other number's country", () => {
    const profile: Profile = {
      ...p,
      contact: { ...p.contact, phone: { value: '+84905123456', source: SITE } },
    };
    expect(ok(contact(profile, { whatsapp: '0905 111 222' })).contact.whatsapp).toEqual({
      value: '+84905111222',
      source: 'owner',
    });
  });

  test('the town gives the country when there is no other number', () => {
    expect(ok(contact(p, { whatsapp: '0812 3456 7891' })).contact.whatsapp).toEqual({
      value: '+6281234567891',
      source: 'owner',
    });
  });

  test('without any hint the owner is asked for the country code', () => {
    const profile: Profile = {
      ...p,
      location: {
        town: { value: 'Springfield', source: SITE },
        area: null,
        address: null,
        serviceArea: null,
      },
    };
    expect(contact(profile, { whatsapp: '0812 3456 7891' })).toEqual({
      ok: false,
      errors: { whatsapp: 'needCountryCode' },
    });
  });

  test('a number too short to be one is refused', () => {
    expect(contact(p, { phone: '+12' })).toEqual({ ok: false, errors: { phone: 'invalidPhone' } });
  });

  test('an Instagram link or @handle becomes a handle', () => {
    expect(
      ok(contact(p, { instagram: 'https://www.instagram.com/svarga.spa/' })).contact.instagram,
    ).toEqual({ value: 'svarga.spa', source: 'owner' });
    expect(ok(contact(p, { instagram: '@svarga.bali' })).contact.instagram).toEqual(
      p.contact.instagram,
    );
  });

  test('a booking link gets https', () => {
    expect(ok(contact(p, { bookingUrl: 'svarga.com/book' })).contact.bookingUrl).toEqual({
      value: 'https://svarga.com/book',
      source: 'owner',
    });
  });

  test('a bad booking link is refused', () => {
    expect(contact(p, { bookingUrl: 'not a link' })).toEqual({
      ok: false,
      errors: { bookingUrl: 'invalidUrl' },
    });
  });

  test('an untouched booking link or email is kept exactly as read', () => {
    for (const bookingUrl of ['svargabalimassage.com/book', 'Book on WhatsApp', 'mailto:x@y.com']) {
      const profile: Profile = {
        ...p,
        contact: { ...p.contact, bookingUrl: { value: bookingUrl, source: SITE } },
      };
      const saved = ok(contact(profile, { whatsapp: '+6281234567891' }));
      expect(saved.contact.bookingUrl).toEqual(profile.contact.bookingUrl);
      expect(countOwnerEdits(saved)).toBe(1);
    }
  });

  test('a typed link with another scheme is refused, not prefixed', () => {
    expect(contact(p, { bookingUrl: 'mailto:x@y.com' })).toEqual({
      ok: false,
      errors: { bookingUrl: 'invalidUrl' },
    });
  });

  test('a bad email is refused', () => {
    expect(contact(p, { email: 'hello at svarga' })).toEqual({
      ok: false,
      errors: { email: 'invalidEmail' },
    });
  });

  test('a 30-word summary is refused', () => {
    expect(business(p, { summary: Array(30).fill('word').join(' ') })).toEqual({
      ok: false,
      errors: { summary: 'tooManyWords' },
    });
  });

  test('the name cannot be emptied', () => {
    expect(business(p, { name: '  ' })).toEqual({ ok: false, errors: { name: 'required' } });
  });

  test('more than 8 highlights are refused', () => {
    const highlights = Array.from({ length: 9 }, (_, i) => ({ value: `Claim ${i}` }));
    expect(business(p, { highlights })).toEqual({ ok: false, errors: { highlights: 'tooMany' } });
  });

  test('half a visual style is refused, none is null', () => {
    const empty = { summary: '', palette: '', light: '', textures: '', mood: '' };
    expect(look(p, { style: { ...empty, mood: 'calm' } })).toEqual({
      ok: false,
      errors: { style: 'styleIncomplete' },
    });
    expect(ok(look(p, { style: empty })).visualStyle).toBeNull();
  });

  test('the last colour cannot be removed', () => {
    expect(look(p, { colours: [] })).toEqual({ ok: false, errors: { colours: 'needColour' } });
  });

  test("a new colour is the owner's, an unchanged one keeps its source", () => {
    const values = sectionValues(p, 'look') as LookValues;
    const saved = ok(look(p, { colours: [...values.colours, { hex: '#C0A060', role: 'accent' }] }));
    expect(saved.colours).toEqual([
      ...p.colours,
      { hex: '#c0a060', role: 'accent', source: 'owner' },
    ]);
  });

  test('removing the logo sets it to null', () => {
    expect(ok(look(p, { keepLogo: false })).logoUrl).toBeNull();
  });

  test('removing a photo keeps the others', () => {
    expect(ok(look(p, { photoUrls: [] })).photoUrls).toEqual([]);
  });

  test('feeling words are taken as typed, without empty ones', () => {
    const values = sectionValues(p, 'feeling');
    const saved = ok(
      applySection(p, 'feeling', { ...values, tone: [' calm ', '', 'playful'] } as typeof values),
    );
    expect(saved.tone).toEqual(['calm', 'playful']);
  });

  test('counts owner edits across the profile', () => {
    const once = ok(place(p, { hours: '9am to midnight' }));
    const twice = ok(contact(once, { email: 'book@svarga.com' }));
    expect(countOwnerEdits(twice)).toBe(2);
  });

  test('names the fields without a source that the owner changed', () => {
    const values = sectionValues(p, 'look') as LookValues;
    const after = ok(look(p, { style: { ...values.style, mood: 'bright and lively' } }));
    expect(changedUnsourced(p, after)).toEqual(['visualStyle']);
    const feeling = sectionValues(p, 'feeling');
    const toned = ok(applySection(p, 'feeling', { ...feeling, tone: ['playful'] }));
    expect(changedUnsourced(p, toned)).toEqual(['tone']);
    expect(changedUnsourced(p, p)).toEqual([]);
  });

  test('records an edit to search terms as an owner edit', () => {
    const feeling = sectionValues(p, 'feeling');
    const after = ok(
      applySection(p, 'feeling', { ...feeling, searchTerms: [' hotel massage canggu ', ''] }),
    );
    expect(after.essence.searchTerms).toEqual(['hotel massage canggu']);
    expect(changedUnsourced(p, after)).toEqual(['essence.searchTerms']);
  });

  test('counts edits to fields without a source too', () => {
    expect(countOwnerEdits(p, ['tone', 'visualStyle'])).toBe(2);
  });
});
