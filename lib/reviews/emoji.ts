import { dropStopsBeforeEmoji, graphemes, isEmoji, tidy } from '@/lib/posts/emoji';

// The emoji a reply or an answer keeps (docs/specs/reviews/better-replies-and-answers,
// "Emojis"): a few, one of each, the business's flower once at the very end,
// and no stop right before an emoji, as on posts
// (docs/specs/posts/day-and-night-copy, "No stop before an emoji").

// Every flower the model may write; code puts the business's own in its place.
export const FLOWER_EMOJI = /🌸|🌺|🌷|🌹|💮|🪷|🌼|🏵️?/gu;
const FLOWER = new RegExp(`^(?:${FLOWER_EMOJI.source})$`, 'u');

export type EmojiRule = {
  // The emoji other than flowers the text may hold, one of each.
  keep: readonly string[];
  // The business's flower, which ends the text once; null for no flower.
  flower: string | null;
};

// An emoji without its skin tone or variation selector: 🙏🏽 counts as 🙏.
const VARIANT = /[\u{1F3FB}-\u{1F3FF}️]/gu;
const plain = (emoji: string) => emoji.replace(VARIANT, '');

const ENDS_ON_WORD = /[\p{L}\p{N}]$/u;
// A sentence starts on a capital, or on a letter of a script with no case.
const STARTS_SENTENCE = /^[\p{Lu}\p{Lt}\p{Lo}]/u;
const SPACE = /^\s+$/u;
const WORD = /[\p{L}\p{N}]/u;

export function keepEmoji(text: string, rule: EmojiRule): string {
  const parts = graphemes(text);
  const kept = new Set<string>();
  let out = '';
  parts.forEach((part, i) => {
    if (!isEmoji(part)) {
      out += part;
      return;
    }
    const base = plain(part);
    if (!FLOWER.test(base) && rule.keep.includes(base) && !kept.has(base)) {
      kept.add(base);
      out += part;
      return;
    }
    // A removed emoji that stood in place of a stop leaves one; a flower goes
    // to the end.
    const next = parts.slice(i + 1).find((p) => !SPACE.test(p) && !isEmoji(p));
    const before = out.trimEnd();
    out =
      ENDS_ON_WORD.test(before) && next !== undefined && STARTS_SENTENCE.test(next)
        ? `${before}. `
        : `${out} `;
  });
  const tidied = tidy(out);
  // An empty part stays empty, so the checks can still refuse it.
  if (!WORD.test(tidied)) return '';
  return dropStopsBeforeEmoji(rule.flower ? `${tidied} ${rule.flower}` : tidied);
}
