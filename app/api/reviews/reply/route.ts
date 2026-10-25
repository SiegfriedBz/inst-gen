import { defaultReplyDeps } from '@/lib/brand/deps';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { REPLY_ERROR_STATUS, type ReplyErrorCode, replyBodySchema } from '@/lib/reviews/reply';
import { runReply } from '@/lib/reviews/reply-run';

// Writes two replies to a Google Maps review (docs/specs/reviews/reply-drafts).
// Reached only with a valid session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 60;

const headers = { 'cache-control': 'no-store' };

function fail(code: ReplyErrorCode): Response {
  return Response.json({ error: code }, { status: REPLY_ERROR_STATUS[code], headers });
}

export async function POST(request: Request): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  let body: ReturnType<typeof replyBodySchema.parse>;
  try {
    body = replyBodySchema.parse(await request.json());
  } catch {
    return fail('invalid_request');
  }
  const out = await runReply(body, ownerId, defaultReplyDeps(), request.signal);
  if (out.ok) return Response.json(out.response, { headers });
  // Nobody is left to read an answer.
  if (out.code === 'aborted') return new Response(null, { status: 499, headers });
  return fail(out.code);
}
