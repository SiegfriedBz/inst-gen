import type { Page } from '@playwright/test';
import type { BrandErrorCode, Profile } from '@/lib/brand/profile';
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
  return { count: () => requests };
}
