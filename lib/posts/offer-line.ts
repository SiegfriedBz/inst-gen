import { POSTS_LIMITS } from './batch';
import { emojisIn, FLOWERS } from './emoji';
import { hookOnItsLine } from './hook-line';
import { mentionsDay, OFFER_LIMITS, type Offer } from './offer';
import { paragraphsOf } from './paragraphs';
import { sentences } from './story';

// An offer post's line, written by code from the offer and the post's
// treatment, put second in its caption, after the question, and used as its
// story text (docs/specs/posts/offer-line-first; second since
// docs/specs/posts/short-captions, amended 2026-11-10).

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

// The line as the caption's second paragraph, word for word. Paragraph by
// paragraph, the sentences that state the offer go; the first paragraph left
// gives the question (its first sentence and the emoji after it), then the
// line, then the rest.
export function putOfferLineSecond(
  caption: string,
  line: string,
  offer: Offer,
): { caption: string; fix: 'put second' | 'added' | null } {
  const text = caption.trim();
  const bare = line.replace(/\.$/, '');
  if (paragraphsOf(text)[1]?.startsWith(bare)) return { caption: text, fix: null };
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
  const fix = stated ? 'put second' : 'added';
  if (kept.length === 0) return { caption: line, fix };
  const [first, ...others] = kept;
  const [hook, ...after] = paragraphsOf(hookOnItsLine(first));
  return { caption: [hook, line, ...after, ...others].join('\n\n'), fix };
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
