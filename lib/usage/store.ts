import { Redis } from '@upstash/redis';
import type { Env } from './limits';

// Where usage counts live (docs/specs/platform/usage-counters, "Where the
// counts live"): Upstash Redis, or the server's memory off Vercel. A take is
// all or nothing, so two taps at once can't both pass the last unit.

export type Take = { key: string; max: number | null; ttlSeconds: number };
export type TakeResult = { ok: true } | { ok: false; full: number };

export type UsageStore = {
  take(items: Take[]): Promise<TakeResult>;
  giveBack(key: string): Promise<void>;
  read(keys: string[]): Promise<number[]>;
};

export class UsageStoreError extends Error {
  constructor(cause?: unknown) {
    super('usage store unavailable', { cause });
    this.name = 'UsageStoreError';
  }
}

export function memoryStore(now: () => number = Date.now): UsageStore {
  const counts = new Map<string, { n: number; expiresAt: number }>();
  const get = (key: string) => {
    const found = counts.get(key);
    if (!found || found.expiresAt <= now()) return 0;
    return found.n;
  };
  return {
    async take(items) {
      const full = items.findIndex((item) => item.max !== null && get(item.key) + 1 > item.max);
      if (full !== -1) return { ok: false, full };
      for (const item of items) {
        counts.set(item.key, { n: get(item.key) + 1, expiresAt: now() + item.ttlSeconds * 1000 });
      }
      return { ok: true };
    },
    async giveBack(key) {
      const found = counts.get(key);
      if (found && get(key) > 0) found.n -= 1;
    },
    async read(keys) {
      return keys.map(get);
    },
  };
}

// The Redis calls the store makes, so tests can stand in for Upstash.
export type RedisLike = {
  eval(script: string, keys: string[], args: string[]): Promise<unknown>;
  decr(key: string): Promise<number>;
  set(key: string, value: number): Promise<unknown>;
  mget(...keys: string[]): Promise<unknown[]>;
};

// Checks every item, then takes from all; returns 0, or the full item's
// index + 1. A max of -1 counts without a limit.
export const TAKE_SCRIPT = `
for i = 1, #KEYS do
  local max = tonumber(ARGV[i * 2 - 1])
  if max >= 0 and (tonumber(redis.call('GET', KEYS[i]) or '0') + 1) > max then
    return i
  end
end
for i = 1, #KEYS do
  redis.call('INCR', KEYS[i])
  redis.call('EXPIRE', KEYS[i], tonumber(ARGV[i * 2]))
end
return 0
`;

const REDIS_TIMEOUT_MS = 2_000;

async function cut<T>(call: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new UsageStoreError('timeout')), REDIS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([call, timeout]);
  } catch (error) {
    throw error instanceof UsageStoreError ? error : new UsageStoreError(error);
  } finally {
    clearTimeout(timer);
  }
}

export function redisStore(redis: RedisLike): UsageStore {
  return {
    async take(items) {
      const args = items.flatMap((item) => [String(item.max ?? -1), String(item.ttlSeconds)]);
      const reply = Number(
        await cut(
          redis.eval(
            TAKE_SCRIPT,
            items.map((item) => item.key),
            args,
          ),
        ),
      );
      return reply === 0 ? { ok: true } : { ok: false, full: reply - 1 };
    },
    async giveBack(key) {
      // A key that expired meanwhile comes back as -1: put it at 0.
      if ((await cut(redis.decr(key))) < 0) await cut(redis.set(key, 0));
    },
    async read(keys) {
      if (keys.length === 0) return [];
      const values = await cut(redis.mget(...keys));
      return keys.map((_key, i) => Number(values[i] ?? 0) || 0);
    },
  };
}

let store: UsageStore | undefined;

export function getUsageStore(env: Env = process.env): UsageStore {
  if (!store) {
    const url = env.UPSTASH_REDIS_REST_URL;
    const token = env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
      store = redisStore(new Redis({ url, token, retry: false }) as unknown as RedisLike);
    } else {
      console.info("usage: Upstash isn't configured, counting in memory");
      store = memoryStore();
    }
  }
  return store;
}

export function resetUsageStoreForTests(): void {
  store = undefined;
}
