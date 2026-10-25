import { z } from 'zod';
import { INSTAGRAM_CAPTION_MAX } from './edit';

// A caption read in the owner's language (docs/specs/posts/editor-download,
// "The owner's-language view"): what the browser sends, what the route
// answers, and how it fails. Only the caption goes, never the call to action.

export const TRANSLATE_LOCALES = ['id', 'vi'] as const;
export type TranslateLocale = (typeof TRANSLATE_LOCALES)[number];

export const translateBodySchema = z.object({
  text: z.string().min(1).max(INSTAGRAM_CAPTION_MAX),
  locale: z.enum(TRANSLATE_LOCALES),
});
export type TranslateBody = z.infer<typeof translateBodySchema>;

export const translateResponseSchema = z.object({
  text: z.string().trim().min(1),
  model: z.string().min(1),
  promptVersion: z.string().min(1),
});
export type TranslateResponse = z.infer<typeof translateResponseSchema>;

export const TRANSLATE_ERROR_CODES = [
  'invalid_request',
  'model_busy',
  'model_timeout',
  'model_failed',
] as const;
export type TranslateErrorCode = (typeof TRANSLATE_ERROR_CODES)[number];

export const TRANSLATE_ERROR_STATUS: Record<TranslateErrorCode, number> = {
  invalid_request: 400,
  model_busy: 503,
  model_timeout: 504,
  model_failed: 502,
};
