import type { Profile } from '@/lib/brand/profile';
import { defaultReadDeps, type ReadDeps, type RunningRead } from '@/lib/brand/read-client';
import { loadBrand } from '@/lib/brand/store';
import { newPostsRun, type RunRecord, resumeRun, stepsToRequest } from '@/lib/runs/run-record';
import { deleteRun, loadOpenRun, saveRun } from '@/lib/runs/store';
import {
  type PlanResult,
  POSTS_ERROR_CODES,
  type Post,
  type PostBatch,
  type PostsErrorCode,
  type RecentPost,
} from './batch';
import { mergeRewrite } from './edit';
import { ctaFor } from './input';
import { applyCta, loadBatches, recentPosts, saveBatch } from './store';
import { readPostsLines } from './stream';

// A post plan or rewrite driven from the browser (decision 0005), like the
// brand read (lib/brand/read-client.ts): the run is kept on the phone while
// its request is alive, so a step the page lost is asked for again, at most
// twice, when the owner comes back.

export type PostsEvent =
  | { type: 'post'; index: number; post: Post }
  | { type: 'final'; batch: PostBatch }
  | { type: 'error'; code: PostsErrorCode }
  | { type: 'offline' }
  | { type: 'signedOut' };

type Input =
  | { step: 'plan'; recent: RecentPost[] }
  | { step: 'rewrite'; batch: PostBatch; postIds: string[] };

const live = new Set<string>();
const MAX_RESUMES = 2;

function isErrorCode(value: unknown): value is PostsErrorCode {
  return (POSTS_ERROR_CODES as readonly unknown[]).includes(value);
}

async function errorCodeOf(response: Response): Promise<PostsErrorCode> {
  try {
    const body: unknown = await response.json();
    const code = body && typeof body === 'object' ? (body as { error?: unknown }).error : null;
    return isErrorCode(code) ? code : 'model_failed';
  } catch {
    return 'model_failed';
  }
}

function toBatch(
  run: RunRecord,
  input: Input,
  profile: Profile,
  result: PlanResult,
  now: Date,
): PostBatch {
  if (input.step === 'rewrite') return mergeRewrite(input.batch, result, input.postIds);
  return {
    ...result,
    id: run.id,
    ownerId: run.ownerId,
    createdAt: now.toISOString(),
    profileReadAt: profile.readAt,
  };
}

// The batch as saved, with the call to action of the brand as saved now: the
// owner may have changed WhatsApp while the posts were being made.
async function keep(batch: PostBatch): Promise<PostBatch> {
  await saveBatch(batch);
  const saved = await loadBrand(batch.ownerId);
  const cta = saved.kind === 'saved' ? ctaFor(saved.record.profile) : null;
  if (!cta) return batch;
  const batches = await applyCta(batch.ownerId, cta);
  return batches.find((b) => b.id === batch.id) ?? batch;
}

// Requests the run's step. The run's id must already be in `live`.
function request(
  run: RunRecord,
  isNew: boolean,
  profile: Profile,
  input: Input,
  onEvent: (e: PostsEvent) => void,
  deps: ReadDeps,
): RunningRead {
  const controller = new AbortController();
  let finished = false;

  async function go(): Promise<void> {
    try {
      await saveRun(
        isNew
          ? run
          : {
              ...run,
              steps: [{ name: input.step, status: 'running' }],
              resumes: (run.resumes ?? 0) + 1,
            },
      );
      if (controller.signal.aborted) return;
      const body =
        input.step === 'plan'
          ? { profile, recent: input.recent }
          : { profile, posts: input.batch.posts.filter((p) => input.postIds.includes(p.id)) };
      const response = await deps.fetch(`/api/posts/${input.step}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (response.status === 401) {
        await deleteRun(run.id);
        onEvent({ type: 'signedOut' });
        return;
      }
      if (!response.ok || !response.body) {
        const code = await errorCodeOf(response);
        await deleteRun(run.id);
        onEvent({ type: 'error', code });
        return;
      }
      for await (const line of readPostsLines(response.body)) {
        if (line.type === 'post') {
          onEvent(line);
        } else if (line.type === 'final') {
          // Stopped (a Forget, a re-read, the section closing): keep nothing.
          if (controller.signal.aborted) return;
          const batch = await keep(toBatch(run, input, profile, line.result, deps.now()));
          await deleteRun(run.id);
          onEvent({ type: 'final', batch });
          return;
        } else {
          await deleteRun(run.id);
          onEvent({ type: 'error', code: line.code });
          return;
        }
      }
      // The stream ended with no final or error line: the connection dropped.
      if (!controller.signal.aborted) onEvent({ type: 'offline' });
    } catch (error) {
      if (controller.signal.aborted) return;
      if (error instanceof TypeError) {
        onEvent({ type: 'offline' });
      } else {
        await deleteRun(run.id);
        onEvent({ type: 'error', code: 'model_failed' });
      }
    } finally {
      live.delete(run.id);
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

export function startPlan(
  input: { ownerId: string; profile: Profile; recent: RecentPost[] },
  onEvent: (e: PostsEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): RunningRead {
  const run = newPostsRun({ ownerId: input.ownerId, step: 'plan' }, deps.now(), deps.newId());
  live.add(run.id);
  return request(run, true, input.profile, { step: 'plan', recent: input.recent }, onEvent, deps);
}

// Rewrites the batch's posts named in `postIds`; the others stay as they are.
export function startRewrite(
  input: { ownerId: string; profile: Profile; batch: PostBatch; postIds: string[] },
  onEvent: (e: PostsEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): RunningRead {
  const run = newPostsRun(
    {
      ownerId: input.ownerId,
      step: 'rewrite',
      batchId: input.batch.id,
      postIds: input.postIds,
    },
    deps.now(),
    deps.newId(),
  );
  live.add(run.id);
  const step: Input = { step: 'rewrite', batch: input.batch, postIds: input.postIds };
  return request(run, true, input.profile, step, onEvent, deps);
}

// Asks again for this owner's unfinished plan or rewrite, or returns null when
// there is none, its request is still alive, or its batch is gone.
export async function resumePosts(
  ownerId: string,
  profile: Profile,
  onEvent: (e: PostsEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): Promise<(RunningRead & { step: 'plan' | 'rewrite' }) | null> {
  const open = await loadOpenRun(ownerId, 'posts');
  if (!open) return null;
  const run = resumeRun(open, (id) => live.has(id));
  const step = stepsToRequest(run).find((name) => name === 'plan' || name === 'rewrite');
  if (!step || live.has(run.id)) return null;
  live.add(run.id);
  const batches = await loadBatches(ownerId);
  const batch = batches.find((b) => b.id === run.batchId);
  if ((run.resumes ?? 0) >= MAX_RESUMES || (step === 'rewrite' && !batch)) {
    await deleteRun(run.id);
    live.delete(run.id);
    if (step === 'plan' || batch) onEvent({ type: 'error', code: 'model_failed' });
    return null;
  }
  const input: Input =
    step === 'rewrite' && batch
      ? { step, batch, postIds: run.postIds ?? batch.posts.map((p) => p.id) }
      : { step: 'plan', recent: recentPosts(batches) };
  return { ...request(run, false, profile, input, onEvent, deps), step };
}
