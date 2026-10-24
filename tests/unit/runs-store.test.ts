import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test } from 'vitest';
import { resetStoreForTests } from '@/lib/brand/store';
import { newBrandRun, type RunRecord } from '@/lib/runs/run-record';
import { deleteRun, loadOpenRun, saveRun } from '@/lib/runs/store';
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
