import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  forgetBrand,
  loadBrand,
  openStore,
  requestPersistence,
  resetStoreForTests,
  saveBrand,
} from '@/lib/brand/store';
import { SITE, svargaProfile } from './helpers/brand';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function rawRun(id: string, ownerId: string) {
  return {
    id,
    ownerId,
    kind: 'brand-read' as const,
    reread: false,
    url: 'example.com',
    startedAt: '2026-10-24T10:00:00.000Z',
    steps: [{ name: 'brand' as const, status: 'running' as const }],
  };
}

describe('the brand store', () => {
  test('saves and loads a profile by owner', async () => {
    expect(await saveBrand('sen', svargaProfile(), new Date('2026-10-24T10:00:00Z'))).toBe(true);
    expect(await loadBrand('sen')).toEqual({
      kind: 'saved',
      record: { ownerId: 'sen', profile: svargaProfile(), savedAt: '2026-10-24T10:00:00.000Z' },
    });
  });

  test('another owner sees nothing', async () => {
    await saveBrand('sen', svargaProfile());
    expect(await loadBrand('svarga')).toEqual({ kind: 'none' });
  });

  test('a record that fails the schema loads as invalid', async () => {
    const db = await openStore();
    await db?.put('brands', {
      ownerId: 'sen',
      profile: { schemaVersion: 2 } as never,
      savedAt: '2026-10-24T10:00:00.000Z',
    });
    expect(await loadBrand('sen')).toEqual({ kind: 'invalid' });
  });

  test('refuses to save an invalid profile', async () => {
    await expect(
      saveBrand('sen', { ...svargaProfile(), name: { value: '', source: SITE } }),
    ).rejects.toThrow();
  });

  test('forget deletes the brand and its runs, not other owners', async () => {
    await saveBrand('sen', svargaProfile());
    await saveBrand('svarga', svargaProfile());
    const db = await openStore();
    await db?.put('runs', rawRun('r1', 'sen'));
    await db?.put('runs', rawRun('r2', 'svarga'));

    await forgetBrand('sen');

    expect(await loadBrand('sen')).toEqual({ kind: 'none' });
    expect(await loadBrand('svarga')).toMatchObject({ kind: 'saved' });
    expect((await db?.getAll('runs'))?.map((run) => run.id)).toEqual(['r2']);
  });

  test('without IndexedDB, load says unavailable and save returns false', async () => {
    vi.stubGlobal('indexedDB', undefined);
    resetStoreForTests();
    expect(await loadBrand('sen')).toEqual({ kind: 'unavailable' });
    expect(await saveBrand('sen', svargaProfile())).toBe(false);
  });

  test('when opening IndexedDB throws, load says unavailable', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('SecurityError');
      },
    });
    resetStoreForTests();
    expect(await loadBrand('sen')).toEqual({ kind: 'unavailable' });
  });

  test('asks for persistent storage once', async () => {
    const persist = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('navigator', { storage: { persist } });
    await requestPersistence();
    await requestPersistence();
    expect(persist).toHaveBeenCalledTimes(1);
  });
});
