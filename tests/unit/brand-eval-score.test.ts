import { describe, expect, test } from 'vitest';
import { type Expected, normaliseText, scoreFixture } from '@/lib/brand/eval/score';
import type { Profile } from '@/lib/brand/profile';
import { svargaProfile } from './helpers/brand';

const SITE = 'https://svargabalimassage.com/';
const pages = new Map([
  [SITE, 'Svarga. Balinese massage IDR 450,000 for 90 minutes. Mobile spa in Canggu.'],
  ['https://svargabalimassage.com/about', 'Therapists come to you.'],
]);

const expected: Expected = {
  acceptedNames: ['Svarga', 'Svarga Bali Massage'],
  whatsapp: '+6281234567890',
  town: 'Canggu',
  summaryKeywords: ['massage', 'spa'],
  offerings: ['Balinese massage'],
  brandColours: ['#22705e'],
  thin: false,
};

function score(change: (p: Profile) => void = () => {}, exp: Partial<Expected> = {}) {
  const profile = svargaProfile();
  change(profile);
  return scoreFixture(profile, { ...expected, ...exp }, pages);
}

describe('normaliseText', () => {
  test('ignores case, accents and punctuation', () => {
    expect(normaliseText('Svarga Bali Massage!')).toBe(normaliseText('svarga bali massage'));
    expect(normaliseText('Đà Nẵng')).toBe('da nang');
  });
});

describe('scoreFixture', () => {
  test('passes a matching profile', () => {
    expect(score()).toEqual({ pass: true, failures: [] });
  });

  test('fails on a name outside the accepted names', () => {
    expect(score((p) => (p.name.value = 'Svarga Luxury')).failures).toEqual(['name']);
  });

  test('"Svarga Bali Massage!" matches "svarga bali massage"', () => {
    expect(score((p) => (p.name.value = 'Svarga Bali Massage!')).pass).toBe(true);
  });

  test('fails on a wrong WhatsApp number', () => {
    expect(
      score((p) => (p.contact.whatsapp = { value: '+6281111111111', source: SITE })).failures,
    ).toEqual(['whatsapp']);
  });

  test('fails on a WhatsApp number where the site has none', () => {
    expect(score(undefined, { whatsapp: null }).failures).toEqual(['whatsapp']);
  });

  test('fails on a wrong town', () => {
    expect(score((p) => (p.location.town = { value: 'Ubud', source: SITE })).failures).toEqual([
      'town',
    ]);
  });

  test('fails on a summary without any key word', () => {
    expect(
      score((p) => (p.summary = { value: 'Wellness at your villa', source: SITE })).failures,
    ).toEqual(['summary']);
  });

  test('fails when under 70 % of the expected offerings are found', () => {
    expect(
      score(undefined, { offerings: ['Balinese massage', 'Hot stone', 'Facial', 'Scrub'] })
        .failures,
    ).toEqual(['offerings_recall']);
  });

  test('fails on an offering whose name is not on its page', () => {
    expect(
      score((p) => p.offerings.push({ name: 'Four hands massage', source: SITE })).failures,
    ).toEqual(['offerings_invented']);
  });

  test('fails on a price the site does not show', () => {
    expect(score((p) => (p.offerings[0].price = 'IDR 999,000')).failures).toEqual(['prices']);
  });

  test('#1f6f5c against #22705e passes, against #ff0000 fails', () => {
    expect(score().failures).not.toContain('colour');
    expect(score(undefined, { brandColours: ['#ff0000'] }).failures).toEqual(['colour']);
  });

  test('a thin fixture is scored only on thin, WhatsApp and invented facts', () => {
    const thin = {
      acceptedNames: ['Yin'],
      whatsapp: null,
      town: null,
      summaryKeywords: [],
      offerings: [],
      brandColours: [],
      thin: true,
    };
    const result = score((p) => {
      p.thin = true;
      p.name.value = 'Home';
      p.contact.whatsapp = null;
      p.location.town = null;
      p.summary = null;
    }, thin);
    expect(result).toEqual({ pass: true, failures: [] });
  });

  test('fails on the wrong thin flag', () => {
    expect(score(undefined, { thin: true }).failures).toEqual(['thin']);
  });
});
