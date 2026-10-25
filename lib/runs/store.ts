import { openStore } from '@/lib/brand/store';
import { isFinished, type RunKind, type RunRecord } from './run-record';

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
  const db = await openStore();
  if (!db) return null;
  const runs = await db.getAllFromIndex('runs', 'ownerId', ownerId);
  const open = runs.filter((run) => (run.kind ?? 'brand-read') === kind && !isFinished(run));
  open.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  return open[0] ?? null;
}

export async function deleteRun(id: string): Promise<void> {
  const db = await openStore();
  await db?.delete('runs', id);
}
