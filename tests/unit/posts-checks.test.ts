import { describe, expect, it } from 'vitest';
import type { Flag, ModelPost } from '@/lib/posts/batch';
import {
  carries,
  checkPlan,
  checkPost,
  checkRewrite,
  cleanHashtags,
  cutCaption,
  findFlags,
  setupFlags,
} from '@/lib/posts/checks';
import type { Offer } from '@/lib/posts/offer';
import type { Setup } from '@/lib/posts/setup';
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
    storyText: 'Warm oil tonight. 🌸',
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
        {
          id: 'a',
          caption: 'New words.',
          hashtags: ['canggu'],
          altText: 'New alt',
          storyText: 'New.',
        },
        {
          id: 'b',
          caption: 'Drink water.',
          hashtags: ['tip'],
          altText: 'A glass of water',
          storyText: 'Drink water.',
        },
      ],
    };
    const { posts } = checkRewrite(answer, originals, svargaProfile());
    expect(posts[0]).toMatchObject({
      id: 'a',
      type: 'offer',
      topic: 'Massage',
      scene: 'treatment',
      imagePrompt: 'Deck at dusk',
      // Svarga is a spa: code adds its flower (docs/specs/posts/story-text).
      caption: 'New words. 🌸',
    });
  });

  it('keeps an original whose id the model left out', () => {
    const answer = {
      posts: [{ id: 'a', caption: 'New.', hashtags: [], altText: 'x', storyText: 'New.' }],
    };
    const { posts, dropped } = checkRewrite(answer, originals, svargaProfile());
    expect(posts[1]).toEqual(originals[1]);
    expect(dropped).toContainEqual({ field: 'posts', reason: 'no rewrite for b' });
  });
});

