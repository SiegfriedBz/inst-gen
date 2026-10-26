import { z } from 'zod';
import { openStore } from '@/lib/brand/store';
import { dayStart } from '@/lib/posts/day';
import { REPLY_LIMITS, replyResponseSchema, SCREEN_LOCALES } from './reply';

// The current review and its replies, kept on the phone so a trip to Google
// Maps never loses them (docs/specs/reviews/reply-drafts, "Kept until a new
// review or 3am", and docs/specs/platform/one-daily-reset): one record per
// owner, gone at Google's reset, midnight Pacific.
// Without IndexedDB nothing is kept.

const edit = z.string().max(REPLY_LIMITS.reply).nullable();

export const reviewRecordSchema = z.object({
  ownerId: z.string().min(1),
  name: z.string().max(REPLY_LIMITS.name),
  review: z.string().min(1).max(REPLY_LIMITS.review),
  // The screen's language the translations were made in.
  locale: z.enum(SCREEN_LOCALES),
  // The model's replies, with `{name}`; the name is put in when shown.
  answer: replyResponseSchema,
  edits: z.object({ short: edit, warm: edit }),
  createdAt: z.iso.datetime(),
});
export type ReviewRecord = z.infer<typeof reviewRecordSchema>;

export async function saveReview(record: ReviewRecord): Promise<void> {
  const db = await openStore();
  await db?.put('reviews', record);
}

export async function clearReview(ownerId: string): Promise<void> {
  const db = await openStore();
  await db?.delete('reviews', ownerId);
}

// A record from before today's reset, or one that no longer fits, is deleted.
export async function loadReview(ownerId: string, now: Date): Promise<ReviewRecord | null> {
  const db = await openStore();
  if (!db) return null;
  const parsed = reviewRecordSchema.safeParse(await db.get('reviews', ownerId));
  if (parsed.success && new Date(parsed.data.createdAt) >= dayStart(now)) return parsed.data;
  await db.delete('reviews', ownerId);
  return null;
}
