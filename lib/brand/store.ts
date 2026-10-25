import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { PostBatch } from '@/lib/posts/batch';
import type { RunRecord } from '@/lib/runs/run-record';
import { type Profile, profileSchema, upgradeProfile } from './profile';
import type { SearchAnswer } from './search/run';
import { mergeSearch } from './search-client';

// The owner's business kept on the phone (docs/specs/brand/brand-panel,
// "Stored on the phone"): one IndexedDB database, a brand per owner id and
// the runs of decision 0005. Without IndexedDB everything here is a no-op.

// `ownerEdited` names the fields with no source of their own that the owner
// changed (lib/brand/edit.ts, UNSOURCED_FIELDS).
export type BrandRecord = {
  ownerId: string;
  profile: Profile;
  savedAt: string;
  ownerEdited: string[];
};

export type LoadResult =
  | { kind: 'none' }
  | { kind: 'saved'; record: BrandRecord }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };

export interface ShopfrontDb extends DBSchema {
  // Records saved before `ownerEdited` existed have none.
  brands: { key: string; value: Omit<BrandRecord, 'ownerEdited'> & { ownerEdited?: string[] } };
  runs: { key: string; value: RunRecord; indexes: { ownerId: string } };
  // Batches of posts (docs/specs/posts/generate-copy, "On the phone").
  posts: { key: string; value: PostBatch; indexes: { ownerId: string } };
}

const DB_NAME = 'shopfront';
const DB_VERSION = 2;

let opening: Promise<IDBPDatabase<ShopfrontDb> | null> | null = null;
let persistAsked = false;

async function open(): Promise<IDBPDatabase<ShopfrontDb> | null> {
  if (typeof indexedDB === 'undefined' || !indexedDB) return null;
  try {
    return await openDB<ShopfrontDb>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          db.createObjectStore('brands', { keyPath: 'ownerId' });
          db.createObjectStore('runs', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
        }
        if (oldVersion < 2) {
          db.createObjectStore('posts', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
        }
      },
    });
  } catch {
    return null;
  }
}

// The database, opened once per page load; null when the browser has none.
export function openStore(): Promise<IDBPDatabase<ShopfrontDb> | null> {
  opening ??= open();
  return opening;
}

export function resetStoreForTests(): void {
  opening = null;
  persistAsked = false;
}

export async function loadBrand(ownerId: string): Promise<LoadResult> {
  const db = await openStore();
  if (!db) return { kind: 'unavailable' };
  const record = await db.get('brands', ownerId);
  if (!record) return { kind: 'none' };
  const parsed = profileSchema.safeParse(upgradeProfile(record.profile));
  if (!parsed.success) return { kind: 'invalid' };
  return {
    kind: 'saved',
    record: { ...record, profile: parsed.data, ownerEdited: record.ownerEdited ?? [] },
  };
}

// Throws on a profile that fails the schema; false when nothing can be kept.
export async function saveBrand(
  ownerId: string,
  profile: Profile,
  now: Date = new Date(),
  ownerEdited: string[] = [],
): Promise<boolean> {
  const checked = profileSchema.parse(profile);
  const db = await openStore();
  if (!db) return false;
  await db.put('brands', { ownerId, profile: checked, savedAt: now.toISOString(), ownerEdited });
  return true;
}

// Merges an essence search answer into the record as stored now, in one
// transaction, so an edit saved from another tab since the search left is
// kept (docs/specs/brand/search-essence). A record already searched keeps its
// first answer. Null when there is no record (forgotten) or no store.
export async function mergeSearchIntoStore(
  ownerId: string,
  answer: SearchAnswer,
  now: Date = new Date(),
): Promise<BrandRecord | null> {
  const db = await openStore();
  if (!db) return null;
  const tx = db.transaction('brands', 'readwrite');
  const raw = await tx.store.get(ownerId);
  if (!raw) {
    await tx.done;
    return null;
  }
  const parsed = profileSchema.safeParse(upgradeProfile(raw.profile));
  if (!parsed.success) {
    await tx.done;
    return null;
  }
  const ownerEdited = raw.ownerEdited ?? [];
  if (parsed.data.searchedAt !== null) {
    await tx.done;
    return { ownerId, profile: parsed.data, savedAt: raw.savedAt, ownerEdited };
  }
  const record: BrandRecord = {
    ownerId,
    profile: profileSchema.parse(mergeSearch(parsed.data, answer)),
    savedAt: now.toISOString(),
    ownerEdited,
  };
  await tx.store.put(record);
  await tx.done;
  return record;
}

export async function forgetBrand(ownerId: string): Promise<void> {
  const db = await openStore();
  if (!db) return;
  const tx = db.transaction(['brands', 'runs', 'posts'], 'readwrite');
  const runIds = await tx.objectStore('runs').index('ownerId').getAllKeys(ownerId);
  const batchIds = await tx.objectStore('posts').index('ownerId').getAllKeys(ownerId);
  await Promise.all([
    tx.objectStore('brands').delete(ownerId),
    ...runIds.map((id) => tx.objectStore('runs').delete(id)),
    ...batchIds.map((id) => tx.objectStore('posts').delete(id)),
  ]);
  await tx.done;
}

// Asks the browser once per page load not to clear the store; a refusal is fine.
export async function requestPersistence(): Promise<void> {
  if (persistAsked) return;
  persistAsked = true;
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Kept in best-effort storage.
  }
}
