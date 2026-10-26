import { TEXT_MODELS } from '@/lib/ai/text-model';
import { USAGE_STATUS, type UsageCode } from './codes';
import { nextMonth, nextReset, usageDay, usageMonth } from './day';
import {
  type Env,
  imageMonthMax,
  isLimited,
  type LimitedAction,
  OWNER_LIMITS,
  searchesPerMonth,
  textPools,
} from './limits';
import { getUsageStore, type Take, type UsageStore } from './store';

// The routes' one door to the counts (docs/specs/platform/usage-counters):
// before a model, search or image call, take one from the owner's day and
// from every app-wide count the call spends, or refuse with when it comes
// back. A failure that isn't the owner's gives the owner's count back.

export type MeteredAction = LimitedAction | 'searches' | 'firstImages';

export type Ticket = { ownerKey: string | null; ownerId: string; action: MeteredAction };

export type TakeOutcome =
  | { ok: true; ticket: Ticket }
  | { ok: false; code: UsageCode; resetsAt: string };

const DAY_TTL = 2 * 24 * 60 * 60;
const MONTH_TTL = 40 * 24 * 60 * 60;
const UNAVAILABLE_MS = 5 * 60 * 1000;

// The failures the owner didn't cause: their count comes back.
export const GIVE_BACK_CODES: ReadonlySet<string> = new Set([
  'model_busy',
  'model_timeout',
  'model_failed',
  'image_blocked',
  'image_timeout',
  'image_failed',
  'images_paused',
  'search_busy',
  'search_failed',
]);

export const ownerKey = (day: string, ownerId: string, action: MeteredAction) =>
  `usage:${day}:${ownerId}:${action}`;
export const poolKey = (day: string, modelId: string) => `usage:${day}:pool:${modelId}`;
export const monthKey = (month: string, what: 'images' | 'searches') => `usage:${month}:${what}`;

// The text model each text action calls (lib/ai/text-model.ts).
const ACTION_MODEL: Partial<Record<MeteredAction, string>> = {
  reads: TEXT_MODELS.brand,
  searches: TEXT_MODELS.light,
  attempts: TEXT_MODELS.posts,
  rewrites: TEXT_MODELS.posts,
  translations: TEXT_MODELS.light,
  replies: TEXT_MODELS.light,
};

const isImage = (action: MeteredAction) => action === 'firstImages' || action === 'newImages';

type Item = Take & { refusal: { code: UsageCode; resetsAt: Date } };

export function usageItems(
  ownerId: string,
  action: MeteredAction,
  now: Date,
  env: Env,
): { items: Item[]; ownerKey: string | null } {
  const day = usageDay(now);
  const month = usageMonth(now);
  const items: Item[] = [];
  let owner: string | null = null;
  if (action in OWNER_LIMITS && isLimited(ownerId)) {
    owner = ownerKey(day, ownerId, action);
    items.push({
      key: owner,
      max: OWNER_LIMITS[action as LimitedAction],
      ttlSeconds: DAY_TTL,
      refusal: { code: 'limit_reached', resetsAt: nextReset(now) },
    });
  }
  const model = ACTION_MODEL[action];
  const pool = model ? textPools(env).get(model) : undefined;
  if (model && pool !== undefined) {
    items.push({
      key: poolKey(day, model),
      max: pool,
      ttlSeconds: DAY_TTL,
      refusal: { code: 'pool_empty', resetsAt: nextReset(now) },
    });
  }
  if (action === 'searches') {
    items.push({
      key: monthKey(month, 'searches'),
      max: searchesPerMonth(env),
      ttlSeconds: MONTH_TTL,
      refusal: { code: 'limit_reached', resetsAt: nextMonth(now) },
    });
  }
  if (isImage(action)) {
    items.push({
      key: monthKey(month, 'images'),
      max: imageMonthMax(env),
      ttlSeconds: MONTH_TTL,
      refusal: { code: 'images_month', resetsAt: nextMonth(now) },
    });
  }
  return { items, ownerKey: owner };
}

function log(ownerId: string, action: MeteredAction, outcome: string): void {
  console.info(`usage owner=${ownerId} action=${action} outcome=${outcome}`);
}

export async function takeUsage(input: {
  ownerId: string;
  action: MeteredAction;
  now?: Date;
  env?: Env;
  store?: UsageStore;
}): Promise<TakeOutcome> {
  const { ownerId, action } = input;
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const { items, ownerKey: owner } = usageItems(ownerId, action, now, env);
  try {
    const store = input.store ?? getUsageStore();
    const result = await store.take(items.map(({ refusal: _r, ...take }) => take));
    if (!result.ok) {
      const { code, resetsAt } = items[result.full]?.refusal ?? {
        code: 'limit_reached' as const,
        resetsAt: nextReset(now),
      };
      log(ownerId, action, code);
      return { ok: false, code, resetsAt: resetsAt.toISOString() };
    }
    log(ownerId, action, 'taken');
    return { ok: true, ticket: { ownerKey: owner, ownerId, action } };
  } catch (error) {
    log(ownerId, action, 'unavailable');
    console.error(`usage: store failed: ${error instanceof Error ? error.message : 'unknown'}`);
    // Images spend money: never uncounted. Text spends only free quota.
    if (isImage(action)) {
      return {
        ok: false,
        code: 'usage_unavailable',
        resetsAt: new Date(now.getTime() + UNAVAILABLE_MS).toISOString(),
      };
    }
    return { ok: true, ticket: { ownerKey: null, ownerId, action } };
  }
}

export async function giveBackUsage(ticket: Ticket, store?: UsageStore): Promise<void> {
  if (!ticket.ownerKey) return;
  try {
    await (store ?? getUsageStore()).giveBack(ticket.ownerKey);
    log(ticket.ownerId, ticket.action, 'given_back');
  } catch {
    log(ticket.ownerId, ticket.action, 'unavailable');
  }
}

export function usageRefusal(code: UsageCode, resetsAt: string): Response {
  return Response.json(
    { error: code, resetsAt },
    { status: USAGE_STATUS[code], headers: { 'cache-control': 'no-store' } },
  );
}
