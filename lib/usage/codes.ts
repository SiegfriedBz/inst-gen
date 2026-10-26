// What a counted route answers when a count is full or can't be read
// (docs/specs/platform/usage-counters, "When a count is taken and given
// back"). Shared with the browser.

export const USAGE_CODES = [
  'limit_reached',
  'pool_empty',
  'images_month',
  'usage_unavailable',
] as const;
export type UsageCode = (typeof USAGE_CODES)[number];

export const USAGE_STATUS: Record<UsageCode, number> = {
  limit_reached: 429,
  pool_empty: 429,
  images_month: 429,
  usage_unavailable: 503,
};

export function isUsageCode(value: unknown): value is UsageCode {
  return (USAGE_CODES as readonly unknown[]).includes(value);
}
