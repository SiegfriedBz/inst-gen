import { BANNED_WORDS } from '@/lib/posts/banned';

// What the reply and the answer prompts share
// (docs/specs/reviews/better-replies-and-answers, "Both tabs").

// Code decides it, not the model: the brand read writes a service area only
// for a business that comes to the client ("A business that goes to its
// guests").
export function goesToGuests(serviceArea: string | null | undefined): boolean {
  return Boolean(serviceArea?.trim());
}

export const TONE_RULE = 'Warm, calm and kind, as a good host writes: never pushy, never salesy.';

// The posts' rules that fit any text a guest reads ("The posts' rules on
// words"), from docs/specs/posts/short-captions and docs/specs/posts/generate-copy.
export const WORD_RULES = `Plain, concrete words, as the owner would write them: never a word that only adds intensity, such as completely, deeply, truly, ultimate or pure. Never "Imagine…", a "not this, it's that" contrast, an em dash (—), three adjectives in a row, or these words: unwind, indulge, pamper, oasis, escape, melt away, soothe. Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.`;
