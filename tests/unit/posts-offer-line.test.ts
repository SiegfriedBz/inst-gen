import { describe, expect, it } from 'vitest';
import type { Offer } from '@/lib/posts/offer';
import {
  offerLine,
  offerStory,
  offerTreatment,
  putOfferLineFirst,
  statesOffer,
} from '@/lib/posts/offer-line';

// An offer post's line, put first by code (docs/specs/posts/offer-line-first).

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
  it('keeps a caption that opens on its line', () => {
    const caption = `${LINE} 🌺 Long flight? Feel light again.`;
    expect(putOfferLineFirst(caption, LINE, offer, true)).toEqual({ caption, fix: null });
  });

  it('puts the line first when a hook comes before it', () => {
    expect(
      putOfferLineFirst(`Long flight? 🌸 ${LINE} Feel light again.`, LINE, offer, true),
    ).toEqual({ caption: `${LINE} 🌸 Long flight? Feel light again.`, fix: 'put first' });
  });

  it('replaces the line in other words, and one with a flower before it', () => {
    const other = '10% off the 90-minute thai massage until Sunday 1 November! Feel light.';
    expect(putOfferLineFirst(other, LINE, offer, false)).toEqual({
      caption: `${LINE} Feel light.`,
      fix: 'put first',
    });
    expect(putOfferLineFirst(`🌸 ${LINE} Feel light.`, LINE, offer, true).caption).toBe(
      `${LINE} 🌸 Feel light.`,
    );
  });

  it('adds the line to a caption without the offer', () => {
    expect(putOfferLineFirst('Long flight? 🌸 Feel light.', LINE, offer, true)).toEqual({
      caption: `${LINE} 🌸 Long flight? 🌸 Feel light.`,
      fix: 'added',
    });
  });

  it("keeps one flower after the line: the caption's own, never two in a row", () => {
    const other =
      '10% off our 90-minute thai massage, until Sunday 1 November. 🌺 Long flight? Feel light.';
    const fixed = putOfferLineFirst(other, LINE, offer, true);
    expect(fixed).toEqual({ caption: `${LINE} 🌺 Long flight? Feel light.`, fix: 'put first' });
    expect(offerStory(LINE, fixed.caption, undefined, true).storyText).toBe(`${LINE} 🌺`);
    expect(putOfferLineFirst(`🌸 ${LINE} 🌸 Feel light.`, LINE, offer, true).caption).toBe(
      `${LINE} 🌸 Feel light.`,
    );
    expect(putOfferLineFirst('🌸 Long flight? Feel light.', LINE, offer, true)).toEqual({
      caption: `${LINE} 🌸 Long flight? Feel light.`,
      fix: 'added',
    });
  });

  it('leaves the line alone when the caption was only the offer', () => {
    expect(putOfferLineFirst('10% off, until 1 Nov!', LINE, offer, false)).toEqual({
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
