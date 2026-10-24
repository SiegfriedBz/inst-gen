import { SearchError, type SearchResult, type SearchTool } from './search-tool';

// Tavily's search API on the free Researcher plan: a basic search costs one
// credit, and the plan stops when the month's credits are used up
// (docs/specs/brand/search-essence, "The queries").

const ENDPOINT = 'https://api.tavily.com/search';
// 429: rate limit; 432: plan limit; 433: pay-as-you-go limit.
const BUSY_STATUSES = [429, 432, 433];
const MESSAGE_CHARS = 200;

export function tavilySearchTool(deps: { fetch?: typeof fetch; apiKey?: string } = {}): SearchTool {
  const doFetch = deps.fetch ?? ((...args) => globalThis.fetch(...args));
  return {
    async search(query, options, signal) {
      const apiKey = deps.apiKey ?? process.env.TAVILY_API_KEY;
      if (!apiKey) throw new SearchError('unavailable', 'TAVILY_API_KEY is not set');
      const response = await doFetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          query,
          // Basic, never auto: auto may switch to advanced, which costs 2.
          search_depth: 'basic',
          auto_parameters: false,
          max_results: 5,
          topic: 'general',
          ...(options.country ? { country: options.country } : {}),
          exclude_domains: options.excludeDomains,
        }),
        signal,
      });
      if (!response.ok) {
        const text = (await response.text().catch(() => '')).slice(0, MESSAGE_CHARS);
        const kind = BUSY_STATUSES.includes(response.status) ? 'busy' : 'failed';
        throw new SearchError(kind, `Tavily ${response.status}: ${text}`);
      }
      const body = (await response.json()) as { results?: Partial<SearchResult>[] };
      return (body.results ?? []).flatMap((r) =>
        typeof r.url === 'string'
          ? [{ title: r.title ?? '', url: r.url, content: r.content ?? '' }]
          : [],
      );
    },
  };
}
