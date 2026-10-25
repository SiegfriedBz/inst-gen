import { defaultTranslateDeps } from '@/lib/brand/deps';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import {
  TRANSLATE_ERROR_STATUS,
  type TranslateErrorCode,
  translateBodySchema,
} from '@/lib/posts/translate';
import { runTranslate } from '@/lib/posts/translate-run';

// Translates one caption for the owner to read in their own language
// (docs/specs/posts/editor-download). Reached only with a valid session:
// proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 60;

const headers = { 'cache-control': 'no-store' };

function fail(code: TranslateErrorCode): Response {
  return Response.json({ error: code }, { status: TRANSLATE_ERROR_STATUS[code], headers });
}

export async function POST(request: Request): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  let body: ReturnType<typeof translateBodySchema.parse>;
  try {
    body = translateBodySchema.parse(await request.json());
  } catch {
    return fail('invalid_request');
  }
  const out = await runTranslate(body, ownerId, defaultTranslateDeps(), request.signal);
  if (out.ok) return Response.json(out.response, { headers });
  // Nobody is left to read an answer.
  if (out.code === 'aborted') return new Response(null, { status: 499, headers });
  return fail(out.code);
}
