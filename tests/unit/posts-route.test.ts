import { describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { readPostsLines } from '@/lib/posts/stream';
import { svargaProfile } from './helpers/brand';
import { planRecording, post } from './helpers/posts';

// The developer: no owner limits get in the way (docs/specs/platform/usage-counters).
vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => 'dev' }));
vi.mock('@/lib/brand/deps', () => ({
  defaultPostsDeps: () => ({
    model: replayTextModel(
      { modelId: 'm', promptVersion: 'p', partials: [], final: {} },
      { posts: planRecording() },
    ),
  }),
}));

const plan = await import('@/app/api/posts/plan/route');
const rewrite = await import('@/app/api/posts/rewrite/route');

const request = (path: string, body: string) =>
  new Request(`http://localhost/api/posts/${path}`, { method: 'POST', body });

describe('POST /api/posts/plan', () => {
  test('runs on Node.js with a 300 s ceiling', () => {
    expect(plan.runtime).toBe('nodejs');
    expect(plan.maxDuration).toBe(300);
  });

  test('an invalid body answers 400 invalid_profile', async () => {
    const response = await plan.POST(request('plan', JSON.stringify({ profile: {} })));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_profile' });
  });

  test('a valid body streams NDJSON lines', async () => {
    const response = await plan.POST(
      request('plan', JSON.stringify({ profile: svargaProfile(), recent: [] })),
    );
    expect(response.headers.get('content-type')).toBe('application/x-ndjson');
    const types: string[] = [];
    if (!response.body) throw new Error('no body');
    for await (const line of readPostsLines(response.body)) types.push(line.type);
    expect(types.at(-1)).toBe('final');
  });
});

describe('the special offer in the plan body', () => {
  const offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const send = (o: unknown) =>
    plan.POST(request('plan', JSON.stringify({ profile: svargaProfile(), recent: [], offer: o })));

  test('a treatment the profile does not have answers 400', async () => {
    expect((await send({ ...offer, treatments: ['Hot stone'] })).status).toBe(400);
  });

  test('more than 90% answers 400', async () => {
    expect((await send({ ...offer, percent: 95 })).status).toBe(400);
  });

  test('a good offer streams', async () => {
    expect((await send(offer)).status).toBe(200);
  });
});

describe('POST /api/posts/rewrite', () => {
  test('an invalid body answers 400 invalid_profile', async () => {
    const response = await rewrite.POST(
      request('rewrite', JSON.stringify({ profile: svargaProfile(), posts: [] })),
    );
    expect(response.status).toBe(400);
  });

  test('a valid body streams NDJSON lines', async () => {
    const response = await rewrite.POST(
      request('rewrite', JSON.stringify({ profile: svargaProfile(), posts: [post()] })),
    );
    expect(response.status).toBe(200);
    expect(rewrite.maxDuration).toBe(300);
  });
});
