import { defaultSearchDeps } from '@/lib/brand/deps';
import { searchBodySchema } from '@/lib/brand/search/queries';
import { runSearch, SEARCH_ERROR_STATUS, SearchStepError } from '@/lib/brand/search/run';

// Looks up what people search for around the business's trade and town, and
// answers additions to its essence as JSON (docs/specs/brand/search-essence).
// Reached only with a valid session: proxy.ts answers 401 otherwise.

export const runtime = 'nodejs';
export const maxDuration = 60;

const HEADERS = { 'cache-control': 'no-store' };

export async function POST(request: Request): Promise<Response> {
  let body: ReturnType<typeof searchBodySchema.parse>;
  try {
    body = searchBodySchema.parse(await request.json());
  } catch {
    return Response.json({ error: 'search_failed' }, { status: 400, headers: HEADERS });
  }
  try {
    const answer = await runSearch(body, defaultSearchDeps(), request.signal);
    return Response.json(answer, { headers: HEADERS });
  } catch (error) {
    if (!(error instanceof SearchStepError)) throw error;
    return Response.json(
      { error: error.code },
      { status: SEARCH_ERROR_STATUS[error.code], headers: HEADERS },
    );
  }
}
