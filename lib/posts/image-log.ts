import type { Scene } from './batch';
import type { ImageErrorCode } from './image';

// One line in the server log per image, like the post plan's
// (lib/posts/log.ts). It never holds the image prompt
// (docs/specs/posts/generate-images, "Failures") nor the owner's hint, only
// whether there was one (docs/specs/posts/editor-download).

export type ImageLog = {
  owner: string;
  postId: string;
  scene: Scene;
  hint: boolean;
  // Whether code's cast line, from the post's set-up, went first.
  cast: boolean;
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
    `hint=${log.hint ? 'yes' : 'no'}`,
    `cast=${log.cast ? 'yes' : 'no'}`,
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
