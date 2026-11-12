import { describe, expect, it } from 'vitest';
import { joinQuestion, keepParagraphs, paragraphsOf } from '@/lib/posts/paragraphs';

// docs/specs/posts/short-captions, "At most three short paragraphs".
describe('keepParagraphs', () => {
  // A blank line between paragraphs, as the maintainer's examples have
  // (docs/specs/posts/short-captions, amended 2026-11-10).
  it('keeps three paragraphs, a blank line between them', () => {
    expect(keepParagraphs('Hook?\n\nOne.\nTwo.', 'post-1')).toEqual({
      caption: 'Hook?\n\nOne.\n\nTwo.',
      dropped: [],
    });
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

describe('paragraphsOf', () => {
  it('blank and space-only lines are no paragraph', () => {
    expect(paragraphsOf('A.\n \n\nB.')).toEqual(['A.', 'B.']);
  });
});

// On an offer post, a question alone after the line keeps its answer
// (docs/specs/posts/short-captions, amended 2026-11-12).
describe('joinQuestion', () => {
  it('joins a question alone in the second of four paragraphs to the third', () => {
    expect(joinQuestion('L\n\nQ?\n\nA.\n\nF.')).toBe('L\n\nQ? A.\n\nF.');
  });

  it('counts single line breaks as paragraphs, and keeps the emoji after the question', () => {
    expect(joinQuestion('L\nQ? 🌸\nA.\nF.')).toBe('L\n\nQ? 🌸 A.\n\nF.');
  });

  it('keeps a caption of three paragraphs byte for byte', () => {
    expect(joinQuestion('L\n\nQ?\n\nA.')).toBe('L\n\nQ?\n\nA.');
    expect(joinQuestion('L\nQ?\nA.')).toBe('L\nQ?\nA.');
  });

  it('never joins a second paragraph that holds more than its question', () => {
    expect(joinQuestion('L\n\nQ? A.\n\nB.\n\nF.')).toBe('L\n\nQ? A.\n\nB.\n\nF.');
    expect(joinQuestion('L\n\nNot one.\n\nA.\n\nF.')).toBe('L\n\nNot one.\n\nA.\n\nF.');
  });
});