describe('the special offer', () => {
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Thai Massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const profile = () => profileWithPrice('IDR 450,000', '60 min');
  const offerFlags = (flags: Flag[]) => flags.filter((f) => f.kind === 'offer').map((f) => f.text);

  it('without an offer, percentages are not looked at', () => {
    expect(offerFlags(findFlags('15% off this week', profile()))).toEqual([]);
  });

  it('the offer post states its own offer: nothing flagged', () => {
    const caption = '10% off a 90-minute Thai Massage, until 27 Oct. Our 90 minutes of calm.';
    expect(findFlags(caption, profile(), { offer, carries: true })).toEqual([]);
  });

  it('another percentage is flagged', () => {
    expect(
      offerFlags(findFlags('15% off until 27 Oct', profile(), { offer, carries: true })),
    ).toEqual(['15%']);
  });

  it('the offer in a post that does not carry it is flagged', () => {
    expect(offerFlags(findFlags('Now 10% off!', profile(), { offer, carries: false }))).toEqual([
      '10%',
    ]);
  });

  it('100%, 24/7 and ranges are never flagged', () => {
    const caption = '100% natural oils, open 24/7, 9-10pm. 10% off until 27 Oct.';
    expect(offerFlags(findFlags(caption, profile(), { offer, carries: true }))).toEqual([]);
  });

  it('an offer post without the last day is flagged', () => {
    expect(
      offerFlags(
        findFlags('10% off a 90-minute Thai Massage', profile(), { offer, carries: true }),
      ),
    ).toEqual(['Tuesday 27 October']);
  });

  it('90 minutes is a known duration only in a post that carries the offer', () => {
    const kinds = (c: boolean) =>
      findFlags('A 90 minutes ritual, until 27 Oct', profile(), { offer, carries: c }).map(
        (f) => f.kind,
      );
    expect(kinds(true)).not.toContain('duration');
    expect(kinds(false)).toContain('duration');
  });

  it('a free extra names its gift as a known fact; any percentage is flagged', () => {
    const free: Offer = {
      kind: 'freeExtra',
      gift: 'Foot Reflexology',
      treatments: ['Thai Massage'],
      until: offer.until,
      lastDay: offer.lastDay,
    };
    const caption = 'Free Foot Reflexology with a 90-minute Thai Massage, until 27 Oct';
    expect(findFlags(caption, profile(), { offer: free, carries: true })).toEqual([]);
    expect(
      offerFlags(findFlags(`${caption}. 10% off`, profile(), { offer: free, carries: true })),
    ).toEqual(['10%']);
  });

  it('only the first two offer posts carry it', () => {
    expect([
      carries('offer', 0),
      carries('offer', 1),
      carries('offer', 2),
      carries('tip', 0),
    ]).toEqual([true, true, false, false]);
  });

  it('checkPost marks a carrying post and checks it with the offer', () => {
    const { post: checked } = checkPost(
      raw({ type: 'offer', caption: '15% off a 90-minute massage, until 27 Oct.' }),
      profile(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.offer).toBe(true);
    expect(offerFlags(checked?.unchecked ?? [])).toEqual(['15%']);
    const { post: plain } = checkPost(raw(), profile(), 'post-2');
    expect(plain?.offer).toBeUndefined();
  });

  it('checkRewrite keeps the badge and checks with the offer', () => {
    const original = post({ id: 'a', offer: true });
    const answer = {
      posts: [
        {
          id: 'a',
          caption: '15% off, until 27 Oct.',
          hashtags: ['canggu'],
          altText: 'x',
          storyText: '15% off, until 27 Oct.',
        },
      ],
    };
    const { posts } = checkRewrite(answer, [original], profile(), offer);
    expect(posts[0].offer).toBe(true);
    expect(offerFlags(posts[0].unchecked)).toEqual(['15%']);
  });
});

describe('the image set-ups', () => {
  const setup: Setup = {
    treatment: 'Balinese massage',
    look: 'plain',
    guests: 'man',
    therapists: 1,
    bodyPart: 'back',
    scene: 'detail',
    locals: 'Balinese',
  };
  const withPrompt = (imagePrompt: string, s: Setup) =>
    post({ id: 'post-1', imagePrompt, setup: s });

  it('checkPost takes the scene from the set-up and keeps the set-up', () => {
    const { post: checked, dropped } = checkPost(
      raw({ scene: 'banana' }),
      svargaProfile(),
      'post-1',
      undefined,
      setup,
    );
    // Only the spa's flower is recorded: no scene was dropped.
    expect(dropped.filter((d) => d.field !== 'emoji')).toEqual([]);
    expect(checked?.scene).toBe('detail');
    expect(checked?.setup).toEqual(setup);
  });

  it('without a set-up, an unknown scene still drops the post', () => {
    expect(checkPost(raw({ scene: 'banana' }), svargaProfile(), 'post-1').post).toBeNull();
  });

  it('flags a prompt with only "a woman" for a man set-up', () => {
    expect(setupFlags(withPrompt('A woman relaxes on a bed at dusk', setup))).toEqual([
      { field: 'image', reason: 'post-1: no "man" in the image prompt' },
    ]);
  });

  it('flags a four-hands prompt without "two therapists"', () => {
    const fourHands: Setup = { ...setup, look: 'fourHands', therapists: 2 };
    expect(setupFlags(withPrompt('A man on a bed, therapists at work', fourHands))).toEqual([
      { field: 'image', reason: 'post-1: no "two therapists" in the image prompt' },
    ]);
  });

  it('a couple needs both man and woman', () => {
    const couple: Setup = { ...setup, look: 'couple', guests: 'couple', therapists: 2 };
    expect(setupFlags(withPrompt('A Man and two therapists', couple))).toEqual([
      { field: 'image', reason: 'post-1: no "woman" in the image prompt' },
    ]);
  });

  it('"two women therapists" names the two therapists', () => {
    const fourHands: Setup = { ...setup, look: 'fourHands', therapists: 2 };
    expect(
      setupFlags(withPrompt("Two women therapists work on a man's shoulders", fourHands)),
    ).toEqual([]);
  });

  it('no flag when the prompt matches', () => {
    const fourHands: Setup = { ...setup, look: 'fourHands', therapists: 2 };
    expect(setupFlags(withPrompt('A man on a bed, Two therapists at work', fourHands))).toEqual([]);
  });

  it('no set-up, no flag', () => {
    expect(setupFlags(post({ imagePrompt: 'A deck' }))).toEqual([]);
  });

  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const plan = (types: string[]) =>
    types.map((type, i) =>
      post({
        id: `p${i}`,
        type: type as 'offer',
        scene: (['treatment', 'detail', 'place'] as const)[i % 3],
      }),
    );

  it('flags an offer plan whose posts 1 and 2 are not offer posts', () => {
    const result = checkPlan(
      plan(['moment', 'offer', 'offer', 'local', 'tip', 'ritual']),
      [],
      svargaProfile(),
      offer,
    );
    expect(result.dropped).toContainEqual({
      field: 'mix',
      reason: 'offer posts are not posts 1 and 2',
    });
  });

  it('no flag when posts 1 and 2 are the offer posts', () => {
    const result = checkPlan(
      plan(['offer', 'offer', 'moment', 'local', 'tip', 'ritual']),
      [],
      svargaProfile(),
      offer,
    );
    expect(result.dropped).not.toContainEqual({
      field: 'mix',
      reason: 'offer posts are not posts 1 and 2',
    });
  });

  it('no offer, no position flag', () => {
    const result = checkPlan(
      plan(['moment', 'offer', 'offer', 'local', 'tip', 'ritual']),
      [],
      svargaProfile(),
    );
    expect(result.dropped).not.toContainEqual({
      field: 'mix',
      reason: 'offer posts are not posts 1 and 2',
    });
  });
});

// The story text and the spa's flowers (docs/specs/posts/story-text).
describe('story text and flowers', () => {
  const bakery = () => ({ ...svargaProfile(), category: 'bakery' });

  it("fixes a spa's caption and story text emojis, and records each fix", () => {
    const { post: checked, dropped } = checkPost(
      raw({
        caption: 'Warm oil 💆 and slow hands tonight.',
        storyText: 'Relax tonight 💆 in your room!',
      }),
      svargaProfile(),
      'post-1',
    );
    expect(checked?.caption).toBe('Warm oil and slow hands tonight. 🌸');
    expect(checked?.storyText).toBe('Relax tonight in your room! 🌸');
    expect(dropped).toEqual([
      { field: 'emoji', reason: 'post-1: caption removed 💆, added 🌸' },
      { field: 'emoji', reason: 'post-1: story text removed 💆, added 🌸' },
    ]);
  });

  it("leaves another business's emoji as they are", () => {
    const { post: checked, dropped } = checkPost(
      raw({ caption: 'Fresh bread 🥐 every morning.', storyText: 'Fresh bread 🥐' }),
      bakery(),
      'post-1',
    );
    expect(checked?.caption).toBe('Fresh bread 🥐 every morning.');
    expect(checked?.storyText).toBe('Fresh bread 🥐');
    expect(dropped).toEqual([]);
  });

  it("flags a price in the story text apart from the caption's flags", () => {
    const { post: checked } = checkPost(
      raw({ storyText: 'Only VND 900k tonight 🌸' }),
      profileWithPrice('VND 500k'),
      'post-1',
    );
    expect(checked?.storyUnchecked).toEqual([{ kind: 'price', text: 'VND 900k' }]);
    expect(checked?.unchecked).toEqual([]);
  });

  it('keeps a post whose story text is missing, with none', () => {
    const { post: checked, dropped } = checkPost(
      raw({ storyText: undefined as unknown as string }),
      bakery(),
      'post-2',
    );
    expect(checked).not.toBeNull();
    expect(checked?.storyText).toBeUndefined();
    expect(dropped).toEqual([{ field: 'story', reason: 'post-2: no story text' }]);
  });

  it("gives a rewritten post the answer's story text, or none", () => {
    const originals = [
      post({ id: 'a', storyText: 'Old story. 🌸', storyUnchecked: [] }),
      post({ id: 'b', storyText: 'Old story. 🌸', storyUnchecked: [] }),
    ];
    const answer = {
      posts: [
        { id: 'a', caption: 'New.', hashtags: [], altText: 'x', storyText: 'New story. 🌺' },
        { id: 'b', caption: 'New.', hashtags: [], altText: 'x', storyText: '' },
      ],
    };
    const { posts } = checkRewrite(answer, originals, svargaProfile());
    expect(posts[0].storyText).toBe('New story. 🌺');
    expect(posts[1].storyText).toBeUndefined();
    expect(posts[1].storyUnchecked).toBeUndefined();
  });
});
