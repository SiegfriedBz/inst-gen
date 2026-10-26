import { afterEach, describe, expect, test, vi } from 'vitest';
import { usageConfigProblem } from '@/lib/usage/config';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('the Upstash check', () => {
  test('off Vercel, nothing is needed', () => {
    expect(usageConfigProblem({})).toBeNull();
  });

  test('on Vercel, both variables are needed', () => {
    expect(usageConfigProblem({ VERCEL_ENV: 'production' })).toBe(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set on Vercel',
    );
    expect(
      usageConfigProblem({
        VERCEL_ENV: 'preview',
        UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
      }),
    ).not.toBeNull();
    expect(
      usageConfigProblem({
        VERCEL_ENV: 'production',
        UPSTASH_REDIS_REST_URL: 'https://x.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 't',
      }),
    ).toBeNull();
  });

  test('the gate treats a missing Upstash on Vercel as not configured', async () => {
    vi.stubEnv('PILOT_PASSPHRASES', 'test-lotus-river-sen');
    vi.stubEnv('SESSION_SECRET', 'test-session-secret-not-for-production-0001');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { getPilotConfig } = await import('@/lib/pilot/runtime-config');
    expect(getPilotConfig().ok).toBe(false);
  });
});
