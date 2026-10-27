import { describe, expect, test } from 'vitest';
import {
  DEFAULT_ANSWERS,
  englishDay,
  mentionsDay,
  type Offer,
  offerFits,
  offerSchema,
  offerUntil,
  pruneOffer,
  toOffer,
} from '@/lib/posts/offer';
import { svargaProfile } from './helpers/brand';

function profile(names = ['Thai Massage', 'Foot Reflexology']) {
  const p = svargaProfile();
  p.offerings = names.map((name) => ({ name, source: p.siteUrl }));
  return p;
}

const offer: Offer = {
  kind: 'discount',
  percent: 10,
  treatments: ['Thai Massage', 'Foot Reflexology'],
  until: '2026-10-27',
  lastDay: 'Tuesday 27 October',
};

describe('offerUntil', () => {
  const sunday = new Date(2026, 9, 25, 16, 0); // phone time
  test.each([
    ['today', '2026-10-25'],
    ['3days', '2026-10-27'],
    ['1week', '2026-10-31'],
  ] as const)('%s ends %s', (length, until) => {
    expect(offerUntil(sunday, length)).toBe(until);
  });
});

test('englishDay writes the long English day', () => {
  expect(englishDay('2026-10-27')).toBe('Tuesday 27 October');
});

describe('toOffer', () => {
  const today = new Date(2026, 9, 26);
  test('the default answers with one ticked treatment make a 10% offer until today', () => {
    expect(toOffer({ ...DEFAULT_ANSWERS, treatments: ['Thai Massage'] }, today)).toEqual({
      kind: 'discount',
      percent: 10,
      treatments: ['Thai Massage'],
      until: '2026-10-26',
      lastDay: 'Monday 26 October',
    });
  });
  test('no treatment ticked, no offer', () => {
    expect(toOffer(DEFAULT_ANSWERS, today)).toBeNull();
  });
  test.each([0, 91, 1.5])('percent %s, no offer', (percent) => {
    expect(
      toOffer({ ...DEFAULT_ANSWERS, percent, treatments: ['Thai Massage'] }, today),
    ).toBeNull();
  });
  test('a free extra needs its gift', () => {
    const answers = {
      ...DEFAULT_ANSWERS,
      kind: 'freeExtra' as const,
      treatments: ['Thai Massage'],
    };
    expect(toOffer(answers, today)).toBeNull();
    expect(toOffer({ ...answers, gift: 'Foot Reflexology' }, today)).toMatchObject({
      kind: 'freeExtra',
      gift: 'Foot Reflexology',
    });
  });
});

test('offerSchema refuses a lastDay that is not the until date', () => {
  expect(offerSchema.safeParse(offer).success).toBe(true);
  expect(offerSchema.safeParse({ ...offer, lastDay: 'Monday 27 October' }).success).toBe(false);
});

describe('offerFits and pruneOffer', () => {
  test('names among the offerings fit', () => {
    expect(offerFits(offer, profile())).toBe(true);
  });
  test('an unknown treatment does not fit', () => {
    expect(offerFits({ ...offer, treatments: ['Hot Stone'] }, profile())).toBe(false);
  });
  test('a treatment that left is dropped; none left, no offer', () => {
    expect(pruneOffer(offer, profile(['Thai Massage']))).toEqual({
      ...offer,
      treatments: ['Thai Massage'],
    });
    expect(pruneOffer(offer, profile(['Hot Stone']))).toBeNull();
  });
  test('a gift that left clears the offer', () => {
    const free: Offer = {
      kind: 'freeExtra',
      gift: 'Foot Reflexology',
      treatments: ['Thai Massage'],
      until: offer.until,
      lastDay: offer.lastDay,
    };
    expect(offerFits(free, profile())).toBe(true);
    expect(pruneOffer(free, profile(['Thai Massage']))).toBeNull();
  });
});

describe('mentionsDay', () => {
  test.each([
    'until Tuesday 27 October',
    'until 27 Oct.',
    'Book before Tue, 27 Oct',
    'until October 27th',
    'until the 27th of October',
    'UNTIL 27 OCTOBER',
  ])('"%s" names the 27th', (caption) => {
    expect(mentionsDay(caption, '2026-10-27')).toBe(true);
  });
  test.each(['until 27 November', 'until Tuesday', 'only 7 Oct', 'until 127 Oct'])(
    '"%s" does not',
    (caption) => expect(mentionsDay(caption, '2026-10-27')).toBe(false),
  );
});
