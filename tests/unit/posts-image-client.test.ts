import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ReadDeps } from '@/lib/brand/read-client';
import { resetStoreForTests } from '@/lib/brand/store';
import type { PostBatch } from '@/lib/posts/batch';
import type { ImageResponse } from '@/lib/posts/image';
import {
  type ImageEvent,
  isImageRunning,
  resumeImages,
  startImages,
} from '@/lib/posts/image-client';
import { imageKey, loadImages, saveImage } from '@/lib/posts/image-store';
import { newImagesRun } from '@/lib/runs/run-record';
import { loadOpenRuns, saveRun } from '@/lib/runs/store';
import { post } from './helpers/posts';

const posts = Array.from({ length: 6 }, (_, i) =>
  post({ id: `post-${i + 1}`, imagePrompt: `Scene ${i + 1} at dusk`, scene: 'detail' }),
);
const batch: PostBatch = {
  id: 'b1',
  ownerId: 'sen',
  createdAt: '2026-10-25T09:00:00.000Z',
  profileReadAt: '2026-10-24T09:00:00.000Z',
  profileHash: 'h',
  promptVersion: 'posts-1',
  model: 'm',
  posts,
  dropped: [],
};
const ids = posts.map((p) => p.id);

const answer = (postId: string): ImageResponse => ({
  postId,
  story: btoa('\xff\xd8story'),
  post: btoa('\xff\xd8post'),
  model: 'gemini-nano-banana-2.1',
  promptVersion: 'images-1',
  ms: 20,
});
const ok = (postId: string) => Response.json(answer(postId));
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

let fetchMock: ReturnType<typeof vi.fn>;
let deps: ReadDeps;
let n = 0;

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  vi.restoreAllMocks();
  fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
    ok(JSON.parse(init.body as string).postId),
  );
  n = 0;
  deps = {
    fetch: fetchMock as unknown as typeof fetch,
    now: () => new Date('2026-10-25T10:00:00Z'),
    newId: () => `run-${++n}`,
  };
});

async function make(postIds = ids) {
  const events: ImageEvent[] = [];
  await startImages({ ownerId: 'sen', batch, postIds }, (e) => events.push(e), deps).done;
  return events;
}

describe("a batch's images from the browser", () => {
  test('six requests start at once', async () => {
    const waiting: ((r: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => waiting.push(resolve)));
    const run = startImages({ ownerId: 'sen', batch, postIds: ids }, () => {}, deps);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(6));
    expect(isImageRunning('b1', 'post-1')).toBe(true);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/posts/image');
    expect(bodyOf(fetchMock.mock.calls[2])).toEqual({
      postId: 'post-3',
      imagePrompt: 'Scene 3 at dusk',
      scene: 'detail',
    });
    waiting.forEach((resolve, i) => {
      resolve(ok(`post-${i + 1}`));
    });
    await run.done;
    expect(isImageRunning('b1', 'post-1')).toBe(false);
  });

  test('an answer is saved then reported', async () => {
    const events = await make(['post-1']);
    expect(events).toHaveLength(1);
    const [event] = events;
    if (event.type !== 'image') throw new Error(event.type);
    expect(event.image).toMatchObject({ postId: 'post-1', batchId: 'b1', ownerId: 'sen' });
    expect((await loadImages('sen')).has(imageKey('b1', 'post-1'))).toBe(true);
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('one failure leaves the others', async () => {
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) => {
      const { postId } = JSON.parse(init.body as string);
      return postId === 'post-3'
        ? Response.json({ error: 'image_blocked' }, { status: 502 })
        : ok(postId);
    });
    const events = await make();
    expect(events.filter((e) => e.type === 'image')).toHaveLength(5);
    expect(events.filter((e) => e.type === 'error')).toEqual([
      { type: 'error', batchId: 'b1', postId: 'post-3', code: 'image_blocked' },
    ]);
    expect((await loadImages('sen')).size).toBe(5);
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('an unknown error answer is image_failed', async () => {
    fetchMock.mockResolvedValue(new Response('oops', { status: 500 }));
    expect(await make(['post-1'])).toEqual([
      { type: 'error', batchId: 'b1', postId: 'post-1', code: 'image_failed' },
    ]);
  });

  test('401 reports signedOut once', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
    expect(await make()).toEqual([{ type: 'signedOut' }]);
  });

  test('a quota error on save reports no_space', async () => {
    const real = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (this: IDBObjectStore, ...args) {
      if (this.name === 'images') throw new DOMException('full', 'QuotaExceededError');
      return real.apply(this, args);
    };
    try {
      expect(await make(['post-1'])).toEqual([
        { type: 'error', batchId: 'b1', postId: 'post-1', code: 'no_space' },
      ]);
    } finally {
      IDBObjectStore.prototype.put = real;
    }
  });

  test('a dropped connection reports offline and keeps the step running', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await make(['post-1'])).toEqual([{ type: 'offline', batchId: 'b1', postId: 'post-1' }]);
    const [run] = await loadOpenRuns('sen', 'images');
    expect(run.steps).toEqual([{ name: 'image', postId: 'post-1', status: 'running' }]);
  });

  test('an answer after stop saves nothing', async () => {
    let resolve: (r: Response) => void = () => {};
    fetchMock.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((res, rej) => {
          resolve = res;
          init.signal?.addEventListener('abort', () => rej(new DOMException('', 'AbortError')));
        }),
    );
    const events: ImageEvent[] = [];
    const run = startImages(
      { ownerId: 'sen', batch, postIds: ['post-1'] },
      (e) => events.push(e),
      deps,
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    run.stop();
    resolve(ok('post-1'));
    await run.done;
    expect(events).toEqual([]);
    expect((await loadImages('sen')).size).toBe(0);
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('try again asks for one post only', async () => {
    await make(['post-3']);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(fetchMock.mock.calls[0]).postId).toBe('post-3');
  });
});

