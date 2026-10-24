import type { Profile } from '@/lib/brand/profile';

// A run as decision 0005 keeps it in the browser: each step's status and,
// once done, its output. The brand panel (docs/specs/brand/brand-panel)
// has one step, the brand read; phase 2 adds more.

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export type RunStep = { name: 'brand'; status: StepStatus; output?: Profile };

export type RunRecord = {
  id: string;
  ownerId: string;
  kind: 'brand-read';
  reread: boolean;
  url: string;
  startedAt: string;
  steps: RunStep[];
  // How many times the read was asked for again after it was lost.
  resumes?: number;
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

// Decision 0005, "Resume": a step marked running whose request is no
// longer alive goes back to pending. Done and failed steps stay as they are.
export function resumeRun(run: RunRecord, isLive: (runId: string) => boolean): RunRecord {
  if (isLive(run.id)) return run;
  return {
    ...run,
    steps: run.steps.map((step) =>
      step.status === 'running' ? { ...step, status: 'pending' } : step,
    ),
  };
}

export function stepsToRequest(run: RunRecord): RunStep['name'][] {
  return run.steps.filter((step) => step.status === 'pending').map((step) => step.name);
}

export function isFinished(run: RunRecord): boolean {
  return run.steps.every((step) => step.status === 'done' || step.status === 'failed');
}
