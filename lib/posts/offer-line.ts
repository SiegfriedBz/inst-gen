import { POSTS_LIMITS } from './batch';
import { emojisIn, FLOWERS } from './emoji';
import { mentionsDay, OFFER_LIMITS, type Offer } from './offer';
import { paragraphsOf } from './paragraphs';
import { sentences } from './story';

// An offer post's line, written by code from the offer and the post's
// treatment, put first in its caption, its question after it, and used as its
// story text (docs/specs/posts/offer-line-first; first again since
// docs/specs/posts/short-captions was amended 2026-11-12).

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

const hasWords = (text: string) => /[\p{L}\p{N}]/u.test(text);
const LEADING_EMOJI = /^(?:\s|\p{Extended_Pictographic}|\uFE0F)*/u;

// The line as the caption's first paragraph, word for word. Paragraph by
// paragraph, the sentences that state the offer go; the line comes first,
// then what is left, its question first. No flower is added here: a spa's
// two come after the paragraph limit.
export function putOfferLineFirst(
  caption: string,
  line: string,
  offer: Offer,
): { caption: string; fix: 'put first' | 'added' | null } {
  const text = caption.trim();
  const bare = line.replace(/\.$/, '');
  if (paragraphsOf(text)[0]?.startsWith(bare)) return { caption: text, fix: null };
  let stated = false;
  const kept = paragraphsOf(text)
    .map((paragraph) =>
      sentences(paragraph)
        .map((sentence) => {
          if (!statesOffer(sentence, offer)) return sentence;
          stated = true;
          // The emoji that ended the sentence before stays with it.
          return sentence.match(LEADING_EMOJI)?.[0] ?? '';
        })
        .join('')
        .replace(/[ \t]{2,}/g, ' ')
        .trim(),
    )
    .filter(hasWords);
  const fix = stated ? 'put first' : 'added';
  return { caption: [line, ...kept].join('\n\n'), fix };
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
