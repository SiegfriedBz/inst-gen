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
  ])('catches %s', (question) => {
    expect(mentionsSex(question)).toBe(true);
  });

  it.each(['Thai massage for 2 at 9 pm', 'We stay in Essex', 'A spa massage, please'])(
    'leaves %s alone',
    (question) => {
      expect(mentionsSex(question)).toBe(false);
    },
  );
});
