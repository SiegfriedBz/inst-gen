import { z } from 'zod';
import { POSTS_LIMITS, SCENES } from './batch';

// One post's image (docs/specs/posts/generate-images): what the browser asks
// for, what the route answers, and how it fails.

const text = z.string().min(1);

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean).length;

export const imageBodySchema = z.object({
  postId: text,
  imagePrompt: text.refine((value) => words(value) <= POSTS_LIMITS.imagePromptWords, {
    message: `at most ${POSTS_LIMITS.imagePromptWords} words`,
  }),
  scene: z.enum(SCENES),
});
export type ImageBody = z.infer<typeof imageBodySchema>;

export const imageResponseSchema = z.object({
  postId: text,
  story: z.base64(),
  post: z.base64(),
  model: text,
  promptVersion: text,
  ms: z.number().int().min(0),
});
export type ImageResponse = z.infer<typeof imageResponseSchema>;

export const IMAGE_ERROR_CODES = [
  'invalid_request',
  'images_off',
  'images_paused',
  'image_blocked',
  'image_timeout',
  'image_failed',
] as const;
export type ImageErrorCode = (typeof IMAGE_ERROR_CODES)[number];

export const IMAGE_ERROR_STATUS: Record<ImageErrorCode, number> = {
  invalid_request: 400,
  images_off: 403,
  images_paused: 503,
  image_blocked: 502,
  image_timeout: 504,
  image_failed: 502,
};

export const IMAGE_SIZES = {
  story: { width: 1080, height: 1920 },
  post: { width: 1080, height: 1350 },
} as const;
