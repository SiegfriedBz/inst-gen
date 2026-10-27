import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { beforeEach, describe, expect, test } from 'vitest';
import {
  forgetBrand,
  loadBrand,
  openStore,
  resetStoreForTests,
  saveBrand,
} from '@/lib/brand/store';
import type { PostBatch } from '@/lib/posts/batch';
import { staleUnedited } from '@/lib/posts/edit';
import { imageKey, loadImages, type SavedImage, saveImage } from '@/lib/posts/image-store';
import { hashText, profileHash } from '@/lib/posts/input';
import { applyCta, clearBefore, loadBatches, recentPosts, saveBatch } from '@/lib/posts/store';
import { loadTranslation, saveTranslation } from '@/lib/posts/translation-store';
import { newPostsRun } from '@/lib/runs/run-record';
import { loadOpenRun, saveRun } from '@/lib/runs/store';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

function batch(id: string, createdAt: string, overrides: Partial<PostBatch> = {}): PostBatch {
  return {
    id,
    ownerId: 'svarga',
    createdAt,
    profileReadAt: '2026-10-24T09:00:00.000Z',
    profileHash: profileHash(svargaProfile()),
    promptVersion: 'posts-1',
    model: 'gemini-3.5-flash-lite',
    posts: Array.from({ length: 6 }, (_, i) =>
      post({ id: `${id}-${i}`, topic: `${id} topic ${i}` }),
    ),
    dropped: [],
    ...overrides,
  };
}

