import type { Profile } from '@/lib/brand/profile';
import type { Flag, PlanResult, Post, PostBatch } from './batch';
import { cleanHashtags, findFlags } from './checks';
import { profileHash } from './input';

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
export function applyEdit(post: Post, edit: PostEdit, profile: Profile): Post {
  const caption = edit.caption.trim();
  return {
    ...post,
    caption,
    hashtags: parseHashtags(edit.hashtags),
    altText: edit.altText.trim(),
    unchecked: findFlags(caption, profile),
    edited: true,
    altToCheck: false,
    profileHash: profileHash(profile),
  };
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

// An edited post that is out of date is checked against today's details,
// with no call.
export function flagsFor(post: Post, batch: PostBatch, profile: Profile): Flag[] {
  return post.edited && isPostStale(post, batch, profile)
    ? findFlags(post.caption, profile)
    : post.unchecked;
}

// A rewrite's answer for the posts sent; the others keep their words and the
// profile they were written against.
export function mergeRewrite(batch: PostBatch, result: PlanResult, sentIds: string[]): PostBatch {
  const answers = new Map(result.posts.map((post) => [post.id, post]));
  const posts = batch.posts.map((post) => {
    const answer = sentIds.includes(post.id) ? answers.get(post.id) : undefined;
    if (!answer) return { ...post, profileHash: postHash(post, batch) };
    return { ...answer, edited: false, profileHash: result.profileHash };
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
    posts: batch.posts.map((post) => (post.id === postId ? { ...post, altToCheck: true } : post)),
  };
}
