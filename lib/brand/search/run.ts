import { ModelError, type TextModel } from '@/lib/ai/text-model';
import { SearchError, type SearchResult, type SearchTool } from '@/lib/search/search-tool';
import { describeModelError } from '../read-log';
import { type CheckedSearch, checkSearchAnswer } from './checks';
import type { SearchLog } from './log';
import { SEARCH_PROMPT_VERSION, searchPrompt, searchUserText } from './prompt';
import { buildQueries, type SearchBody, searchOptions } from './queries';

// The essence search, end to end: three searches in parallel, one short model
// call, then code's checks (docs/specs/brand/search-essence). It never
// retries: a retry spends free credits.

export const SEARCH_ERROR_CODES = [
  'search_unavailable',
  'search_busy',
  'model_busy',
  'search_failed',
] as const;

export type SearchErrorCode = (typeof SEARCH_ERROR_CODES)[number];

export const SEARCH_ERROR_STATUS: Record<SearchErrorCode, number> = {
  search_unavailable: 503,
  search_busy: 503,
  model_busy: 503,
  search_failed: 502,
};

export type SearchAnswer = CheckedSearch & { searchedAt: string; searchPromptVersion: string };

export type SearchDeps = {
  tool: SearchTool;
  model: TextModel;
  now?: () => Date;
  timeoutMs?: number;
  log?: (entry: SearchLog) => void;
};

export class SearchStepError extends Error {
  constructor(readonly code: SearchErrorCode) {
    super(code);
    this.name = 'SearchStepError';
  }
}

export const SEARCH_TIMEOUT_MS = 20_000;

function errorCode(error: unknown): SearchErrorCode {
  if (error instanceof SearchError) {
    if (error.kind === 'unavailable') return 'search_unavailable';
    if (error.kind === 'busy') return 'search_busy';
  }
  if (error instanceof ModelError && error.kind === 'busy') return 'model_busy';
  return 'search_failed';
}

// What the log says about a failure: Tavily's status and message, or what
// describeModelError keeps of a model error.
function errorText(error: unknown): string {
  return error instanceof SearchError ? error.message : describeModelError(error);
}

export async function runSearch(
  body: SearchBody,
  deps: SearchDeps,
  signal: AbortSignal,
): Promise<SearchAnswer> {
  const now = deps.now ?? (() => new Date());
  const started = Date.now();
  const step = AbortSignal.any([signal, AbortSignal.timeout(deps.timeoutMs ?? SEARCH_TIMEOUT_MS)]);
  const options = searchOptions(body);
  const entry: SearchLog = {
    host: options.excludeDomains[0] ?? '',
    results: 0,
    searchMs: null,
    modelMs: null,
    totalMs: 0,
    outcome: 'aborted',
  };
  try {
    const found = await Promise.all(
      buildQueries(body).map((query) => deps.tool.search(query, options, step)),
    );
    const results: SearchResult[] = [];
    for (const result of found.flat()) {
      if (!results.some((r) => r.url === result.url)) results.push(result);
    }
    entry.results = results.length;
    entry.searchMs = Date.now() - started;

    let checked: CheckedSearch = { searchTerms: [], moments: [], placeSymbols: [], dropped: [] };
    if (results.length > 0) {
      const modelStarted = Date.now();
      const answer = await deps.model.searchEssence(
        { system: searchPrompt(), text: searchUserText(body, results) },
        step,
      );
      entry.modelMs = Date.now() - modelStarted;
      checked = checkSearchAnswer(answer, { results, essence: body.essence });
    }
    entry.outcome = 'answered';
    return {
      ...checked,
      searchedAt: now().toISOString(),
      searchPromptVersion: SEARCH_PROMPT_VERSION,
    };
  } catch (error) {
    const code = errorCode(error);
    // A client that left isn't a failure of the search.
    entry.outcome = signal.aborted ? 'aborted' : code;
    entry.error = errorText(error);
    throw new SearchStepError(code);
  } finally {
    entry.totalMs = Date.now() - started;
    deps.log?.(entry);
  }
}
