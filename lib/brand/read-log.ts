import { APICallError } from 'ai';
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

// What a failed model call says in the log. Gemini's own answer (an API call
// error) keeps its status and message; any other error gives only its name,
// since its message can quote the model's output and so the owner's details.
export function describeModelError(error: unknown): string {
  let innermost: unknown = error;
  for (let e = error; e instanceof Error; e = e.cause) {
    if (APICallError.isInstance(e)) return `${e.name} ${e.statusCode ?? '-'}: ${e.message}`;
    innermost = e;
  }
  return innermost instanceof Error ? innermost.name : typeof innermost;
}
