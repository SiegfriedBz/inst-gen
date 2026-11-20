import { isSpa } from '@/lib/posts/emoji';
import { sameLanguage, withoutBanned, withoutSentences } from '@/lib/reviews/checks';
import { type EmojiRule, endSentence, keepEmoji } from '@/lib/reviews/emoji';
import { guestScript, holdsScript } from '@/lib/reviews/script';
import { answerFlags } from './flags';
import {
  type AnswerResponse,
  type Guest,
  type ModelAnswer,
  QUESTION_LIMITS,
  type QuestionBody,
} from './question';
import { mentionsSex } from './words';

// Code builds each answer from the model's parts
// (docs/specs/questions/answer-drafts, "The answer" and "The model call"): the
// greeting, with the line on professional massage after it when the question
// mentions sex, the answer, and the call to action last on a final answer, the
// translation the same way. Null when a part it needs is empty: the route
// answers model_failed. An answer that isn't final ends on its gentle offer,
// unless the question mentions sex; 😊 and the flower, the flower last; the
// website's address in place of {website}
// (docs/specs/reviews/better-replies-and-answers).

// Which check said the question mentions sex, for the log line.
export type SexualBy = 'model' | 'words' | 'both' | null;
export type BuiltAnswer = Omit<AnswerResponse, 'model' | 'promptVersion'> & {
  sexualBy: SexualBy;
};

const detail = (value: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, QUESTION_LIMITS.detail) : null;
};

const WEBSITE = /\{+\s*website\s*\}+/i;
const WEBSITES = /\{+\s*website\s*\}+/gi;
// A placeholder code didn't fill never reaches the guest: its sentence goes.
const LEFTOVER = /\{[^{}\n]*\}/;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const sameLink = (a: string, b: string) =>
  a.replace(/\/+$/, '').toLowerCase() === b.replace(/\/+$/, '').toLowerCase();

// A link the model writes on the business's own site, with or without "www"
// or a page, becomes its address: never a page that doesn't exist. The
// booking link stays; an email address is no link.
function ownLinks(text: string, address: string, bookingUrl: string | null): string {
  let host: string;
  try {
    host = new URL(address).hostname.replace(/^www\./, '');
  } catch {
    return text;
  }
  const link = new RegExp(
    `(?<![@\\w./-])(?:https?:\\/\\/)?(?:www\\.)?${escapeRegex(host)}(?:\\/[^\\s]*)?`,
    'giu',
  );
  return text.replace(link, (match) => {
    const trailing = match.match(/[.,!?;:)]+$/u)?.[0] ?? '';
    const url = match.slice(0, match.length - trailing.length);
    if (bookingUrl && sameLink(url, bookingUrl)) return match;
    return address + trailing;
  });
}

// The model writes {website}; code puts the address there, never a page of
// the model's own. With no website, the sentence that holds it goes.
export function fillWebsite(
  text: string,
  website: string | null,
  bookingUrl: string | null = null,
): string {
  if (!website) return withoutSentences(text, (sentence) => WEBSITE.test(sentence));
  const address = website.trim().replace(/\/+$/, '');
  // A function, so a "$" in the address stays as written.
  return ownLinks(
    text.replace(WEBSITES, () => address),
    address,
    bookingUrl,
  );
}

// A detail the model gives replaces the one kept; one it leaves out stays.
export function mergeGuest(known: Guest, given: ModelAnswer['guest']): Guest {
  return {
    place: detail(given.place) ?? known.place,
    day: detail(given.day) ?? known.day,
    time: detail(given.time) ?? known.time,
  };
}

export function buildAnswer(
  model: ModelAnswer,
  { body, flower }: { body: QuestionBody; flower: string },
): BuiltAnswer | null {
  const words = mentionsSex(body.question);
  const sexualBy: SexualBy =
    model.sexual && words ? 'both' : model.sexual ? 'model' : words ? 'words' : null;
  // The line names massage: a business that isn't a spa gets none, nor the note.
  const line = sexualBy !== null && isSpa(body.business.category);
  // Each part ends on its punctuation (the model may leave a stop out).
  const clean = (text: string | null): string =>
    endSentence(
      withoutSentences(
        fillWebsite(
          withoutBanned(text ?? ''),
          body.business.website,
          body.business.contact.bookingUrl,
        ),
        (sentence) => LEFTOVER.test(sentence),
      ),
    );
  const greeting = clean(model.greeting.text);
  const answer = clean(model.answer.text);
  const professional = line ? clean(model.professionalOnly.text) : '';
  // The call to book on a final answer; else the gentle offer, unless the
  // question mentions sex.
  const cta = body.final || sexualBy === null ? clean(model.callToAction.text) : '';
  if (!greeting || (body.final && !cta) || (line && !professional) || (!answer && !line)) {
    return null;
  }
  const rule: EmojiRule = sexualBy !== null ? { keep: [], flower: null } : { keep: ['😊'], flower };
  const join = (parts: { greeting: string; professional: string; answer: string; cta: string }) =>
    keepEmoji(
      [[parts.greeting, parts.professional].filter(Boolean).join(' '), parts.answer, parts.cta]
        .filter(Boolean)
        .join('\n\n'),
      rule,
    );
  const text = join({ greeting, professional, answer, cta });
  // An answer in other letters than the guest's never reaches the owner
  // ("The guest's letters"): the route answers model_failed.
  const script = guestScript(body.question);
  if (script && !holdsScript(text, script)) return null;
  const same = sameLanguage(model.questionLanguage, body.locale);
  const translated = {
    greeting: clean(model.greeting.translation),
    professional: line ? clean(model.professionalOnly.translation) : '',
    answer: answer ? clean(model.answer.translation) : '',
    cta: cta ? clean(model.callToAction.translation) : '',
  };
  // A part without its translation leaves the owner none, rather than half.
  const whole =
    translated.greeting &&
    (!line || translated.professional) &&
    (!answer || translated.answer) &&
    (!cta || translated.cta);
  return {
    questionLanguage: model.questionLanguage,
    sexual: line,
    sexualBy,
    unanswered: model.unanswered,
    questionTranslation: same ? null : model.questionTranslation?.trim() || null,
    answer: { text, translation: !same && whole ? join(translated) : null },
    guest: mergeGuest(body.known, model.guest),
    flags: answerFlags(text, body.business),
  };
}
