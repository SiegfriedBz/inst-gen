import { BANNED_WORDS } from '@/lib/posts/banned';
import { type EmojiRule, endSentence, keepEmoji } from './emoji';
import type { ModelReplies, ReplyBody, ScreenLocale } from './reply';

// What code makes sure of in the model's replies
// (docs/specs/reviews/reply-drafts, "The replies"): the business's own
// flower, no emoji on an abusive review, and no translation into the
// language the review is already in; no sentence with a banned word, and
// only 🙏, 😊 and the flower, with no 😊 after a complaint
// (docs/specs/reviews/better-replies-and-answers, "Emojis").

// Shared with the answers to guests' questions (lib/questions/checks.ts):
// the sentences, the banned words and the language.

// A sentence ends on its stop, or on an emoji in a stop's place, with the
// spaces after it (docs/specs/reviews/better-replies-and-answers, "The posts'
// rules on words").
const SENTENCE_END = /(?<=(?:[.!?]|\p{Extended_Pictographic}|\p{Emoji_Modifier}|️)\s+)(?=\S)/u;

export function withoutSentences(text: string, drop: (sentence: string) => boolean): string {
  return text
    .split(SENTENCE_END)
    .filter((sentence) => !drop(sentence))
    .join('')
    .trim();
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BANNED = BANNED_WORDS.map(
  (word) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(word)}(?:$|[^\\p{L}\\p{N}])`, 'iu'),
);

// A sentence that holds a banned word goes whole (docs/specs/questions/answer-drafts).
export function withoutBanned(text: string): string {
  return withoutSentences(text, (sentence) => BANNED.some((word) => word.test(sentence)));
}

export function flowerFor(country: ReplyBody['country']): '🪷' | '🌼' | '🌸' {
  if (country === 'VN') return '🪷';
  if (country === 'ID') return '🌼';
  return '🌸';
}

export function sameLanguage(code: string, locale: ScreenLocale): boolean {
  return code.split('-')[0].toLowerCase() === locale;
}

export function checkReplies(
  answer: ModelReplies,
  ctx: { locale: ScreenLocale; flower: string },
): ModelReplies | null {
  const same = sameLanguage(answer.reviewLanguage, ctx.locale);
  const rule: EmojiRule = answer.abusive
    ? { keep: [], flower: null }
    : { keep: answer.complaint ? ['🙏'] : ['🙏', '😊'], flower: ctx.flower };
  const clean = (text: string) => keepEmoji(endSentence(withoutBanned(text)), rule);
  const translation = (text: string | null) => {
    if (same || text === null) return null;
    const out = clean(text);
    return out === '' ? null : out;
  };
  const draft = (d: ModelReplies['short']) => ({
    text: clean(d.text),
    translation: translation(d.translation),
  });
  const short = draft(answer.short);
  const warm = draft(answer.warm);
  if (!short.text || !warm.text) return null;
  const review = same ? null : (answer.reviewTranslation?.trim() ?? null);
  return { ...answer, reviewTranslation: review || null, short, warm };
}
