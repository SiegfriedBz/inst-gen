import type { Profile } from '@/lib/brand/profile';
import { openStore } from '@/lib/brand/store';
import { batchSchema, POSTS_LIMITS, type PostBatch, type RecentPost } from './batch';
import { profileHash } from './input';

// Batches of posts kept on the phone (docs/specs/posts/generate-copy, "On the
// phone"), in the brand's database. Without IndexedDB nothing is kept.

export async function saveBatch(batch: PostBatch): Promise<void> {
  const db = await openStore();
  await db?.put('posts', batchSchema.parse(batch));
}

// Newest first; a record that no longer fits the schema is left out.
export async function loadBatches(ownerId: string): Promise<PostBatch[]> {
  const db = await openStore();
  if (!db) return [];
  const raw = await db.getAllFromIndex('posts', 'ownerId', ownerId);
  const batches = raw.flatMap((record) => {
    const parsed = batchSchema.safeParse(record);
    return parsed.success ? [parsed.data] : [];
  });
  return batches.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// What a new batch must not repeat: the newest posts, newest batch first.
export function recentPosts(batches: PostBatch[]): RecentPost[] {
  return batches
    .flatMap((batch) => batch.posts.map(({ type, topic }) => ({ type, topic })))
    .slice(0, POSTS_LIMITS.recent);
}

// Sets the call to action on every post the owner has, in one transaction:
// a WhatsApp edit needs no model call. Returns the batches, newest first.
export async function applyCta(ownerId: string, cta: string): Promise<PostBatch[]> {
  const db = await openStore();
  if (!db) return [];
  const tx = db.transaction('posts', 'readwrite');
  const raw = await tx.store.index('ownerId').getAll(ownerId);
  const updated = raw.map((batch) => ({
    ...batch,
    posts: batch.posts.map((post) => ({ ...post, cta })),
  }));
  await Promise.all(updated.map((batch) => tx.store.put(batch)));
  await tx.done;
  return updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function isStale(batch: PostBatch, profile: Profile): boolean {
  return batch.profileHash !== profileHash(profile);
}
