import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ReadDeps } from '@/lib/brand/read-client';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { PlanResult, PostBatch } from '@/lib/posts/batch';
import { type PostsEvent, resumePosts, startPlan, startRewrite } from '@/lib/posts/client';
import { profileHash } from '@/lib/posts/input';
import { loadBatches, saveBatch } from '@/lib/posts/store';
import { encodePostsLine, type PostsLine } from '@/lib/posts/stream';
import { loadOpenRun } from '@/lib/runs/store';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

const profile = svargaProfile();
const posts = Array.from({ length: 6 }, (_, i) =>
  post({ id: `post-${i + 1}`, topic: `Topic ${i}` }),
);
const result: PlanResult = {
  posts,
  dropped: [],
  promptVersion: 'posts-1',
  model: 'gemini-3.5-flash-lite',
  profileHash: profileHash(profile),
};
const postLines: PostsLine[] = posts.map((p, index) => ({ type: 'post', index, post: p }));

function ndjson(lines: PostsLine[]): Response {
  return new Response(lines.map(encodePostsLine).join(''), {
    headers: { 'content-type': 'application/x-ndjson' },
  });
}

let fetchMock: ReturnType<typeof vi.fn>;
let deps: ReadDeps;
let ids = 0;

beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
  fetchMock = vi.fn();
  ids = 0;
  deps = {
    fetch: fetchMock as unknown as typeof fetch,
    now: () => new Date('2026-10-25T10:00:00Z'),
    newId: () => `id-${++ids}`,
  };
  await saveBrand('svarga', profile);
});

async function plan() {
  const events: PostsEvent[] = [];
  await startPlan({ ownerId: 'svarga', profile, recent: [] }, (e) => events.push(e), deps).done;
  return events;
}

describe('a post plan from the browser', () => {
  test('six post lines then final save one batch and clear the run', async () => {
    fetchMock.mockResolvedValue(ndjson([...postLines, { type: 'final', result }]));
    const events = await plan();
    expect(events.filter((e) => e.type === 'post')).toHaveLength(6);
    const final = events.at(-1);
    expect(final).toMatchObject({
      type: 'final',
      batch: { ownerId: 'svarga', profileReadAt: profile.readAt },
    });
    const batches = await loadBatches('svarga');
    expect(batches).toHaveLength(1);
    expect(batches[0].posts).toHaveLength(6);
    expect(await loadOpenRun('svarga', 'posts')).toBeNull();
  });

  test('sends the profile and the recent posts', async () => {
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', result }]));
    const recent = [{ type: 'offer' as const, topic: 'Old topic' }];
    await startPlan({ ownerId: 'svarga', profile, recent }, () => {}, deps).done;
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/posts/plan',
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ profile, recent }) }),
    );
  });

  test('a stream that drops after 3 posts saves nothing, and resume asks once more', async () => {
    fetchMock.mockResolvedValueOnce(ndjson(postLines.slice(0, 3)));
    const events = await plan();
    expect(events.at(-1)).toEqual({ type: 'offline' });
    expect(await loadBatches('svarga')).toEqual([]);
    expect(await loadOpenRun('svarga', 'posts')).not.toBeNull();

    fetchMock.mockResolvedValueOnce(ndjson([...postLines, { type: 'final', result }]));
    const resumed: PostsEvent[] = [];
    const running = await resumePosts('svarga', profile, (e) => resumed.push(e), deps);
    await running?.done;
    expect(resumed.at(-1)?.type).toBe('final');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(await loadBatches('svarga')).toHaveLength(1);
  });

  test('an error line clears the run and reports the code', async () => {
    fetchMock.mockResolvedValue(ndjson([postLines[0], { type: 'error', code: 'model_busy' }]));
    const events = await plan();
    expect(events.at(-1)).toEqual({ type: 'error', code: 'model_busy' });
    expect(await loadOpenRun('svarga', 'posts')).toBeNull();
    expect(await loadBatches('svarga')).toEqual([]);
  });

  test('a final line that arrives after stop saves nothing', async () => {
    let running: { stop(): void } | null = null;
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          running?.stop();
          controller.enqueue(new TextEncoder().encode(encodePostsLine({ type: 'final', result })));
          controller.close();
        },
      },
      { highWaterMark: 0 },
    );
    fetchMock.mockResolvedValue(new Response(body));
    const events: PostsEvent[] = [];
    running = startPlan({ ownerId: 'svarga', profile, recent: [] }, (e) => events.push(e), deps);
    await (running as unknown as { done: Promise<void> }).done;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await loadBatches('svarga')).toEqual([]);
    expect(events).toEqual([]);
  });

  test('a 400 reports its error code', async () => {
    fetchMock.mockResolvedValue(Response.json({ error: 'invalid_profile' }, { status: 400 }));
    expect((await plan()).at(-1)).toEqual({ type: 'error', code: 'invalid_profile' });
  });

  test('the saved batch carries the WhatsApp number as saved now', async () => {
    const edited = svargaProfile();
    edited.contact.whatsapp = { value: '+6280000000000', source: 'owner' };
    await saveBrand('svarga', edited);
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', result }]));
    await plan();
    const [saved] = await loadBatches('svarga');
    expect(saved.posts.every((p) => p.cta === 'Book on WhatsApp: +6280000000000')).toBe(true);
  });
});

describe('a rewrite from the browser', () => {
  test('keeps the batch id and its creation time', async () => {
    const batch: PostBatch = {
      ...result,
      id: 'b1',
      ownerId: 'svarga',
      createdAt: '2026-10-24T10:00:00.000Z',
      profileReadAt: profile.readAt,
      profileHash: 'stale000',
    };
    await saveBatch(batch);
    const rewritten = { ...result, posts: posts.map((p) => ({ ...p, caption: 'New caption.' })) };
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', result: rewritten }]));
    await startRewrite({ ownerId: 'svarga', profile, batch }, () => {}, deps).done;
    const batches = await loadBatches('svarga');
    expect(batches).toHaveLength(1);
    expect(batches[0]).toMatchObject({
      id: 'b1',
      createdAt: '2026-10-24T10:00:00.000Z',
      profileHash: result.profileHash,
    });
    expect(batches[0].posts[0].caption).toBe('New caption.');
    expect(fetchMock).toHaveBeenCalledWith('/api/posts/rewrite', expect.anything());
  });
});
