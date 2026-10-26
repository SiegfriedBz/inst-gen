import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { imagesOn } from '@/lib/posts/image-access';
import { readUsage } from '@/lib/usage/read';

// What the signed-in owner has left today, for the usage bar
// (docs/specs/platform/usage-counters, "Reading what's left"). Reached only
// with a valid session: proxy.ts answers 401 otherwise. Logs nothing.

export const runtime = 'nodejs';

const headers = { 'cache-control': 'no-store' };

export async function GET(): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) return Response.json({ error: 'unauthorized' }, { status: 401, headers });
  return Response.json(await readUsage({ ownerId, imagesOn: imagesOn() }), { headers });
}
