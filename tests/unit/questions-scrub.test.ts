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
});
