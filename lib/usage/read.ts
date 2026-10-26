import { TEXT_MODELS } from '@/lib/ai/text-model';
import { BAR_ACTIONS, type BarCounts, type UsageAnswer } from './answer';
import { nextMonth, nextReset, usageDay, usageMonth } from './day';
import { type Env, imageMonthMax, isLimited, OWNER_LIMITS, textPools } from './limits';
import { monthKey, poolKey, usageItems } from './meter';
import { getUsageStore, type UsageStore } from './store';

// What the signed-in owner has left today, for the usage bar. A text count is
// 0 when its model's pool is empty, so the bar never promises what the pool
// can't give. A store that fails reads as nothing used, as text fails open.
export async function readUsage(input: {
  ownerId: string;
  now?: Date;
  env?: Env;
  store?: UsageStore;
  imagesOn: boolean;
}): Promise<UsageAnswer> {
  const { ownerId, imagesOn } = input;
  const now = input.now ?? new Date();
  const env = input.env ?? process.env;
  const pools = textPools(env);
  const day = usageDay(now);
  const models = [...new Set(Object.values(TEXT_MODELS))].filter((m) => pools.has(m));
  const perAction = BAR_ACTIONS.map((action) => usageItems(ownerId, action, now, env).items);
  const imagesKey = monthKey(usageMonth(now), 'images');
  const keys = [
    ...new Set([
      ...perAction.flat().map((item) => item.key),
      ...models.map((m) => poolKey(day, m)),
      imagesKey,
    ]),
  ];
  let values: number[];
  try {
    values = await (input.store ?? getUsageStore()).read(keys);
  } catch {
    values = keys.map(() => 0);
  }
  const used = new Map(keys.map((key, i) => [key, values[i] ?? 0]));
  const count = (key: string) => used.get(key) ?? 0;

  const poolEmpty = models.some((m) => count(poolKey(day, m)) >= (pools.get(m) ?? 0));
  const monthFull = count(imagesKey) >= imageMonthMax(env);
  const answer: UsageAnswer = {
    resetsAt: nextReset(now).toISOString(),
    limited: isLimited(ownerId),
    poolEmpty,
    images: { on: imagesOn, monthFull, backAt: nextMonth(now).toISOString() },
  };
  if (!answer.limited) return answer;

  const left = {} as BarCounts;
  const limits = {} as BarCounts;
  BAR_ACTIONS.forEach((action, i) => {
    limits[action] = OWNER_LIMITS[action];
    const room = (perAction[i] ?? []).map((item) =>
      item.max === null ? Number.POSITIVE_INFINITY : item.max - count(item.key),
    );
    left[action] = Math.max(0, Math.min(...room));
  });
  return { ...answer, left, limits };
}
