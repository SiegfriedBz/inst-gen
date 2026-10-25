import { describe, expect, it } from 'vitest';
import { batchSchema, type Post } from '@/lib/posts/batch';
import { post } from './helpers/posts';

function batch(posts: Post[]) {
  return {
    id: 'b1',
    ownerId: 'svarga',
    createdAt: '2026-10-25T09:00:00.000Z',
    profileReadAt: '2026-10-24T09:00:00.000Z',
    profileHash: '0a1b2c3d',
    promptVersion: 'posts-1',
    model: 'gemini-3.5-flash-lite',
    posts,
    dropped: [],
  };
}

describe('batchSchema', () => {
  it('accepts a six-post batch', () => {
    const posts = Array.from({ length: 6 }, (_, i) => post({ id: `p${i}` }));
    expect(batchSchema.safeParse(batch(posts)).success).toBe(true);
  });

  it('keeps the editor fields', () => {
    const edited = post({ edited: true, altToCheck: true, profileHash: 'h1' });
    const parsed = batchSchema.parse(batch([edited]));
    expect(parsed.posts[0]).toMatchObject({ edited: true, altToCheck: true, profileHash: 'h1' });
  });

  it('refuses a hashtag with "#"', () => {
    expect(batchSchema.safeParse(batch([post({ hashtags: ['#canggu'] })])).success).toBe(false);
  });
});
