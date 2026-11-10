import { describe, expect, it } from 'vitest';
import { BANNED_WORDS } from '@/lib/posts/banned';
import { ANSWER_PROMPT_VERSION, answerPrompt } from '@/lib/questions/answer-prompt';
import type { QuestionBody } from '@/lib/questions/question';

// docs/specs/questions/answer-drafts, "The answer".
function body(overrides: Partial<QuestionBody> = {}): QuestionBody {
  return {
    question: 'Which massages do you have?',
    final: false,
    locale: 'vi',
    business: {
      name: 'Sen',
      summary: 'Mobile massage in Da Nang',
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
    known: { place: 'Hyatt', day: null, time: null },
    avoid: null,
    ...overrides,
  };
}

describe('answerPrompt', () => {
  it('has a version', () => {
    expect(ANSWER_PROMPT_VERSION).toBe('answer-1');
  });

  it('gives the rules of the spec', () => {
    const { system } = answerPrompt(body(), '🪷', true);
    for (const rule of [
      'in the language of the message',
      'Use only the facts under "Business"',
      'Never invent a treatment, a price, a discount, a free time, a payment method or any other fact.',
      'say the team will check and reply, and set "unanswered" to true',
      'give each with its duration and its price',
      'one per line when there are more than two',
      '1 to 4 short sentences',
      'written in Vietnamese',
      'Promise nothing the owner has not decided',
      'Translate the message and each part into Vietnamese',
      '🪷',
      ...BANNED_WORDS,
    ]) {
      expect(system).toContain(rule);
    }
  });

  it('asks for a call to action on a final answer only, for what is missing', () => {
    const final = answerPrompt(body({ final: true }), '🪷', true).system;
    expect(final).toContain(
      'asks the guest to book now, asking only for what the guest has not told yet',
    );
    expect(final).toContain('where they are staying, for a business that goes to its guests');
    const not = answerPrompt(body(), '🪷', true).system;
    expect(not).toContain('this answer is not the final one');
    expect(not).not.toContain('asks the guest to book now');
  });

  it('asks a spa for the line on professional massage on every call, and another business for none', () => {
    expect(answerPrompt(body(), '🪷', true).system).toContain(
      'saying the business offers only professional therapeutic massage',
    );
    expect(answerPrompt(body(), '🌸', false).system).not.toContain(
      'professional therapeutic massage',
    );
  });

  it("gives the business's details, what the guest has told, and whether the answer is final", () => {
    const { text } = answerPrompt(body({ avoid: 'Hello! Old answer.' }), '🪷', true);
    for (const part of [
      'Business: Sen',
      '- Thai Massage, 60 min, VND 500k',
      'Highlights: Free travel in our core areas',
      'Where it goes: My Khe',
      'What the guest has told:\n- Staying at: Hyatt\n- Day: not yet\n- Time: not yet',
      'Final answer: no',
      'Message:\nWhich massages do you have?',
      'The owner did not use this answer. Say it differently:\nHello! Old answer.',
    ]) {
      expect(text).toContain(part);
    }
    expect(answerPrompt(body({ final: true }), '🪷', true).text).toContain('Final answer: yes');
  });
});
