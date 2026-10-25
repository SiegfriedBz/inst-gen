import { describe, expect, it } from 'vitest';
import type { ModelPost } from '@/lib/posts/batch';
import {
  checkPlan,
  checkPost,
  checkRewrite,
  cleanHashtags,
  cutCaption,
  findFlags,
} from '@/lib/posts/checks';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

function profileWithPrice(price: string, duration = '90 minutes') {
  const profile = svargaProfile();
  profile.offerings = [{ name: 'Balinese massage', price, duration, source: profile.siteUrl }];
  return profile;
}

function raw(overrides: Partial<ModelPost> = {}): ModelPost {
  return {
    type: 'offer',
    topic: 'Balinese massage at your villa',
    scene: 'treatment',
    caption: 'Warm oil, slow hands, and the sound of the sea.',
    hashtags: ['canggu', 'balimassage', 'aftersurf'],
    altText: 'Hands pressing warm oil into shoulders on a villa deck at dusk',
    imagePrompt: 'A villa deck at dusk',
    ...overrides,
  };
}

describe('findFlags: prices', () => {
  it('does not flag a price the profile holds, however it is written', () => {
    const profile = profileWithPrice('350,000 VND');
    for (const caption of ['Only 350.000đ.', 'Just 350k for 90 minutes', 'VND 350,000 a session']) {
      expect(findFlags(caption, profile)).toEqual([]);
    }
  });

  it('flags a price the profile does not hold', () => {
    expect(findFlags('A treat, only 450k', profileWithPrice('350,000 VND'))).toEqual([
      { kind: 'price', text: '450k' },
    ]);
  });

  it('matches Indonesian and dollar prices', () => {
    expect(findFlags('From Rp 250.000 or IDR 250K', profileWithPrice('IDR 250,000'))).toEqual([]);
    expect(findFlags('Only $25', profileWithPrice('$25'))).toEqual([]);
    expect(findFlags('Only $30', profileWithPrice('$25'))).toEqual([
      { kind: 'price', text: '$30' },
    ]);
  });
});

describe('findFlags: durations', () => {
  it('compares durations in minutes', () => {
    const profile = profileWithPrice('IDR 450,000', '90 minutes');
    expect(findFlags('A full 1.5 hours of calm', profile)).toEqual([]);
    expect(findFlags('90 min of calm', profile)).toEqual([]);
    expect(findFlags('60 min of calm', profile)).toEqual([{ kind: 'duration', text: '60 min' }]);
  });
});

describe('findFlags: words and lengths', () => {
  it('flags a banned word', () => {
    expect(findFlags('A sensual escape', svargaProfile())).toEqual([
      { kind: 'banned', text: 'sensual' },
    ]);
  });

  it('flags a long first line without cutting it', () => {
    const first = 'a'.repeat(130);
    const flags = findFlags(`${first}\nMore.`, svargaProfile());
    expect(flags).toEqual([{ kind: 'firstLine', text: first }]);
  });
});

describe('cutCaption', () => {
  it('cuts a caption over 700 characters at the last full sentence', () => {
    const sentence = 'Warm oil and slow hands after a long day. ';
    const caption = sentence.repeat(20).trim();
    const cut = cutCaption(caption);
    expect(cut.length).toBeLessThanOrEqual(700);
    expect(cut.endsWith('day.')).toBe(true);
  });

  it('leaves a short caption as it is', () => {
    expect(cutCaption('Short.')).toBe('Short.');
  });
});

describe('cleanHashtags', () => {
  it('removes #, spaces and symbols, lower-cases, dedupes and keeps 5', () => {
    expect(
      cleanHashtags([
        '#DaNang',
        'massage danang',
        'danang',
        'Spa!',
        'aftersurf',
        'relax',
        'balcony',
      ]),
    ).toEqual(['danang', 'massagedanang', 'spa', 'aftersurf', 'relax']);
  });

  it('keeps Vietnamese letters and their accents', () => {
    expect(cleanHashtags(['#ĐàNẵng', 'massage'])).toEqual(['đànẵng', 'massage']);
  });

  it('treats accents typed as separate marks like precomposed ones', () => {
    expect(cleanHashtags(['Đa\u0300Na\u0306\u0303ng', 'đànẵng'])).toEqual(['đànẵng']);
  });

  it('still drops hyphens and folds case', () => {
    expect(cleanHashtags(['#da-nang', 'DaNang'])).toEqual(['danang']);
    expect(cleanHashtags(['#PijatBali'])).toEqual(['pijatbali']);
  });
});

