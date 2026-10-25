import { openStore } from '@/lib/brand/store';
import { isFinished, type RunKind, type RunRecord, type StepStatus } from './run-record';

// Runs kept on the phone (decision 0005). Without IndexedDB nothing is kept,
// and a read that drops can't be resumed.

export async function saveRun(run: RunRecord): Promise<void> {
  const db = await openStore();
  await db?.put('runs', run);
}

// The owner's newest run of this kind that still has a step to finish, or
// null. Kinds are apart, so a posts run never hides a lost brand read.
export async function loadOpenRun(
  ownerId: string,
  kind: RunKind = 'brand-read',
): Promise<RunRecord | null> {
  return (await loadOpenRuns(ownerId, kind))[0] ?? null;
}

// Every run of this kind the owner still has to finish, newest first.
export async function loadOpenRuns(ownerId: string, kind: RunKind): Promise<RunRecord[]> {
  const db = await openStore();
  if (!db) return [];
  const runs = await db.getAllFromIndex('runs', 'ownerId', ownerId);
  const open = runs.filter((run) => (run.kind ?? 'brand-read') === kind && !isFinished(run));
  return open.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

// Sets one image step's status in one transaction, so images that end
// together don't overwrite each other. A run whose steps have all ended is
// deleted, and null returned; null too when the run is gone.
export async function setImageStep(
  runId: string,
  postId: string,
  status: StepStatus,
): Promise<RunRecord | null> {
  const db = await openStore();
  if (!db) return null;
  const tx = db.transaction('runs', 'readwrite');
  const run = await tx.store.get(runId);
  if (!run) {
    await tx.done;
    return null;
  }
  const updated: RunRecord = {
    ...run,
    steps: run.steps.map((step) =>
      step.name === 'image' && step.postId === postId ? { ...step, status } : step,
    ),
  };
  const finished = isFinished(updated);
  await (finished ? tx.store.delete(runId) : tx.store.put(updated));
  await tx.done;
  return finished ? null : updated;
}

export async function deleteRun(id: string): Promise<void> {
  const db = await openStore();
  await db?.delete('runs', id);
}
