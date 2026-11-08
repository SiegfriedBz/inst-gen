import { describe, expect, test } from 'vitest';
import { LIMITS } from '@/lib/brand/profile';
import { cutLook, namesAMan } from '@/lib/brand/staff-look';

// The therapists' look (docs/specs/posts/therapists-look): the images always
// show women, and the look fits the profile's limits.

const words = (text: string) => text.split(' ').length;

describe('namesAMan', () => {
  test.each([
    'white tunics; the men wear shirts',
    'a male therapist in black',
    'His uniform is a navy tunic',
    'a boy in white',
  ])('"%s" names a man', (look) => {
    expect(namesAMan(look)).toBe(true);
  });

  test.each([
    'a woman in white',
    'women in navy tunics',
    'female staff in sage green',
    'a white tunic, white trousers, dark hair in a neat low bun',
    'the theme is calm, the hem is long',
  ])('"%s" names no man', (look) => {
    expect(namesAMan(look)).toBe(false);
  });
});

describe('cutLook', () => {
  test('a short look comes back trimmed and whole', () => {
    expect(cutLook('  a white tunic,  white trousers, dark hair in a neat low bun ')).toBe(
      'a white tunic, white trousers, dark hair in a neat low bun',
    );
  });

  test('a long look with commas ends before a comma, within 30 words', () => {
    const parts = Array.from({ length: 8 }, (_, i) => `part ${i} of the look`);
    const cut = cutLook(parts.join(', '));
    expect(words(cut)).toBeLessThanOrEqual(LIMITS.staffLookWords);
    expect(cut).toBe(parts.slice(0, 6).join(', '));
  });

  test('a long look with no comma keeps its first 30 words', () => {
    const forty = Array.from({ length: 40 }, (_, i) => `w${i}`).join(' ');
    expect(cutLook(forty)).toBe(Array.from({ length: 30 }, (_, i) => `w${i}`).join(' '));
  });

  test('30 long words stay within 300 characters, on a whole word', () => {
    const long = Array.from({ length: 30 }, (_, i) => `abcdefghij${String(i).padStart(2, '0')}`);
    const cut = cutLook(long.join(' '));
    expect(cut.length).toBeLessThanOrEqual(LIMITS.staffLookChars);
    expect(long.join(' ').startsWith(cut)).toBe(true);
    expect(long).toContain(cut.split(' ').at(-1));
  });
});
