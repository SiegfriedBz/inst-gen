import { describe, expect, it } from 'vitest';
import { answerFlags } from '@/lib/questions/flags';
import type { QuestionBody } from '@/lib/questions/question';

// The check lines under an answer (docs/specs/questions/answer-drafts, "Checks
// the owner sees").
const business = {
  offerings: [{ name: 'Couple Massage', duration: '60 min', price: '$31 VND 800k' }],
  highlights: [],
  contact: { whatsapp: '84898661224', phone: null },
} as unknown as QuestionBody['business'];

describe('answerFlags', () => {
  it('reads a price whole when a Korean ending is glued to it ("800k이며" is VND 800k)', () => {
    expect(
      answerFlags('커플 마사지는 60분에 31달러 VND 800k이며 호텔로 방문합니다.', business),
    ).toEqual([]);
  });

  it('still flags a price the details do not hold', () => {
    expect(answerFlags('커플 마사지는 VND 900k이며', business)).toEqual([
      { kind: 'price', text: 'VND 900k' },
    ]);
  });
});
