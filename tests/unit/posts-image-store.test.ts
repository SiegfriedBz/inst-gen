import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { openDB } from 'idb';
import { beforeEach, describe, expect, test } from 'vitest';
import { forgetBrand, resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { PostBatch } from '@/lib/posts/batch';
import {
  ImageStoreFullError,
  loadImages,
  type SavedImage,
  saveImage,
  toSavedImage,
} from '@/lib/posts/image-store';
import { loadBatches } from '@/lib/posts/store';
import { senProfile } from './helpers/brand';
import { post } from './helpers/posts';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

const jpeg = (bytes: number[]) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });

function image(ownerId: string, postId: string): SavedImage {
  return {
    postId,
    batchId: 'b1',
    ownerId,
    story: jpeg([0xff, 0xd8, 1, 2]),
    post: jpeg([0xff, 0xd8, 3]),
    imagePrompt: 'Oil at dusk',
    model: 'gemini-nano-banana-2.1',
    promptVersion: 'images-1',
    createdAt: '2026-10-25T10:00:00.000Z',
  };
}

describe('the images store', () => {
  test('an image saved is loaded with its blobs', async () => {
    await saveImage(image('sen', 'post-1'));
    const loaded = (await loadImages('sen')).get('post-1');
    expect(loaded?.story.type).toBe('image/jpeg');
    expect(new Uint8Array(await (loaded as SavedImage).story.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 1, 2]),
    );
    expect(loaded?.post.size).toBe(3);
  });

  test('images of another owner are not loaded', async () => {
    await saveImage(image('svarga', 'post-9'));
    expect((await loadImages('sen')).size).toBe(0);
  });

  test("forget removes the owner's images", async () => {
    await saveBrand('sen', senProfile());
    await saveImage(image('sen', 'post-1'));
    await saveImage(image('svarga', 'post-2'));
    await forgetBrand('sen');
    expect((await loadImages('sen')).size).toBe(0);
    expect((await loadImages('svarga')).size).toBe(1);
  });

  test('a version 2 database upgrades and keeps its batches', async () => {
    const old: PostBatch = {
      id: 'b1',
      ownerId: 'sen',
      createdAt: '2026-10-25T09:00:00.000Z',
      profileReadAt: '2026-10-24T09:00:00.000Z',
      profileHash: 'h',
      promptVersion: 'posts-1',
      model: 'm',
      posts: [post()],
      dropped: [],
    };
    const v2 = await openDB('shopfront', 2, {
      upgrade(db) {
        db.createObjectStore('brands', { keyPath: 'ownerId' });
        db.createObjectStore('runs', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
        db.createObjectStore('posts', { keyPath: 'id' }).createIndex('ownerId', 'ownerId');
      },
    });
    await v2.put('posts', old);
    v2.close();
    expect((await loadBatches('sen')).map((b) => b.id)).toEqual(['b1']);
    await saveImage(image('sen', 'post-1'));
    expect((await loadImages('sen')).size).toBe(1);
  });

  test('toSavedImage decodes base64 into JPEG blobs', async () => {
    const saved = toSavedImage(
      {
        postId: 'post-1',
        story: Buffer.from([0xff, 0xd8, 7]).toString('base64'),
        post: Buffer.from([0xff, 0xd8, 8, 9]).toString('base64'),
        model: 'gemini-nano-banana-2.1',
        promptVersion: 'images-1',
        ms: 20,
      },
      { batchId: 'b1', ownerId: 'sen', imagePrompt: 'Oil at dusk' },
      new Date('2026-10-25T10:00:00.000Z'),
    );
    expect(saved).toMatchObject({
      postId: 'post-1',
      batchId: 'b1',
      ownerId: 'sen',
      imagePrompt: 'Oil at dusk',
      createdAt: '2026-10-25T10:00:00.000Z',
    });
    expect(saved.story.type).toBe('image/jpeg');
    expect(new Uint8Array(await saved.post.arrayBuffer())).toEqual(
      new Uint8Array([0xff, 0xd8, 8, 9]),
    );
  });

  test('a full phone throws ImageStoreFullError', async () => {
    const real = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = () => {
      throw new DOMException('full', 'QuotaExceededError');
    };
    try {
      await expect(saveImage(image('sen', 'post-1'))).rejects.toBeInstanceOf(ImageStoreFullError);
    } finally {
      IDBObjectStore.prototype.put = real;
    }
  });
});
