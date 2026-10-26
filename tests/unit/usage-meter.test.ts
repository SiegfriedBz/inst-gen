import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { isUsageCode } from '@/lib/usage/codes';
import { nextReset } from '@/lib/usage/day';
import { giveBackUsage, poolKey, takeUsage, usageRefusal } from '@/lib/usage/meter';
import { memoryStore, type UsageStore } from '@/lib/usage/store';

const now = new Date('2026-10-26T05:00:00Z');
let store: UsageStore;
let info: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  store = memoryStore();
  info = vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

const take = (
  ownerId: string,
  action: Parameters<typeof takeUsage>[0]['action'],
  env: Record<string, string> = {},
) => takeUsage({ ownerId, action, now, env, store });

describe('per-owner limits', () => {
  test('the fourth attempt is refused until midnight Pacific', async () => {
    for (let i = 0; i < 3; i++) expect((await take('sen', 'attempts')).ok).toBe(true);
    expect(await take('sen', 'attempts')).toEqual({
      ok: false,
      code: 'limit_reached',
      resetsAt: nextReset(now).toISOString(),
    });
  });

  test("one spa can't spend another's day", async () => {
    for (let i = 0; i < 3; i++) await take('sen', 'attempts');
    expect((await take('svarga', 'attempts')).ok).toBe(true);
  });

  test('dev passes the owner limit, and still counts in the pool', async () => {
    for (let i = 0; i < 10; i++) expect((await take('dev', 'attempts')).ok).toBe(true);
    const day = '2026-10-25';
    expect(await store.read([poolKey(day, 'gemini-3.5-flash-lite')])).toEqual([10]);
  });

  test('the eleventh new image is refused', async () => {
    for (let i = 0; i < 10; i++) await take('sen', 'newImages');
    expect(await take('sen', 'newImages')).toMatchObject({ ok: false, code: 'limit_reached' });
  });
});

describe('app-wide counts', () => {
  test('an empty pool stops every text action', async () => {
    const env = { TEXT_DAILY_REQUESTS: 'gemini-3.5-flash-lite=2' };
    expect((await take('sen', 'replies', env)).ok).toBe(true);
    expect((await take('svarga', 'reads', env)).ok).toBe(true);
    expect(await take('svarga', 'attempts', env)).toEqual({
      ok: false,
      code: 'pool_empty',
      resetsAt: nextReset(now).toISOString(),
    });
  });

  test('158 images a month pass, the 159th is refused until the 1st', async () => {
    for (let i = 0; i < 158; i++) expect((await take('dev', 'firstImages')).ok).toBe(true);
    expect(await take('sen', 'firstImages')).toEqual({
      ok: false,
      code: 'images_month',
      resetsAt: '2026-11-01T00:00:00.000Z',
    });
  });

  test("searches past the month's cap", async () => {
    const env = { SEARCHES_PER_MONTH: '2' };
    await take('sen', 'searches', env);
    await take('sen', 'searches', env);
    expect(await take('svarga', 'searches', env)).toEqual({
      ok: false,
      code: 'limit_reached',
      resetsAt: '2026-11-01T00:00:00.000Z',
    });
  });
});

describe('giving back', () => {
  test("the owner's count comes back, the pool's doesn't", async () => {
    const out = await take('sen', 'replies');
    if (!out.ok) throw new Error('refused');
    await giveBackUsage(out.ticket, store);
    const day = '2026-10-25';
    expect(
      await store.read([`usage:${day}:sen:replies`, poolKey(day, 'gemini-3.5-flash-lite')]),
    ).toEqual([0, 1]);
  });
});

describe('a store that fails', () => {
  const broken: UsageStore = {
    take: async () => {
      throw new Error('down');
    },
    giveBack: async () => {
      throw new Error('down');
    },
    read: async () => {
      throw new Error('down');
    },
  };

  test('text goes ahead, uncounted', async () => {
    const out = await takeUsage({ ownerId: 'sen', action: 'replies', now, env: {}, store: broken });
    expect(out).toMatchObject({ ok: true, ticket: { ownerKey: null } });
    if (out.ok) await giveBackUsage(out.ticket, broken);
  });

  test('images are refused', async () => {
    const out = await takeUsage({
      ownerId: 'sen',
      action: 'newImages',
      now,
      env: {},
      store: broken,
    });
    expect(out).toMatchObject({ ok: false, code: 'usage_unavailable' });
  });
});

describe('the refusal and the log', () => {
  test('usageRefusal answers 429 with the code and resetsAt', async () => {
    const iso = '2026-10-26T07:00:00.000Z';
    const response = usageRefusal('pool_empty', iso);
    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'pool_empty', resetsAt: iso });
    expect(usageRefusal('usage_unavailable', iso).status).toBe(503);
    expect(isUsageCode('limit_reached')).toBe(true);
    expect(isUsageCode('model_busy')).toBe(false);
  });

  test('one line per take, owner, action and outcome only', async () => {
    for (let i = 0; i < 4; i++) await take('sen', 'attempts');
    expect(info).toHaveBeenLastCalledWith('usage owner=sen action=attempts outcome=limit_reached');
  });
});
