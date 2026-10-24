import { SearchError, type SearchResult, type SearchTool } from './search-tool';

// Recorded searches: unit tests replay them, and `pnpm eval:search --record`
// writes them.

export type SearchRecording = { queries: { query: string; results: SearchResult[] }[] };

export function replaySearchTool(
  recording: SearchRecording,
  opts: { error?: SearchError['kind']; hang?: boolean } = {},
): SearchTool {
  return {
    async search(query, _options, signal) {
      if (opts.error) throw new SearchError(opts.error, `replayed ${opts.error}`);
      if (opts.hang) {
        await new Promise((_resolve, reject) => {
          if (signal.aborted) reject(signal.reason);
          signal.addEventListener('abort', () => reject(signal.reason), { once: true });
        });
      }
      return recording.queries.find((q) => q.query === query)?.results ?? [];
    },
  };
}

export function recordingSearchTool(
  inner: SearchTool,
  onResult: (query: string, results: SearchResult[]) => void,
): SearchTool {
  return {
    async search(query, options, signal) {
      const results = await inner.search(query, options, signal);
      onResult(query, results);
      return results;
    },
  };
}
