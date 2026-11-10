import { z } from 'zod';
import { SCREEN_LOCALES } from '@/lib/reviews/reply';

// One answer to a guest's question (docs/specs/questions/answer-drafts, "The
// model call"): what the browser sends, what the model and the route answer,
// and how it fails. The question has lost its numbers, emails and links on the
// phone (lib/questions/scrub.ts).

export const QUESTION_LIMITS = { question: 2000, answer: 4000, detail: 200 } as const;

const detail = z.string().trim().min(1).max(QUESTION_LIMITS.detail).nullable();

// What the guest has told so far: the booking details a final answer asks for
// ("What this guest has told you").
export const guestSchema = z.object({ place: detail, day: detail, time: detail });
export type Guest = z.infer<typeof guestSchema>;
export const NO_GUEST: Guest = { place: null, day: null, time: null };

const text = (max: number) => z.string().trim().max(max);
const fact = text(300).nullable();

export const questionBodySchema = z.object({
  question: z.string().trim().min(1).max(QUESTION_LIMITS.question),
  final: z.boolean(),
  locale: z.enum(SCREEN_LOCALES),
  business: z.object({
    name: z.string().trim().min(1).max(200),
    summary: text(400).nullable(),
    category: text(200),
    offerings: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(200),
          description: text(400).optional(),
          duration: text(100).optional(),
          price: text(100).optional(),
        }),
      )
      .max(20),
    highlights: z.array(text(300)).max(8),
    hours: fact,
    town: fact,
    area: fact,
    serviceArea: text(1000).nullable(),
    contact: z.object({
      whatsapp: fact,
      phone: fact,
      email: fact,
      instagram: fact,
      bookingUrl: fact,
    }),
  }),
  country: z.enum(['VN', 'ID']).nullable(),
  known: guestSchema,
  avoid: z.string().trim().min(1).max(QUESTION_LIMITS.answer).nullable(),
});
export type QuestionBody = z.infer<typeof questionBodySchema>;

const part = z.object({ text: z.string(), translation: z.string().nullable() });

// The model writes each part on its own; code builds the answer from them. The
// call to action comes on every call, empty when the answer isn't final.
export const modelAnswerSchema = z.object({
  questionLanguage: z.string().min(2).max(20),
  sexual: z.boolean(),
  unanswered: z.boolean(),
  questionTranslation: z.string().nullable(),
  greeting: part,
  answer: part,
  professionalOnly: part,
  callToAction: part,
  guest: z.object({
    place: z.string().nullable(),
    day: z.string().nullable(),
    time: z.string().nullable(),
  }),
});
export type ModelAnswer = z.infer<typeof modelAnswerSchema>;

export const ANSWER_FLAG_KINDS = ['price', 'duration', 'number'] as const;
const flagSchema = z.object({ kind: z.enum(ANSWER_FLAG_KINDS), text: z.string().min(1) });
export type AnswerFlag = z.infer<typeof flagSchema>;

const built = z.string().trim().min(1).max(QUESTION_LIMITS.answer);

export const answerResponseSchema = z.object({
  questionLanguage: z.string().min(2).max(20),
  sexual: z.boolean(),
  unanswered: z.boolean(),
  questionTranslation: z.string().trim().min(1).nullable(),
  answer: z.object({ text: built, translation: built.nullable() }),
  guest: guestSchema,
  flags: z.array(flagSchema),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
});
export type AnswerResponse = z.infer<typeof answerResponseSchema>;

export const QUESTION_ERROR_CODES = [
  'invalid_request',
  'model_busy',
  'model_timeout',
  'model_failed',
] as const;
export type QuestionErrorCode = (typeof QUESTION_ERROR_CODES)[number];

export const QUESTION_ERROR_STATUS: Record<QuestionErrorCode, number> = {
  invalid_request: 400,
  model_busy: 503,
  model_timeout: 504,
  model_failed: 502,
};
