import { countryOf } from '@/lib/brand/country';
import type { Profile } from '@/lib/brand/profile';
import type { ScreenLocale } from '@/lib/reviews/reply';
import { noteUsage } from '@/lib/usage/client';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';
import {
  type AnswerResponse,
  answerResponseSchema,
  type Guest,
  QUESTION_ERROR_CODES,
  type QuestionBody,
  type QuestionErrorCode,
} from './question';
import { scrubQuestion } from './scrub';

// One answer from the browser (docs/specs/questions/answer-drafts, "What leaves
// the phone" and "The model call"): the question without its numbers, emails
// and links, whether it is the final answer, the business's details, what the
// guest has told, and the answer to say differently.

export type AnswerResult =
  | { ok: true; answer: AnswerResponse }
  | { ok: false; code: QuestionErrorCode | UsageCode | 'offline' | 'signedOut' };

type Deps = { fetch: typeof fetch };

const defaultDeps = (): Deps => ({ fetch: (...args) => fetch(...args) });

function isErrorCode(value: unknown): value is QuestionErrorCode {
  return (QUESTION_ERROR_CODES as readonly unknown[]).includes(value);
}

export type AnswerInput = {
  question: string;
  final: boolean;
  locale: ScreenLocale;
  profile: Profile;
  known: Guest;
  avoid: string | null;
};

const cut = (text: string | undefined | null, max: number) =>
  text == null ? null : text.trim().slice(0, max);

export function questionBodyFor(input: AnswerInput): QuestionBody {
  const p = input.profile;
  const value = (fact: { value: string } | null | undefined, max = 300) => cut(fact?.value, max);
  return {
    question: scrubQuestion(input.question.trim()),
    final: input.final,
    locale: input.locale,
    business: {
      name: p.name.value.trim().slice(0, 200),
      summary: value(p.summary, 400),
      category: p.category.trim().slice(0, 200),
      offerings: p.offerings.slice(0, 20).map((o) => ({
        name: o.name.trim().slice(0, 200),
        ...(o.description ? { description: o.description.trim().slice(0, 400) } : {}),
        ...(o.duration ? { duration: o.duration.trim().slice(0, 100) } : {}),
        ...(o.price ? { price: o.price.trim().slice(0, 100) } : {}),
      })),
      highlights: p.highlights.slice(0, 8).map((h) => h.value.trim().slice(0, 300)),
      hours: value(p.hours),
      town: value(p.location.town),
      area: value(p.location.area),
      serviceArea: value(p.location.serviceArea, 1000),
      contact: {
        whatsapp: value(p.contact.whatsapp),
        phone: value(p.contact.phone),
        email: value(p.contact.email),
        instagram: value(p.contact.instagram),
        bookingUrl: value(p.contact.bookingUrl),
      },
    },
    country: countryOf(p),
    known: input.known,
    avoid: input.avoid,
  };
}

export async function requestAnswer(
  input: AnswerInput,
  deps: Deps = defaultDeps(),
): Promise<AnswerResult> {
  let response: Response;
  try {
    response = await deps.fetch('/api/questions/answer', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(questionBodyFor(input)),
    });
  } catch {
    return { ok: false, code: 'offline' };
  }
  // Settled: the usage bar reads again.
  noteUsage();
  if (response.status === 401) return { ok: false, code: 'signedOut' };
  try {
    const json: unknown = await response.json();
    if (!response.ok) {
      const code = json && typeof json === 'object' ? (json as { error?: unknown }).error : null;
      return { ok: false, code: isErrorCode(code) || isUsageCode(code) ? code : 'model_failed' };
    }
    return { ok: true, answer: answerResponseSchema.parse(json) };
  } catch {
    return { ok: false, code: 'model_failed' };
  }
}
