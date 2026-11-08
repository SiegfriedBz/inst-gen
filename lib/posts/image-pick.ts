import type { PostBatch } from './batch';
import type { Light } from './setup';

// The posts of an attempt that get their first image
// (docs/specs/posts/two-images, "Which two suggestions get an image"): the
// posts that carry the special offer; then a day and a night; then the first
// posts left. The same attempt always gives the same posts.

export const IMAGES_PER_ATTEMPT = 2;

export function imagePosts(batch: Pick<PostBatch, 'posts'>): string[] {
  const { posts } = batch;
  // A post saved without a set-up, or a set-up without a light, is a day.
  const lightOf = (i: number): Light => posts[i].setup?.light ?? 'day';
  const picked = new Set<number>();
  const pick = (i: number) => {
    if (picked.size < IMAGES_PER_ATTEMPT) picked.add(i);
  };

  posts.forEach((post, i) => {
    if (post.offer) pick(i);
  });
  for (const light of ['day', 'night'] as const) {
    const had = [...picked].some((i) => lightOf(i) === light);
    const first = posts.findIndex((_, i) => !picked.has(i) && lightOf(i) === light);
    if (!had && first !== -1) pick(first);
  }
  posts.forEach((_, i) => {
    pick(i);
  });

  return [...picked].sort((a, b) => a - b).map((i) => posts[i].id);
}
