import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { normaliseSource } from '@/lib/brand/checks';
import { FIXTURES_DIR, loadFixture } from '@/lib/brand/fixtures';
import { buildQueries } from '@/lib/brand/search/queries';
import { runSearch } from '@/lib/brand/search/run';
import { replaySearchTool } from '@/lib/search/replay';

// The essence searches recorded by `pnpm eval:search --record`, replayed with
// no network (docs/specs/brand/search-essence, "Tests and evaluation").

const slugs = readdirSync(FIXTURES_DIR).filter((slug) =>
  existsSync(join(FIXTURES_DIR, slug, 'search.json')),
);
const noBrandRead = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };

describe('recorded essence searches', () => {
  test('cover Sen, Svarga and three more fixtures', () => {
    expect(slugs).toEqual(expect.arrayContaining(['sen', 'svarga']));
    expect(slugs.length).toBeGreaterThanOrEqual(5);
  });

  test.each(slugs)('%s replays to a checked answer', async (slug) => {
    const { search } = loadFixture(join(FIXTURES_DIR, slug));
    if (!search) throw new Error('no search.json');
    // A change to the queries needs new recordings.
    expect(search.queries.map((q) => q.query)).toEqual(buildQueries(search.body));
    const answer = await runSearch(
      search.body,
      {
        tool: replaySearchTool({ queries: search.queries }),
        model: replayTextModel(noBrandRead, { searchAnswer: search.answer }),
      },
      new AbortController().signal,
    );
    expect(answer.searchTerms.length).toBeGreaterThan(0);
    const urls = search.queries.flatMap((q) => q.results.map((r) => r.url));
    for (const moment of answer.moments) {
      expect(normaliseSource(moment.source, urls)).not.toBeNull();
    }
    expect(answer.searchPromptVersion).toBe(search.promptVersion);
  });
});
