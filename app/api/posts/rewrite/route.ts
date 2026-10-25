import { defaultPostsDeps } from '@/lib/brand/deps';
import { POSTS_ERROR_STATUS, rewriteBodySchema } from '@/lib/posts/batch';
import { streamRewrite } from '@/lib/posts/run';
import { encodePostsLine } from '@/lib/posts/stream';

// Rewrites a batch's captions after a brand edit and streams them as
// NDJSON (docs/specs/posts/generate-copy). Reached only with a valid session:
// proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  let body: ReturnType<typeof rewriteBodySchema.parse>;
  try {
    body = rewriteBodySchema.parse(await request.json());
  } catch {
    return Response.json(
      { error: 'invalid_profile' },
      { status: POSTS_ERROR_STATUS.invalid_profile, headers: { 'cache-control': 'no-store' } },
    );
  }
  const lines = streamRewrite(body, defaultPostsDeps(), request.signal);
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
