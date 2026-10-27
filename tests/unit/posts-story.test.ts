import { describe, expect, it } from 'vitest';
import { POSTS_LIMITS } from '@/lib/posts/batch';
import { cleanStory, cutStory } from '@/lib/posts/story';

// The story text's cleanup and cut (docs/specs/posts/story-text, "Code's
// checks").

const long =
  'Long flight? Deep tissue in your room for sixty minutes tonight. Our local therapists ease every knot. Wake up light and happy tomorrow!';

describe('cutStory', () => {
  it('keeps a text that fits', () => {
    expect(cutStory('Long flight? 🌸', 120)).toBe('Long flight? 🌸');
  });

  it('keeps the whole sentences that fit', () => {
    expect(long.length).toBe(136);
    expect(cutStory(long, 120)).toBe(
      'Long flight? Deep tissue in your room for sixty minutes tonight. Our local therapists ease every knot.',
    );
  });

  it('falls back to whole words, never inside an emoji', () => {
    const text = `${'word '.repeat(23)}go🧘‍♀️ end`;
    const out = cutStory(text, 120);
    expect(out.length).toBeLessThanOrEqual(120);
    expect(out).toMatch(/word$/);
  });

  it('cuts a single word too long by whole graphemes', () => {
    const out = cutStory(`${'a'.repeat(118)}🌸🌸`, 120);
    expect(out).toBe(`${'a'.repeat(118)}🌸`);
  });
});

describe('cleanStory', () => {
  it('limits are 120 and 100', () => {
    expect(POSTS_LIMITS.storyChars).toBe(120);
    expect(POSTS_LIMITS.storyAsked).toBe(100);
  });

  it('gives a spa story text its flower within 120', () => {
    const { storyText, dropped } = cleanStory('a'.repeat(119), { id: 'post-1', spa: true });
    expect(storyText?.endsWith(' 🌸')).toBe(true);
    expect(storyText?.length).toBeLessThanOrEqual(120);
    expect(dropped).toContainEqual({ field: 'emoji', reason: 'post-1: story text added 🌸' });
  });

  it("fixes a spa's emojis", () => {
    const { storyText, dropped } = cleanStory('Relax tonight 💆 in your room!', {
      id: 'post-4',
      spa: true,
    });
    expect(storyText).toBe('Relax tonight in your room! 🌸');
    expect(dropped).toEqual([
      { field: 'emoji', reason: 'post-4: story text removed 💆' },
      { field: 'emoji', reason: 'post-4: story text added 🌸' },
    ]);
  });

  it('removes hashtags', () => {
    expect(cleanStory('Calm tonight #danang 🌸', { id: 'post-1', spa: true }).storyText).toBe(
      'Calm tonight 🌸',
    );
  });

  it('leaves no story text when only hashtags and emoji are left', () => {
    const out = cleanStory('#danang 💆', { id: 'post-2', spa: true });
    expect(out.storyText).toBeUndefined();
    expect(out.dropped).toContainEqual({ field: 'story', reason: 'post-2: no story text' });
  });

  it('leaves no story text for a recording made before story texts', () => {
    const out = cleanStory(undefined, { id: 'post-1', spa: false });
    expect(out.storyText).toBeUndefined();
    expect(out.dropped).toEqual([{ field: 'story', reason: 'post-1: no story text' }]);
  });

  it('records a cut', () => {
    const out = cleanStory(long, { id: 'post-3', spa: false });
    expect(out.storyText?.length).toBe(102);
    expect(out.dropped).toContainEqual({
      field: 'story',
      reason: 'post-3: story text cut from 136 to 102',
    });
  });

  it("keeps another business's emoji", () => {
    expect(cleanStory('Fresh bread 🥐', { id: 'post-1', spa: false })).toEqual({
      storyText: 'Fresh bread 🥐',
      dropped: [],
    });
  });

  it('keeps a flower the cut would drop', () => {
    const text = `${'Calm tonight. '.repeat(8)}Wake up light! 🌺`;
    const { storyText } = cleanStory(text, { id: 'post-1', spa: true });
    expect(storyText?.length).toBeLessThanOrEqual(120);
    expect(storyText?.endsWith('🌸') || storyText?.endsWith('🌺')).toBe(true);
  });
});
