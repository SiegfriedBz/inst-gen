import type { Profile } from '@/lib/brand/profile';
import type { PostBatch } from '@/lib/posts/batch';

// A run as decision 0005 keeps it in the browser: each step's status and,
// once done, its output. The brand panel (docs/specs/brand/brand-panel)
// has one step, the brand read; a posts run (docs/specs/posts/generate-copy)
// has one too, the plan or its rewrite; an images run has one step per post
// (docs/specs/posts/generate-images).

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export type RunStep =
  | { name: 'brand'; status: StepStatus; output?: Profile }
  | { name: 'plan' | 'rewrite'; status: StepStatus; output?: PostBatch }
  // The image itself lives in the images store, not in the run.
  | { name: 'image'; postId: string; status: StepStatus };

export type RunKind = 'brand-read' | 'posts' | 'images';

export type RunRecord = {
  id: string;
  ownerId: string;
  kind: RunKind;
  reread: boolean;
  url: string;
  startedAt: string;
  steps: RunStep[];
  // How many times the step was asked for again after it was lost.
  resumes?: number;
  // The batch a rewrite replaces, or whose images an images run makes.
  batchId?: string;
  // The posts a rewrite sends: those the owner didn't edit, or the one they
  // asked for (docs/specs/posts/editor-download). All of them when absent.
  postIds?: string[];
  // The owner's hint for a new image, asked for again on a resume.
  hint?: string;
};

export function newBrandRun(
  input: { ownerId: string; url: string; reread: boolean },
  now: Date,
  id: string,
): RunRecord {
  return {
    id,
    ownerId: input.ownerId,
    kind: 'brand-read',
    reread: input.reread,
    url: input.url,
    startedAt: now.toISOString(),
    steps: [{ name: 'brand', status: 'running' }],
  };
}

export function newPostsRun(
  input: { ownerId: string; step: 'plan' | 'rewrite'; batchId?: string; postIds?: string[] },
  now: Date,
  id: string,
): RunRecord {
  return {
    id,
    ownerId: input.ownerId,
    kind: 'posts',
    reread: false,
    url: '',
    startedAt: now.toISOString(),
    steps: [{ name: input.step, status: 'running' }],
    ...(input.batchId ? { batchId: input.batchId } : {}),
    ...(input.postIds ? { postIds: input.postIds } : {}),
  };
}

export function newImagesRun(
  input: { ownerId: string; batchId: string; postIds: string[]; hint?: string },
  now: Date,
  id: string,
): RunRecord {
  return {
    id,
    ownerId: input.ownerId,
    kind: 'images',
    reread: false,
    url: '',
    startedAt: now.toISOString(),
    steps: input.postIds.map((postId) => ({ name: 'image', postId, status: 'running' })),
    batchId: input.batchId,
    ...(input.hint ? { hint: input.hint } : {}),
  };
}

// Decision 0005, "Resume": a step marked running whose request is no
// longer alive goes back to pending. Done and failed steps stay as they are.
export function resumeRun(run: RunRecord, isLive: (runId: string) => boolean): RunRecord {
  if (isLive(run.id)) return run;
  return {
    ...run,
    steps: run.steps.map((step) =>
      step.status === 'running' ? ({ ...step, status: 'pending' } as RunStep) : step,
    ),
  };
}

export function stepsToRequest(run: RunRecord): RunStep['name'][] {
  return run.steps.filter((step) => step.status === 'pending').map((step) => step.name);
}

export function isFinished(run: RunRecord): boolean {
  return run.steps.every((step) => step.status === 'done' || step.status === 'failed');
}
