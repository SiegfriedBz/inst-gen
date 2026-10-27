import type { Profile } from '@/lib/brand/profile';
import type { Flag, PlanResult, Post, PostBatch } from './batch';
import { cleanHashtags, findFlags, type OfferContext } from './checks';
import { profileHash } from './input';
import type { Offer } from './offer';

// The owner's edits to a post, and which posts a change to the business
// details leaves out of date (docs/specs/posts/editor-download, "Editing a
// post" and "'Update captions' and edited posts").

// Instagram's limit for caption, call to action and hashtags together.
export const INSTAGRAM_CAPTION_MAX = 2200;

export type PostEdit = { caption: string; hashtags: string; altText: string };

// Hashtags as the owner types them: `#danang massage`, `danang, massage`.
export function parseHashtags(text: string): string[] {
  return cleanHashtags(text.split(/[\s,]+/));
}

// What gets posted under the image, in Instagram's order.
export function postText(post: Pick<Post, 'caption' | 'hashtags'>, cta: string): string {
  const tags = post.hashtags.map((tag) => `#${tag}`).join(' ');
  return [post.caption, cta, tags].filter(Boolean).join('\n\n');
}

export function charsOver(edit: PostEdit, cta: string): number {
  const length = postText(
    { caption: edit.caption.trim(), hashtags: parseHashtags(edit.hashtags) },
    cta,
  ).length;
  return Math.max(0, length - INSTAGRAM_CAPTION_MAX);
}

// The owner's words, kept whole: no cut at 700 characters. Saving stamps
// today's profile, since the owner has just read the post against it.
export function applyEdit(post: Post, edit: PostEdit, profile: Profile, offer?: Offer): Post {
  const caption = edit.caption.trim();
  // The text copied before is no longer the text on screen.
  const { copiedAt: _copied, ...rest } = post;
  return {
    ...rest,
    caption,
    hashtags: parseHashtags(edit.hashtags),
    altText: edit.altText.trim(),
    unchecked: findFlags(caption, profile, offerContext(post, offer)),
    // The story text stays, but is checked against today's profile too
    // (docs/specs/posts/story-text).
    ...(post.storyText
      ? { storyUnchecked: findFlags(post.storyText, profile, offerContext(post, offer)) }
      : {}),
    edited: true,
    altToCheck: false,
    profileHash: profileHash(profile),
  };
}

// A post is checked against its batch's offer, if the batch has one.
function offerContext(post: Post, offer?: Offer): OfferContext | undefined {
  return offer ? { offer, carries: post.offer === true } : undefined;
}

export function postHash(post: Post, batch: PostBatch): string {
  return post.profileHash ?? batch.profileHash;
}

export function isPostStale(post: Post, batch: PostBatch, profile: Profile): boolean {
  return postHash(post, batch) !== profileHash(profile);
}

// What "Update captions" sends: the out-of-date posts the owner didn't edit.
export function staleUnedited(batch: PostBatch, profile: Profile): Post[] {
  return batch.posts.filter((post) => !post.edited && isPostStale(post, batch, profile));
}

// An out-of-date post is checked against today's details, with no call: in
// the newest batch only an edited one, since the others are about to be
// rewritten; in an older batch, which nothing rewrites, every one
// (docs/specs/platform/home-tabs).
export function flagsFor(post: Post, batch: PostBatch, profile: Profile, newest = true): Flag[] {
  return (post.edited || !newest) && isPostStale(post, batch, profile)
    ? findFlags(post.caption, profile, offerContext(post, batch.offer))
    : post.unchecked;
}

// The story text's flags, checked the same way (docs/specs/posts/story-text).
export function storyFlagsFor(
  post: Post,
  batch: PostBatch,
  profile: Profile,
  newest = true,
): Flag[] {
  if (!post.storyText) return [];
  return (post.edited || !newest) && isPostStale(post, batch, profile)
    ? findFlags(post.storyText, profile, offerContext(post, batch.offer))
    : (post.storyUnchecked ?? []);
}

// The batch made last. A rewrite moves its batch to the top of the list, so
// the list's order doesn't tell.
export function newestBatch(batches: PostBatch[]): PostBatch | undefined {
  return batches.reduce<PostBatch | undefined>(
    (newest, batch) => (!newest || batch.createdAt > newest.createdAt ? batch : newest),
    undefined,
  );
}

// What the posts section rewrites by itself after a business edit: the newest
// batch's out-of-date posts the owner didn't edit (docs/specs/platform/home-tabs).
export function autoRewrite(
  batches: PostBatch[],
  profile: Profile,
): { batch: PostBatch; postIds: string[] } | null {
  const batch = newestBatch(batches);
  if (!batch) return null;
  const postIds = staleUnedited(batch, profile).map((post) => post.id);
  return postIds.length > 0 ? { batch, postIds } : null;
}

// A rewrite's answer for the posts sent; the others keep their words and the
// profile they were written against.
export function mergeRewrite(batch: PostBatch, result: PlanResult, sentIds: string[]): PostBatch {
  const answers = new Map(result.posts.map((post) => [post.id, post]));
  const posts = batch.posts.map((post) => {
    const answer = sentIds.includes(post.id) ? answers.get(post.id) : undefined;
    if (!answer) return { ...post, profileHash: postHash(post, batch) };
    // New words, same image: what was copied goes, what was saved stays.
    const saved = post.savedAt ? { savedAt: post.savedAt } : {};
    return { ...answer, ...saved, edited: false, profileHash: result.profileHash };
  });
  return {
    ...batch,
    posts,
    dropped: result.dropped,
    promptVersion: result.promptVersion,
    model: result.model,
    profileHash: result.profileHash,
  };
}

export function markNewImage(batch: PostBatch, postId: string): PostBatch {
  return {
    ...batch,
    posts: batch.posts.map((post) => {
      if (post.id !== postId) return post;
      // The images saved before are no longer the ones on screen.
      const { savedAt: _saved, ...rest } = post;
      return { ...rest, altToCheck: true };
    }),
  };
}
