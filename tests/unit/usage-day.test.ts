import { describe, expect, test } from 'vitest';
import { lastReset, nextMonth, nextReset, usageDay, usageMonth } from '@/lib/usage/day';

// The owner's day for counts ends at midnight Pacific, whatever the phone's
// clock (docs/specs/platform/usage-counters, "The owner's day").

describe('the Pacific day', () => {
  test('in winter it turns at 08:00 UTC', () => {
    expect(usageDay(new Date('2026-11-15T07:59:00Z'))).toBe('2026-11-14');
    expect(usageDay(new Date('2026-11-15T08:00:00Z'))).toBe('2026-11-15');
  });

  test('in US summer time it turns at 07:00 UTC', () => {
    expect(usageDay(new Date('2026-07-15T06:59:00Z'))).toBe('2026-07-14');
    expect(usageDay(new Date('2026-07-15T07:00:00Z'))).toBe('2026-07-15');
  });

  test('nextReset is the next midnight Pacific', () => {
    expect(nextReset(new Date('2026-11-15T03:00:00Z')).toISOString()).toBe(
      '2026-11-15T08:00:00.000Z',
    );
    expect(nextReset(new Date('2026-07-15T08:00:00Z')).toISOString()).toBe(
      '2026-07-16T07:00:00.000Z',
    );
  });

  test('nextReset on the days the US clocks change', () => {
    expect(nextReset(new Date('2026-03-08T12:00:00Z')).toISOString()).toBe(
      '2026-03-09T07:00:00.000Z',
    );
    expect(nextReset(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe(
      '2026-11-02T08:00:00.000Z',
    );
  });

  test('lastReset is the latest midnight Pacific, from the instant itself', () => {
    expect(lastReset(new Date('2026-11-15T07:59:00Z')).toISOString()).toBe(
      '2026-11-14T08:00:00.000Z',
    );
    expect(lastReset(new Date('2026-11-15T08:00:00Z')).toISOString()).toBe(
      '2026-11-15T08:00:00.000Z',
    );
    expect(lastReset(new Date('2026-07-15T20:00:00Z')).toISOString()).toBe(
      '2026-07-15T07:00:00.000Z',
    );
  });

  test('lastReset on the day the US clocks fall back is midnight PDT', () => {
    expect(lastReset(new Date('2026-11-01T08:30:00Z')).toISOString()).toBe(
      '2026-11-01T07:00:00.000Z',
    );
    expect(lastReset(new Date('2026-11-01T12:00:00Z')).toISOString()).toBe(
      '2026-11-01T07:00:00.000Z',
    );
  });
});

describe('the UTC month', () => {
  test('usageMonth and nextMonth', () => {
    const now = new Date('2026-10-31T23:59:59Z');
    expect(usageMonth(now)).toBe('2026-10');
    expect(nextMonth(now).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(nextMonth(new Date('2026-12-05T00:00:00Z')).toISOString()).toBe(
      '2027-01-01T00:00:00.000Z',
    );
  });
});
