import { describe, expect, it } from 'vitest';
import type { Profile } from '@/lib/brand/profile';
import { SCENES } from '@/lib/posts/batch';
import type { Offer } from '@/lib/posts/offer';
import {
  castLine,
  dealSetups,
  localsOf,
  lookOf,
  type Setup,
  seededRandom,
  setupLine,
} from '@/lib/posts/setup';
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

function withOfferings(names: string[]): Profile {
  const profile = svargaProfile();
  return { ...profile, offerings: names.map((name) => ({ name, source: profile.siteUrl })) };
}

const EIGHT = [
  'Aroma Massage',
  'Balinese Massage',
  'Deep Tissue Massage',
  'Sport Massage',
  'Lomi Lomi',
  'Signature Massage',
  'Coconut Oil Massage',
  'Relax Massage',
];

function offerOn(treatments: string[]): Offer {
  return {
    kind: 'discount',
    percent: 10,
    treatments,
    until: '2026-10-28',
    lastDay: 'Wednesday 28 October',
  };
}

const deal = (profile: Profile, offer?: Offer, seed = 't') =>
  dealSetups(profile, offer, seededRandom(seed));

const count = <T>(values: T[], value: T) => values.filter((v) => v === value).length;

describe('dealSetups', () => {
  it('deals six', () => {
    expect(deal(senProfile())).toHaveLength(6);
  });

  it('six different treatments when there are six or more', () => {
    const treatments = deal(withOfferings(EIGHT)).map((s) => s.treatment);
    expect(new Set(treatments).size).toBe(6);
    for (const t of treatments) expect(EIGHT).toContain(t);
  });

  it('each offering once before any twice when fewer', () => {
    const treatments = deal(senProfile()).map((s) => s.treatment);
    expect(count(treatments, 'Vietnamese Traditional Massage')).toBe(3);
    expect(count(treatments, 'Foot Reflexology')).toBe(3);
  });

  it('the excluded offerings are never drawn', () => {
    const profile = withOfferings([
      'Kids Massage',
      'Gift Voucher',
      'Aroma Massage',
      'Thai Massage',
    ]);
    for (const seed of ['a', 'b', 'c', 'd']) {
      for (const s of deal(profile, undefined, seed)) {
        expect(['Aroma Massage', 'Thai Massage']).toContain(s.treatment);
      }
    }
  });

  it('no eligible offering: six plain set-ups without a treatment', () => {
    for (const s of deal(withOfferings(['Gift Voucher']))) {
      expect(s.treatment).toBeUndefined();
      expect(s.look).toBe('plain');
    }
  });

  it('half men, half women without a couple', () => {
    for (const seed of ['a', 'b', 'c']) {
      const guests = deal(withOfferings(EIGHT), undefined, seed).map((s) => s.guests);
      expect(count(guests, 'man')).toBe(3);
      expect(count(guests, 'woman')).toBe(3);
    }
  });

  it('a couple: two therapists, and 3 men, 2 women among the others', () => {
    const profile = withOfferings(['Couple Massage', ...EIGHT.slice(0, 5)]);
    const setups = deal(profile);
    const couple = setups.filter((s) => s.guests === 'couple');
    expect(couple).toHaveLength(1);
    expect(couple[0].therapists).toBe(2);
    const guests = setups.map((s) => s.guests);
    expect(count(guests, 'man')).toBe(3);
    expect(count(guests, 'woman')).toBe(2);
  });

  it('a pregnancy is always a woman and counts as one', () => {
    const profile = withOfferings(['Pregnancy Massage', ...EIGHT.slice(0, 5)]);
    for (const seed of ['a', 'b', 'c', 'd']) {
      const setups = deal(profile, undefined, seed);
      const pregnancy = setups.find((s) => s.look === 'pregnancy');
      expect(pregnancy?.guests).toBe('woman');
      const guests = setups.map((s) => s.guests);
      expect(count(guests, 'man')).toBe(3);
      expect(count(guests, 'woman')).toBe(3);
    }
  });

  it('two therapists only for four hands and couple', () => {
    const profile = withOfferings([
      'Four-Hands Massage',
      'Couple Massage',
      'Thai Massage',
      'Foot Reflexology',
      'Hot Stone',
      'Aroma Massage',
    ]);
    for (const s of deal(profile)) {
      expect(s.therapists).toBe(s.look === 'fourHands' || s.look === 'couple' ? 2 : 1);
    }
  });

  it('feet for reflexology, whole body for thai, back for stone, head for a facial', () => {
    const profile = withOfferings([
      'Foot Reflexology',
      'Thai Massage',
      'Hot Stone',
      'Balinese Facial',
      'Aroma Massage',
      'Lomi Lomi',
    ]);
    const part = (look: Setup['look']) => deal(profile).find((s) => s.look === look)?.bodyPart;
    expect(part('foot')).toBe('feet');
    expect(part('thai')).toBe('whole body');
    expect(part('stone')).toBe('back');
    expect(part('head')).toBe('head');
  });

  it('the plain look never repeats a body part three times', () => {
    for (const seed of ['a', 'b', 'c', 'd', 'e']) {
      const parts = deal(withOfferings(EIGHT), undefined, seed).map((s) => s.bodyPart);
      for (const part of new Set(parts)) expect(count(parts, part)).toBeLessThanOrEqual(2);
    }
  });

  it('no scene more than twice', () => {
    for (let i = 0; i < 50; i += 1) {
      const scenes = deal(withOfferings(EIGHT), undefined, `s${i}`).map((s) => s.scene);
      for (const scene of SCENES) expect(count(scenes, scene)).toBeLessThanOrEqual(2);
    }
  });

  it('offer treatments go to set-ups 1 and 2', () => {
    const profile = withOfferings(['Thai Massage', ...EIGHT]);
    const setups = deal(profile, offerOn(['Thai Massage']));
    expect(setups[0].treatment).toBe('Thai Massage');
    expect(setups[1].treatment).toBe('Thai Massage');
  });

  it('an offer with two treatments shows both, once each, first', () => {
    const profile = withOfferings(['Thai Massage', 'Hot Stone', ...EIGHT]);
    const setups = deal(profile, offerOn(['Thai Massage', 'Hot Stone']));
    expect(new Set([setups[0].treatment, setups[1].treatment])).toEqual(
      new Set(['Thai Massage', 'Hot Stone']),
    );
  });

  it('an offer on an excluded treatment is still dealt, plain look', () => {
    const profile = withOfferings(['Manicure', ...EIGHT]);
    const setups = deal(profile, offerOn(['Manicure']));
    expect(setups[0].treatment).toBe('Manicure');
    expect(setups[0].look).toBe('plain');
  });

  it('the same seed deals the same six', () => {
    expect(deal(withOfferings(EIGHT), undefined, 'x')).toEqual(
      deal(withOfferings(EIGHT), undefined, 'x'),
    );
  });

  it('every set-up carries the profile locals', () => {
    for (const s of deal(senProfile())) expect(s.locals).toBe('Vietnamese');
  });
});

