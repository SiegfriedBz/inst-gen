import type { ModelReplies, ReplyBody, ScreenLocale } from './reply';

// What code makes sure of in the model's replies
// (docs/specs/reviews/reply-drafts, "The replies"): the business's own
// flower, no emoji on an abusive review, and no translation into the
// language the review is already in.

const FLOWERS = /🌸|🌺|🌷|🌹|💮|🪷|🌼|🏵️?/gu;
const EMOJI = /\p{Extended_Pictographic}️?|‍|️/gu;

export function flowerFor(country: ReplyBody['country']): '🪷' | '🌼' | '🌸' {
  if (country === 'VN') return '🪷';
  if (country === 'ID') return '🌼';
  return '🌸';
}

export function sameLanguage(code: string, locale: ScreenLocale): boolean {
  return code.split('-')[0].toLowerCase() === locale;
}

function noEmoji(text: string): string {
  return text
    .replace(EMOJI, '')
    .replace(/ +([,.!?])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .trim();
}

export function checkReplies(
  answer: ModelReplies,
  ctx: { locale: ScreenLocale; flower: string },
): ModelReplies | null {
  const same = sameLanguage(answer.reviewLanguage, ctx.locale);
  const clean = (text: string) => {
    const flowered = text.replace(FLOWERS, ctx.flower);
    return (answer.abusive ? noEmoji(flowered) : flowered).trim();
  };
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
