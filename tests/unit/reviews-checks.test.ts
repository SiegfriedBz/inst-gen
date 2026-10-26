import { describe, expect, test } from 'vitest';
import { checkReplies, flowerFor, sameLanguage } from '@/lib/reviews/checks';
import type { ModelReplies } from '@/lib/reviews/reply';

// Code's checks on the model's answer (docs/specs/reviews/reply-drafts, "The
// replies" and "The model call").
const answer = (over: Partial<ModelReplies> = {}): ModelReplies => ({
  reviewLanguage: 'en',
  abusive: false,
  reviewTranslation: 'Massage đá nóng tuyệt vời!',
  short: {
    text: 'Thank you, {name}! 🙏 Hope to see you again 🌸',
    translation: 'Cảm ơn {name}! 🌺',
  },
  warm: { text: 'Dear {name}, thank you so much 🌷', translation: 'Thân mến {name} 💮' },
  ...over,
});

describe('flowerFor', () => {
  test('lotus for Vietnam, the frangipani look-alike for Indonesia, cherry blossom elsewhere', () => {
    expect(flowerFor('VN')).toBe('🪷');
    expect(flowerFor('ID')).toBe('🌼');
    expect(flowerFor(null)).toBe('🌸');
  });
});

describe('sameLanguage', () => {
  test('sameLanguage compares base codes, any case', () => {
    expect(sameLanguage('en-US', 'en')).toBe(true);
    expect(sameLanguage('EN', 'en')).toBe(true);
    expect(sameLanguage('vi', 'vi')).toBe(true);
    expect(sameLanguage('ru', 'en')).toBe(false);
  });
});

describe('checkReplies', () => {
  test("puts the business's flower in place of any other", () => {
    const checked = checkReplies(answer(), { locale: 'vi', flower: '🪷' });
    expect(checked?.short.text).toBe('Thank you, {name}! 🙏 Hope to see you again 🪷');
    expect(checked?.short.translation).toBe('Cảm ơn {name}! 🪷');
    expect(checked?.warm.text).toBe('Dear {name}, thank you so much 🪷');
    expect(checked?.warm.translation).toBe('Thân mến {name} 🪷');
  });

  test('an abusive review gets replies with no emoji at all', () => {
    const checked = checkReplies(
      answer({
        abusive: true,
        short: { text: 'Hello {name} 🙏, we have no record of your visit. 🌸', translation: null },
        warm: { text: 'Hello {name}, ❤️ please contact us. 😊', translation: 'Xin chào 🙏' },
      }),
      { locale: 'vi', flower: '🪷' },
    );
    expect(checked?.short.text).toBe('Hello {name}, we have no record of your visit.');
    expect(checked?.warm.text).toBe('Hello {name}, please contact us.');
    expect(checked?.warm.translation).toBe('Xin chào');
  });

  test("drops the translations when the review is in the screen's language", () => {
    const checked = checkReplies(answer({ reviewLanguage: 'vi' }), { locale: 'vi', flower: '🪷' });
    expect(checked?.reviewTranslation).toBeNull();
    expect(checked?.short.translation).toBeNull();
    expect(checked?.warm.translation).toBeNull();
  });

  test('an empty reply fails', () => {
    expect(
      checkReplies(answer({ short: { text: '  ', translation: null } }), {
        locale: 'vi',
        flower: '🪷',
      }),
    ).toBeNull();
  });

  test('an empty translation counts as none', () => {
    const checked = checkReplies(answer({ reviewTranslation: ' ' }), {
      locale: 'vi',
      flower: '🪷',
    });
    expect(checked?.reviewTranslation).toBeNull();
  });
});
