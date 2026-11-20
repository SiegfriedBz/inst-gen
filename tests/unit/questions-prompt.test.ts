import { describe, expect, it } from 'vitest';
import { BANNED_WORDS } from '@/lib/posts/banned';
import { ANSWER_PROMPT_VERSION, answerPrompt } from '@/lib/questions/answer-prompt';
import type { QuestionBody } from '@/lib/questions/question';
import { TONE_RULE, WORD_RULES } from '@/lib/reviews/copy-rules';

// docs/specs/questions/answer-drafts, "The answer", changed by
// docs/specs/reviews/better-replies-and-answers.
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
      website: null,
    },
    country: 'VN',
    known: { place: 'Hyatt', day: null, time: null },
    avoid: null,
    ...overrides,
  };
}

const withBusiness = (over: Partial<QuestionBody['business']>, rest: Partial<QuestionBody> = {}) =>
  body({ ...rest, business: { ...body().business, ...over } });

describe('answerPrompt', () => {
  it('has a version', () => {
    expect(ANSWER_PROMPT_VERSION).toBe('answer-4');
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
      TONE_RULE,
      WORD_RULES,
      ...BANNED_WORDS,
    ]) {
      expect(system).toContain(rule);
    }
  });

  it("writes every part in the message's language, never English unless the message is (answer-3 answered Korean and Russian in English)", () => {
    expect(answerPrompt(body(), '🪷', true).system).toContain(
      "Every part is in the message's language, never in English or Vietnamese unless the message is",
    );
  });

  it('names treatments only as the details do, and never invites the guest to a business that goes to them', () => {
    const { system } = answerPrompt(body(), '🪷', true);
    expect(system).toContain("never take the guest's words for a treatment's name");
    expect(system).toContain('never invite the guest to come, come back or visit');
  });

  it('keeps 😊 and the flower, one of each, and no emoji when the question mentions sex', () => {
    const { system } = answerPrompt(body(), '🪷', true);
    expect(system).toContain('only 😊 and 🪷, one of each');
    expect(system).toContain('Every sentence ends on its full stop');
    expect(system).toContain('no full stop before or after the emoji');
    expect(system).toContain('No emoji when "sexual" is true');
  });

  it('says whether the business goes to its guests, from its service area', () => {
    expect(answerPrompt(body(), '🪷', true).text).toContain('Goes to its guests: yes');
    expect(answerPrompt(withBusiness({ serviceArea: null }), '🪷', true).text).toContain(
      'Goes to its guests: no',
    );
    expect(answerPrompt(withBusiness({ serviceArea: '  ' }), '🪷', true).text).toContain(
      'Goes to its guests: no',
    );
  });

  it('ends an answer that is not final on a gentle offer', () => {
    const { system } = answerPrompt(body(), '🪷', true);
    for (const rule of [
      '"callToAction": the gentle offer',
      'names no day or time',
      'never a question with no next step',
      'When "sexual" is true, leave the callToAction\'s text empty and its translation null',
      'naming that place as the guest put it',
      'Never reuse a phrase from these instructions',
    ]) {
      expect(system).toContain(rule);
    }
    expect(system).not.toContain('asks the guest to book now');
    // answer-2 copied "hotel, villa or home" into three answers.
    expect(system).not.toContain('hotel, villa or home');
  });

  it('asks for a call to book on a final answer, for what is missing', () => {
    const final = answerPrompt(body({ final: true }), '🪷', true).system;
    expect(final).toContain(
      'asks the guest to book now, asking only for what the guest has not told yet',
    );
    expect(final).toContain('where they are staying, for a business that goes to its guests');
    expect(final).not.toContain('"callToAction": the gentle offer');
  });

  it('asks for {website} only when the website is known, never giving the address', () => {
    const known = answerPrompt(
      withBusiness({ website: 'https://sendanangmassage.com/' }),
      '🪷',
      true,
    );
    expect(known.system).toContain('write {website}, exactly so');
    expect(known.system).toContain('never a web address of your own');
    expect(`${known.system}\n${known.text}`).not.toContain('sendanangmassage.com');
    const none = answerPrompt(body(), '🪷', true);
    expect(`${none.system}\n${none.text}`).not.toContain('{website}');
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
