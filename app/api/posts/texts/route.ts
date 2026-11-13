import { defaultPostsDeps } from '@/lib/brand/deps';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { newTextsBodySchema, POSTS_ERROR_STATUS } from '@/lib/posts/batch';
import { streamNewTexts } from '@/lib/posts/run';
import { encodePostsLine } from '@/lib/posts/stream';
import { takeUsage, usageRefusal } from '@/lib/usage/meter';
import { giveBackOnError } from '@/lib/usage/stream';

// New words for one suggestion, its images kept, streamed as NDJSON
// (docs/specs/platform/easier-to-use, "New texts for a suggestion"). Reached
// only with a valid session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) {
    return Response.json(
      { error: 'unauthorized' },
      { status: 401, headers: { 'cache-control': 'no-store' } },
    );
  }
  let body: ReturnType<typeof newTextsBodySchema.parse>;
  try {
    body = newTextsBodySchema.parse(await request.json());
  } catch {
    return Response.json(
      { error: 'invalid_profile' },
      { status: POSTS_ERROR_STATUS.invalid_profile, headers: { 'cache-control': 'no-store' } },
    );
  }
  const usage = await takeUsage({ ownerId, action: 'newTexts' });
  if (!usage.ok) return usageRefusal(usage.code, usage.resetsAt);
  const lines = giveBackOnError(
    streamNewTexts(body, defaultPostsDeps(), request.signal),
    usage.ticket,
  );
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await lines.next();
      if (next.done) controller.close();
      else controller.enqueue(encoder.encode(encodePostsLine(next.value)));
    },
    async cancel() {
      await lines.return(undefined);
    },
  });
  return new Response(stream, {
    headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' },
  });
}
