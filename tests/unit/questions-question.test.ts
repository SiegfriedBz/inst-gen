import { describe, expect, it } from 'vitest';
import { QUESTION_LIMITS, questionBodySchema } from '@/lib/questions/question';

// docs/specs/questions/answer-drafts, "The model call".
function body(overrides: Record<string, unknown> = {}) {
  return {
    question: 'Which massages do you have?',
    final: false,
    locale: 'vi',
    business: {
      name: 'Sen',
      summary: null,
      category: 'mobile massage spa',
      offerings: [{ name: 'Thai Massage', duration: '60 min', price: 'VND 500k' }],
      highlights: ['Free travel in our core areas'],
      hours: '08:30-23:00 daily',
      town: 'Da Nang',
      area: null,
      serviceArea: 'My Khe',
      contact: {
        whatsapp: '84898661224',
        phone: null,
        email: null,
        instagram: null,
        bookingUrl: null,
      },
    },
    country: 'VN',
    known: { place: null, day: null, time: null },
    avoid: null,
    ...overrides,
  };
}

describe('questionBodySchema', () => {
  it("takes the spec's fields", () => {
    expect(questionBodySchema.parse(body()).business.name).toBe('Sen');
    expect(
      questionBodySchema.parse(body({ known: { place: 'Hyatt', day: 'tomorrow', time: null } }))
        .known.place,
    ).toBe('Hyatt');
  });

  it('refuses a question over 2,000 characters, or an empty one', () => {
    expect(QUESTION_LIMITS.question).toBe(2000);
    expect(questionBodySchema.safeParse(body({ question: 'a'.repeat(2001) })).success).toBe(false);
    expect(questionBodySchema.safeParse(body({ question: '   ' })).success).toBe(false);
  });
});
