import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { usageAnswerSchema } from '@/lib/usage/answer';
import { nextReset } from '@/lib/usage/day';
import { takeUsage } from '@/lib/usage/meter';
import { readUsage } from '@/lib/usage/read';
import { memoryStore, type UsageStore } from '@/lib/usage/store';

const now = new Date('2026-10-26T05:00:00Z');
const state = { owner: 'sen' as string | null, store: memoryStore() as UsageStore };

vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => state.owner }));
vi.mock('@/lib/usage/store', async (original) => ({
  ...(await original<typeof import('@/lib/usage/store')>()),
  getUsageStore: () => state.store,
}));

const route = await import('@/app/api/usage/route');

let store: UsageStore;
beforeEach(() => {
  store = memoryStore();
  vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  state.owner = 'sen';
  state.store = memoryStore();
  vi.restoreAllMocks();
});

const use = async (
  ownerId: string,
  action: Parameters<typeof takeUsage>[0]['action'],
  n: number,
  env = {},
) => {
  for (let i = 0; i < n; i++) await takeUsage({ ownerId, action, now, env, store });
};
const read = (ownerId = 'sen', env = {}, imagesOn = true) =>
  readUsage({ ownerId, now, env, store, imagesOn });

describe('what is left', () => {
  test("an owner's day", async () => {
    await use('sen', 'attempts', 1);
    await use('sen', 'reads', 2);
    const answer = await read();
    expect(answer).toEqual({
      resetsAt: nextReset(now).toISOString(),
      limited: true,
      left: { reads: 1, attempts: 2, newImages: 10, replies: 20 },
      limits: { reads: 3, attempts: 3, newImages: 10, replies: 20 },
      poolEmpty: false,
      images: { on: true, monthFull: false, backAt: '2026-11-01T00:00:00.000Z' },
    });
    expect(usageAnswerSchema.parse(answer)).toEqual(answer);
  });

  test('dev has no limits to show', async () => {
    const answer = await read('dev');
    expect(answer.limited).toBe(false);
    expect(answer.left).toBeUndefined();
    expect(answer.limits).toBeUndefined();
  });

  test('an empty pool leaves no text for anyone', async () => {
    const env = { TEXT_DAILY_REQUESTS: 'gemini-3.5-flash-lite=2' };
    await use('svarga', 'replies', 2, env);
    const answer = await read('sen', env);
    expect(answer.poolEmpty).toBe(true);
    expect(answer.left).toMatchObject({ reads: 0, attempts: 0, replies: 0, newImages: 10 });
  });

  test('a full image month', async () => {
    await use('dev', 'firstImages', 158);
    const answer = await read();
    expect(answer.images.monthFull).toBe(true);
    expect(answer.left?.newImages).toBe(0);
  });

  test('without the image key', async () => {
    expect((await read('sen', {}, false)).images.on).toBe(false);
  });

  test('a store that fails reads as all left', async () => {
    const down = async () => {
      throw new Error('down');
    };
    const answer = await readUsage({
      ownerId: 'sen',
      now,
      env: {},
      store: { take: down, giveBack: down, read: down },
      imagesOn: true,
    });
    expect(answer.left).toEqual(answer.limits);
    expect(answer.poolEmpty).toBe(false);
  });
});

describe('GET /api/usage', () => {
  test('401 without a session', async () => {
    state.owner = null;
    expect((await route.GET()).status).toBe(401);
  });

  test("the owner's answer, not cached", async () => {
    const response = await route.GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(usageAnswerSchema.safeParse(await response.json()).success).toBe(true);
  });
});
