import { describe, expect, it } from 'vitest';
import { emojisIn, FLOWERS } from '@/lib/posts/emoji';
import { paragraphsOf } from '@/lib/posts/paragraphs';
import {
  SAMPLE_FACTS,
  SAMPLE_PHRASES,
  SAMPLE_PLACES,
  SAMPLES,
  samplesText,
} from '@/lib/posts/samples';
import { REASONS } from '@/lib/posts/setup';
import { folded, sentenceWords } from '@/lib/posts/variety';

// The five sample posts of Maré, a made-up business in Lisbon
// (docs/specs/posts/reasons-to-book, "Five sample posts").

const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const words = (text: string) => text.match(WORD)?.length ?? 0;
const flowers = (text: string) =>
  emojisIn(text).filter((e) => (FLOWERS as readonly string[]).includes(e)).length;
const withoutEmoji = (text: string) =>
  emojisIn(text)
    .reduce((t, e) => t.replaceAll(e, ''), text)
    .trim();

describe('the samples', () => {
  it('one per reason, in order, with their lights and guests', () => {
    expect(SAMPLES.map((s) => s.reason)).toEqual([...REASONS]);
    expect(SAMPLES.map((s) => s.light)).toEqual(['night', 'night', 'day', 'night', 'day']);
    expect(SAMPLES.map((s) => s.guests)).toEqual(['one', 'two', 'two', 'one', 'one']);
  });

  it.each(SAMPLES.map((s) => [s.reason, s] as const))(
    '%s keeps the caption and story rules',
    (_reason, sample) => {
      const paragraphs = paragraphsOf(sample.caption);
      expect(paragraphs).toHaveLength(3);
      const question = withoutEmoji(paragraphs[0]);
      expect(question.endsWith('?')).toBe(true);
      expect(words(question)).toBeLessThanOrEqual(12);
      for (const n of sentenceWords(paragraphs[1])) expect(n).toBeLessThanOrEqual(12);
      expect(sample.caption.length).toBeGreaterThanOrEqual(80);
      expect(sample.caption.length).toBeLessThanOrEqual(280);
      expect(flowers(sample.caption)).toBe(2);
      expect(emojisIn(sample.caption)).toHaveLength(2);
      expect(words(sample.story)).toBeLessThanOrEqual(10);
      expect(sample.story.length).toBeLessThanOrEqual(60);
      expect(flowers(sample.story)).toBe(1);
    },
  );

  it('every sample holds a phrase or a place code can catch', () => {
    for (const sample of SAMPLES) {
      const text = folded(`${sample.caption}\n${sample.story}`);
      const caught = [...SAMPLE_PHRASES, ...SAMPLE_PLACES].some((p) => text.includes(folded(p)));
      expect(caught).toBe(true);
    }
  });

  it("the prompt's text holds every caption, story text and fact", () => {
    const text = samplesText();
    for (const sample of SAMPLES) {
      expect(text).toContain(sample.caption);
      expect(text).toContain(sample.story);
    }
    for (const fact of SAMPLE_FACTS) expect(text).toContain(fact);
  });
});
