// The essence search's error codes and their statuses, shared by the route and
// the browser (docs/specs/brand/search-essence, "Failures").

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
