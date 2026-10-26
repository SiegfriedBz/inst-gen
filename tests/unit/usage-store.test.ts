import { afterEach, describe, expect, test, vi } from 'vitest';
import { memoryStore, type RedisLike, redisStore, UsageStoreError } from '@/lib/usage/store';

const DAY = 172_800;
const MONTH = 3_456_000;

afterEach(() => {
  vi.useRealTimers();
});

describe('the memory store', () => {
  test('takes one from every item with room', async () => {
    const store = memoryStore();
    const items = [
      { key: 'a', max: 3, ttlSeconds: DAY },
      { key: 'b', max: 1, ttlSeconds: DAY },
    ];
    expect(await store.take(items)).toEqual({ ok: true });
    expect(await store.read(['a', 'b'])).toEqual([1, 1]);
  });

  test('takes nothing when one item is full, and says which', async () => {
    const store = memoryStore();
    await store.take([{ key: 'b', max: 1, ttlSeconds: DAY }]);
    const out = await store.take([
      { key: 'a', max: 3, ttlSeconds: DAY },
      { key: 'b', max: 1, ttlSeconds: DAY },
    ]);
    expect(out).toEqual({ ok: false, full: 1 });
    expect(await store.read(['a', 'b'])).toEqual([0, 1]);
  });

  test('max null counts without a limit', async () => {
    const store = memoryStore();
    for (let i = 0; i < 50; i++) await store.take([{ key: 'p', max: null, ttlSeconds: DAY }]);
    expect(await store.read(['p'])).toEqual([50]);
  });

  test('five racing takes for three units: three pass', async () => {
    const store = memoryStore();
    const outs = await Promise.all(
      Array.from({ length: 5 }, () => store.take([{ key: 'a', max: 3, ttlSeconds: DAY }])),
    );
    expect(outs.filter((o) => o.ok)).toHaveLength(3);
  });

  test('giveBack lowers by one, never below 0', async () => {
    const store = memoryStore();
    await store.take([{ key: 'a', max: 3, ttlSeconds: DAY }]);
    await store.giveBack('a');
    await store.giveBack('a');
    expect(await store.read(['a'])).toEqual([0]);
  });

  test('a key past its ttl reads 0', async () => {
    let now = 0;
    const store = memoryStore(() => now);
    await store.take([{ key: 'a', max: 3, ttlSeconds: 10 }]);
    now = 10_001;
    expect(await store.read(['a'])).toEqual([0]);
  });
});

function fakeRedis(reply: unknown = 0) {
  const calls: unknown[][] = [];
  const redis: RedisLike = {
    eval: async (...args) => {
      calls.push(args);
      return reply;
    },
    decr: async () => 0,
    set: async () => 'OK',
    mget: async () => [],
  };
  return { redis, calls };
}

describe('the Redis store', () => {
  test('one script for the whole take', async () => {
    const { redis, calls } = fakeRedis(0);
    const store = redisStore(redis);
    const out = await store.take([
      { key: 'usage:o', max: 3, ttlSeconds: DAY },
      { key: 'usage:m', max: null, ttlSeconds: MONTH },
    ]);
    expect(out).toEqual({ ok: true });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.[1]).toEqual(['usage:o', 'usage:m']);
    expect(calls[0]?.[2]).toEqual(['3', '172800', '-1', '3456000']);
  });

  test("the script's index maps to the full item", async () => {
    const store = redisStore(fakeRedis(2).redis);
    expect(
      await store.take([
        { key: 'a', max: 3, ttlSeconds: DAY },
        { key: 'b', max: 3, ttlSeconds: DAY },
      ]),
    ).toEqual({ ok: false, full: 1 });
  });

  test('a Redis that never answers is cut at 2 seconds', async () => {
    vi.useFakeTimers();
    const redis: RedisLike = {
      eval: () => new Promise(() => {}),
      decr: async () => 0,
      set: async () => 'OK',
      mget: async () => [],
    };
    const taking = redisStore(redis).take([{ key: 'a', max: 1, ttlSeconds: DAY }]);
    const caught = taking.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(2_000);
    expect(await caught).toBeInstanceOf(UsageStoreError);
  });

  test('read turns missing keys into 0', async () => {
    const redis: RedisLike = { ...fakeRedis().redis, mget: async () => [3, null, '2'] };
    expect(await redisStore(redis).read(['a', 'b', 'c'])).toEqual([3, 0, 2]);
  });
});
