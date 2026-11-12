import { describe, expect, it } from 'vitest';
import { factOnItsLine, joinQuestion, keepParagraphs, paragraphsOf } from '@/lib/posts/paragraphs';

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

// The model joined its fact to the answer in 5 of posts-18's 8 captions
// (docs/specs/posts/short-captions, amended 2026-11-12).
describe('factOnItsLine', () => {
  it("puts the second paragraph's last sentence on a line of its own", () => {
    expect(factOnItsLine('Q?\n\nA. F 🌸', false)).toBe('Q?\n\nA.\n\nF 🌸');
  });

  it('keeps an emoji that opens the last sentence with the one before', () => {
    expect(factOnItsLine('Q?\n\nA. 🌸 F.', false)).toBe('Q?\n\nA. 🌸\n\nF.');
  });

  it("splits an offer post's question, answer and fact, never its question and answer", () => {
    expect(factOnItsLine('L\n\nQ? A. F.', true)).toBe('L\n\nQ? A.\n\nF.');
    expect(factOnItsLine('L\n\nQ? A.', true)).toBe('L\n\nQ? A.');
  });

  it('keeps one paragraph, three, and a second of one sentence, byte for byte', () => {
    expect(factOnItsLine('Q? A. F.', false)).toBe('Q? A. F.');
    expect(factOnItsLine('Q?\n\nA.\n\nF. G.', false)).toBe('Q?\n\nA.\n\nF. G.');
    expect(factOnItsLine('Q?\n\nA 🌸', false)).toBe('Q?\n\nA 🌸');
  });

  // The final review (2026-11-12): a stop after an abbreviation, or before a
  // lower-case word, ends no sentence.
  it('never splits at an abbreviation or a stop a lower-case word follows', () => {
    expect(factOnItsLine('Sore feet?\n\nWe come to your villa until 10 p.m. tonight.', false)).toBe(
      'Sore feet?\n\nWe come to your villa until 10 p.m. tonight.',
    );
    expect(
      factOnItsLine('Sore feet? 🌸\n\nWe come to your villa near Jl. Nelayan. 🌺', false),
    ).toBe('Sore feet? 🌸\n\nWe come to your villa near Jl. Nelayan. 🌺');
    expect(
      joinQuestion(
        'L\n\nSore legs after a surf near Jl. Nelayan?\n\nWe come to your villa tonight.\n\nNo deposit needed.',
      ),
    ).toBe(
      'L\n\nSore legs after a surf near Jl. Nelayan? We come to your villa tonight.\n\nNo deposit needed.',
    );
  });
});
