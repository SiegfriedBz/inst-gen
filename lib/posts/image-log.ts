import type { Scene } from './batch';
import type { ImageErrorCode } from './image';

// One line in the server log per image, like the post plan's
// (lib/posts/log.ts). It never holds the image prompt
// (docs/specs/posts/generate-images, "Failures").

export type ImageLog = {
  owner: string;
  postId: string;
  scene: Scene;
  model: string;
  promptVersion: string;
  // The size the model returned, as "1536x2752"; null before it answered.
  size: string | null;
  storyBytes: number | null;
  postBytes: number | null;
  modelMs: number | null;
  totalMs: number;
  outcome: 'ok' | 'aborted' | ImageErrorCode;
  // What Google charges, estimated: IMAGE_USD once an image came back.
  usd: number;
  error?: string;
};

const ERROR_CHARS = 300;

export function formatImageLog(log: ImageLog): string {
  const fields = [
    `owner=${log.owner}`,
    `post=${log.postId}`,
    `scene=${log.scene}`,
    `model=${log.model}`,
    `prompt=${log.promptVersion}`,
    `size=${log.size ?? '-'}`,
    `story_bytes=${log.storyBytes ?? '-'}`,
    `post_bytes=${log.postBytes ?? '-'}`,
    `model_ms=${log.modelMs ?? '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
    `usd=${log.usd}`,
  ];
  if (log.error !== undefined) {
    const message = log.error.replace(/\s+/g, ' ').slice(0, ERROR_CHARS);
    fields.push(`error="${message.replaceAll('"', '\\"')}"`);
  }
  return `image ${fields.join(' ')}`;
}
