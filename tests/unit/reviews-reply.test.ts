import { describe, expect, test } from 'vitest';
import { REPLY_ERROR_STATUS, REPLY_LIMITS, replyBodySchema } from '@/lib/reviews/reply';

// What the browser sends for a review (docs/specs/reviews/reply-drafts, "The
// model call").
const sen = {
  review: '  Lovely hot stone massage, my back feels new!  ',
  hasName: true,
  locale: 'vi',
  business: { name: 'Sen Spa', summary: 'A calm massage spa in Da Nang.' },
  country: 'VN',
  avoid: null,
};

describe('replyBodySchema', () => {
  test("accepts Sen's review, trimmed", () => {
    expect(replyBodySchema.parse(sen).review).toBe('Lovely hot stone massage, my back feels new!');
  });

  test('accepts two replies to avoid and no summary or country', () => {
    const body = {
      ...sen,
      business: { name: 'Sen Spa', summary: null },
      country: null,
      avoid: ['Thank you, {name}!', 'Dear {name}, thank you.'],
    };
    expect(replyBodySchema.safeParse(body).success).toBe(true);
  });

  test('rejects a blank or too long review, another locale, one reply to avoid', () => {
    for (const body of [
      { ...sen, review: ' \n ' },
      { ...sen, review: 'a'.repeat(REPLY_LIMITS.review + 1) },
      { ...sen, locale: 'fr' },
      { ...sen, avoid: ['only one'] },
    ]) {
      expect(replyBodySchema.safeParse(body).success).toBe(false);
    }
  });

  test('carries no name field', () => {
    const parsed = replyBodySchema.parse({ ...sen, name: 'Anna K.' });
    expect(JSON.stringify(parsed)).not.toContain('Anna');
  });
});

describe('REPLY_ERROR_STATUS', () => {
  test('maps each code as the translate route does', () => {
    expect(REPLY_ERROR_STATUS).toEqual({
      invalid_request: 400,
      model_busy: 503,
      model_timeout: 504,
      model_failed: 502,
    });
  });
});
