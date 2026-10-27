import { z } from 'zod';
import type { Profile } from '@/lib/brand/profile';
import { openStore } from '@/lib/brand/store';
import { dayStart } from './day';
import { type OfferAnswers, offerSchema, pruneOffer } from './offer';

// Today's special offer, kept on the phone for the owner until Google's
// reset, like the review draft (docs/specs/posts/special-offer, "How long it
// lasts"): one record per owner, with the sheet's answers so it reopens on
// them. Without IndexedDB nothing is kept.

const answersSchema = z.object({
  kind: z.enum(['discount', 'freeExtra']),
  percent: z.number(),
  gift: z.string().nullable(),
  treatments: z.array(z.string()),
  length: z.enum(['today', '3days', '1week']),
}) satisfies z.ZodType<OfferAnswers>;

export const offerRecordSchema = z.object({
  ownerId: z.string().min(1),
  answers: answersSchema,
  offer: offerSchema,
  createdAt: z.iso.datetime(),
});
export type OfferRecord = z.infer<typeof offerRecordSchema>;

export async function saveOffer(record: OfferRecord): Promise<void> {
  const db = await openStore();
  await db?.put('offers', record);
}

export async function clearOffer(ownerId: string): Promise<void> {
  const db = await openStore();
  await db?.delete('offers', ownerId);
}

// A record from before today's reset, one that no longer fits, or one whose
// treatments all left the business is deleted; names that left are dropped.
export async function loadOffer(
  ownerId: string,
  profile: Profile,
  now: Date,
): Promise<OfferRecord | null> {
  const db = await openStore();
  if (!db) return null;
  const parsed = offerRecordSchema.safeParse(await db.get('offers', ownerId));
  const today = parsed.success && new Date(parsed.data.createdAt) >= dayStart(now);
  const offer = today ? pruneOffer(parsed.data.offer, profile) : null;
  if (!parsed.success || !offer) {
    await db.delete('offers', ownerId);
    return null;
  }
  if (offer.treatments.length === parsed.data.offer.treatments.length) return parsed.data;
  const kept = new Set(offer.treatments);
  const record = {
    ...parsed.data,
    offer,
    answers: {
      ...parsed.data.answers,
      treatments: parsed.data.answers.treatments.filter((t) => kept.has(t)),
    },
  };
  await db.put('offers', record);
  return record;
}
