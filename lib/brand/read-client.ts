import { newBrandRun, type RunRecord, resumeRun, stepsToRequest } from '@/lib/runs/run-record';
import { deleteRun, loadOpenRun, saveRun } from '@/lib/runs/store';
import { type BrandErrorCode, ERROR_CODES, type PartialProfile, type Profile } from './profile';
import { saveBrand } from './store';
import { readLines } from './stream';

// One brand read driven from the browser (decision 0005): the run is kept on
// the phone while its request is alive, so a read the page lost is asked
// for again, once, when the owner comes back.

export type ReadEvent =
  | { type: 'partial'; profile: PartialProfile }
  | { type: 'final'; profile: Profile; kept: boolean }
  | { type: 'error'; code: BrandErrorCode }
  | { type: 'offline' }
  | { type: 'signedOut' };

export type ReadDeps = { fetch: typeof fetch; now: () => Date; newId: () => string };

export type RunningRead = { stop(): void; done: Promise<void> };

export function defaultReadDeps(): ReadDeps {
  return {
    fetch: (...args) => globalThis.fetch(...args),
    now: () => new Date(),
    newId: () => crypto.randomUUID(),
  };
}

// Runs whose request is alive in this page.
const live = new Set<string>();

function isErrorCode(value: unknown): value is BrandErrorCode {
  return (ERROR_CODES as readonly unknown[]).includes(value);
}

async function errorCodeOf(response: Response): Promise<BrandErrorCode> {
  try {
    const body: unknown = await response.json();
    const code = body && typeof body === 'object' ? (body as { error?: unknown }).error : null;
    return isErrorCode(code) ? code : 'model_failed';
  } catch {
    return 'model_failed';
  }
}

// Requests the run's brand step. The run's id must already be in `live`.
function request(
  run: RunRecord,
  isNew: boolean,
  onEvent: (e: ReadEvent) => void,
  deps: ReadDeps,
): RunningRead {
  const controller = new AbortController();
  let finished = false;

  async function go(): Promise<void> {
    try {
      await saveRun(isNew ? run : { ...run, steps: [{ name: 'brand', status: 'running' }] });
      if (controller.signal.aborted) return;
      const response = await deps.fetch('/api/brand/read', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: run.url }),
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
      for await (const line of readLines(response.body)) {
        if (line.type === 'partial') {
          onEvent({ type: 'partial', profile: line.profile });
        } else if (line.type === 'final') {
          const kept = await saveBrand(run.ownerId, line.profile, deps.now());
          await deleteRun(run.id);
          onEvent({ type: 'final', profile: line.profile, kept });
          return;
        } else {
          await deleteRun(run.id);
          onEvent({ type: 'error', code: line.code });
          return;
        }
      }
      // The stream ended with no final or error line: the connection dropped.
      if (!controller.signal.aborted) onEvent({ type: 'offline' });
    } catch {
      if (!controller.signal.aborted) onEvent({ type: 'offline' });
    } finally {
      live.delete(run.id);
      finished = true;
      if (controller.signal.aborted) await deleteRun(run.id);
    }
  }

  // Stopping a read whose connection already dropped forgets it too, so it
  // isn't resumed later.
  const stop = () => {
    if (finished) void deleteRun(run.id);
    else controller.abort();
  };
  return { stop, done: go() };
}

export function startRead(
  input: { ownerId: string; url: string; reread: boolean },
  onEvent: (e: ReadEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): RunningRead {
  const run = newBrandRun(input, deps.now(), deps.newId());
  live.add(run.id);
  return request(run, true, onEvent, deps);
}

// Asks again for this owner's unfinished read, or returns null when there is
// none or its request is still alive in this page.
export async function resumeRead(
  ownerId: string,
  onEvent: (e: ReadEvent) => void,
  deps: ReadDeps = defaultReadDeps(),
): Promise<(RunningRead & { reread: boolean; url: string }) | null> {
  const open = await loadOpenRun(ownerId);
  if (!open) return null;
  const run = resumeRun(open, (id) => live.has(id));
  if (!stepsToRequest(run).includes('brand')) return null;
  // Claimed before any await, so two resumes can't both ask.
  if (live.has(run.id)) return null;
  live.add(run.id);
  return { ...request(run, false, onEvent, deps), reread: run.reread, url: run.url };
}
