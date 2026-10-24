import { describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { ModelError, type TextModel } from '@/lib/ai/text-model';
import { formatSearchLog, type SearchLog } from '@/lib/brand/search/log';
import { SEARCH_PROMPT_VERSION } from '@/lib/brand/search/prompt';
import type { SearchBody } from '@/lib/brand/search/queries';
import { runSearch, SEARCH_ERROR_STATUS, SearchStepError } from '@/lib/brand/search/run';
import { replaySearchTool, type SearchRecording } from '@/lib/search/replay';
import type { SearchOptions, SearchTool } from '@/lib/search/search-tool';

const GUIDE = 'https://vietnam.travel/da-nang';
const body: SearchBody = {
  siteUrl: 'https://sendanangmassage.com/',
  category: 'massage spa',
  town: 'Da Nang',
  area: null,
  serviceArea: null,
  country: 'VN',
  essence: { feeling: [], placeSymbols: [], senses: [], moments: [], searchTerms: [] },
};
const recording: SearchRecording = {
  queries: [
    {
      query: 'massage spa Da Nang',
      results: [{ title: 'Da Nang guide', url: GUIDE, content: 'Surf at My Khe' }],
    },
    {
      query: 'things to do in Da Nang',
      results: [{ title: 'Da Nang guide', url: GUIDE, content: 'Surf at My Khe' }],
    },
  ],
};
const answer = {
  searchTerms: ['hotel massage da nang'],
  moments: [{ value: 'after hiking Ba Na Hills', source: GUIDE }],
  placeSymbols: ['marble mountains'],
};
const rec = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };
const NOW = new Date('2026-10-24T12:00:00.000Z');
const signal = () => new AbortController().signal;

function deps(over: { tool?: SearchTool; model?: TextModel; timeoutMs?: number } = {}) {
  const log = vi.fn<(entry: SearchLog) => void>();
  return {
    log,
    deps: {
      tool: over.tool ?? replaySearchTool(recording),
      model: over.model ?? replayTextModel(rec, { searchAnswer: answer }),
      now: () => NOW,
      timeoutMs: over.timeoutMs,
      log,
    },
  };
}

describe('the essence search step', () => {
  test('answers checked additions with searchedAt and the prompt version', async () => {
    const { deps: d } = deps();
    expect(await runSearch(body, d, signal())).toEqual({
      ...answer,
      dropped: [],
      searchedAt: NOW.toISOString(),
      searchPromptVersion: SEARCH_PROMPT_VERSION,
    });
  });

  test('runs the three queries with the options', async () => {
    const seen: { query: string; options: SearchOptions }[] = [];
    const tool: SearchTool = {
      async search(query, options) {
        seen.push({ query, options });
        return [];
      },
    };
    await runSearch(body, deps({ tool }).deps, signal());
    expect(seen).toHaveLength(3);
    for (const call of seen) {
      expect(call.options).toEqual({
        country: 'vietnam',
        excludeDomains: ['sendanangmassage.com'],
      });
    }
  });

  test('sends each result to the model once', async () => {
    let text = '';
    const model: TextModel = {
      ...replayTextModel(rec, { searchAnswer: answer }),
      async searchEssence(input) {
        text = input.text;
        return answer;
      },
    };
    await runSearch(body, deps({ model }).deps, signal());
    expect(text.split(`### Result: ${GUIDE}`)).toHaveLength(2);
  });

  test('skips the model when nothing is found', async () => {
    const searchEssence = vi.fn();
    const model = { ...replayTextModel(rec), searchEssence } as TextModel;
    const result = await runSearch(
      body,
      deps({ tool: replaySearchTool({ queries: [] }), model }).deps,
      signal(),
    );
    expect(searchEssence).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      searchTerms: [],
      moments: [],
      placeSymbols: [],
      searchedAt: NOW.toISOString(),
    });
  });

  test.each([
    ['unavailable', 'search_unavailable'],
    ['busy', 'search_busy'],
    ['failed', 'search_failed'],
  ] as const)('maps a %s search to %s', async (kind, code) => {
    const { deps: d } = deps({ tool: replaySearchTool(recording, { error: kind }) });
    const error = await runSearch(body, d, signal()).catch((e) => e);
    expect(error).toBeInstanceOf(SearchStepError);
    expect(error.code).toBe(code);
  });

  test('maps a busy model to model_busy, and a failed one to search_failed', async () => {
    const busy = deps({ model: replayTextModel(rec, { error: 'busy' }) }).deps;
    await expect(runSearch(body, busy, signal())).rejects.toMatchObject({ code: 'model_busy' });
    const failed = deps({ model: replayTextModel(rec, { error: 'failed' }) }).deps;
    await expect(runSearch(body, failed, signal())).rejects.toMatchObject({
      code: 'search_failed',
    });
  });

  test('gives up at the timeout with search_failed', async () => {
    const { deps: d, log } = deps({
      tool: replaySearchTool(recording, { hang: true }),
      timeoutMs: 50,
    });
    await expect(runSearch(body, d, signal())).rejects.toMatchObject({ code: 'search_failed' });
    expect(log.mock.calls[0]?.[0].outcome).toBe('search_failed');
  });

  test('logs one line, without snippets or the answer', async () => {
    const { deps: d, log } = deps();
    await runSearch(body, d, signal());
    expect(log).toHaveBeenCalledTimes(1);
    const entry = log.mock.calls[0]?.[0] as SearchLog;
    expect(entry).toMatchObject({ host: 'sendanangmassage.com', results: 1, outcome: 'answered' });
    const line = formatSearchLog(entry);
    expect(line).toMatch(/^brand search host=sendanangmassage\.com results=1 search_ms=\d+ /);
    expect(line).not.toContain('Surf');
    expect(line).not.toContain('hotel massage');
  });

  test('logs the model error message', async () => {
    const model = {
      ...replayTextModel(rec),
      searchEssence: async () => {
        throw new ModelError('failed', 'boom');
      },
    } as TextModel;
    const { deps: d, log } = deps({ model });
    await runSearch(body, d, signal()).catch(() => {});
    expect(log.mock.calls[0]?.[0].outcome).toBe('search_failed');
    expect(log.mock.calls[0]?.[0].error).toBeDefined();
  });

  test('the statuses match the spec', () => {
    expect(SEARCH_ERROR_STATUS).toEqual({
      search_unavailable: 503,
      search_busy: 503,
      model_busy: 503,
      search_failed: 502,
    });
  });
});
