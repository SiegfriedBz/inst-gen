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

describe('the 3am day', () => {
  test('dayStart is the latest 03:00 on the phone at or before now', () => {
    expect(dayStart(local(26, 2, 59))).toEqual(local(25, 3));
    expect(dayStart(local(26, 3))).toEqual(local(26, 3));
    expect(dayStart(local(26, 15))).toEqual(local(26, 3));
  });

  test("dayOf gives the date of the 3am day, not the calendar's", () => {
    expect(dayOf(local(26, 0, 10).toISOString())).toBe('2026-10-25');
    expect(dayOf(local(26, 8).toISOString())).toBe('2026-10-26');
    expect(dayOf('2026-10-25T17:10:00.000Z')).toBe('2026-10-25');
  });

  test('isToday from 03:00 exactly', () => {
    const now = local(26, 15);
    expect(isToday(local(26, 3).toISOString(), now)).toBe(true);
    expect(isToday(local(26, 2, 59, 59).toISOString(), now)).toBe(false);
  });
});
