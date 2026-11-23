import { lastReset } from '@/lib/usage/day';

// The owner's day for suggestions and the review draft
// (docs/specs/platform/one-daily-reset): it starts at Google's reset, midnight
// Pacific, the moment the usage counts come back. 14:00 or 15:00 in Da Nang.

export function dayStart(now: Date): Date {
  return lastReset(now);
}

// The phone's date when an instant's day started: in Da Nang, 10:00 on the
// 27th is still the day that opened at 14:00 on the 26th.
export function dayOf(iso: string): string {
  const start = dayStart(new Date(iso));
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
}

export function isToday(iso: string, now: Date): boolean {
  return new Date(iso) >= dayStart(now);
}

// "Attempt 1" is the first of the day: numbers by creation, oldest first.
export function attemptNumbers(batches: { id: string; createdAt: string }[]): Map<string, number> {
  const oldestFirst = [...batches].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return new Map(oldestFirst.map((batch, i) => [batch.id, i + 1]));
}

// The day before the current one (docs/specs/posts/two-days): it started at
// the reset before today's, and its suggestions stay on the screen.
export function yesterdayStart(now: Date): Date {
  return lastReset(new Date(dayStart(now).getTime() - 1));
}

// The current day's and the day before's, each newest first; anything older
// is in neither.
export function splitDays<T extends { createdAt: string }>(
  batches: readonly T[],
  now: Date,
): { today: T[]; yesterday: T[] } {
  const today = dayStart(now);
  const before = yesterdayStart(now);
  const newestFirst = [...batches].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    today: newestFirst.filter((b) => new Date(b.createdAt) >= today),
    yesterday: newestFirst.filter((b) => {
      const at = new Date(b.createdAt);
      return at >= before && at < today;
    }),
  };
}
