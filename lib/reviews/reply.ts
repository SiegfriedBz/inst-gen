import { z } from 'zod';

// Two replies to a Google Maps review (docs/specs/reviews/reply-drafts, "The
// model call"): what the browser sends, what the model and the route answer,
// and how it fails. The guest's name never travels: only whether there is one.

export const REPLY_LIMITS = { name: 60, review: 4000, reply: 4000 } as const;

export const SCREEN_LOCALES = ['en', 'id', 'vi'] as const;
export type ScreenLocale = (typeof SCREEN_LOCALES)[number];

const reply = z.string().trim().min(1).max(REPLY_LIMITS.reply);

export const replyBodySchema = z.object({
  review: z.string().trim().min(1).max(REPLY_LIMITS.review),
  hasName: z.boolean(),
  locale: z.enum(SCREEN_LOCALES),
  business: z.object({
    name: z.string().trim().min(1).max(200),
    summary: z.string().max(400).nullable(),
  }),
  country: z.enum(['VN', 'ID']).nullable(),
  avoid: z.tuple([reply, reply]).nullable(),
});
export type ReplyBody = z.infer<typeof replyBodySchema>;

const draft = z.object({ text: z.string(), translation: z.string().nullable() });

export const modelRepliesSchema = z.object({
  reviewLanguage: z.string().min(2).max(20),
  abusive: z.boolean(),
  reviewTranslation: z.string().nullable(),
  short: draft,
  warm: draft,
});
export type ModelReplies = z.infer<typeof modelRepliesSchema>;

const checkedDraft = z.object({ text: reply, translation: reply.nullable() });

export const replyResponseSchema = z.object({
  reviewLanguage: z.string().min(2).max(20),
  abusive: z.boolean(),
  reviewTranslation: z.string().trim().min(1).nullable(),
  short: checkedDraft,
  warm: checkedDraft,
  model: z.string().min(1),
  promptVersion: z.string().min(1),
});
export type ReplyResponse = z.infer<typeof replyResponseSchema>;

export const REPLY_ERROR_CODES = [
  'invalid_request',
  'model_busy',
  'model_timeout',
  'model_failed',
] as const;
export type ReplyErrorCode = (typeof REPLY_ERROR_CODES)[number];

export const REPLY_ERROR_STATUS: Record<ReplyErrorCode, number> = {
  invalid_request: 400,
  model_busy: 503,
  model_timeout: 504,
  model_failed: 502,
};
