import { POSTS_LIMITS } from './batch';
import { emojisIn, FLOWERS } from './emoji';
import { mentionsDay, OFFER_LIMITS, type Offer } from './offer';
import { sentences } from './story';

// An offer post's line, written by code from the offer and the post's
// treatment, put first in its caption and used as its story text
// (docs/specs/posts/offer-line-first).

const FLOWER = '🌸';

export function offerLine(offer: Offer, treatment: string): string {
  const session = `${OFFER_LIMITS.minutes}-minute ${treatment}, until ${offer.lastDay}.`;
  return offer.kind === 'discount'
    ? `${offer.percent}% off our ${session}`
    : `Free ${offer.gift} with a ${session}`;
}

// The set-up's treatment when it is on offer, else the first on offer that
// the caption names.
export function offerTreatment(
  offer: Offer,
  setupTreatment: string | undefined,
  caption: string,
): string | null {
  if (setupTreatment && offer.treatments.includes(setupTreatment)) return setupTreatment;
  const text = caption.toLowerCase();
  return offer.treatments.find((t) => text.includes(t.toLowerCase())) ?? null;
}

export function statesOffer(sentence: string, offer: Offer): boolean {
  if (mentionsDay(sentence, offer.until)) return true;
  if (offer.kind === 'discount') {
    return new RegExp(`(?<!\\d)${offer.percent}\\s?%`).test(sentence);
  }
  return /\bfree\b/i.test(sentence) && sentence.toLowerCase().includes(offer.gift.toLowerCase());
}

function isFlower(text: string): boolean {
  return (FLOWERS as readonly string[]).includes(text);
}

// The flower that opens the text, if any.
function leadingFlower(text: string): string | null {
  const next = text.trimStart();
  const first = emojisIn(next)[0];
  return first && isFlower(first) && next.startsWith(first) ? first : null;
}

export function putOfferLineFirst(
  caption: string,
  line: string,
  offer: Offer,
  spa: boolean,
): { caption: string; fix: 'put first' | 'added' | null } {
  const text = caption.trim();
  if (text.startsWith(line)) return { caption: text, fix: null };
  const all = sentences(text);
  const kept = all.filter((sentence) => !statesOffer(sentence, offer));
  let rest = kept.join('').trim();
  // A spa's line takes the flower that already leads the rest: one, not two.
  const lead = spa ? leadingFlower(rest) : null;
  if (lead) rest = rest.slice(lead.length).trim();
  const head = spa ? `${line} ${lead ?? FLOWER}` : line;
  return {
    caption: rest ? `${head} ${rest}` : head,
    fix: kept.length < all.length ? 'put first' : 'added',
  };
}

// The flower right after the line in the caption, if any.
function flowerAfter(line: string, caption: string): string | null {
  return caption.startsWith(line) ? leadingFlower(caption.slice(line.length)) : null;
}

export function offerStory(
  line: string,
  caption: string,
  story: string | undefined,
  spa: boolean,
): { storyText?: string; fix: 'set' | 'too long' | null } {
  if (story?.startsWith(line)) {
    const after = story.slice(line.length).trim();
    if (spa ? isFlower(after) : after === '') return { storyText: story, fix: null };
  }
  const text = spa ? `${line} ${flowerAfter(line, caption) ?? FLOWER}` : line;
  if (text.length > POSTS_LIMITS.storyChars) return { fix: 'too long' };
  return { storyText: text, fix: 'set' };
}

// After its line, a post that carries the offer never gives a price (amended
// 2026-10-29): each sentence that holds one goes, the line's flower stays.
export function dropPrices(
  caption: string,
  line: string,
  price: RegExp,
): { caption: string; removed: string[] } {
  const rest = caption.slice(line.length);
  const lead = leadingFlower(rest);
  const body = lead ? rest.trimStart().slice(lead.length) : rest;
  const removed: string[] = [];
  const kept = sentences(body).filter((sentence) => {
    if (!price.test(sentence)) return true;
    removed.push(sentence.trim());
    return false;
  });
  if (removed.length === 0) return { caption, removed };
  return { caption: `${lead ? `${line} ${lead}` : line}${kept.join('')}`, removed };
}
