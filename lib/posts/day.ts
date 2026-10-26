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
