import { describe, expect, it } from 'vitest';
import { guestScript, holdsScript, SCRIPT_NAMES } from '@/lib/reviews/script';

// The letters a guest writes with (docs/specs/reviews/better-replies-and-answers,
// "The guest's letters").
describe('guestScript', () => {
  it('finds the script most of the letters belong to, when it is not Latin', () => {
    expect(guestScript('커플 마사지는 얼마예요? 호텔로 와 주시나요?')).toBe('Hangul');
    expect(guestScript('Здравствуйте! Есть интим услуги?')).toBe('Cyrillic');
    expect(guestScript('情侣按摩多少钱？')).toBe('CJK');
    expect(guestScript('カップルマッサージはいくらですか？')).toBe('CJK');
    expect(guestScript('นวดคู่ราคาเท่าไหร่')).toBe('Thai');
  });

  it('finds none in the Latin alphabet, or when Latin letters are most', () => {
    expect(guestScript('Do you do happy ending?')).toBeNull();
    expect(guestScript('Bên em có massage đặc biệt cho nam không?')).toBeNull();
    expect(guestScript('Berapa harga pijat Bali 60 menit?')).toBeNull();
    expect(guestScript('Couple massage for two tonight, 감사')).toBeNull();
    expect(guestScript('😊 123')).toBeNull();
  });

  it('names each script for the prompt', () => {
    expect(SCRIPT_NAMES.Hangul).toBe('Korean');
    expect(SCRIPT_NAMES.CJK).toBe('Chinese or Japanese');
  });
});

describe('holdsScript', () => {
  it("says whether a text holds any of the script's letters", () => {
    expect(holdsScript('안녕하세요 😊 Couple Massage', 'Hangul')).toBe(true);
    expect(holdsScript('Hello 😊 Couple Massage', 'Hangul')).toBe(false);
    expect(holdsScript('Мы предлагаем массаж', 'Cyrillic')).toBe(true);
  });
});