describe('checkPost', () => {
  it('cuts alt text to 125 characters at a word boundary', () => {
    const { post: checked } = checkPost(
      raw({ altText: 'word '.repeat(40) }),
      svargaProfile(),
      'p1',
    );
    expect(checked?.altText.length).toBeLessThanOrEqual(125);
    expect(checked?.altText.endsWith('word')).toBe(true);
  });

  it('cuts the image prompt to 80 words', () => {
    const { post: checked } = checkPost(
      raw({ imagePrompt: 'dusk '.repeat(100) }),
      svargaProfile(),
      'p1',
    );
    expect(checked?.imagePrompt.split(/\s+/)).toHaveLength(80);
  });

  it('drops an unknown type and records it', () => {
    const { post: checked, dropped } = checkPost(raw({ type: 'meme' }), svargaProfile(), 'p1');
    expect(checked).toBeNull();
    expect(dropped).toEqual([{ field: 'posts', reason: 'unknown type "meme"' }]);
  });

  it('drops a post with an empty image prompt', () => {
    const { post: checked, dropped } = checkPost(
      raw({ imagePrompt: '   ' }),
      svargaProfile(),
      'p1',
    );
    expect(checked).toBeNull();
    expect(dropped).toEqual([{ field: 'posts', reason: 'empty image prompt' }]);
  });

  it('sets the call to action from the profile', () => {
    const { post: checked } = checkPost(raw(), svargaProfile(), 'p1');
    expect(checked?.cta).toBe('Book on WhatsApp: +6281234567890');
    expect(checked?.id).toBe('p1');
  });
});

describe('checkPlan', () => {
  it('keeps 6 of 7 posts and records a type used 3 times', () => {
    const types = ['offer', 'offer', 'offer', 'moment', 'local', 'tip', 'ritual'] as const;
    const scenes = [
      'treatment',
      'detail',
      'place',
      'guest',
      'treatment',
      'detail',
      'place',
    ] as const;
    const posts = types.map((type, i) => post({ id: `p${i}`, type, scene: scenes[i] }));
    const result = checkPlan(posts, [], svargaProfile());
    expect(result.posts).toHaveLength(6);
    expect(result.dropped).toContainEqual({ field: 'posts', reason: 'more than 6 posts' });
    expect(result.dropped).toContainEqual({ field: 'mix', reason: 'type offer used 3 times' });
  });

  it('keeps a short batch from a thin profile without failing', () => {
    const profile = profileWithPrice('IDR 450,000');
    profile.highlights = [];
    profile.essence.promise = null;
    const posts = ['offer', 'moment', 'local', 'tip'].map((type, i) =>
      post({ id: `p${i}`, type: type as 'offer' }),
    );
    const result = checkPlan(posts, [], profile);
    expect(result.posts).toHaveLength(4);
  });

  it('records fewer than 2 offers when the profile has two offerings', () => {
    const profile = svargaProfile();
    profile.offerings.push({ name: 'Foot massage', source: profile.siteUrl });
    const posts = ['offer', 'moment', 'local', 'tip', 'ritual', 'proof'].map((type, i) =>
      post({
        id: `p${i}`,
        type: type as 'offer',
        scene: (['treatment', 'detail', 'place'] as const)[i % 3],
      }),
    );
    expect(checkPlan(posts, [], profile).dropped).toContainEqual({
      field: 'mix',
      reason: 'fewer than 2 offer posts',
    });
  });
});

describe('checkRewrite', () => {
  const originals = [
    post({
      id: 'a',
      type: 'offer',
      topic: 'Massage',
      scene: 'treatment',
      imagePrompt: 'Deck at dusk',
    }),
    post({ id: 'b', type: 'tip', topic: 'Water', scene: 'detail', imagePrompt: 'A glass' }),
  ];

  it("keeps the original's type, topic, scene and image prompt", () => {
    const answer = {
      posts: [
        { id: 'a', caption: 'New words.', hashtags: ['canggu'], altText: 'New alt' },
        { id: 'b', caption: 'Drink water.', hashtags: ['tip'], altText: 'A glass of water' },
      ],
    };
    const { posts } = checkRewrite(answer, originals, svargaProfile());
    expect(posts[0]).toMatchObject({
      id: 'a',
      type: 'offer',
      topic: 'Massage',
      scene: 'treatment',
      imagePrompt: 'Deck at dusk',
      caption: 'New words.',
    });
  });

  it('keeps an original whose id the model left out', () => {
    const answer = { posts: [{ id: 'a', caption: 'New.', hashtags: [], altText: 'x' }] };
    const { posts, dropped } = checkRewrite(answer, originals, svargaProfile());
    expect(posts[1]).toEqual(originals[1]);
    expect(dropped).toContainEqual({ field: 'posts', reason: 'no rewrite for b' });
  });
});
