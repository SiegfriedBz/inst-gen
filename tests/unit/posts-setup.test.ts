import { describe, expect, it } from 'vitest';
import type { Profile } from '@/lib/brand/profile';
import { localsOf, lookOf, seededRandom } from '@/lib/posts/setup';
import { senProfile, svargaProfile } from './helpers/brand';

// The image set-ups (docs/specs/posts/varied-images).

const place = (value: string) => ({ value, source: 'https://example.com/' });

function elsewhere(changes: Partial<Profile['location']>, whatsapp: string | null): Profile {
  const profile = svargaProfile();
  return {
    ...profile,
    siteUrl: 'https://example.com/',
    location: { ...profile.location, area: null, serviceArea: null, ...changes },
    contact: { ...profile.contact, whatsapp: whatsapp ? place(whatsapp) : null, phone: null },
  };
}

describe('lookOf', () => {
  it.each([
    ['Four-Hands Massage', 'fourHands'],
    ['4 Hands Massage', 'fourHands'],
    ['Couple Massage', 'couple'],
    ['Thai Massage', 'thai'],
    ['Foot Reflexology', 'foot'],
    ['Hot Stone Therapy', 'stone'],
    ['Head & Scalp Massage', 'head'],
    ['Balinese Facial', 'head'],
    ['Coffee Body Scrub', 'scrub'],
    ['Baby on Board Pregnancy Massage', 'pregnancy'],
    ['Aroma Massage', 'plain'],
    ['Signature Massage', 'plain'],
    ['Mát-xa Thái', 'thai'],
  ])('%s → %s', (name, look) => {
    expect(lookOf(name)).toBe(look);
  });

  it.each([
    'Gift Voucher',
    'Anak Anak Kids Massage',
    'Manicure',
    'Ear Candling',
    'Reiki',
    'Singing Bowl Healing',
    'Yoga Class',
    'Airport Transfer',
  ])('%s is excluded', (name) => {
    expect(lookOf(name)).toBe('excluded');
  });

  it('ignores case and accents', () => {
    expect(lookOf('THAÏ massage')).toBe('thai');
  });
});

describe('localsOf', () => {
  it('Sen is Vietnamese', () => {
    expect(localsOf(senProfile())).toBe('Vietnamese');
  });

  it('Svarga is Balinese', () => {
    expect(localsOf(svargaProfile())).toBe('Balinese');
  });

  it('a Bali town without "Bali" is Balinese', () => {
    expect(localsOf(elsewhere({ town: place('Pererenan') }, '+6281234567890'))).toBe('Balinese');
  });

  it('"bali" only in the host is Balinese', () => {
    const profile = elsewhere({ town: place('Kota') }, '+6281234567890');
    expect(localsOf({ ...profile, siteUrl: 'https://svargabalimassage.com/' })).toBe('Balinese');
  });

  it('elsewhere in Indonesia is Indonesian', () => {
    expect(localsOf(elsewhere({ town: place('Yogyakarta') }, '+6281234567890'))).toBe('Indonesian');
  });

  it('no country is Southeast Asian', () => {
    expect(localsOf(elsewhere({ town: place('Yogyakarta') }, null))).toBe('Southeast Asian');
  });
});

describe('seededRandom', () => {
  it('repeats for one seed and differs between seeds', () => {
    const a = seededRandom('sen');
    const b = seededRandom('sen');
    const c = seededRandom('svarga');
    const xs = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(xs);
    expect(c()).not.toBe(xs[0]);
    for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
  });
});