describe('the posts store', () => {
  test('a version-1 database opens as version 5, its brand kept and empty posts and reviews stores', async () => {
    const old = await openDB('shopfront', 1, {
      upgrade(db) {
        db.createObjectStore('brands', { keyPath: 'ownerId' });
        db.createObjectStore('runs', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
      },
    });
    await old.put('brands', {
      ownerId: 'svarga',
      profile: svargaProfile(),
      savedAt: 'x',
      ownerEdited: [],
    });
    old.close();
    expect((await loadBrand('svarga')).kind).toBe('saved');
    expect(await loadBatches('svarga')).toEqual([]);
    const db = await openStore();
    expect(db?.version).toBe(5);
    expect(db?.objectStoreNames.contains('reviews')).toBe(true);
  });

  test('loadBatches returns newest first, this owner only', async () => {
    await saveBatch(batch('a', '2026-10-25T09:00:00.000Z'));
    await saveBatch(batch('b', '2026-10-25T10:00:00.000Z'));
    await saveBatch(batch('c', '2026-10-25T11:00:00.000Z', { ownerId: 'sen' }));
    expect((await loadBatches('svarga')).map((b) => b.id)).toEqual(['b', 'a']);
  });

  test('recentPosts takes the newest 12 across batches', async () => {
    const batches = [
      batch('b', '2026-10-25T10:00:00.000Z'),
      batch('a', '2026-10-25T09:00:00.000Z'),
      batch('z', '2026-10-24T09:00:00.000Z'),
    ];
    const recent = recentPosts(batches);
    expect(recent).toHaveLength(12);
    expect(recent[0]).toEqual({ type: 'offer', topic: 'b topic 0' });
    expect(recent.at(-1)).toEqual({ type: 'offer', topic: 'a topic 5' });
  });

  test("applyCta changes every post's cta and nothing else", async () => {
    await saveBatch(batch('a', '2026-10-25T09:00:00.000Z'));
    const [updated] = await applyCta('svarga', 'Book on WhatsApp: +6289999999999');
    expect(updated.posts.every((p) => p.cta === 'Book on WhatsApp: +6289999999999')).toBe(true);
    expect(updated.posts[0].caption).toBe('Warm oil, slow hands.');
    expect((await loadBatches('svarga'))[0].posts[0].cta).toBe('Book on WhatsApp: +6289999999999');
  });

  test('a new WhatsApp number clears copied on every post, keeps saved', async () => {
    const NOW = '2026-10-27T10:00:00.000Z';
    await saveBatch(
      batch('a', '2026-10-25T09:00:00.000Z', {
        posts: [
          post({ id: 'a-0', savedAt: NOW, copiedAt: NOW }),
          post({ id: 'a-1', copiedAt: NOW }),
        ],
      }),
    );
    const [updated] = await applyCta('svarga', 'Book on WhatsApp: +6289999999999');
    expect(updated.posts.map((p) => p.copiedAt)).toEqual([undefined, undefined]);
    expect(updated.posts[0].savedAt).toBe(NOW);
    expect((await loadBatches('svarga'))[0].posts[0].copiedAt).toBeUndefined();
  });

  test('a batch saved after a WhatsApp edit gets the new number from applyCta', async () => {
    await saveBatch(batch('a', '2026-10-25T09:00:00.000Z'));
    await applyCta('svarga', 'Book on WhatsApp: +6280000000000');
    await saveBatch(batch('b', '2026-10-25T10:00:00.000Z'));
    const batches = await applyCta('svarga', 'Book on WhatsApp: +6280000000000');
    expect(batches.flatMap((b) => b.posts).every((p) => p.cta.endsWith('+6280000000000'))).toBe(
      true,
    );
  });

  test('posts are not stale after a WhatsApp edit, and are after a summary edit', () => {
    const saved = batch('a', '2026-10-25T09:00:00.000Z');
    const whatsapp = svargaProfile();
    whatsapp.contact.whatsapp = { value: '+6280000000000', source: 'owner' };
    expect(staleUnedited(saved, whatsapp)).toEqual([]);
    const summary = svargaProfile();
    summary.summary = { value: 'Massage at home', source: 'owner' };
    expect(staleUnedited(saved, summary)).toEqual(saved.posts);
  });

  test('forgetBrand deletes batches and posts runs', async () => {
    await saveBrand('svarga', svargaProfile());
    await saveBatch(batch('a', '2026-10-25T09:00:00.000Z'));
    await saveRun(newPostsRun({ ownerId: 'svarga', step: 'plan' }, new Date(), 'r1'));
    await forgetBrand('svarga');
    expect(await loadBatches('svarga')).toEqual([]);
    expect(await loadOpenRun('svarga', 'posts')).toBeNull();
  });

  test('loadOpenRun keeps brand reads and posts runs apart', async () => {
    await saveRun(
      newPostsRun({ ownerId: 'svarga', step: 'plan' }, new Date('2026-10-25T10:00:00Z'), 'p1'),
    );
    expect(await loadOpenRun('svarga', 'brand-read')).toBeNull();
    expect((await loadOpenRun('svarga', 'posts'))?.id).toBe('p1');
  });
});

describe('opening the store', () => {
  test('gives up when another tab holds the old version open', async () => {
    const old = await openDB('shopfront', 1, {
      upgrade(db) {
        db.createObjectStore('brands', { keyPath: 'ownerId' });
        db.createObjectStore('runs', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
      },
    });
    const started = Date.now();
    expect(await openStore()).toBeNull();
    expect(Date.now() - started).toBeLessThan(4000);
    old.close();
  });
});

describe('clearing what came before the day', () => {
  const image = (batchId: string, postId: string): SavedImage => ({
    batchId,
    postId,
    ownerId: 'svarga',
    post: new Blob(['p'], { type: 'image/jpeg' }),
    story: new Blob(['s'], { type: 'image/jpeg' }),
    imagePrompt: 'A villa deck at dusk',
    model: 'm',
    promptVersion: 'images-1',
    createdAt: '2026-10-25T10:00:00.000Z',
  });
  const translation = (batchId: string, caption: string) => ({
    batchId,
    postId: `${batchId}-0`,
    ownerId: 'svarga',
    locale: 'id' as const,
    captionHash: hashText(caption),
    text: 'Terjemahan',
    model: 'm',
    promptVersion: 'translate-1',
    createdAt: '2026-10-25T10:00:00.000Z',
  });

  test("old attempts lose their images and translations, keep their topics up to the limit, and today's stay", async () => {
    const days = [
      '2026-10-22T10:00:00.000Z',
      '2026-10-23T10:00:00.000Z',
      '2026-10-24T10:00:00.000Z',
      '2026-10-25T10:00:00.000Z',
    ];
    const ids = ['d1', 'd2', 'd3', 'today'];
    for (const [i, id] of ids.entries()) {
      const b = batch(id, days[i]);
      await saveBatch(b);
      await saveImage(image(id, `${id}-0`));
      await saveTranslation(translation(id, b.posts[0].caption));
    }
    await clearBefore('svarga', new Date('2026-10-25T03:00:00.000Z'));

    const kept = await loadBatches('svarga');
    expect(kept.map((b) => b.id)).toEqual(['today', 'd3', 'd2']);
    const images = await loadImages('svarga');
    expect([...images.keys()]).toEqual([imageKey('today', 'today-0')]);
    const caption = kept[0].posts[0].caption;
    expect(await loadTranslation('today', 'today-0', 'id', caption)).not.toBeNull();
    expect(await loadTranslation('d3', 'd3-0', 'id', caption)).toBeNull();
    expect(recentPosts(kept.slice(1)).map((p) => p.topic)).toContain('d3 topic 0');
  });
});
