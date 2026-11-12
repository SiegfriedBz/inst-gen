import { describe, expect, it } from 'vitest';
import type { Offer } from '@/lib/posts/offer';
import {
  offerLine,
  offerStory,
  offerTreatment,
  putOfferLineFirst,
  statesOffer,
} from '@/lib/posts/offer-line';

// An offer post's line, put by code (docs/specs/posts/offer-line-first), first
// again, its question after it (docs/specs/posts/short-captions, amended
// 2026-11-12).

const offer: Offer = {
  kind: 'discount',
  percent: 10,
  treatments: ['Thai Massage', 'Vietnamese Traditional Massage'],
  until: '2026-11-01',
  lastDay: 'Sunday 1 November',
};
const free: Offer = {
  kind: 'freeExtra',
  gift: 'Foot Reflexology',
  treatments: ['Thai Massage'],
  until: '2026-11-01',
  lastDay: 'Sunday 1 November',
};
const LINE = '10% off our 90-minute Thai Massage, until Sunday 1 November.';

describe('the offer line', () => {
  it('writes the discount line and the free extra line', () => {
    expect(offerLine(offer, 'Thai Massage')).toBe(LINE);
    expect(offerLine(free, 'Thai Massage')).toBe(
      'Free Foot Reflexology with a 90-minute Thai Massage, until Sunday 1 November.',
    );
  });

  it("takes the set-up's treatment, else the caption's, else none", () => {
    expect(offerTreatment(offer, 'Thai Massage', '')).toBe('Thai Massage');
    expect(offerTreatment(offer, 'Hot Stone', 'Our vietnamese traditional massage.')).toBe(
      'Vietnamese Traditional Massage',
    );
    expect(offerTreatment(offer, undefined, 'Warm oil tonight.')).toBeNull();
  });

  it('knows a sentence that states the offer', () => {
    expect(statesOffer('Book before 1 Nov.', offer)).toBe(true);
    expect(statesOffer(' 🌸 10 % off tonight.', offer)).toBe(true);
    expect(statesOffer('100% natural oils.', offer)).toBe(false);
    expect(statesOffer('A 110% welcome.', offer)).toBe(false);
    expect(statesOffer('Free foot reflexology with it!', free)).toBe(true);
    expect(statesOffer('Foot reflexology helps.', free)).toBe(false);
  });
});

describe('putOfferLineFirst', () => {
  const hook = 'Tight hips after a day exploring Da Nang? 🌸';

  it('keeps a line the model wrote first, its stop gone before a flower or not', () => {
    const caption = `${LINE}\n\n${hook} We come to your hotel.\n\nFree travel.`;
    expect(putOfferLineFirst(caption, LINE, offer)).toEqual({ caption, fix: null });
    const flowered = `${LINE.replace(/\.$/, '')} 🌺\n\n${hook} We come to your hotel.`;
    expect(putOfferLineFirst(flowered, LINE, offer)).toEqual({ caption: flowered, fix: null });
  });

  it('puts a line the model wrote second before the question', () => {
    expect(putOfferLineFirst(`${hook}\n\n${LINE}\n\nWe come to your hotel.`, LINE, offer)).toEqual({
      caption: `${LINE}\n\n${hook}\n\nWe come to your hotel.`,
      fix: 'put first',
    });
  });

  it('puts the line in place of the model own words for the offer', () => {
    expect(
      putOfferLineFirst(`${hook}\n\n10% off Thai this week, until 1 Nov!\n\nWe come.`, LINE, offer),
    ).toEqual({ caption: `${LINE}\n\n${hook}\n\nWe come.`, fix: 'put first' });
  });

  it("keeps the question's flower when the model's offer followed it", () => {
    expect(putOfferLineFirst(`Long flight? 🌸 ${LINE} Feel light again.`, LINE, offer)).toEqual({
      caption: `${LINE}\n\nLong flight? 🌸 Feel light again.`,
      fix: 'put first',
    });
  });

  it('adds a line the model left out, first, and no flower', () => {
    expect(putOfferLineFirst(`${hook} We come to your hotel.`, LINE, offer)).toEqual({
      caption: `${LINE}\n\n${hook} We come to your hotel.`,
      fix: 'added',
    });
  });

  it('gives the line alone when the caption only stated the offer', () => {
    expect(putOfferLineFirst('10% off, until 1 Nov!', LINE, offer)).toEqual({
      caption: LINE,
      fix: 'put first',
    });
  });
});

describe('offerStory', () => {
  it('keeps a story text that is the line and a flower, any of the five', () => {
    expect(offerStory(LINE, `${LINE} 🌸 Feel light.`, `${LINE} 🌺`, true)).toEqual({
      storyText: `${LINE} 🌺`,
      fix: null,
    });
    expect(offerStory(LINE, `${LINE} Feel light.`, LINE, false)).toEqual({
      storyText: LINE,
      fix: null,
    });
  });

  it("sets the story text from the caption's flower, else 🌸", () => {
    expect(offerStory(LINE, `${LINE} 🌼 Feel light.`, 'Long flight? 🌸', true)).toEqual({
      storyText: `${LINE} 🌼`,
      fix: 'set',
    });
    expect(offerStory(LINE, `${LINE} Feel light.`, undefined, true)).toEqual({
      storyText: `${LINE} 🌸`,
      fix: 'set',
    });
    expect(offerStory(LINE, LINE, 'Long flight?', false)).toEqual({ storyText: LINE, fix: 'set' });
  });

  it('gives no story text rather than one over 120', () => {
    const long = `Free Foot Reflexology with a 90-minute ${'Very '.repeat(12)}Long Massage, until Sunday 1 November.`;
    expect(offerStory(long, long, undefined, true)).toEqual({ fix: 'too long' });
  });
});
