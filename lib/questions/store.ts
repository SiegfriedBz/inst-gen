import { z } from 'zod';
import { openStore } from '@/lib/brand/store';
import { dayStart } from '@/lib/posts/day';
import { SCREEN_LOCALES } from '@/lib/reviews/reply';
import { answerResponseSchema, guestSchema, QUESTION_LIMITS } from './question';

// The current conversation, kept on the phone so a trip to the chat never loses
// it (docs/specs/questions/answer-drafts, "Kept until a new conversation or the
// daily reset"): what the guest has told, and the current question with its
// answer. One record per owner, gone at Google's reset, as the review is.
// Without IndexedDB nothing is kept.

export const conversationRecordSchema = z.object({
  ownerId: z.string().min(1),
  known: guestSchema,
  current: z
    .object({
      question: z.string().min(1).max(QUESTION_LIMITS.question),
      final: z.boolean(),
      // The screen's language the translations were made in.
      locale: z.enum(SCREEN_LOCALES),
      answer: answerResponseSchema,
      edit: z.string().max(QUESTION_LIMITS.answer).nullable(),
      createdAt: z.iso.datetime(),
    })
    .nullable(),
  updatedAt: z.iso.datetime(),
});
export type ConversationRecord = z.infer<typeof conversationRecordSchema>;

export async function saveConversation(record: ConversationRecord): Promise<void> {
  const db = await openStore();
  await db?.put('questions', record);
}

export async function clearConversation(ownerId: string): Promise<void> {
  const db = await openStore();
  await db?.delete('questions', ownerId);
}

// A record from before today's reset, or one that no longer fits, is deleted.
export async function loadConversation(
  ownerId: string,
  now: Date,
): Promise<ConversationRecord | null> {
  const db = await openStore();
  if (!db) return null;
  const parsed = conversationRecordSchema.safeParse(await db.get('questions', ownerId));
  if (parsed.success && new Date(parsed.data.updatedAt) >= dayStart(now)) return parsed.data;
  await db.delete('questions', ownerId);
  return null;
}
