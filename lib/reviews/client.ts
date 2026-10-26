import type { Profile } from '@/lib/brand/profile';
import { countryOf } from '@/lib/brand/search-client';
import { noteUsage } from '@/lib/usage/client';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';
import {
  REPLY_ERROR_CODES,
  type ReplyBody,
  type ReplyErrorCode,
  type ReplyResponse,
  replyResponseSchema,
  type ScreenLocale,
} from './reply';

// Two replies to a review from the browser (docs/specs/reviews/reply-drafts,
// "The model call"): the review, whether there is a name, and the business's
// name, summary and country. The guest's name never goes.

export type RepliesResult =
  | { ok: true; answer: ReplyResponse }
  | { ok: false; code: ReplyErrorCode | UsageCode | 'offline' | 'signedOut' };

type Deps = { fetch: typeof fetch };

const defaultDeps = (): Deps => ({ fetch: (...args) => fetch(...args) });

function isErrorCode(value: unknown): value is ReplyErrorCode {
  return (REPLY_ERROR_CODES as readonly unknown[]).includes(value);
}

export type RepliesInput = {
  review: string;
  name: string;
  locale: ScreenLocale;
  profile: Profile;
  avoid: [string, string] | null;
};

// What goes to the route: the name is reduced to whether there is one.
export function replyBodyFor(input: RepliesInput): ReplyBody {
  return {
    review: input.review.trim(),
    hasName: input.name.trim() !== '',
    locale: input.locale,
    business: {
      name: input.profile.name.value,
      summary: input.profile.summary?.value ?? null,
    },
    country: countryOf(input.profile),
    avoid: input.avoid,
  };
}

export async function requestReplies(
  input: RepliesInput,
  deps: Deps = defaultDeps(),
): Promise<RepliesResult> {
  const body = replyBodyFor(input);
  let response: Response;
  try {
    response = await deps.fetch('/api/reviews/reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, code: 'offline' };
  }
  // Settled: the usage bar reads again.
  noteUsage();
  if (response.status === 401) return { ok: false, code: 'signedOut' };
  try {
    const json: unknown = await response.json();
    if (!response.ok) {
      const code = json && typeof json === 'object' ? (json as { error?: unknown }).error : null;
      return { ok: false, code: isErrorCode(code) || isUsageCode(code) ? code : 'model_failed' };
    }
    return { ok: true, answer: replyResponseSchema.parse(json) };
  } catch {
    return { ok: false, code: 'model_failed' };
  }
}
