import { BANNED_WORDS } from '@/lib/posts/banned';
import { isSpa } from '@/lib/posts/emoji';
import { sentences } from '@/lib/posts/story';
import { FLOWER_EMOJI, noEmoji, sameLanguage } from '@/lib/reviews/checks';
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
// answers model_failed.

// Which check said the question mentions sex, for the log line.
export type SexualBy = 'model' | 'words' | 'both' | null;
export type BuiltAnswer = Omit<AnswerResponse, 'model' | 'promptVersion'> & {
  sexualBy: SexualBy;
};

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const BANNED = BANNED_WORDS.map(
  (word) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(word)}(?:$|[^\\p{L}\\p{N}])`, 'iu'),
);

// A sentence that holds a banned word goes whole.
function withoutBanned(text: string): string {
  return sentences(text)
    .filter((sentence) => !BANNED.some((word) => word.test(sentence)))
    .join('')
    .trim();
}

const detail = (value: string | null): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, QUESTION_LIMITS.detail) : null;
};

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
  const clean = (text: string | null): string => {
    const flowered = withoutBanned(text ?? '').replace(FLOWER_EMOJI, flower);
    return (sexualBy !== null ? noEmoji(flowered) : flowered).trim();
  };
  const greeting = clean(model.greeting.text);
  const answer = clean(model.answer.text);
  const professional = line ? clean(model.professionalOnly.text) : '';
  const cta = body.final ? clean(model.callToAction.text) : '';
  if (!greeting || (body.final && !cta) || (line && !professional) || (!answer && !line)) {
    return null;
  }
  const join = (parts: { greeting: string; professional: string; answer: string; cta: string }) =>
    [[parts.greeting, parts.professional].filter(Boolean).join(' '), parts.answer, parts.cta]
      .filter(Boolean)
      .join('\n\n');
  const text = join({ greeting, professional, answer, cta });
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
