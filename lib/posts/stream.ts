import { z } from 'zod';
import { readNdjson } from '@/lib/stream/ndjson';
import {
  type PlanResult,
  POSTS_ERROR_CODES,
  type Post,
  type PostsErrorCode,
  planResultSchema,
  postSchema,
} from './batch';

// The post routes' response: one JSON object per line. A post line comes as
// each post is complete; the final line holds the checked batch.
export type PostsLine =
  | { type: 'post'; index: number; post: Post }
  | { type: 'final'; result: PlanResult }
  | { type: 'error'; code: PostsErrorCode };

const lineSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('post'), index: z.number().int().min(0), post: postSchema }),
  z.object({ type: z.literal('final'), result: planResultSchema }),
  z.object({ type: z.literal('error'), code: z.enum(POSTS_ERROR_CODES) }),
]);

export function encodePostsLine(line: PostsLine): string {
  return `${JSON.stringify(line)}\n`;
}

export function readPostsLines(body: ReadableStream<Uint8Array>): AsyncGenerator<PostsLine> {
  return readNdjson(body, (raw) => lineSchema.parse(JSON.parse(raw)) as PostsLine);
}
