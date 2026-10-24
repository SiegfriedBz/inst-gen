// The app's only door to a web search tool (docs/specs/brand/search-essence).
// Callers see the SearchTool interface, so tests replay recordings and another
// tool can replace Tavily in lib/search/tavily.ts alone.

export type SearchResult = { title: string; url: string; content: string };

export type SearchOptions = {
  country: 'vietnam' | 'indonesia' | null;
  excludeDomains: string[];
};

export interface SearchTool {
  search(query: string, options: SearchOptions, signal: AbortSignal): Promise<SearchResult[]>;
}

// unavailable: no key; busy: rate limit or the month's credits used up.
export class SearchError extends Error {
  constructor(
    readonly kind: 'unavailable' | 'busy' | 'failed',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'SearchError';
  }
}
