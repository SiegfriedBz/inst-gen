import { defaultReadDeps, type ReadDeps, type RunningRead } from '@/lib/brand/read-client';
import { isFinished, newImagesRun, type RunRecord, resumeRun } from '@/lib/runs/run-record';
import { deleteRun, loadOpenRuns, saveRun, setImageStep } from '@/lib/runs/store';
import type { PostBatch } from './batch';
import { IMAGE_ERROR_CODES, type ImageErrorCode, imageResponseSchema } from './image';
import {
  ImageStoreFullError,
  loadImages,
  type SavedImage,
  saveImage,
  toSavedImage,
} from './image-store';

// A batch's images asked for from the browser (decision 0005;
// docs/specs/posts/generate-images): one request per post, all at once, in a
// run of kind `images`. A step the page lost is asked for again, at most
// twice, when the owner comes back; a post with a saved image never is.

export type ImageEvent =
  | { type: 'image'; image: SavedImage }
  | { type: 'error'; postId: string; code: ImageErrorCode | 'no_space' }
  | { type: 'offline'; postId: string }
  | { type: 'signedOut' };

const liveRuns = new Set<string>();
// How many requests are alive per post: a retry may overlap a lost request.
const livePosts = new Map<string, number>();
const MAX_RESUMES = 2;

export function isImageRunning(postId: string): boolean {
  return (livePosts.get(postId) ?? 0) > 0;
}

function holdPost(postId: string): void {
  livePosts.set(postId, (livePosts.get(postId) ?? 0) + 1);
}

function releasePost(postId: string): void {
  const left = (livePosts.get(postId) ?? 0) - 1;
  if (left > 0) livePosts.set(postId, left);
  else livePosts.delete(postId);
}

// A new request for these posts replaces any older run's step for them, so a
// resume never asks for the same image twice.
async function supersede(ownerId: string, runId: string, postIds: string[]): Promise<void> {
  for (const other of await loadOpenRuns(ownerId, 'images')) {
    if (other.id === runId) continue;
    for (const step of other.steps) {
      if (step.name !== 'image' || !postIds.includes(step.postId)) continue;
      if (step.status === 'running' || step.status === 'pending') {
        await setImageStep(other.id, step.postId, 'failed');
      }
    }
  }
}

function isErrorCode(value: unknown): value is ImageErrorCode {
  return (IMAGE_ERROR_CODES as readonly unknown[]).includes(value);
}

async function errorCodeOf(response: Response): Promise<ImageErrorCode> {
  try {
    const body: unknown = await response.json();
    const code = body && typeof body === 'object' ? (body as { error?: unknown }).error : null;
    return isErrorCode(code) ? code : 'image_failed';
  } catch {
    return 'image_failed';
  }
}

