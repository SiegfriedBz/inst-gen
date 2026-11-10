import { BANNED_WORDS } from '@/lib/posts/banned';

// Code's word list (docs/specs/questions/answer-drafts): words and phrases that
// ask for or mention sex, in the guests' main languages, written as code
// folds them (no case, no accents). A match adds the line on professional
// massage even when the model didn't flag the question. Latin-script entries
// match whole words; the others anywhere. The list may grow.
export const SEX_WORDS: readonly string[] = [
  ...BANNED_WORDS,
  // English
  'sex',
  'sexual',
  'happy ending',
  'hand job',
  'handjob',
  'blow job',
  'blowjob',
  'extra service',
  'special service',
  'full service',
  'massage plus',
  // Vietnamese: tình dục, kích dục
  'tinh duc',
  'kich duc',
  // Indonesian
  'pijat plus',
  'plus plus',
  'esek esek',
  'esek-esek',
  // Russian
  'секс',
  'интим',
  'эрот',
  // Korean
  '섹스',
  // Chinese
  '色情',
  '性服务',
  '特殊服务',
  '大保健',
];

function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

const LATIN = /^[a-z0-9 +-]+$/;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const MATCHERS = SEX_WORDS.map((word) => {
  const folded = fold(word);
  return LATIN.test(folded)
    ? new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(folded)}(?:$|[^\\p{L}\\p{N}])`, 'u')
    : new RegExp(escapeRegex(folded), 'u');
});

export function mentionsSex(text: string): boolean {
  const folded = fold(text);
  return MATCHERS.some((matcher) => matcher.test(folded));
}
