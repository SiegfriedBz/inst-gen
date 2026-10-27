import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { type Recording, replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR } from '@/lib/brand/fixtures';
import type { TranslateLocale } from '@/lib/posts/translate';
import { TRANSLATE_PROMPT_VERSION } from '@/lib/posts/translate-prompt';
import { runTranslate } from '@/lib/posts/translate-run';

// The two translations recorded with `pnpm eval:translate --record`
// (docs/specs/posts/editor-download, "Tests and evaluation"), replayed.

// Each fixture's first caption, and the price it must keep.
const pairs: [string, TranslateLocale, string][] = [
  ['sen', 'vi', '500k'],
  ['svarga', 'id', '250k'],
];

describe('replayed translations', () => {
  test.each(pairs)('%s in %s keeps its price and duration', async (slug, locale, price) => {
    const recording = JSON.parse(
      readFileSync(join(FIXTURES_DIR, slug, `translate-${locale}.json`), 'utf8'),
    ) as Recording & { caption: string; story?: string };
    expect(recording.promptVersion).toBe(TRANSLATE_PROMPT_VERSION);
    // translate-2: the first post's caption and story text, in one call
    // (docs/specs/posts/story-text).
    expect(recording.story).toBeTruthy();
    const empty = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };
    const out = await runTranslate(
      { text: recording.caption, story: recording.story, locale },
      'sen',
      { model: replayTextModel(empty, { translation: recording }) },
      new AbortController().signal,
    );
    if (!out.ok) throw new Error(`expected ok, got ${out.code}`);
    const final = recording.final as { caption: string; story: string };
    expect(out.response.text).toBe(final.caption);
    expect(out.response.story).toBe(final.story);
    expect(out.response.text).toContain(price);
    expect(out.response.text).toContain('60');
  });
});
