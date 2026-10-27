import { IMAGE_MODEL, IMAGE_USD, type ImageModel, ImageModelError } from '@/lib/ai/image-model';
import { describeModelError } from '@/lib/brand/read-log';
import type { ImageBody, ImageErrorCode, ImageResponse } from './image';
import { storyAndPost } from './image-crop';
import type { ImageLog } from './image-log';
import { cleanHint, IMAGE_PROMPT_VERSION, imagePrompt } from './image-prompt';

// One post's image, end to end (docs/specs/posts/generate-images): the model
// call, then the story and post JPEGs. Not streamed; no retry, since a retry
// spends the prepaid balance.

export type ImageDeps = {
  model: ImageModel;
  // The model the ImageModel calls, for the answer and the log.
  modelId?: string;
  timeoutMs?: number;
  log?: (entry: ImageLog) => void;
};

export const IMAGE_TIMEOUT_MS = 60_000;

export type ImageOutcome =
  | { ok: true; response: ImageResponse }
  | { ok: false; code: ImageErrorCode | 'aborted' };

export async function makePostImage(
  body: ImageBody,
  ownerId: string,
  deps: ImageDeps,
  signal: AbortSignal,
): Promise<ImageOutcome> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(deps.timeoutMs ?? IMAGE_TIMEOUT_MS);
  const stepSignal = AbortSignal.any([signal, timeout]);
  const model = deps.modelId ?? IMAGE_MODEL;
  const hint = cleanHint(body.hint);
  const entry: ImageLog = {
    owner: ownerId,
    postId: body.postId,
    scene: body.scene,
    hint: hint !== undefined,
    cast: body.setup !== undefined,
    model,
    promptVersion: IMAGE_PROMPT_VERSION,
    size: null,
    storyBytes: null,
    postBytes: null,
    modelMs: null,
    totalMs: 0,
    outcome: 'aborted',
    usd: 0,
  };
  const end = (outcome: ImageOutcome): ImageOutcome => {
    entry.outcome = outcome.ok ? 'ok' : outcome.code;
    return outcome;
  };
  try {
    // The cut-off must end a model that never answers.
    const stopped = new Promise<never>((_resolve, reject) => {
      stepSignal.addEventListener('abort', () => reject(stepSignal.reason), { once: true });
    });
    stopped.catch(() => {});
    const file = await Promise.race([
      deps.model.makeImage(imagePrompt(body.imagePrompt, hint, body.setup), stepSignal),
      stopped,
    ]);
    entry.modelMs = Date.now() - started;
    if (!file) return end({ ok: false, code: 'image_blocked' });
    entry.usd = IMAGE_USD;
    const out = await storyAndPost(file.data);
    entry.size = `${out.inWidth}x${out.inHeight}`;
    entry.storyBytes = out.story.length;
    entry.postBytes = out.post.length;
    return end({
      ok: true,
      response: {
        postId: body.postId,
        story: out.story.toString('base64'),
        post: out.post.toString('base64'),
        model,
        promptVersion: IMAGE_PROMPT_VERSION,
        ms: Date.now() - started,
      },
    });
  } catch (error) {
    if (signal.aborted) return end({ ok: false, code: 'aborted' });
    entry.error = describeModelError(error);
    if (timeout.aborted) return end({ ok: false, code: 'image_timeout' });
    if (error instanceof ImageModelError && error.kind === 'paused') {
      return end({ ok: false, code: 'images_paused' });
    }
    return end({ ok: false, code: 'image_failed' });
  } finally {
    entry.totalMs = Date.now() - started;
    deps.log?.(entry);
  }
}
