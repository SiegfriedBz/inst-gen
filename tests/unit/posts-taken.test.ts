import { describe, expect, test } from 'vitest';
import { batchSchema, type PostBatch } from '@/lib/posts/batch';
import { markTaken, takenLabel } from '@/lib/posts/taken';
import { post } from './helpers/posts';

const NOW = '2026-10-27T10:00:00.000Z';
const LATER = '2026-10-27T10:01:00.000Z';

function batchOf(...posts: ReturnType<typeof post>[]): PostBatch {
  return {
    id: 'b1',
    ownerId: 'sen',
    createdAt: '2026-10-27T09:00:00.000Z',
    profileReadAt: '2026-10-26T09:00:00.000Z',
    profileHash: 'h',
    promptVersion: 'posts-1',
    model: 'gemini-3.5-flash-lite',
    posts,
    dropped: [],
  };
}

describe('saved and copied', () => {
  test('both steps, in either order, make "savedAndCopied"', () => {
    let b = batchOf(post({ id: 'p1' }));
    b = markTaken(b, 'p1', 'copied', NOW);
    expect(takenLabel(b.posts[0], true)).toBeNull();
    b = markTaken(b, 'p1', 'saved', LATER);
    expect(takenLabel(b.posts[0], true)).toBe('savedAndCopied');
    expect(b.posts[0]).toMatchObject({ copiedAt: NOW, savedAt: LATER });

    let c = batchOf(post({ id: 'p1' }));
    c = markTaken(c, 'p1', 'saved', NOW);
    expect(takenLabel(c.posts[0], true)).toBeNull();
    c = markTaken(c, 'p1', 'copied', LATER);
    expect(takenLabel(c.posts[0], true)).toBe('savedAndCopied');
  });

  test('without images, copied alone is "copied"', () => {
    const b = markTaken(batchOf(post({ id: 'p1' })), 'p1', 'copied', NOW);
    expect(takenLabel(b.posts[0], false)).toBe('copied');
    expect(takenLabel(post(), false)).toBeNull();
  });

  test('only the named post changes', () => {
    const b = markTaken(batchOf(post({ id: 'p1' }), post({ id: 'p2' })), 'p1', 'copied', NOW);
    expect(b.posts[0].copiedAt).toBe(NOW);
    expect(b.posts[1].copiedAt).toBeUndefined();
  });

  test('a batch saved before this item still parses, and a marked one too', () => {
    expect(batchSchema.safeParse(batchOf(post())).success).toBe(true);
    const marked = markTaken(batchOf(post({ id: 'p1' })), 'p1', 'saved', NOW);
    expect(batchSchema.parse(marked).posts[0].savedAt).toBe(NOW);
  });
});
