import { describe, expect, test } from 'vitest';
import { fillName } from '@/lib/reviews/name';

// The guest's name, put in on the phone (docs/specs/reviews/reply-drafts,
// "The replies").
describe('fillName', () => {
  test('puts the name in as typed, every time', () => {
    expect(fillName('Thank you, {name}! See you, {name}.', 'Anna K.')).toBe(
      'Thank you, Anna K.! See you, Anna K..',
    );
    expect(fillName('Cảm ơn chị {name}!', ' Nguyễn Văn An ')).toBe('Cảm ơn chị Nguyễn Văn An!');
  });

  test('fillName keeps $ patterns literal', () => {
    expect(fillName('Thank you, {name}!', 'Jo$&ann $1')).toBe('Thank you, Jo$&ann $1!');
  });

  test('without a name, the placeholder goes with the comma or space before it', () => {
    expect(fillName('Thank you, {name}!', '')).toBe('Thank you!');
    expect(fillName('Thank you {name}, we loved it.', '  ')).toBe('Thank you, we loved it.');
    expect(fillName('Dear {name}, thanks.', '')).toBe('Dear, thanks.');
    expect(fillName('No name here.', '')).toBe('No name here.');
  });
});
