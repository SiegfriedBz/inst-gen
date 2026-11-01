import { describe, expect, it } from 'vitest';
import type { Post } from '@/lib/posts/batch';
import { dealSetups, seededRandom } from '@/lib/posts/setup';
import { lightRecords, repeatRecords } from '@/lib/posts/variety';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

// docs/specs/posts/day-and-night-copy, "Code's checks".
const [setup] = dealSetups(svargaProfile(), undefined, seededRandom('t'));

function at(
  n: number,
  caption: string,
  more: { light?: 'day' | 'night'; storyText?: string; offer?: true } = {},
): Post {
  const { light, ...rest } = more;
  return post({
    id: `post-${n}`,
    caption,
    ...(light ? { setup: { ...setup, light } } : {}),
    ...rest,
  });
}

describe('repeatRecords', () => {
  it('records a last sentence two captions share, flowers, case and spaces aside', () => {
    const posts = [
      at(1, 'Sore legs? Let warm oil work. Wake up light tomorrow. 🌺'),
      at(2, 'Busy day? Rest here. Feel new.'),
      at(3, 'Hot sun? Cool down. Smile again.'),
      at(4, 'Long walk? Slow hands help.  wake up light   tomorrow.'),
    ];
    expect(repeatRecords(posts)).toEqual([
      { field: 'mix', reason: 'last sentence "Wake up light tomorrow." in post-1, post-4' },
    ]);
  });

  it('records a first sentence two captions share', () => {
    const posts = [
      at(1, 'Feel new. Rest here.'),
      at(2, 'Long flight? 🌸 Let us ease it. Smile.'),
      at(3, 'Long flight? 🌺 Sleep it off. Breathe.'),
    ];
    expect(repeatRecords(posts)).toEqual([
      { field: 'mix', reason: 'first sentence "Long flight?" in post-2, post-3' },
    ]);
  });

  it('records a story text ending two posts share, but not on offer posts', () => {
    const story = (offer?: true) => [
      at(1, 'A. B.', { storyText: 'Tired? Sleep well. 🌸', offer }),
      at(2, 'C. D.', { storyText: 'Sore? sleep well. 🌺', offer }),
    ];
    expect(repeatRecords(story())).toEqual([
      { field: 'mix', reason: 'story text "Sleep well." in post-1, post-2' },
    ]);
    expect(repeatRecords(story(true))).toEqual([]);
  });

  it('leaves out offer posts opening on the same offer line', () => {
    const line = '10% off our 90-minute Balinese Massage, until Sunday 1 November.';
    const posts = [
      at(1, `${line} 🌸 Sore back? Rest.`, { offer: true }),
      at(2, `${line} 🌺 Long day? Unwind.`, { offer: true }),
    ];
    expect(repeatRecords(posts)).toEqual([]);
  });

  it('reads an emoji as the end of a sentence, and ignores the last stop', () => {
    const posts = [
      at(1, 'Rest here 🌸 Feel new 🌺'),
      at(2, 'Rest here. Smile.'),
      at(3, 'Busy day? Wake up light tomorrow 🌺'),
      at(4, 'Long walk? Wake up light tomorrow!'),
    ];
    expect(repeatRecords(posts)).toEqual([
      { field: 'mix', reason: 'first sentence "Rest here" in post-1, post-2' },
      { field: 'mix', reason: 'last sentence "Wake up light tomorrow" in post-3, post-4' },
    ]);
  });

  it('records nothing when every post differs', () => {
    const posts = Array.from({ length: 6 }, (_, i) =>
      at(i + 1, `Hook ${i}? Body ${i}. End ${i}. 🌸`, { storyText: `Story ${i}. 🌺` }),
    );
    expect(repeatRecords(posts)).toEqual([]);
  });
});

describe('lightRecords', () => {
  it('records a night word on a day post', () => {
    expect(lightRecords(at(2, 'Feel calm. Sleep deeply tonight.', { light: 'day' }))).toEqual([
      { field: 'light', reason: 'post-2 (day): "sleep"' },
    ]);
  });

  it('records a day word on a night post', () => {
    expect(lightRecords(at(3, 'Perfect this afternoon.', { light: 'night' }))).toEqual([
      { field: 'light', reason: 'post-3 (night): "this afternoon"' },
    ]);
  });

  it('matches whole words only', () => {
    expect(lightRecords(at(1, 'After wakeboarding, an awakening.', { light: 'day' }))).toEqual([]);
  });

  it('reads a post without a set-up as a day', () => {
    expect(lightRecords(at(4, 'Wake up fresh.'))).toEqual([
      { field: 'light', reason: 'post-4 (day): "wake"' },
    ]);
  });

  it('checks the story text too', () => {
    expect(
      lightRecords(at(5, 'Calm hands.', { light: 'night', storyText: 'Your midday break. 🌸' })),
    ).toEqual([{ field: 'light', reason: 'post-5 (night): "midday"' }]);
  });
});
