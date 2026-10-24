import type { Page } from '@playwright/test';
import type { BrandErrorCode, Profile } from '@/lib/brand/profile';
import type { SearchErrorCode } from '@/lib/brand/search/errors';
import type { SearchAnswer } from '@/lib/brand/search/run';
import { encodeLine, type StreamLine } from '@/lib/brand/stream';

// The brand read's NDJSON answer, built from a profile, so the phone tests
// never reach the real route, a model or a website.
export function streamBody(
  profile: Profile,
  opts: { partials?: number; end?: 'final' | { error: BrandErrorCode } | 'drop' } = {},
): string {
  const { partials = 2, end = 'final' } = opts;
  const lines: StreamLine[] = [];
  if (partials >= 1) lines.push({ type: 'partial', profile: { name: profile.name } });
  if (partials >= 2) {
    lines.push({
      type: 'partial',
      profile: { name: profile.name, contact: profile.contact, location: profile.location },
    });
  }
  if (end === 'final') lines.push({ type: 'final', profile });
  else if (end !== 'drop') lines.push({ type: 'error', code: end.error });
  return lines.map(encodeLine).join('');
}

// Answers each POST to /api/brand/read with the next body (the last one
// repeats), and counts the requests.
export async function fulfilRead(page: Page, bodies: string[]): Promise<{ count(): number }> {
  let requests = 0;
  await page.route('**/api/brand/read', async (route) => {
    const body = bodies[Math.min(requests, bodies.length - 1)] ?? '';
    requests += 1;
    await route.fulfill({ status: 200, contentType: 'application/x-ndjson', body });
  });
  // The essence search answers "unavailable" unless a test calls
  // fulfilSearch, so no test reaches Tavily or Gemini with a real key.
  await page.route('**/api/brand/search', (route) =>
    route.fulfill({ status: 503, json: { error: 'search_unavailable' } }),
  );
  return { count: () => requests };
}

// Answers each POST to /api/brand/search with `answer`, after `delayMs`.
// Called after fulfilRead, so it takes over from its default.
export async function fulfilSearch(
  page: Page,
  answer: SearchAnswer | { status: number; error: SearchErrorCode },
  delayMs = 0,
): Promise<{ count(): number }> {
  let requests = 0;
  await page.route('**/api/brand/search', async (route) => {
    requests += 1;
    if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
    if ('error' in answer && 'status' in answer) {
      await route.fulfill({ status: answer.status, json: { error: answer.error } });
    } else {
      await route.fulfill({ status: 200, json: answer });
    }
  });
  return { count: () => requests };
}
