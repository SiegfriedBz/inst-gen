import type { SearchErrorCode } from './run';

// One line in the server log per essence search, like the brand read's
// (lib/brand/read-log.ts). It never holds the snippets, the model's answer or
// anything about the owner (docs/specs/brand/search-essence, "Failures").

export type SearchLog = {
  host: string;
  // Distinct result pages found.
  results: number;
  // null when the step ended before that part ran.
  searchMs: number | null;
  modelMs: number | null;
  totalMs: number;
  outcome: 'answered' | 'aborted' | SearchErrorCode;
  error?: string;
};

const ERROR_CHARS = 300;

export function formatSearchLog(log: SearchLog): string {
  const fields = [
    `host=${log.host}`,
    `results=${log.results}`,
    `search_ms=${log.searchMs ?? '-'}`,
    `model_ms=${log.modelMs ?? '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
  ];
  if (log.error !== undefined) {
    const message = log.error.replace(/\s+/g, ' ').slice(0, ERROR_CHARS);
    fields.push(`error="${message.replaceAll('"', '\\"')}"`);
  }
  return `brand search ${fields.join(' ')}`;
}
