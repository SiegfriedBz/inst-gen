// The owner's day for suggestions (docs/specs/posts/suggestions, "Suggestions
// last until 3am"): it starts at 3am on the phone's clock, not midnight, so
// the reset happens while the owner sleeps. Local time throughout.

export const DAY_STARTS_AT_HOUR = 3;

export function dayStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(DAY_STARTS_AT_HOUR, 0, 0, 0);
  if (start > now) start.setDate(start.getDate() - 1);
  return start;
}

// The date of the 3am day an instant belongs to: 00:10 is still yesterday's.
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
