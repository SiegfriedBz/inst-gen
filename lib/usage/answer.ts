import { z } from 'zod';

// What GET /api/usage answers (docs/specs/platform/usage-counters, "Reading
// what's left"). Shared with the browser.

const counts = z.object({
  reads: z.number().int().min(0),
  attempts: z.number().int().min(0),
  newImages: z.number().int().min(0),
  replies: z.number().int().min(0),
});
export type BarCounts = z.infer<typeof counts>;
export type BarAction = keyof BarCounts;
export const BAR_ACTIONS: readonly BarAction[] = ['reads', 'attempts', 'newImages', 'replies'];

export const usageAnswerSchema = z.object({
  resetsAt: z.string(),
  limited: z.boolean(),
  left: counts.optional(),
  limits: counts.optional(),
  poolEmpty: z.boolean(),
  images: z.object({ on: z.boolean(), monthFull: z.boolean(), backAt: z.string() }),
});
export type UsageAnswer = z.infer<typeof usageAnswerSchema>;
