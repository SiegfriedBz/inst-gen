import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  forgetBrand,
  loadBrand,
  mergeSearchIntoStore,
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

const searchAnswer = {
  searchTerms: ['hotel massage canggu'],
  moments: [],
  placeSymbols: [],
  dropped: [],
  searchedAt: '2026-10-24T12:00:00.000Z',
  searchPromptVersion: 'search-2',
};

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
      record: {
        ownerId: 'sen',
        profile: svargaProfile(),
        savedAt: '2026-10-24T10:00:00.000Z',
        ownerEdited: [],
      },
    });
  });

  test("keeps the owner's edits to fields without a source", async () => {
    await saveBrand('sen', svargaProfile(), new Date(), ['tone']);
    expect(await loadBrand('sen')).toMatchObject({ record: { ownerEdited: ['tone'] } });
  });

  test('a record saved before ownerEdited existed loads with none', async () => {
    const db = await openStore();
    await db?.put('brands', { ownerId: 'sen', profile: svargaProfile(), savedAt: '' } as never);
    expect(await loadBrand('sen')).toMatchObject({ record: { ownerEdited: [] } });
  });

  test('loads a saved v1 profile as v2 and keeps its owner edits', async () => {
    const { searchedAt: _a, searchPromptVersion: _b, ...rest } = svargaProfile();
    const { searchTerms: _c, ...essence } = rest.essence;
    const v1 = {
      ...rest,
      schemaVersion: 1,
      essence,
      hours: { value: '9am to midnight', source: 'owner' },
    };
    const db = await openStore();
    await db?.put('brands', {
      ownerId: 'sen',
      profile: v1 as never,
      savedAt: '2026-10-24T10:00:00.000Z',
      ownerEdited: ['tone'],
    });
    const result = await loadBrand('sen');
    if (result.kind !== 'saved') throw new Error(`expected saved, got ${result.kind}`);
    expect(result.record.profile.schemaVersion).toBe(2);
    expect(result.record.profile.essence.searchTerms).toEqual([]);
    expect(result.record.profile.searchedAt).toBeNull();
    expect(result.record.profile.hours).toEqual({ value: '9am to midnight', source: 'owner' });
    expect(result.record.ownerEdited).toEqual(['tone']);
  });

  test('merges a search answer into the record as stored, not as the caller holds it', async () => {
    // Another tab saved a tone edit after this tab loaded the profile.
    await saveBrand('sen', { ...svargaProfile(), tone: ['playful'] }, new Date(), ['tone']);
    const merged = await mergeSearchIntoStore('sen', searchAnswer);
    expect(merged?.profile.tone).toEqual(['playful']);
    expect(merged?.profile.essence.searchTerms).toEqual(['hotel massage canggu']);
    expect(merged?.ownerEdited).toEqual(['tone']);
    const stored = await loadBrand('sen');
    expect(stored.kind === 'saved' && stored.record.profile).toEqual(merged?.profile);
  });

  test('merges a search answer only once', async () => {
    await saveBrand('sen', svargaProfile());
    await mergeSearchIntoStore('sen', searchAnswer);
    const again = await mergeSearchIntoStore('sen', {
      ...searchAnswer,
      searchTerms: ['spa seminyak'],
    });
    expect(again?.profile.essence.searchTerms).toEqual(['hotel massage canggu']);
  });

  test('a search answer for a forgotten brand is dropped', async () => {
    expect(await mergeSearchIntoStore('sen', searchAnswer)).toBeNull();
  });

  test('another owner sees nothing', async () => {
    await saveBrand('sen', svargaProfile());
    expect(await loadBrand('svarga')).toEqual({ kind: 'none' });
  });

  test('a record that fails the schema loads as invalid', async () => {
    const db = await openStore();
    await db?.put('brands', {
      ownerId: 'sen',
      profile: { schemaVersion: 3 } as never,
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

  test('forget deletes translations', async () => {
    await saveBrand('sen', svargaProfile());
    const db = await openStore();
    const translation = (ownerId: string) => ({
      batchId: 'b1',
      postId: `post-${ownerId}`,
      ownerId,
      locale: 'vi' as const,
      captionHash: 'h',
      text: 'Xin chào',
      model: 'm',
      promptVersion: 'translate-1',
      createdAt: '2026-10-25T10:00:00.000Z',
    });
    await db?.put('translations', translation('sen'));
    await db?.put('translations', translation('svarga'));

    await forgetBrand('sen');

    expect((await db?.getAll('translations'))?.map((t) => t.ownerId)).toEqual(['svarga']);
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