// Requests the run's images for these posts. The run's id must already be in
// `liveRuns`.
function request(
  run: RunRecord,
  isNew: boolean,
  batch: PostBatch,
  postIds: string[],
  onEvent: (e: ImageEvent) => void,
  deps: ReadDeps,
): RunningRead {
  const controller = new AbortController();
  let finished = false;
  let signedOut = false;
  for (const id of postIds) holdPost(id);
  const held = new Set(postIds);
  const release = (id: string) => {
    if (held.delete(id)) releasePost(id);
  };

  async function one(postId: string): Promise<void> {
    const post = batch.posts.find((p) => p.id === postId);
    try {
      if (!post) throw new Error(`no post ${postId}`);
      const response = await deps.fetch('/api/posts/image', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ postId, imagePrompt: post.imagePrompt, scene: post.scene }),
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (response.status === 401) {
        await setImageStep(run.id, postId, 'failed');
        if (!signedOut) onEvent({ type: 'signedOut' });
        signedOut = true;
        return;
      }
      if (!response.ok) {
        const code = await errorCodeOf(response);
        await setImageStep(run.id, postId, 'failed');
        onEvent({ type: 'error', postId, code });
        return;
      }
      const answer = imageResponseSchema.parse(await response.json());
      // Stopped (a Forget, the section closing): keep nothing.
      if (controller.signal.aborted) return;
      const image = toSavedImage(
        answer,
        { batchId: batch.id, ownerId: run.ownerId, imagePrompt: post.imagePrompt },
        deps.now(),
      );
      await saveImage(image);
      await setImageStep(run.id, postId, 'done');
      onEvent({ type: 'image', image });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof TypeError) {
        // The step stays running; it is asked for again when the owner is back.
        onEvent({ type: 'offline', postId });
        return;
      }
      await setImageStep(run.id, postId, 'failed');
      onEvent({
        type: 'error',
        postId,
        code: error instanceof ImageStoreFullError ? 'no_space' : 'image_failed',
      });
    } finally {
      release(postId);
    }
  }

  async function go(): Promise<void> {
    try {
      await saveRun(
        isNew
          ? run
          : {
              ...run,
              steps: run.steps.map((step) =>
                step.name === 'image' && postIds.includes(step.postId)
                  ? { ...step, status: 'running' }
                  : step,
              ),
              resumes: (run.resumes ?? 0) + 1,
            },
      );
      if (controller.signal.aborted) return;
      await supersede(run.ownerId, run.id, postIds);
      if (controller.signal.aborted) return;
      await Promise.all(postIds.map(one));
    } finally {
      for (const id of postIds) release(id);
      liveRuns.delete(run.id);
      finished = true;
      if (controller.signal.aborted) await deleteRun(run.id);
    }
  }

  const stop = () => {
    if (finished) void deleteRun(run.id);
    else controller.abort();
  };
  return { stop, done: go() };
}

export function startImages(
  input: { ownerId: string; batch: PostBatch; postIds: string[] },
  onEvent: (e: ImageEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): RunningRead {
  const run = newImagesRun(
    { ownerId: input.ownerId, batchId: input.batch.id, postIds: input.postIds },
    deps.now(),
    deps.newId(),
  );
  liveRuns.add(run.id);
  return request(run, true, input.batch, input.postIds, onEvent, deps);
}

// Asks again for the images this owner's open runs lost, or returns null when
// there are none to ask for.
export async function resumeImages(
  ownerId: string,
  batches: PostBatch[],
  onEvent: (e: ImageEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): Promise<(RunningRead & { postIds: string[] }) | null> {
  const open = await loadOpenRuns(ownerId, 'images');
  const saved = await loadImages(ownerId);
  const resumed: (RunningRead & { postIds: string[] })[] = [];
  // Each post is asked for once, whatever number of runs still hold it.
  const taken = new Set<string>();
  for (const found of open) {
    if (liveRuns.has(found.id)) continue;
    const run = resumeRun(found, (id) => liveRuns.has(id));
    const batch = batches.find((b) => b.id === run.batchId);
    if (!batch) {
      await deleteRun(run.id);
      continue;
    }
    // A post whose image reached the phone is done, whatever the run says;
    // one being asked for right now, or by a newer run, is this run's no more.
    const current: RunRecord = {
      ...run,
      steps: run.steps.map((step) => {
        if (step.name !== 'image' || step.status !== 'pending') return step;
        if (saved.has(step.postId)) return { ...step, status: 'done' };
        if (isImageRunning(step.postId) || taken.has(step.postId)) {
          return { ...step, status: 'failed' };
        }
        taken.add(step.postId);
        return step;
      }),
    };
    const pending = current.steps.flatMap((step) =>
      step.name === 'image' && step.status === 'pending' ? [step.postId] : [],
    );
    if (pending.length === 0) {
      await (isFinished(current) ? deleteRun(run.id) : saveRun(current));
      continue;
    }
    if ((run.resumes ?? 0) >= MAX_RESUMES) {
      await saveRun(current);
      for (const postId of pending) {
        await setImageStep(run.id, postId, 'failed');
        onEvent({ type: 'error', postId, code: 'image_failed' });
      }
      continue;
    }
    liveRuns.add(run.id);
    resumed.push({ ...request(current, false, batch, pending, onEvent, deps), postIds: pending });
  }
  if (resumed.length === 0) return null;
  return {
    postIds: resumed.flatMap((r) => r.postIds),
    stop: () => {
      for (const r of resumed) r.stop();
    },
    done: Promise.all(resumed.map((r) => r.done)).then(() => {}),
  };
}
