import { clichesIn, folded, wordAt } from '@/lib/posts/variety';

// What the evals print under a reply or an answer, for the developer to read
// back, and what the replay tests check
// (docs/specs/reviews/better-replies-and-answers, "The posts' rules on words"):
// the posts' clichés and em dash and, for a business that goes to its guests,
// the English phrases that invite the guest to it. Records change nothing.
// The list may grow.
export const INVITE_PHRASES: readonly string[] = [
  'come back',
  'coming back',
  'welcome you back',
  'welcome you again',
  'have you back',
  'see you again at',
  'visit us',
  'return to us',
  'back with us',
];

// The posts' words that only add intensity (docs/specs/posts/short-captions).
export const INTENSITY_WORDS: readonly string[] = [
  'completely',
  'deeply',
  'truly',
  'ultimate',
  'pure',
];

// The phrases of a list a text holds, whole words, any case, in the order
// they appear.
function phrasesIn(text: string, phrases: readonly string[]): string[] {
  const plain = folded(text);
  return phrases
    .map((phrase) => ({ phrase, at: wordAt(plain, phrase) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ phrase }) => `"${phrase}"`);
}

export function invitesIn(text: string): string[] {
  return phrasesIn(text, INVITE_PHRASES);
}

export function copyNotes(text: string, goesToGuests: boolean): string[] {
  return [
    ...clichesIn(text),
    ...phrasesIn(text, INTENSITY_WORDS),
    ...(goesToGuests ? invitesIn(text) : []),
  ];
}
