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

// The invitations a text holds, whole words, any case, in the order they appear.
export function invitesIn(text: string): string[] {
  const plain = folded(text);
  return INVITE_PHRASES.map((phrase) => ({ phrase, at: wordAt(plain, phrase) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ phrase }) => `"${phrase}"`);
}

export function copyNotes(text: string, goesToGuests: boolean): string[] {
  return [...clichesIn(text), ...(goesToGuests ? invitesIn(text) : [])];
}
