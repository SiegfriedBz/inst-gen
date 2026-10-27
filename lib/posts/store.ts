import { openStore } from '@/lib/brand/store';
import { batchSchema, POSTS_LIMITS, type PostBatch, type RecentPost } from './batch';

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
  // The text copied before held the old number: it's no longer what's on screen.
  const updated = raw.map((batch) => ({
    ...batch,
    posts: batch.posts.map(({ copiedAt: _copied, ...post }) => ({ ...post, cta })),
  }));
  await Promise.all(updated.map((batch) => tx.store.put(batch)));
  await tx.done;
  return updated.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

// What came before the owner's day (docs/specs/posts/suggestions): the images
// and translations go; the newest records holding up to `recent` posts stay,
// only so new attempts don't repeat their topics; older records go.
export async function clearBefore(ownerId: string, start: Date): Promise<void> {
  const db = await openStore();
  if (!db) return;
  const tx = db.transaction(['posts', 'images', 'translations'], 'readwrite');
  const old = ((await tx.objectStore('posts').index('ownerId').getAll(ownerId)) as PostBatch[])
    .filter((batch) => new Date(batch.createdAt) < start)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (old.length === 0) {
    await tx.done;
    return;
  }
  const oldIds = new Set(old.map((batch) => batch.id));
  let topics = 0;
  for (const batch of old) {
    if (topics >= POSTS_LIMITS.recent) await tx.objectStore('posts').delete(batch.id);
    topics += batch.posts.length;
  }
  for (const name of ['images', 'translations'] as const) {
    const store = tx.objectStore(name);
    for (const record of await store.index('ownerId').getAll(ownerId)) {
      if (oldIds.has(record.batchId)) {
        await store.delete(
          name === 'images'
            ? [record.batchId, record.postId]
            : [record.batchId, record.postId, (record as { locale: string }).locale],
        );
      }
    }
  }
  await tx.done;
}
