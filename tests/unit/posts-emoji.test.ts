import { describe, expect, it } from 'vitest';
import { addFlower, emojisIn, FLOWERS, isSpa, stripEmojis } from '@/lib/posts/emoji';

// Flower emojis for spas, fixed by code (docs/specs/posts/story-text, "Code's
// checks").

describe('isSpa', () => {
  it.each([
    'massage spa',
    'Spa',
    'Pijat Refleksi',
    'Mát-xa Đà Nẵng',
    'mát xa',
    'Foot Reflexology',
    'day-spa',
  ])('%s is a spa', (category) => {
    expect(isSpa(category)).toBe(true);
  });

  it.each(['bakery', 'yoga retreat', 'spaghetti house', ''])('%s is not a spa', (category) => {
    expect(isSpa(category)).toBe(false);
  });
});

describe('emojisIn', () => {
  it('keeps an emoji built from several pieces whole', () => {
    expect(emojisIn('Relax 🧘‍♀️ now 👍🏽 🏵️')).toEqual(['🧘‍♀️', '👍🏽', '🏵️']);
  });

  it('finds no emoji in plain words, digits or punctuation', () => {
    expect(emojisIn('Book 2 hours, now! #danang')).toEqual([]);
  });
});

describe('stripEmojis', () => {
  it('removes another emoji and tidies the spaces', () => {
    expect(stripEmojis('Relax tonight 💆 in your room! 🌸', 2)).toEqual({
      text: 'Relax tonight in your room! 🌸',
      fixes: ['removed 💆'],
    });
  });

  it('leaves no lone joiner, skin tone or variation selector', () => {
    expect(stripEmojis('Calm 🧘‍♀️ 🏵️.', 2).text).toBe('Calm.');
  });

  it('keeps the first flowers up to the limit', () => {
    expect(stripEmojis('A 🌸 B 🌺 C 🌼', 2)).toEqual({
      text: 'A 🌸 B 🌺 C',
      fixes: ['removed 🌼 over 2 flowers'],
    });
  });

  it('keeps line breaks', () => {
    expect(stripEmojis('First line 💆\n\nSecond line 🌸', 3).text).toBe(
      'First line\n\nSecond line 🌸',
    );
  });

  it('changes nothing in a text that keeps the rule', () => {
    expect(stripEmojis('Wake up light! 🌺', 2)).toEqual({ text: 'Wake up light! 🌺', fixes: [] });
  });
});

describe('addFlower', () => {
  it('adds 🌸 at the end when there is no flower', () => {
    expect(addFlower('Wake up light!')).toEqual({ text: 'Wake up light! 🌸', fixes: ['added 🌸'] });
  });

  it('adds nothing when there is a flower', () => {
    expect(addFlower('Wake up light! 🌺')).toEqual({ text: 'Wake up light! 🌺', fixes: [] });
  });
});

it('the five flowers', () => {
  expect(FLOWERS).toEqual(['🌸', '🌺', '🌼', '🌷', '🪷']);
});
