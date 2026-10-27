import type { Post, PostBatch } from './batch';

// What the owner already did with a suggestion today
// (docs/specs/platform/friendlier-home, "Saved and copied"): saved its two
// images, copied its text. It says what happened in Shopfront, never whether
// the owner posted.

export type TakenStep = 'saved' | 'copied';

export function markTaken(
  batch: PostBatch,
  postId: string,
  step: TakenStep,
  at: string,
): PostBatch {
  const key = step === 'saved' ? 'savedAt' : 'copiedAt';
  return {
    ...batch,
    posts: batch.posts.map((post) => (post.id === postId ? { ...post, [key]: at } : post)),
  };
}

// Both steps with images; the text alone without them.
export function takenLabel(post: Post, imagesOn: boolean): 'savedAndCopied' | 'copied' | null {
  if (!imagesOn) return post.copiedAt ? 'copied' : null;
  return post.savedAt && post.copiedAt ? 'savedAndCopied' : null;
}
