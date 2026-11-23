import { describe, expect, it } from 'vitest';
import { hoursInWords } from '@/lib/posts/hours';

// The opening hours as a night post's fact, in words code writes
// (docs/specs/posts/reasons-to-book, "The fact, dealt by code", amended
// 2026-11-23 after the second recordings).

describe('hoursInWords', () => {
  it.each([
    ['Mo-Su 08:30-23:00', 'Open every day until 11 pm'],
    ['Mo-Su 09:00-22:30', 'Open every day until 10:30 pm'],
    ['Mo-Su 10:00-01:00', 'Open every day until 1 am'],
    ['Mo-Su 10:00-00:00', 'Open every day until midnight'],
    ['Mo-Su 10:00-24:00', 'Open every day until midnight'],
    ['Mo-Su 10:00-23:59', 'Open every day until midnight'],
    ['Mon-Sun 08:00-12:00', 'Open every day until noon'],
    ['Mo-Su 00:00-24:00', 'Open 24 hours, every day'],
    ['Mo-Su 00:00-23:59', 'Open 24 hours, every day'],
    ['Mo-Fr 09:00-22:00; Sa-Su 10:00-22:00', 'Open every day until 10 pm'],
    ['Mo,Tu,We,Th,Fr,Sa,Su 09:00-21:00', 'Open every day until 9 pm'],
    ['Daily 9am - 11pm', 'Open every day until 11 pm'],
    ['Every day, 9:00 AM – 10:30 PM', 'Open every day until 10:30 pm'],
    ['Monday to Sunday: 08:00 - 22:00', 'Open every day until 10 pm'],
    ['08:30-23:00 daily', 'Open every day until 11 pm'],
    ['Every day, 9am to midnight', 'Open every day until midnight'],
  ])('%s → %s', (hours, words) => {
    expect(hoursInWords(hours)).toBe(words);
  });

  it.each([
    'Mo-Fr 09:00-18:00; Sa 10:00-14:00',
    'Mo-Sa 09:00-22:00',
    'Mo-Fr 09:00-22:00; Sa-Su 10:00-23:00',
    'By appointment',
    'Mo-Su',
    '08:30-23:00',
    '9am to midnight',
    'Mo-Su 25:00-26:00',
    '',
  ])('%s gives no fact', (hours) => {
    expect(hoursInWords(hours)).toBeNull();
  });
});
