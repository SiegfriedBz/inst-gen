import { z } from 'zod';
import { defaultDeps } from '@/lib/brand/deps';
import { type BrandErrorCode, ERROR_STATUS } from '@/lib/brand/profile';
import { BrandReadError, prepareRead, streamProfile } from '@/lib/brand/read';
import { encodeLine } from '@/lib/brand/stream';

// Reads a business's website and streams its brand profile as NDJSON
// (docs/specs/brand/extract-site/spec.md). Reached only with a valid
// session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 300;

const bodySchema = z.object({ url: z.string() });

function errorResponse(code: BrandErrorCode): Response {
  return Response.json({ error: code }, { status: ERROR_STATUS[code] });
}

export async function POST(request: Request): Promise<Response> {
  let url: string;
  try {
    url = bodySchema.parse(await request.json()).url;
  } catch {
    return errorResponse('invalid_url');
  }

  const deps = defaultDeps();
  let prepared: Awaited<ReturnType<typeof prepareRead>>;
  try {
    prepared = await prepareRead(url, deps, request.signal);
  } catch (error) {
    if (error instanceof BrandReadError) return errorResponse(error.code);
    throw error;
  }

  const lines = streamProfile(prepared, deps, request.signal);
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async pull(controller) {
      const next = await lines.next();
      if (next.done) controller.close();
      else controller.enqueue(encoder.encode(encodeLine(next.value)));
    },
    async cancel() {
      await lines.return(undefined);
    },
  });
  return new Response(body, {
    headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' },
  });
}
