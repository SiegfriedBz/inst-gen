import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test } from 'vitest';
import { resetStoreForTests } from '@/lib/brand/store';
import { newBrandRun, newImagesRun, newPostsRun, type RunRecord } from '@/lib/runs/run-record';
import { deleteRun, loadOpenRun, loadOpenRuns, saveRun, setImageStep } from '@/lib/runs/store';
import { svargaProfile } from './helpers/brand';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

const runFor = (ownerId: string, id: string, at: string) =>
  newBrandRun({ ownerId, url: 'example.com', reread: false }, new Date(at), id);

describe('the runs store', () => {
  test('loads the newest open run of this owner only', async () => {
    await saveRun(runFor('sen', 'old', '2026-10-24T09:00:00Z'));
    await saveRun(runFor('sen', 'new', '2026-10-24T10:00:00Z'));
    await saveRun(runFor('svarga', 'other', '2026-10-24T11:00:00Z'));
    expect((await loadOpenRun('sen'))?.id).toBe('new');
  });

  test('a finished run is not open', async () => {
    const done: RunRecord = {
      ...runFor('sen', 'r1', '2026-10-24T10:00:00Z'),
      steps: [{ name: 'brand', status: 'done', output: svargaProfile() }],
    };
    await saveRun(done);
    expect(await loadOpenRun('sen')).toBeNull();
  });

  test('delete removes it', async () => {
    await saveRun(runFor('sen', 'r1', '2026-10-24T10:00:00Z'));
    await deleteRun('r1');
    expect(await loadOpenRun('sen')).toBeNull();
  });
});

describe('image steps', () => {
  const now = new Date('2026-10-25T10:00:00Z');
  const images = () =>
    newImagesRun({ ownerId: 'sen', batchId: 'b', postIds: ['p1', 'p2', 'p3'] }, now, 'r');

  test('two steps finishing together both land', async () => {
    await saveRun(images());
    await Promise.all([setImageStep('r', 'p1', 'done'), setImageStep('r', 'p2', 'failed')]);
    const [run] = await loadOpenRuns('sen', 'images');
    expect(run.steps.map((s) => s.status)).toEqual(['done', 'failed', 'running']);
  });

  test('the run is deleted once every step ended', async () => {
    await saveRun(images());
    await setImageStep('r', 'p1', 'done');
    await setImageStep('r', 'p2', 'failed');
    expect(await setImageStep('r', 'p3', 'done')).toBeNull();
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('a step of a run that is gone changes nothing', async () => {
    expect(await setImageStep('gone', 'p1', 'done')).toBeNull();
  });

  test('every open images run, newest first', async () => {
    await saveRun(images());
    await saveRun(
      newImagesRun(
        { ownerId: 'sen', batchId: 'b', postIds: ['p4'] },
        new Date('2026-10-25T11:00:00Z'),
        'r2',
      ),
    );
    expect((await loadOpenRuns('sen', 'images')).map((r) => r.id)).toEqual(['r2', 'r']);
  });

  test('an images run never hides a posts run', async () => {
    await saveRun(newPostsRun({ ownerId: 'sen', step: 'plan' }, now, 'plan'));
    await saveRun(images());
    expect((await loadOpenRun('sen', 'posts'))?.id).toBe('plan');
  });
});
