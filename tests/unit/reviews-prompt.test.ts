import { describe, expect, test } from 'vitest';
import { BANNED_WORDS } from '@/lib/posts/banned';
import { TONE_RULE, WORD_RULES } from '@/lib/reviews/copy-rules';
import type { ReplyBody } from '@/lib/reviews/reply';
import { REPLY_PROMPT_VERSION, replyPrompt } from '@/lib/reviews/reply-prompt';

// What Flash-Lite reads to write two replies (docs/specs/reviews/reply-drafts,
// "The replies", changed by docs/specs/reviews/better-replies-and-answers).
const body: ReplyBody = {
  review: 'Lovely Thai massage in our room! The therapist came 20 minutes late.',
  hasName: true,
  locale: 'vi',
  business: {
    name: 'Sen Spa',
    summary: 'In-room massage in Da Nang.',
    offerings: ['Thai Massage', 'Foot Reflexology'],
    goesToGuests: true,
  },
  country: 'VN',
  avoid: null,
};
const visited: ReplyBody = { ...body, business: { ...body.business, goesToGuests: false } };

describe('replyPrompt', () => {
  test('is versioned', () => {
    expect(REPLY_PROMPT_VERSION).toBe('reply-3');
  });

  test("asks for replies in the review's language, short and warmer, 3 or 4 short sentences", () => {
    const { system } = replyPrompt(body, '🪷');
    for (const rule of [
      'same language as the review',
      '"short"',
      '"warm"',
      '3 or 4 short sentences',
      'A review of a few words gets three short sentences in each reply',
    ]) {
      expect(system).toContain(rule);
    }
  });

  test('thanks the guest for their massage, in a calm and kind voice', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('thanks the guest for their massage');
    expect(system).toContain(TONE_RULE);
  });

  test('owns a complaint, promises nothing, and says whether the review complains', () => {
    const { system } = replyPrompt(body, '🪷');
    for (const rule of [
      'every complaint, even a small one',
      'one short sentence',
      'no excuse',
      'not "we acknowledge"',
      'Set "complaint" to true',
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

  test('names a treatment only as the business does', () => {
    const prompt = replyPrompt(body, '🪷');
    expect(prompt.system).toContain("Never take the guest's words for a treatment's name");
    expect(prompt.text).toContain('Treatments: Thai Massage; Foot Reflexology');
    const none = replyPrompt({ ...body, business: { ...body.business, offerings: [] } }, '🪷');
    expect(none.text).toContain('Treatments: none listed');
  });

  test('a business that goes to its guests offers to come to them again, never to see them at its place', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('The business goes to its guests');
    expect(system).toContain('Never invite them to come, come back, return or visit');
    expect(system).toContain('glad to come to them again');
    expect(system).not.toContain('come back to Sen Spa');
  });

  test('a business guests visit invites them back', () => {
    const { system } = replyPrompt(visited, '🪷');
    expect(system).toContain('come back to Sen Spa');
    expect(system).not.toContain('goes to its guests');
  });

  test("follows the posts' rules on words", () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain(WORD_RULES);
    for (const word of BANNED_WORDS) expect(system).toContain(word);
  });

  test('keeps 🙏, 😊 and the flower, one of each, 😊 only with no complaint', () => {
    const { system } = replyPrompt(body, '🌼');
    expect(system).toContain('only 🙏, 😊 and 🌼, one of each');
    expect(system).not.toContain('🪷');
    expect(system).toContain('only when the review holds no complaint');
    expect(system).toContain('never a full stop right before an emoji');
  });

  test('gives no sentence to copy', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).not.toContain('"Sorry about');
    expect(system).not.toContain('"Thank you, {name}! 🙏"');
    expect(system).not.toContain('at most 2 emoji');
  });

  test('flags abusive or fake reviews, with calm replies and no emoji', () => {
    const { system } = replyPrompt(body, '🪷');
    for (const rule of [
      'abusive',
      'fake',
      'no emoji',
      'Never say the review is false',
      'no record of the visit',
    ]) {
      expect(system).toContain(rule);
    }
  });

  test("translates into the screen's language, or not at all when the review is in it", () => {
    expect(replyPrompt(body, '🪷').system).toContain('Vietnamese');
    expect(replyPrompt({ ...body, locale: 'id' }, '🌼').system).toContain('Indonesian');
    const en = replyPrompt({ ...body, locale: 'en' }, '🌸').system;
    expect(en).toContain('English');
    expect(en).toContain('null');
  });

  test('uses the {name} placeholder with a name, and no name without one', () => {
    const { system } = replyPrompt(body, '🪷');
    expect(system).toContain('{name}');
    expect(system).toContain('chị {name}');
    const none = replyPrompt({ ...body, hasName: false }, '🪷').system;
    expect(none).toContain('Do not write {name}');
  });

  test('the text holds the business and the review', () => {
    const { text } = replyPrompt(body, '🪷');
    expect(text).toContain('Sen Spa');
    expect(text).toContain('In-room massage in Da Nang.');
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
