import { describe, expect, test } from 'vitest';
import type { ReplyBody } from '@/lib/reviews/reply';
import { REPLY_PROMPT_VERSION, replyPrompt } from '@/lib/reviews/reply-prompt';

// What Flash-Lite reads to write two replies (docs/specs/reviews/reply-drafts,
// "The replies").
const body: ReplyBody = {
  review: 'Lovely hot stone massage! The room was a bit cold and we waited 20 minutes.',
  hasName: true,
  locale: 'vi',
  business: { name: 'Sen Spa', summary: 'A calm massage spa in Da Nang.' },
  country: 'VN',
  avoid: null,
};

describe('replyPrompt', () => {
  test('is versioned', () => {
    expect(REPLY_PROMPT_VERSION).toBe('reply-2');
  });

  test("asks for replies in the review's language, short and warmer, 2 to 4 sentences", () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('same language as the review');
    expect(system).toContain('2 to 4 sentences');
    expect(system).toContain('short');
    expect(system).toContain('warm');
  });

  test('owns a complaint and promises nothing', () => {
    const { system } = replyPrompt(body, '🪷');
    for (const rule of [
      'one short sentence',
      'no excuse',
      'Promise nothing',
      'discount',
      'Never argue',
      'phone number',
      'link',
      'email',
    ]) {
      expect(system).toContain(rule);
    }
  });

  test('says sorry for every complaint, even a small one (reply-1 left some out)', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('every complaint, even a small one');
    expect(system).toContain('"Sorry about');
    expect(system).toContain('not "we acknowledge"');
  });

  test('the guest comes back to the business, not the other way round', () => {
    expect(replyPrompt(body, '🪷').system).toContain('come back to Sen Spa');
  });

  test('never calls a review false or the guest a liar (reply-1 did)', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('Never say the review is false');
    expect(system).toContain('no record of the visit');
  });

  test('puts 🙏 after the thank-you sentence and the flower last', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('"Thank you, {name}! 🙏"');
    expect(system).toContain('the very end of the reply, after its last punctuation');
  });

  test('sets the emoji rules with the given flower', () => {
    const { system } = replyPrompt(body, '🌼');
    expect(system).toContain('at most 2 emoji');
    expect(system).toContain('🌼');
    expect(system).not.toContain('🪷');
    expect(system).toContain('🙏');
    expect(system).toContain('😊');
  });

  test('flags abusive or fake reviews, with calm replies and no emoji', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('abusive');
    expect(system).toContain('fake');
    expect(system).toContain('no emoji');
  });

  test("translates into the screen's language, or not at all when the review is in it", () => {
    expect(replyPrompt(body, '🪷').system).toContain('Vietnamese');
    expect(replyPrompt({ ...body, locale: 'id' }, '🌼').system).toContain('Indonesian');
    const en = replyPrompt({ ...body, locale: 'en' }, '🌸').system;
    expect(en).toContain('English');
    expect(en).toContain('null');
  });

  test('uses the {name} placeholder with a name, and no name without one', () => {
    expect(replyPrompt(body, '🪷').system).toContain('{name}');
    const none = replyPrompt({ ...body, hasName: false }, '🪷').system;
    expect(none).toContain('Do not write {name}');
  });

  test('the text holds the business and the review', () => {
    const { text } = replyPrompt(body, '🪷');
    expect(text).toContain('Sen Spa');
    expect(text).toContain('A calm massage spa in Da Nang.');
    expect(text).toContain(body.review);
    expect(text).not.toContain('Say it differently');
  });

  test('with replies to avoid, the text holds both and asks for different ones', () => {
    const { text } = replyPrompt(
      { ...body, avoid: ['Thank you, {name}! 🪷', 'Dear {name}, thank you so much.'] },
      '🪷',
    );
    expect(text).toContain('Thank you, {name}! 🪷');
    expect(text).toContain('Dear {name}, thank you so much.');
    expect(text).toContain('Say it differently');
  });
});
