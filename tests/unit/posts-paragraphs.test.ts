import { describe, expect, it } from 'vitest';
import { keepParagraphs, paragraphsOf } from '@/lib/posts/paragraphs';

// docs/specs/posts/short-captions, "At most three short paragraphs".
describe('keepParagraphs', () => {
  it('keeps three paragraphs as they are', () => {
    const caption = 'Hook?\n\nOne.\nTwo.';
    expect(keepParagraphs(caption, 'post-1')).toEqual({ caption, dropped: [] });
  });

  it('keeps the first, the second and the last of five', () => {
    expect(keepParagraphs('A.\n\nB.\n\nC.\n\nD.\n\nE.', 'post-2')).toEqual({
      caption: 'A.\n\nB.\n\nE.',
      dropped: [
        { field: 'caption', reason: 'post-2: paragraph dropped "C."' },
        { field: 'caption', reason: 'post-2: paragraph dropped "D."' },
      ],
    });
  });

  it('a flower alone on a line belongs to the paragraph before it', () => {
    const three = 'A.\n🌸\n\nB.\n\nC.';
    expect(keepParagraphs(three, 'post-1')).toEqual({ caption: three, dropped: [] });
    expect(keepParagraphs('🌸\nA.\n\nB.\n\nC.\n\nD.', 'post-1').caption).toBe('🌸\nA.\n\nB.\n\nD.');
  });
});

// Code put the offer line before the model's own hook: that hook goes first
// (docs/specs/posts/short-captions, final review).
describe('keepParagraphs after the offer line was put first', () => {
  it("drops the model's displaced hook first", () => {
    expect(keepParagraphs('L.\n\nH.\n\nA.\n\nB.', 'post-1', true)).toEqual({
      caption: 'L.\n\nA.\n\nB.',
      dropped: [{ field: 'caption', reason: 'post-1: paragraph dropped "H."' }],
    });
  });

  it('keeps three paragraphs as they are', () => {
    const caption = 'L.\n\nH.\n\nA.';
    expect(keepParagraphs(caption, 'post-1', true)).toEqual({ caption, dropped: [] });
  });
});

describe('paragraphsOf', () => {
  it('blank and space-only lines are no paragraph', () => {
    expect(paragraphsOf('A.\n \n\nB.')).toEqual(['A.', 'B.']);
  });
});
