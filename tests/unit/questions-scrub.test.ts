import { describe, expect, it } from 'vitest';
import { scrubQuestion } from '@/lib/questions/scrub';

// docs/specs/questions/answer-drafts, "What leaves the phone".
describe('scrubQuestion', () => {
  it('replaces a phone number, and keeps a room number', () => {
    expect(scrubQuestion('Call me on +84 905 123 456, room 405')).toBe(
      'Call me on [number], room 405',
    );
  });

  it('replaces an email and a link', () => {
    expect(scrubQuestion('Write to anna@mail.com')).toBe('Write to [email]');
    expect(scrubQuestion('We are here https://maps.app.goo.gl/x1')).toBe('We are here [link]');
  });

  it('keeps short numbers and times', () => {
    expect(scrubQuestion('2 people at 9 pm, 90 minutes')).toBe('2 people at 9 pm, 90 minutes');
  });

  // Amended 2026-11-10: the guest's day, time and price reach the answer.
  it('keeps a date, a time slot and a price', () => {
    const question = 'Can we come on 15.11.2026, 15.00-16.30? Is it 1.500.000đ for two?';
    expect(scrubQuestion(question)).toBe(question);
  });

  it.each([
    '15-11-2026',
    '2026-11-15',
    '15.11.2026-17.11.2026',
    '15.11.2026 18.00',
    '09.00 - 10.30',
    '250.000-350.000',
    'IDR 15.000.000',
  ])('keeps %s', (text) => {
    expect(scrubQuestion(text)).toBe(text);
  });

  it.each([
    ['My number is 0905.123.456', 'My number is [number]'],
    ['WhatsApp 905 123 456', 'WhatsApp [number]'],
    ['+84 905.123.456', '[number]'],
    ['84.905.123.456', '[number]'],
    ['15.11.2026 0905123456', '[number]'],
    ['0812-3456-7890', '[number]'],
  ])('still replaces the phone number in %s', (text, expected) => {
    expect(scrubQuestion(text)).toBe(expected);
  });
});