describe('resuming images', () => {
  const lost = (postIds: string[], resumes = 0) => ({
    ...newImagesRun(
      { ownerId: 'sen', batchId: 'b1', postIds },
      new Date('2026-10-25T09:30:00Z'),
      'lost',
    ),
    resumes,
  });

  test('resume skips posts that already have an image', async () => {
    await saveRun(lost(['post-1', 'post-2']));
    await saveImage({
      postId: 'post-1',
      batchId: 'b1',
      ownerId: 'sen',
      story: new Blob(['s']),
      post: new Blob(['p']),
      imagePrompt: 'Scene 1 at dusk',
      model: 'm',
      promptVersion: 'images-1',
      createdAt: '2026-10-25T09:31:00.000Z',
    });
    const events: ImageEvent[] = [];
    const resumed = await resumeImages('sen', [batch], (e) => events.push(e), deps);
    expect(resumed?.postIds).toEqual(['post-2']);
    await resumed?.done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(bodyOf(fetchMock.mock.calls[0]).postId).toBe('post-2');
    expect(events.map((e) => e.type)).toEqual(['image']);
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test("resume treats another batch's image as not done", async () => {
    await saveRun(lost(['post-1']));
    await saveImage({
      postId: 'post-1',
      batchId: 'other-batch',
      ownerId: 'sen',
      story: new Blob(['s']),
      post: new Blob(['p']),
      imagePrompt: 'Scene 1 at dusk',
      model: 'm',
      promptVersion: 'images-1',
      createdAt: '2026-10-25T09:31:00.000Z',
    });
    const resumed = await resumeImages('sen', [batch], () => {}, deps);
    expect(resumed?.postIds).toEqual(['post-1']);
    await resumed?.done;
  });

  test('nothing to resume is null', async () => {
    expect(await resumeImages('sen', [batch], () => {}, deps)).toBeNull();
  });

  test('a run whose batch is gone is dropped', async () => {
    await saveRun(lost(['post-1']));
    expect(await resumeImages('sen', [], () => {}, deps)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('resume gives up after two tries', async () => {
    await saveRun(lost(['post-1', 'post-2'], 2));
    const events: ImageEvent[] = [];
    expect(await resumeImages('sen', [batch], (e) => events.push(e), deps)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(events).toEqual([
      { type: 'error', batchId: 'b1', postId: 'post-1', code: 'image_failed' },
      { type: 'error', batchId: 'b1', postId: 'post-2', code: 'image_failed' },
    ]);
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('a retry while offline is not asked for twice on resume', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await make(['post-1']);
    await make(['post-1']);
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (_url: string, init: RequestInit) =>
      ok(JSON.parse(init.body as string).postId),
    );
    const resumed = await resumeImages('sen', [batch], () => {}, deps);
    await resumed?.done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await loadOpenRuns('sen', 'images')).toEqual([]);
  });

  test('resume skips a post whose retry is in flight', async () => {
    await saveRun(lost(['post-1']));
    const waiting: ((r: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => waiting.push(resolve)));
    const retry = startImages({ ownerId: 'sen', batch, postIds: ['post-1'] }, () => {}, deps);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await resumeImages('sen', [batch], () => {}, deps)).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    waiting[0](ok('post-1'));
    await retry.done;
  });

  test('a run still alive in this page is left alone', async () => {
    const waiting: ((r: Response) => void)[] = [];
    fetchMock.mockImplementation(() => new Promise<Response>((resolve) => waiting.push(resolve)));
    const run = startImages({ ownerId: 'sen', batch, postIds: ['post-1'] }, () => {}, deps);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(await resumeImages('sen', [batch], () => {}, deps)).toBeNull();
    waiting[0](ok('post-1'));
    await run.done;
  });
});
