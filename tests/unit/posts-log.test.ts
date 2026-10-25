import { describe, expect, test } from 'vitest';
import { formatPostsLog } from '@/lib/posts/log';

describe('formatPostsLog', () => {
  test('is one line with the step, model and times', () => {
    const line = formatPostsLog({
      host: 'svargabalimassage.com',
      kind: 'plan',
      model: 'gemini-3.5-flash-lite',
      promptVersion: 'posts-1',
      kept: 6,
      flags: 1,
      modelMs: 9000,
      totalMs: 9010,
      outcome: 'final',
    });
    expect(line).toBe(
      'posts host=svargabalimassage.com kind=plan model=gemini-3.5-flash-lite prompt=posts-1 kept=6 flags=1 model_ms=9000 total_ms=9010 outcome=final',
    );
  });

  test('keeps a short error message', () => {
    const line = formatPostsLog({
      host: 'h',
      kind: 'rewrite',
      model: 'm',
      promptVersion: 'posts-1',
      kept: 0,
      flags: 0,
      modelMs: null,
      totalMs: 5,
      outcome: 'model_busy',
      error: 'quota "exceeded"\nretry later',
    });
    expect(line).toContain('error="quota \\"exceeded\\" retry later"');
  });
});
