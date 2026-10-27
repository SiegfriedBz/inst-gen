import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ReadDeps } from '@/lib/brand/read-client';
import { resetStoreForTests, saveBrand } from '@/lib/brand/store';
import type { PlanResult, PostBatch } from '@/lib/posts/batch';
import { type PostsEvent, resumePosts, startPlan, startRewrite } from '@/lib/posts/client';
import { profileHash } from '@/lib/posts/input';
import { DEFAULT_ANSWERS, type Offer } from '@/lib/posts/offer';
import { saveOffer } from '@/lib/posts/offer-store';
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
    await startRewrite(
      { ownerId: 'svarga', profile, batch, postIds: posts.map((p) => p.id) },
      () => {},
      deps,
    ).done;
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

describe('a rewrite of some posts', () => {
  const stale: PostBatch = {
    ...result,
    id: 'b1',
    ownerId: 'svarga',
    createdAt: '2026-10-24T10:00:00.000Z',
    profileReadAt: profile.readAt,
    profileHash: 'stale000',
    posts: posts.map((p, i) => (i < 2 ? { ...p, caption: `Mine ${i + 1}.`, edited: true } : p)),
  };
  const sent = ['post-3', 'post-4', 'post-5', 'post-6'];
  const answer = () =>
    ndjson([
      {
        type: 'final',
        result: {
          ...result,
          posts: posts.slice(2).map((p) => ({ ...p, caption: `New ${p.id}.` })),
        },
      },
    ]);

  test('a rewrite sends only the posts asked for', async () => {
    await saveBatch(stale);
    fetchMock.mockResolvedValue(answer());
    await startRewrite({ ownerId: 'svarga', profile, batch: stale, postIds: sent }, () => {}, deps)
      .done;
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.posts.map((p: { id: string }) => p.id)).toEqual(sent);
  });

  test("a rewrite keeps the posts it didn't send", async () => {
    await saveBatch(stale);
    fetchMock.mockResolvedValue(answer());
    await startRewrite({ ownerId: 'svarga', profile, batch: stale, postIds: sent }, () => {}, deps)
      .done;
    const [saved] = await loadBatches('svarga');
    expect(saved.posts.map((p) => p.caption)).toEqual([
      'Mine 1.',
      'Mine 2.',
      'New post-3.',
      'New post-4.',
      'New post-5.',
      'New post-6.',
    ]);
    expect(saved.posts[0]).toMatchObject({ edited: true, profileHash: 'stale000' });
  });

  test('a resumed rewrite sends the same posts', async () => {
    await saveBatch(stale);
    fetchMock.mockRejectedValueOnce(new TypeError('offline'));
    await startRewrite(
      { ownerId: 'svarga', profile, batch: stale, postIds: ['post-4'] },
      () => {},
      deps,
    ).done;
    fetchMock.mockResolvedValue(answer());
    const resumed = await resumePosts('svarga', profile, () => {}, deps);
    await resumed?.done;
    const body = JSON.parse((fetchMock.mock.calls[1][1] as RequestInit).body as string);
    expect(body.posts.map((p: { id: string }) => p.id)).toEqual(['post-4']);
  });
});

describe('a rewrite and an edit saved while it runs', () => {
  test('an edit saved during a rewrite is kept', async () => {
    const batch: PostBatch = {
      ...result,
      id: 'b1',
      ownerId: 'svarga',
      createdAt: '2026-10-24T10:00:00.000Z',
      profileReadAt: profile.readAt,
      profileHash: 'stale000',
    };
    await saveBatch(batch);
    let answer: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(new Promise<Response>((resolve) => (answer = resolve)));
    const run = startRewrite(
      { ownerId: 'svarga', profile, batch, postIds: posts.map((p) => p.id) },
      () => {},
      deps,
    );
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await saveBatch({
      ...batch,
      posts: batch.posts.map((p) =>
        p.id === 'post-3' ? { ...p, caption: 'Saved while it ran.', edited: true } : p,
      ),
    });
    answer(
      ndjson([
        {
          type: 'final',
          result: { ...result, posts: posts.map((p) => ({ ...p, caption: `New ${p.id}.` })) },
        },
      ]),
    );
    await run.done;
    const [saved] = await loadBatches('svarga');
    expect(saved.posts[2]).toMatchObject({ caption: 'Saved while it ran.', edited: true });
    expect(saved.posts[0].caption).toBe('New post-1.');
  });
});

describe('the special offer in requests', () => {
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-25',
    lastDay: 'Sunday 25 October',
  };
  const bodyOf = (call: number) =>
    JSON.parse((fetchMock.mock.calls[call][1] as RequestInit).body as string);

  test('a plan sends the offer; without one, no offer key', async () => {
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', result }]));
    await startPlan({ ownerId: 'svarga', profile, recent: [], offer }, () => {}, deps).done;
    expect(bodyOf(0).offer).toEqual(offer);
    await plan();
    expect('offer' in bodyOf(1)).toBe(false);
  });

  test("a rewrite sends its batch's offer", async () => {
    const batch: PostBatch = {
      ...result,
      offer,
      id: 'b1',
      ownerId: 'svarga',
      createdAt: '2026-10-24T10:00:00.000Z',
      profileReadAt: profile.readAt,
    };
    await saveBatch(batch);
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', result }]));
    await startRewrite({ ownerId: 'svarga', profile, batch, postIds: ['post-1'] }, () => {}, deps)
      .done;
    expect(bodyOf(0).offer).toEqual(offer);
  });

  test("a rewrite after a treatment left sends the batch's offer without it", async () => {
    const batch: PostBatch = {
      ...result,
      offer: { ...offer, treatments: ['Balinese massage', 'Old name'] },
      id: 'b1',
      ownerId: 'svarga',
      createdAt: '2026-10-24T10:00:00.000Z',
      profileReadAt: profile.readAt,
    };
    await saveBatch(batch);
    fetchMock.mockResolvedValue(ndjson([{ type: 'final', result }]));
    await startRewrite({ ownerId: 'svarga', profile, batch, postIds: ['post-1'] }, () => {}, deps)
      .done;
    expect(bodyOf(0).offer.treatments).toEqual(['Balinese massage']);
    const gone = { ...batch, offer: { ...offer, treatments: ['Old name'] } };
    await startRewrite(
      { ownerId: 'svarga', profile, batch: gone, postIds: ['post-1'] },
      () => {},
      deps,
    ).done;
    expect('offer' in bodyOf(1)).toBe(false);
  });

  test('a resumed plan sends the offer kept on the phone', async () => {
    await saveOffer({
      ownerId: 'svarga',
      answers: { ...DEFAULT_ANSWERS, treatments: ['Balinese massage'] },
      offer,
      createdAt: '2026-10-25T09:00:00.000Z',
    });
    fetchMock.mockResolvedValueOnce(ndjson(postLines.slice(0, 3)));
    await startPlan({ ownerId: 'svarga', profile, recent: [], offer }, () => {}, deps).done;
    fetchMock.mockResolvedValueOnce(ndjson([{ type: 'final', result }]));
    const running = await resumePosts('svarga', profile, () => {}, deps);
    await running?.done;
    expect(bodyOf(1).offer).toEqual(offer);
  });
});
