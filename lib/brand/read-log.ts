import type { BrandErrorCode } from './profile';

// One line in the server log per brand read, so a timeout or a model failure
// seen on Vercel has a cause. It never holds page text, the profile or
// anything about the owner (docs/specs/brand/extract-site/spec.md).

export type ReadLog = {
  // '' when the URL didn't parse.
  host: string;
  pages: number;
  photos: number;
  fetchMs: number;
  // The model's first partial, counted from the request's start.
  firstPartialMs: number | null;
  totalMs: number;
  outcome: 'final' | 'aborted' | BrandErrorCode;
  modelError?: string;
};

const MODEL_ERROR_CHARS = 300;

export function formatReadLog(log: ReadLog): string {
  const fields = [
    `host=${log.host}`,
    `pages=${log.pages}`,
    `photos=${log.photos}`,
    `fetch_ms=${log.fetchMs}`,
    `first_partial_ms=${log.firstPartialMs ?? '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
  ];
  if (log.modelError !== undefined) {
    const message = log.modelError.replace(/\s+/g, ' ').slice(0, MODEL_ERROR_CHARS);
    fields.push(`model_error="${message.replaceAll('"', '\\"')}"`);
  }
  return `brand read ${fields.join(' ')}`;
}
