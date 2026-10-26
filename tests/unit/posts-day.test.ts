import { afterAll, describe, expect, test } from 'vitest';
import { dayOf, dayStart, isToday } from '@/lib/posts/day';

// The phone in Da Nang (UTC+7): local times below are the phone's clock.
const zone = process.env.TZ;
process.env.TZ = 'Asia/Ho_Chi_Minh';
afterAll(() => {
  if (zone === undefined) delete process.env.TZ;
  else process.env.TZ = zone;
});

const local = (d: number, h: number, m = 0, s = 0) => new Date(2026, 9, d, h, m, s);

describe("the day starts at Google's reset", () => {
  test('dayStart is the latest midnight Pacific: 14:00 in Da Nang in US summer time', () => {
    expect(dayStart(local(26, 13, 59))).toEqual(local(25, 14));
    expect(dayStart(local(26, 14))).toEqual(local(26, 14));
    expect(dayStart(local(27, 8))).toEqual(local(26, 14));
  });

  test('15:00 in Da Nang after the US time change', () => {
    expect(dayStart(new Date(2026, 10, 3, 14, 59))).toEqual(new Date(2026, 10, 2, 15));
    expect(dayStart(new Date(2026, 10, 3, 15))).toEqual(new Date(2026, 10, 3, 15));
  });

  test('the day of the change itself starts at midnight PDT', () => {
    expect(dayStart(new Date('2026-11-01T08:30:00.000Z'))).toEqual(
      new Date('2026-11-01T07:00:00.000Z'),
    );
  });

  test('dayOf is the date the day started on the phone', () => {
    expect(dayOf(local(27, 10).toISOString())).toBe('2026-10-26');
    expect(dayOf(local(27, 16).toISOString())).toBe('2026-10-27');
  });

  test('isToday from the reset exactly, and overnight is the same day', () => {
    const now = local(27, 8);
    expect(isToday(local(26, 14).toISOString(), now)).toBe(true);
    expect(isToday(local(26, 13, 59, 59).toISOString(), now)).toBe(false);
    expect(isToday(local(26, 20).toISOString(), now)).toBe(true);
  });

  test('in Bali the day starts an hour later on the phone, at the same instant', () => {
    const zone = process.env.TZ;
    try {
      process.env.TZ = 'Asia/Makassar';
      const start = dayStart(new Date('2026-10-26T08:00:00.000Z'));
      expect(start).toEqual(new Date('2026-10-26T07:00:00.000Z'));
      expect(start.getHours()).toBe(15);
      expect(dayOf('2026-10-26T08:00:00.000Z')).toBe('2026-10-26');
    } finally {
      process.env.TZ = zone;
    }
  });
});