describe('the set-up in words', () => {
  const fourHandsMan: Setup = {
    treatment: 'Four-Hands Massage',
    look: 'fourHands',
    guests: 'man',
    therapists: 2,
    bodyPart: 'back',
    scene: 'guest',
    locals: 'Balinese',
  };

  it('setupLine for four hands', () => {
    expect(setupLine(fourHandsMan)).toBe(
      'Four-Hands Massage: one guest, a man, on a massage bed; two therapists working in step, one on each side; the back; scene guest, from above.',
    );
  });

  it('setupLine without a treatment', () => {
    const line = setupLine({ ...fourHandsMan, treatment: undefined, look: 'plain', therapists: 1 });
    expect(line.startsWith('A massage: one guest, a man, ')).toBe(true);
  });

  it('setupLine names every scene with its camera', () => {
    for (const [scene, camera] of [
      ['treatment', 'from the side'],
      ['detail', 'a close view of the hands on the body'],
      ['place', 'the room with the treatment in it'],
      ['guest', 'from above'],
    ] as const) {
      expect(setupLine({ ...fourHandsMan, scene })).toContain(`scene ${scene}, ${camera}.`);
    }
  });

  it('castLine, one guest and one therapist', () => {
    expect(
      castLine({
        ...fourHandsMan,
        look: 'plain',
        guests: 'woman',
        therapists: 1,
        locals: 'Vietnamese',
      }),
    ).toBe('One guest, a woman. One therapist, a young Vietnamese woman.');
  });

  it('castLine, two therapists', () => {
    expect(castLine(fourHandsMan)).toBe(
      'One guest, a man. Two therapists, both young Balinese women.',
    );
  });

  it('castLine, a couple', () => {
    expect(castLine({ ...fourHandsMan, look: 'couple', guests: 'couple' })).toBe(
      'Two guests, a man and a woman, on two beds side by side. Two therapists, both young Balinese women.',
    );
  });
});

// The whole-branch review's findings (journal, 2026-10-27).
describe('review fixes', () => {
  it('a couple never gets the close-up scene', () => {
    const profile = withOfferings(['Couple Massage', ...EIGHT.slice(0, 5)]);
    for (let i = 0; i < 200; i += 1) {
      const setups = deal(profile, undefined, `c${i}`);
      expect(setups.find((s) => s.look === 'couple')?.scene).not.toBe('detail');
      const scenes = setups.map((s) => s.scene);
      for (const scene of SCENES) expect(count(scenes, scene)).toBeLessThanOrEqual(2);
    }
  });

  it('six couples: no close-up at all', () => {
    for (const s of deal(withOfferings(['Couple Massage']))) expect(s.scene).not.toBe('detail');
  });

  it('a treatment word keeps "room", "tea" or "night" from excluding a name', () => {
    expect(lookOf('In-Room Massage')).toBe('plain');
    expect(lookOf('Green Tea Body Scrub')).toBe('scrub');
    expect(lookOf('Late Night Massage')).toBe('plain');
    expect(lookOf('Afternoon Tea')).toBe('excluded');
    expect(lookOf('Massage Gift Voucher')).toBe('excluded');
    expect(lookOf('Kids Massage')).toBe('excluded');
  });

  it('the offer treatment is not dealt again before the others', () => {
    const profile = withOfferings(['Thai Massage', 'Aroma Massage', 'Lomi Lomi', 'Relax Massage']);
    for (let i = 0; i < 50; i += 1) {
      const treatments = deal(profile, offerOn(['Thai Massage']), `o${i}`).map((s) => s.treatment);
      expect(count(treatments, 'Thai Massage')).toBe(2);
    }
  });

  it('a name listed twice is one treatment', () => {
    const profile = withOfferings(['Balinese Massage', 'Balinese Massage', ...EIGHT.slice(2, 7)]);
    for (const seed of ['a', 'b', 'c', 'd']) {
      const treatments = deal(profile, undefined, seed).map((s) => s.treatment);
      expect(new Set(treatments).size).toBe(6);
    }
  });

  it('one eligible offering fills all six', () => {
    for (const s of deal(withOfferings(['Aroma Massage', 'Gift Voucher']))) {
      expect(s.treatment).toBe('Aroma Massage');
    }
  });
});
