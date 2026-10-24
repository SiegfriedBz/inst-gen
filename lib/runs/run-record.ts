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
};
