import { describe, expect, it } from 'vitest';
import { type EmojiRule, endSentence, keepEmoji } from '@/lib/reviews/emoji';

// The emoji a reply or an answer keeps (docs/specs/reviews/better-replies-and-answers,
// "Emojis" and "The posts' rules on words").
const R: EmojiRule = { keep: ['🙏', '😊'], flower: '🌼' };

describe('keepEmoji', () => {
  it('drops the stop before an emoji and keeps "!" and "?"', () => {
    expect(
      keepEmoji(
        'Thank you so much! 🙏 Glad you enjoyed it. 😊 We would love to come to you again. 🌼',
        R,
      ),
    ).toBe('Thank you so much! 🙏 Glad you enjoyed it 😊 We would love to come to you again 🌼');
    expect(keepEmoji('Shall we come to your villa? 🌼', R)).toBe('Shall we come to your villa? 🌼');
  });

  it("puts the business's flower in place of any other, at the very end", () => {
    expect(keepEmoji('Thank you 🌸 Hope to see you', R)).toBe('Thank you. Hope to see you 🌼');
  });

  it('removes another emoji, and puts a stop back where it ended a sentence', () => {
    expect(
      keepEmoji('Sorry the therapist came late 😊 We hope to come to you again ✨', {
        keep: ['🙏'],
        flower: '🪷',
      }),
    ).toBe('Sorry the therapist came late. We hope to come to you again 🪷');
  });

  it('puts no stop before a lower-case word or a comma', () => {
    expect(keepEmoji('Thank you 💆 for coming', R)).toBe('Thank you for coming 🌼');
    expect(
      keepEmoji('Hello {name} 🙏, we have no record of your visit. 🌸', { keep: [], flower: null }),
    ).toBe('Hello {name}, we have no record of your visit.');
  });

  it('puts a stop before a caseless letter or a Cyrillic capital', () => {
    expect(keepEmoji('감사합니다 💆 다음에 또', R)).toBe('감사합니다. 다음에 또 🌼');
    expect(keepEmoji('Спасибо 💆 Мы рады', R)).toBe('Спасибо. Мы рады 🌼');
  });

  it('keeps one of each', () => {
    expect(keepEmoji('Hello! 😊 Yes, we come to your villa 😊 🌼 🌼', R)).toBe(
      'Hello! 😊 Yes, we come to your villa 🌼',
    );
  });

  it('counts a skin tone or a variation selector as the kept emoji', () => {
    expect(keepEmoji('Thank you! 🙏🏽 Glad you liked it ☺️', R)).toBe(
      'Thank you! 🙏🏽 Glad you liked it 🌼',
    );
    expect(keepEmoji('Thank you! 🙏️ Glad you liked it', R)).toBe(
      'Thank you! 🙏️ Glad you liked it 🌼',
    );
  });

  it('keeps paragraphs and lines', () => {
    const list = '- Thai Massage, 60 min: VND 500k\n- Foot Reflexology, 60 min: VND 450k';
    expect(
      keepEmoji(`Hello! 😊\n\n${list}\n\nA therapist can come to your hotel. 🌼`, {
        keep: ['😊'],
        flower: '🌼',
      }),
    ).toBe(`Hello! 😊\n\n${list}\n\nA therapist can come to your hotel 🌼`);
  });

  it('with nothing to keep, removes every emoji and adds no flower', () => {
    expect(keepEmoji('Hello, ❤️ please contact us. 😊', { keep: [], flower: null })).toBe(
      'Hello, please contact us.',
    );
    // The removed emoji ended the text: a stop takes its place.
    expect(keepEmoji('Xin chào 🙏', { keep: [], flower: null })).toBe('Xin chào.');
    expect(keepEmoji('Hello 😊\n\nWe come to you', { keep: [], flower: null })).toBe(
      'Hello.\n\nWe come to you',
    );
  });

  it('drops a stop right after an emoji too', () => {
    expect(keepEmoji('Thank you for your review 🙏. We are glad you enjoyed it 😊.', R)).toBe(
      'Thank you for your review 🙏 We are glad you enjoyed it 😊 🌼',
    );
    expect(keepEmoji('Wait 🙏... we come', R)).toBe('Wait 🙏... we come 🌼');
  });

  it('keeps the line break before an emoji it removes at the start of a line (final review)', () => {
    const rule: EmojiRule = { keep: ['😊'], flower: '🪷' };
    expect(
      keepEmoji(
        'Here are our massages:\n💆 Thai Massage, 60 min, VND 500k\n🌸 Foot Reflexology, 60 min, VND 450k',
        rule,
      ),
    ).toBe(
      'Here are our massages:\nThai Massage, 60 min, VND 500k\nFoot Reflexology, 60 min, VND 450k 🪷',
    );
    expect(keepEmoji('- Foot, 60 min, VND 450k\n\n✨ A therapist can come to you.', rule)).toBe(
      '- Foot, 60 min, VND 450k\n\nA therapist can come to you 🪷',
    );
  });

  it('drops a stop after an emoji even with a space between them (final review)', () => {
    expect(keepEmoji('Thank you 🙏 . Glad you liked it', R)).toBe(
      'Thank you 🙏 Glad you liked it 🌼',
    );
  });

  it('leaves an empty text empty, with no flower', () => {
    expect(keepEmoji('  ', R)).toBe('');
    expect(keepEmoji('🙏 🌸', R)).toBe('');
  });
});

describe('endSentence', () => {
  it('ends a text that ends on a word with a stop', () => {
    expect(endSentence('Hello')).toBe('Hello.');
    expect(endSentence('Kami datang ke vila Anda ')).toBe('Kami datang ke vila Anda.');
  });

  it('leaves a text that ends on its punctuation, an emoji or a list line as it is', () => {
    expect(endSentence('Hello!')).toBe('Hello!');
    expect(endSentence('Hello 😊')).toBe('Hello 😊');
    expect(endSentence('Prices:\n- Thai Massage, 60 min: VND 500k')).toBe(
      'Prices:\n- Thai Massage, 60 min: VND 500k',
    );
    expect(endSentence('')).toBe('');
    expect(endSentence('Prices:\n💆 Thai Massage, 60 min')).toBe(
      'Prices:\n💆 Thai Massage, 60 min',
    );
  });
});
