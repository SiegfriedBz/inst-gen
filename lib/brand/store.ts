import { type DBSchema, type IDBPDatabase, openDB } from 'idb';
import type { RunRecord } from '@/lib/runs/run-record';
import { type Profile, profileSchema } from './profile';

// The owner's business kept on the phone (docs/specs/brand/brand-panel,
// "Stored on the phone"): one IndexedDB database, a brand per owner id and
// the runs of decision 0005. Without IndexedDB everything here is a no-op.

export type BrandRecord = { ownerId: string; profile: Profile; savedAt: string };

export type LoadResult =
  | { kind: 'none' }
  | { kind: 'saved'; record: BrandRecord }
  | { kind: 'invalid' }
  | { kind: 'unavailable' };

export interface ShopfrontDb extends DBSchema {
  brands: { key: string; value: BrandRecord };
  runs: { key: string; value: RunRecord; indexes: { ownerId: string } };
}

const DB_NAME = 'shopfront';
const DB_VERSION = 1;

let opening: Promise<IDBPDatabase<ShopfrontDb> | null> | null = null;
let persistAsked = false;

async function open(): Promise<IDBPDatabase<ShopfrontDb> | null> {
  if (typeof indexedDB === 'undefined' || !indexedDB) return null;
  try {
    return await openDB<ShopfrontDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('brands', { keyPath: 'ownerId' });
        db.createObjectStore('runs', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
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
  const parsed = profileSchema.safeParse(record.profile);
  if (!parsed.success) return { kind: 'invalid' };
  return { kind: 'saved', record: { ...record, profile: parsed.data } };
}

// Throws on a profile that fails the schema; false when nothing can be kept.
export async function saveBrand(
  ownerId: string,
  profile: Profile,
  now: Date = new Date(),
): Promise<boolean> {
  const checked = profileSchema.parse(profile);
  const db = await openStore();
  if (!db) return false;
  await db.put('brands', { ownerId, profile: checked, savedAt: now.toISOString() });
  return true;
}

export async function forgetBrand(ownerId: string): Promise<void> {
  const db = await openStore();
  if (!db) return;
  const tx = db.transaction(['brands', 'runs'], 'readwrite');
  const runIds = await tx.objectStore('runs').index('ownerId').getAllKeys(ownerId);
  await Promise.all([
    tx.objectStore('brands').delete(ownerId),
    ...runIds.map((id) => tx.objectStore('runs').delete(id)),
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
