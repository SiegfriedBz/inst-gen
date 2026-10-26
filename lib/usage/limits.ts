// What each owner may spend a day, and the app-wide pools and monthly caps
// (docs/specs/platform/usage-counters, "What is counted"). Changing a limit is
// a one-line change here and its test.

export type Env = Record<string, string | undefined>;

export const OWNER_LIMITS = {
  reads: 3,
  attempts: 3,
  rewrites: 5,
  translations: 30,
  newImages: 10,
  replies: 20,
} as const;
export type LimitedAction = keyof typeof OWNER_LIMITS;

// The developer tests the deployment; their calls still count app-wide.
export const UNLIMITED_OWNERS = ['dev'] as const;

export function isLimited(ownerId: string): boolean {
  return !(UNLIMITED_OWNERS as readonly string[]).includes(ownerId);
}

// Decision 0003's free-tier numbers, unconfirmed: read from configuration so a
// change in AI Studio needs no code change.
const DEFAULT_TEXT_POOLS = 'gemini-3.5-flash-lite=500,gemini-3.8-flash=20';

export function textPools(env: Env = process.env): Map<string, number> {
  const raw = env.TEXT_DAILY_REQUESTS?.trim() || DEFAULT_TEXT_POOLS;
  const pools = new Map<string, number>();
  for (const entry of raw.split(',')) {
    const [model, size, ...rest] = entry.split('=').map((s) => s.trim());
    const n = Number(size);
    if (!model || rest.length > 0 || !Number.isInteger(n) || n < 0 || size === '') {
      console.error(`usage: TEXT_DAILY_REQUESTS entry ignored: ${entry.trim()}`);
      continue;
    }
    pools.set(model, n);
  }
  return pools;
}

function positive(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return value !== undefined && value.trim() !== '' && Number.isFinite(n) && n > 0 ? n : fallback;
}

// Decision 0004: Nano Banana 2.1 at 2K, and the $8 a month cap.
export function imageMonthMax(env: Env = process.env): number {
  const price = positive(env.IMAGE_PRICE_USD, 0.0504);
  const cap = positive(env.IMAGE_MONTH_CAP_USD, 8);
  return Math.floor(cap / price + 1e-9);
}

// 3 Tavily credits a search: 300 spend 900 of the 1,000 free a month.
export function searchesPerMonth(env: Env = process.env): number {
  return Math.floor(positive(env.SEARCHES_PER_MONTH, 300));
}
