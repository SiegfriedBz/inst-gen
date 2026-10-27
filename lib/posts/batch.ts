import { z } from 'zod';
import { type Profile, profileSchema } from '@/lib/brand/profile';
import { type Offer, offerFits, offerSchema } from './offer';
import { SCENES } from './scene';
import { setupSchema } from './setup';

// A batch of posts made from the brand profile
// (docs/specs/posts/generate-copy/spec.md). One set of schemas serves the
// model's answer, the routes' bodies and lines, and the phone's store.

export const POST_TYPES = ['offer', 'moment', 'local', 'ritual', 'tip', 'proof'] as const;
export type PostType = (typeof POST_TYPES)[number];

export { SCENES, type Scene } from './scene';

export const POSTS_LIMITS = {
  posts: 6,
  perType: 2,
  perScene: 2,
  firstLineChars: 125,
  captionMin: 250,
  captionMax: 700,
  hashtagsMin: 3,
  hashtags: 5,
  altTextChars: 125,
  imagePromptWords: 80,
  topicWords: 12,
  recent: 12,
} as const;

const text = z.string().min(1);

// What code flagged in a caption, for the owner to check before posting.
export const FLAG_KINDS = ['price', 'duration', 'banned', 'firstLine', 'offer'] as const;
const flagSchema = z.object({ kind: z.enum(FLAG_KINDS), text: z.string() });
export type Flag = z.infer<typeof flagSchema>;

const droppedSchema = z.object({ field: text, reason: text });
export type Dropped = z.infer<typeof droppedSchema>;

// A cleaned hashtag: letters with their accents and digits, no `#`.
export const HASHTAG = /^[\p{L}\p{M}\p{N}]+$/u;

export const postSchema = z.object({
  id: text,
  type: z.enum(POST_TYPES),
  topic: text,
  scene: z.enum(SCENES),
  caption: text,
  cta: z.string(),
  hashtags: z.array(z.string().regex(HASHTAG)).max(POSTS_LIMITS.hashtags),
  altText: z.string().max(POSTS_LIMITS.altTextChars),
  imagePrompt: text,
  unchecked: z.array(flagSchema),
  // The owner's editor (docs/specs/posts/editor-download). Absent on posts
  // saved before it: not edited, nothing to check, the batch's profileHash.
  edited: z.boolean().optional(),
  altToCheck: z.boolean().optional(),
  profileHash: z.string().optional(),
  // When the owner saved its two images and copied its text, today
  // (docs/specs/platform/friendlier-home, "Saved and copied"). Absent on
  // posts saved before it.
  savedAt: z.iso.datetime().optional(),
  copiedAt: z.iso.datetime().optional(),
  // One of the two posts that carry the batch's special offer
  // (docs/specs/posts/special-offer). Absent on every other post.
  offer: z.literal(true).optional(),
  // What code set up for its image (docs/specs/posts/varied-images). Absent
  // on posts saved before it.
  setup: setupSchema.optional(),
});
export type Post = z.infer<typeof postSchema>;

// What a route's final line carries.
export const planResultSchema = z.object({
  posts: z.array(postSchema).max(POSTS_LIMITS.posts),
  dropped: z.array(droppedSchema),
  promptVersion: text,
  model: text,
  profileHash: text,
  // The special offer the batch was made with, if any.
  offer: offerSchema.optional(),
});
export type PlanResult = z.infer<typeof planResultSchema>;

export const batchSchema = planResultSchema.extend({
  id: text,
  ownerId: text,
  createdAt: z.iso.datetime(),
  profileReadAt: z.iso.datetime(),
});
export type PostBatch = z.infer<typeof batchSchema>;

// What the model fills in: no limits, as for the brand read; code checks it
// (lib/posts/checks.ts).
const loose = z.string();

export const modelPostPlanSchema = z.object({
  posts: z.array(
    z.object({
      type: loose,
      topic: loose,
      scene: loose,
      caption: loose,
      hashtags: z.array(loose),
      altText: loose,
      imagePrompt: loose,
    }),
  ),
});
export type ModelPostPlan = z.infer<typeof modelPostPlanSchema>;
export type ModelPost = ModelPostPlan['posts'][number];

export const modelRewriteSchema = z.object({
  posts: z.array(z.object({ id: loose, caption: loose, hashtags: z.array(loose), altText: loose })),
});
export type ModelRewrite = z.infer<typeof modelRewriteSchema>;

const recentSchema = z.object({ type: z.enum(POST_TYPES), topic: text });
export type RecentPost = z.infer<typeof recentSchema>;

// An offer names only the profile's treatments (docs/specs/posts/special-offer).
const offerFitsProfile = (body: { profile: Profile; offer?: Offer }) =>
  !body.offer || offerFits(body.offer, body.profile);
const OFFER_UNKNOWN = { message: 'the offer names an unknown treatment', path: ['offer'] };

export const planBodySchema = z
  .object({
    profile: profileSchema,
    recent: z.array(recentSchema).max(POSTS_LIMITS.recent),
    offer: offerSchema.optional(),
  })
  .refine(offerFitsProfile, OFFER_UNKNOWN);
export type PlanBody = z.infer<typeof planBodySchema>;

// Whole posts, so a post the model leaves out keeps what it had.
export const rewriteBodySchema = z
  .object({
    profile: profileSchema,
    posts: z.array(postSchema).min(1).max(POSTS_LIMITS.posts),
    offer: offerSchema.optional(),
  })
  .refine(offerFitsProfile, OFFER_UNKNOWN);
export type RewriteBody = z.infer<typeof rewriteBodySchema>;

export const POSTS_ERROR_CODES = [
  'invalid_profile',
  'model_busy',
  'model_timeout',
  'model_failed',
] as const;
export type PostsErrorCode = (typeof POSTS_ERROR_CODES)[number];

export const POSTS_ERROR_STATUS: Record<PostsErrorCode, number> = {
  invalid_profile: 400,
  model_busy: 503,
  model_timeout: 504,
  model_failed: 502,
};
