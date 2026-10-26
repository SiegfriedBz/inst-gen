import { defaultSearchDeps } from '@/lib/brand/deps';
import { searchBodySchema } from '@/lib/brand/search/queries';
import { runSearch, SEARCH_ERROR_STATUS, SearchStepError } from '@/lib/brand/search/run';
import { getCurrentOwner } from '@/lib/pilot/current-owner';
import { GIVE_BACK_CODES, giveBackUsage, takeUsage } from '@/lib/usage/meter';

// Looks up what people search for around the business's trade and town, and
// answers additions to its essence as JSON (docs/specs/brand/search-essence).
// Reached only with a valid session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 60;

const HEADERS = { 'cache-control': 'no-store' };

export async function POST(request: Request): Promise<Response> {
  const ownerId = await getCurrentOwner();
  if (!ownerId) return Response.json({ error: 'unauthorized' }, { status: 401, headers: HEADERS });
  let body: ReturnType<typeof searchBodySchema.parse>;
  try {
    body = searchBodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: 'search_failed' }, { status: 400, headers: HEADERS });
  }
  // A full month or pool: search can't run, and the panel says nothing
  // (docs/specs/brand/search-essence, "Failures").
  const usage = await takeUsage({ ownerId, action: 'searches' });
  if (!usage.ok) {
    return Response.json(
      { error: 'search_unavailable' },
      { status: SEARCH_ERROR_STATUS.search_unavailable, headers: HEADERS },
    );
  }
  try {
    const answer = await runSearch(body, defaultSearchDeps(), request.signal);
    return Response.json(answer, { headers: HEADERS });
  } catch (error) {
    if (!(error instanceof SearchStepError)) throw error;
    if (GIVE_BACK_CODES.has(error.code)) await giveBackUsage(usage.ticket);
    return Response.json(
      { error: error.code },
      { status: SEARCH_ERROR_STATUS[error.code], headers: HEADERS },
    );
  }
}
