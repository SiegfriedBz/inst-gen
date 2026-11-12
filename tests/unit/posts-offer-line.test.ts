import { describe, expect, it } from 'vitest';
import type { Offer } from '@/lib/posts/offer';
import {
  offerLine,
  offerStory,
  offerTreatment,
  putOfferLineSecond,
  statesOffer,
} from '@/lib/posts/offer-line';

// An offer post's line, put by code (docs/specs/posts/offer-line-first), now
// second, after the question (docs/specs/posts/short-captions, amended
// 2026-11-10).

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

describe('putOfferLineSecond', () => {
  const hook = 'Tight hips after a day exploring Da Nang? 🌸';

  it('keeps a line the model wrote second', () => {
    const caption = `${hook}\n\n${LINE}\n\nWe come to your hotel.`;
    expect(putOfferLineSecond(caption, LINE, offer)).toEqual({ caption, fix: null });
    const flowered = `${hook}\n\n${LINE.replace(/\.$/, '')} 🌺\n\nWe come to your hotel.`;
    expect(putOfferLineSecond(flowered, LINE, offer)).toEqual({ caption: flowered, fix: null });
  });

  it('puts a line the model wrote first after the question', () => {
    expect(putOfferLineSecond(`${LINE} ${hook}\n\nWe come to your hotel.`, LINE, offer)).toEqual({
      caption: `${hook}\n\n${LINE}\n\nWe come to your hotel.`,
      fix: 'put second',
    });
  });

  it('puts the line in place of the model own words for the offer', () => {
    expect(
      putOfferLineSecond(
        `${hook}\n\n10% off Thai this week, until 1 Nov!\n\nWe come.`,
        LINE,
        offer,
      ),
    ).toEqual({ caption: `${hook}\n\n${LINE}\n\nWe come.`, fix: 'put second' });
  });

  it("keeps the question's flower when the model's offer followed it", () => {
    expect(putOfferLineSecond(`Long flight? 🌸 ${LINE} Feel light again.`, LINE, offer)).toEqual({
      caption: `Long flight? 🌸\n\n${LINE}\n\nFeel light again.`,
      fix: 'put second',
    });
  });

  it('adds a line the model left out, after its first sentence', () => {
    expect(putOfferLineSecond(`${hook} We come to your hotel.`, LINE, offer)).toEqual({
      caption: `${hook}\n\n${LINE}\n\nWe come to your hotel.`,
      fix: 'added',
    });
  });

  it('gives the line alone when the caption only stated the offer', () => {
    expect(putOfferLineSecond('10% off, until 1 Nov!', LINE, offer)).toEqual({
      caption: LINE,
      fix: 'put second',
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
