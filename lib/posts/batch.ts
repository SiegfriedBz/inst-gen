import { z } from 'zod';
import { profileSchema } from '@/lib/brand/profile';

// A batch of posts made from the brand profile
// (docs/specs/posts/generate-copy/spec.md). One set of schemas serves the
// model's answer, the routes' bodies and lines, and the phone's store.

export const POST_TYPES = ['offer', 'moment', 'local', 'ritual', 'tip', 'proof'] as const;
export type PostType = (typeof POST_TYPES)[number];

export const SCENES = ['treatment', 'detail', 'place', 'guest'] as const;
export type Scene = (typeof SCENES)[number];

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
export const FLAG_KINDS = ['price', 'duration', 'banned', 'firstLine'] as const;
const flagSchema = z.object({ kind: z.enum(FLAG_KINDS), text: z.string() });
export type Flag = z.infer<typeof flagSchema>;

const droppedSchema = z.object({ field: text, reason: text });
export type Dropped = z.infer<typeof droppedSchema>;

export const postSchema = z.object({
  id: text,
  type: z.enum(POST_TYPES),
  topic: text,
  scene: z.enum(SCENES),
  caption: text,
  cta: z.string(),
  hashtags: z.array(z.string().regex(/^[a-z0-9]+$/)).max(POSTS_LIMITS.hashtags),
  altText: z.string().max(POSTS_LIMITS.altTextChars),
  imagePrompt: text,
  unchecked: z.array(flagSchema),
});
export type Post = z.infer<typeof postSchema>;

// What a route's final line carries.
export const planResultSchema = z.object({
  posts: z.array(postSchema).max(POSTS_LIMITS.posts),
  dropped: z.array(droppedSchema),
  promptVersion: text,
  model: text,
  profileHash: text,
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

export const planBodySchema = z.object({
  profile: profileSchema,
  recent: z.array(recentSchema).max(POSTS_LIMITS.recent),
});
export type PlanBody = z.infer<typeof planBodySchema>;

// Whole posts, so a post the model leaves out keeps what it had.
export const rewriteBodySchema = z.object({
  profile: profileSchema,
  posts: z.array(postSchema).min(1).max(POSTS_LIMITS.posts),
});
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
