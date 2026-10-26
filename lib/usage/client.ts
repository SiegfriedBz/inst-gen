import { type UsageAnswer, usageAnswerSchema } from './answer';

// The usage bar's answer, from the browser. A counted request says when it
// has settled, so the bar reads again (docs/specs/platform/usage-counters,
// "The usage bar").

export const USAGE_EVENT = 'shopfront:usage';

export async function fetchUsage(
  deps: { fetch: typeof fetch } = { fetch: (...args) => fetch(...args) },
): Promise<UsageAnswer | null> {
  try {
    const response = await deps.fetch('/api/usage', { cache: 'no-store' });
    if (!response.ok) return null;
    return usageAnswerSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export function noteUsage(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(USAGE_EVENT));
}
