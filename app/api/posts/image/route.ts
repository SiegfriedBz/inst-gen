import { defaultImageDeps } from '@/lib/brand/deps';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { IMAGE_ERROR_STATUS, type ImageErrorCode, imageBodySchema } from '@/lib/posts/image';
import { imagesOn } from '@/lib/posts/image-access';
import { makePostImage } from '@/lib/posts/image-run';
import { GIVE_BACK_CODES, giveBackUsage, takeUsage, usageRefusal } from '@/lib/usage/meter';

// Makes one post's image: a 1080×1920 story and its 1080×1350 post crop, as
// base64 JPEGs (docs/specs/posts/generate-images). Reached only with a valid
// session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 300;

const headers = { 'cache-control': 'no-store' };

function fail(code: ImageErrorCode): Response {
  return Response.json({ error: code }, { status: IMAGE_ERROR_STATUS[code], headers });
}

export async function POST(request: Request): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  const deps = imagesOn() ? defaultImageDeps() : null;
  if (!deps) return fail('images_off');
  let body: ReturnType<typeof imageBodySchema.parse>;
  try {
    body = imageBodySchema.parse(await request.json());
  } catch {
    return fail('invalid_request');
  }
  // An attempt's first images are covered by the attempt; a new one is
  // taken from the owner's day. Both count in the image month.
  const usage = await takeUsage({ ownerId, action: body.first ? 'firstImages' : 'newImages' });
  if (!usage.ok) return usageRefusal(usage.code, usage.resetsAt);
  const out = await makePostImage(body, ownerId, deps, request.signal);
  if (out.ok) return Response.json(out.response, { headers });
  if (GIVE_BACK_CODES.has(out.code)) await giveBackUsage(usage.ticket);
  // Nobody is left to read an answer.
  if (out.code === 'aborted') return new Response(null, { status: 499, headers });
  return fail(out.code);
}
