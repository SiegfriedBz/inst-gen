import type { Env } from './limits';

// On Vercel the counts must be shared, so the app refuses to run without
// Upstash (docs/specs/platform/usage-counters, "Without the Upstash
// variables"). Never prints a value.
export function usageConfigProblem(env: Env): string | null {
  if (!env.VERCEL_ENV) return null;
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) return null;
  return 'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set on Vercel';
}
