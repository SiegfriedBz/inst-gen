import { describe, expect, it } from 'vitest';
import { mentionsSex } from '@/lib/questions/words';

// docs/specs/questions/answer-drafts, "Code's word list".
describe('mentionsSex', () => {
  it.each([
    'Do you do happy ending?',
    'Есть интим услуги?',
    'Bên em có massage kích dục không?',
    '섹스 가능해요?',
    '有色情服务吗',
    'Ada pijat plus?',
    'SEXY massage?',
    'Do you do massage plus plus?',
    'Ada pijat plus plus?',
    // Taking out "same-sex" leaves the rest of the question checked.
    'Same-sex couple here: do you offer sex?',
  ])('catches %s', (question) => {
    expect(mentionsSex(question)).toBe(true);
  });

  it.each([
    'Thai massage for 2 at 9 pm',
    'We stay in Essex',
    'A spa massage, please',
    // The final review: innocent questions it used to flag.
    'Can I get a Thai massage plus a foot scrub?',
    'Is it a full service spa?',
    'Do you have a special service for couples?',
    'Do you welcome same-sex couples?',
    'Can I choose the sex of the therapist?',
    // Amended 2026-11-10: Bali's prices before tax and service.
    'Is the price plus plus?',
  ])('leaves %s alone', (question) => {
    expect(mentionsSex(question)).toBe(false);
  });
});
