// The owner's day for usage counts (docs/specs/platform/usage-counters, "The
// owner's day: midnight Pacific"): it ends when Gemini's free quotas reset,
// 00:00 in Los Angeles. Monthly counts follow the UTC calendar.

export const USAGE_ZONE = 'America/Los_Angeles';

const parts = new Intl.DateTimeFormat('en-CA', {
  timeZone: USAGE_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function wallClock(t: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (const part of parts.formatToParts(new Date(t))) {
    if (part.type !== 'literal') out[part.type] = Number(part.value);
  }
  return out;
}

// The zone's wall clock at t, read as if it were UTC, minus t.
function offsetMs(t: number): number {
  const w = wallClock(t);
  return Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second) - t;
}

// Midnight never falls inside a US time change (they happen at 02:00), so one
// correction by the zone's offset at the guess is exact.
function zonedMidnight(y: number, m: number, d: number): Date {
  const guess = Date.UTC(y, m - 1, d);
  return new Date(guess - offsetMs(guess));
}

const pad = (n: number) => String(n).padStart(2, '0');

export function usageDay(now: Date): string {
  const w = wallClock(now.getTime());
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

// The day's start for the screen too (docs/specs/platform/one-daily-reset):
// suggestions and the review draft go at the same moment the counts come back.
export function lastReset(now: Date): Date {
  const w = wallClock(now.getTime());
  return zonedMidnight(w.year, w.month, w.day);
}

export function nextReset(now: Date): Date {
  const w = wallClock(now.getTime());
  // Date.UTC rolls the 32nd over into the next month.
  const tomorrow = new Date(Date.UTC(w.year, w.month - 1, w.day + 1));
  return zonedMidnight(
    tomorrow.getUTCFullYear(),
    tomorrow.getUTCMonth() + 1,
    tomorrow.getUTCDate(),
  );
}

export function usageMonth(now: Date): string {
  return `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}`;
}

export function nextMonth(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}
