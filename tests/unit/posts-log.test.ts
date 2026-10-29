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
      storyCuts: 0,
      storyCtas: 0,
      emojiFixes: 0,
      offerFixes: 0,
      modelMs: 9000,
      totalMs: 9010,
      outcome: 'final',
    });
    expect(line).toBe(
      'posts host=svargabalimassage.com kind=plan model=gemini-3.5-flash-lite prompt=posts-1 kept=6 flags=1 story_cuts=0 story_ctas=0 emoji_fixes=0 offer_fixes=0 model_ms=9000 total_ms=9010 outcome=final',
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
      storyCuts: 0,
      storyCtas: 0,
      emojiFixes: 0,
      offerFixes: 0,
      modelMs: null,
      totalMs: 5,
      outcome: 'model_busy',
      error: 'quota "exceeded"\nretry later',
    });
    expect(line).toContain('error="quota \\"exceeded\\" retry later"');
  });

  test('counts story cuts, emoji and offer fixes, never their text', () => {
    const line = formatPostsLog({
      host: 'h',
      kind: 'plan',
      model: 'm',
      promptVersion: 'posts-5',
      kept: 6,
      flags: 0,
      storyCuts: 1,
      storyCtas: 2,
      emojiFixes: 7,
      offerFixes: 3,
      modelMs: 10,
      totalMs: 12,
      outcome: 'final',
    });
    expect(line).toContain(
      ' flags=0 story_cuts=1 story_ctas=2 emoji_fixes=7 offer_fixes=3 model_ms=10 ',
    );
  });
});
