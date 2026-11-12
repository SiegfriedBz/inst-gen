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
import { applyEdit } from '@/lib/posts/edit';
import { emojisIn, FLOWERS } from '@/lib/posts/emoji';
import type { Offer } from '@/lib/posts/offer';
import { paragraphsOf } from '@/lib/posts/paragraphs';
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

// docs/specs/posts/two-suggestions, "Never a price".
describe('never a price', () => {
  it('a caption loses each sentence with a price, recorded', () => {
    const caption = 'Warm oil after a surf. Only 350k for 60 minutes. Sleep well tonight.';
    const { post: checked, dropped } = checkPost(
      raw({ type: 'moment', caption }),
      profileWithPrice('350,000 VND'),
      'post-2',
    );
    expect(checked?.caption).not.toContain('350k');
    expect(checked?.caption).toContain('Warm oil after a surf');
    expect(checked?.caption).toContain('Sleep well tonight');
    expect(dropped).toContainEqual({
      field: 'price',
      reason: 'post-2: price removed "Only 350k for 60 minutes."',
    });
  });

  it('dollar and rupiah prices go too, even ones the profile holds', () => {
    for (const price of ['From $25.', 'Just Rp 300.000 a session.']) {
      const { post: checked } = checkPost(
        raw({ caption: `Warm oil. ${price} Rest well.` }),
        profileWithPrice('Rp 300.000'),
        'post-1',
      );
      expect(checked?.caption).not.toMatch(/\$25|300\.000/);
    }
  });

  it('a story text loses its sentence with a price, recorded', () => {
    const { post: checked, dropped } = checkPost(
      raw({ storyText: 'Treat yourself tonight. From $25.' }),
      svargaProfile(),
      'post-1',
    );
    expect(checked?.storyText).toContain('Treat yourself tonight');
    expect(checked?.storyText).not.toContain('$25');
    expect(dropped).toContainEqual({ field: 'price', reason: 'post-1: price removed "From $25."' });
  });

  it('a story text keeps its words before an emoji, and loses the price after it', () => {
    const storyText =
      'Traditional Balinese Massage in your villa 🌸 IDR 250k for 60 min of pure relaxation.';
    const { post: checked, dropped } = checkPost(raw({ storyText }), svargaProfile(), 'post-1');
    expect(checked?.storyText).toBe('Traditional Balinese Massage in your villa 🌸');
    expect(dropped).toContainEqual({
      field: 'price',
      reason: 'post-1: price removed "IDR 250k for 60 min of pure relaxation."',
    });
  });

  it('a caption update loses its prices too', () => {
    const answer = {
      posts: [
        {
          id: 'a',
          caption: 'Warm oil. Only $30 tonight. Rest well.',
          hashtags: ['canggu'],
          altText: 'Oil',
          storyText: 'Rest well.',
        },
      ],
    };
    const { posts, dropped } = checkRewrite(
      answer,
      [post({ id: 'a', type: 'tip' })],
      svargaProfile(),
    );
    expect(posts[0].caption).not.toContain('$30');
    expect(dropped).toContainEqual({
      field: 'price',
      reason: 'a: price removed "Only $30 tonight."',
    });
  });

  // The final review's fixes (docs/specs/posts/two-suggestions, journal).
  it('lines without stops: only the line with a price goes, the breaks stay', () => {
    const caption = 'Warm oil after the surf\nOnly 350k for an hour\nRest well tonight';
    const { post: checked } = checkPost(raw({ type: 'moment', caption }), svargaProfile(), 'p1');
    // A blank line now, as between any paragraphs (docs/specs/posts/short-captions).
    expect(checked?.caption).toContain('Warm oil after the surf 🌸\n\nRest well tonight');
    expect(checked?.caption).not.toContain('350k');
  });

  it('a paragraph keeps its break when its first sentence goes', () => {
    const caption =
      'Sore after the surf?\n\nOnly 350k for 60 minutes. Feel your shoulders drop.\n\nRest well tonight.';
    const { post: checked } = checkPost(raw({ type: 'moment', caption }), svargaProfile(), 'p1');
    expect(
      checked?.caption.startsWith('Sore after the surf? 🌸\n\nFeel your shoulders drop.'),
    ).toBe(true);
  });

  it('a sentence an emoji splits mid-way goes whole', () => {
    const caption = 'Warm oil. Our 60-minute massage, IDR 250k 🌸 is waiting for you. Rest well.';
    const { post: checked } = checkPost(raw({ type: 'moment', caption }), svargaProfile(), 'p1');
    expect(checked?.caption).not.toContain('is waiting for you');
    expect(checked?.caption).toContain('Rest well');
  });

  it('a caption left with no words is dropped', () => {
    const { post: checked, dropped } = checkPost(
      raw({ type: 'moment', caption: 'Only 350k. From $25.' }),
      svargaProfile(),
      'p1',
    );
    expect(checked).toBeNull();
    expect(dropped).toContainEqual({ field: 'posts', reason: 'empty caption' });
  });

  it('a caption update left with no words keeps the old post', () => {
    const old = post({ id: 'a', type: 'tip', caption: 'Drink water after a massage.' });
    const answer = {
      posts: [
        {
          id: 'a',
          caption: 'Only $30 tonight.',
          hashtags: ['bali'],
          altText: 'Oil',
          storyText: 'Rest well.',
        },
      ],
    };
    const { posts, dropped } = checkRewrite(answer, [old], svargaProfile());
    expect(posts[0]).toEqual(old);
    expect(dropped).toContainEqual({ field: 'posts', reason: 'no rewrite for a' });
  });

  it('steps, runs and screens are not prices', () => {
    for (const sentence of [
      'After 10k steps round the Old Quarter, your legs deserve this.',
      'Stretch after a 5K run on the beach.',
    ]) {
      const { post: checked } = checkPost(
        raw({ type: 'moment', caption: `Warm oil. ${sentence} Rest well.` }),
        svargaProfile(),
        'p1',
      );
      expect(checked?.caption).toContain(sentence);
    }
  });

  it("the pilot's and fixtures' price forms go", () => {
    for (const price of [
      'Only 350.000₫ tonight.',
      'Just VNĐ 350.000 a session.',
      'Only 350k vnd tonight.',
      'Just Rp300rb a session.',
      'Only 1,500 Baht tonight.',
      'Only ฿900 tonight.',
      'Just RM 16.00 a session.',
      'Only €55 tonight.',
    ]) {
      const { post: checked } = checkPost(
        raw({ type: 'moment', caption: `Warm oil. ${price} Rest well.` }),
        svargaProfile(),
        'p1',
      );
      expect(checked?.caption, price).not.toContain(price.split(' ')[1]);
    }
  });

  it('a caption without a price is left alone', () => {
    const { dropped } = checkPost(
      raw({ caption: 'Warm oil, 90 minutes of calm.' }),
      svargaProfile(),
      'p1',
    );
    expect(dropped.filter((d) => d.field === 'price')).toEqual([]);
  });
});

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

  // A duration a highlight or the promise gives is the profile's too
  // (docs/specs/posts/marketing-copy, amended 2026-11-08).
  it("takes a highlight's and the promise's durations, and flags another", () => {
    const profile = svargaProfile();
    profile.highlights = [{ value: 'WhatsApp replies in ~5 mins', source: profile.siteUrl }];
    profile.essence.promise = { value: 'At your door within 30 minutes', source: profile.siteUrl };
    expect(findFlags('WhatsApp replies in about 5 minutes.', profile)).toEqual([]);
    expect(findFlags('At your villa within 30 minutes.', profile)).toEqual([]);
    expect(findFlags('Ready in 45 minutes.', profile)).toEqual([
      { kind: 'duration', text: '45 minutes' },
    ]);
  });

  it("gives a story text the highlight's duration too", () => {
    const profile = svargaProfile();
    profile.highlights = [{ value: 'WhatsApp replies in ~5 mins', source: profile.siteUrl }];
    const { post } = checkPost(
      raw({ storyText: 'Replies in about 5 minutes 🌸' }),
      profile,
      'post-2',
    );
    expect(post?.storyText).toBe('Replies in about 5 minutes 🌸');
    expect(post?.storyUnchecked ?? []).toEqual([]);
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
  it('cuts a caption over 400 characters at the last full sentence', () => {
    const sentence = 'Warm oil and slow hands after a long day. ';
    const caption = sentence.repeat(20).trim();
    const cut = cutCaption(caption);
    expect(cut.length).toBeLessThanOrEqual(400);
    expect(cut.length).toBeGreaterThan(350);
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

// docs/specs/posts/day-and-night-copy, "No stop before an emoji".
describe('no stop before an emoji', () => {
  it('removes it from the caption and the story text, keeping a question mark', () => {
    const { post: checked } = checkPost(
      raw({
        caption: 'Sore feet? 🌺 Feel light again. Wake up rested. 🌸',
        storyText: 'Sore feet? Rest well. 🌸',
      }),
      svargaProfile(),
      'p1',
    );
    expect(checked?.caption).toBe('Sore feet? 🌺\n\nFeel light again. Wake up rested 🌸');
    expect(checked?.storyText).toBe('Sore feet? Rest well 🌸');
  });

  it('removes it after a flower code adds', () => {
    const { post: checked } = checkPost(
      raw({ caption: 'Warm oil. Slow hands.' }),
      svargaProfile(),
      'p1',
    );
    expect(checked?.caption).toBe('Warm oil 🌸\n\nSlow hands 🌸');
  });

  // The offer line first again (docs/specs/posts/short-captions, amended 2026-11-12).
  it("removes it in an offer post's caption and story text", () => {
    const offer: Offer = {
      kind: 'discount',
      percent: 10,
      treatments: ['Balinese massage'],
      until: '2026-10-27',
      lastDay: 'Tuesday 27 October',
    };
    const { post: checked } = checkPost(
      raw({ caption: 'Long flight? 🌸 Our Balinese massage melts it away. Rest. 🌺' }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    const line = '10% off our 90-minute Balinese massage, until Tuesday 27 October';
    expect(checked?.caption).toBe(
      `${line}.\n\nLong flight? 🌸 Our Balinese massage melts it away. Rest 🌺`,
    );
    expect(checked?.storyText).toBe(`${line} 🌸`);
  });

  it('flags quote the text without it', () => {
    const caption = `${'Long words here, '.repeat(10)}End. 🌸`;
    const { post: checked } = checkPost(raw({ caption }), svargaProfile(), 'p1');
    const firstLine = checked?.unchecked.find((f) => f.kind === 'firstLine');
    expect(firstLine?.text.endsWith('End 🌸')).toBe(true);
  });

  it('removes it in a rewrite', () => {
    const answer = {
      posts: [
        {
          id: 'a',
          caption: 'New words. 🌺',
          hashtags: ['canggu'],
          altText: 'Alt',
          storyText: 'New. 🌸',
        },
      ],
    };
    const { posts } = checkRewrite(answer, [post({ id: 'a' })], svargaProfile());
    expect(posts[0].caption).toBe('New words 🌺');
    expect(posts[0].storyText).toBe('New 🌸');
  });
});

// docs/specs/posts/marketing-copy, "The hook alone on the first line".
describe('the hook alone on its line', () => {
  // Review Focus 1: the price goes first, so the next sentence is the hook
  // (the removal is docs/specs/posts/two-suggestions').
  it('makes the next sentence the hook when the first held a price', () => {
    const { post: checked } = checkPost(
      raw({
        caption:
          'Only IDR 250k for an hour? Rest in Canggu tonight. Warm oil and slow hands follow 🌸',
      }),
      svargaProfile(),
      'post-2',
    );
    expect(checked?.caption).toBe('Rest in Canggu tonight 🌸\n\nWarm oil and slow hands follow 🌸');
  });

  it("puts a plan caption's first sentence and its flower on their own line", () => {
    const { post: checked } = checkPost(
      raw({ caption: 'Sore shoulders from the paddle out? 🌸 Our therapists come to your villa.' }),
      svargaProfile(),
      'post-2',
    );
    expect(checked?.caption).toBe(
      'Sore shoulders from the paddle out? 🌸\n\nOur therapists come to your villa 🌸',
    );
  });

  it('puts the hook alone in a rewrite', () => {
    const answer = {
      posts: [
        {
          id: 'a',
          caption: 'Sore feet? 🌺 Warm oil helps.',
          hashtags: ['canggu'],
          altText: 'Alt',
          storyText: 'Rest well 🌸',
        },
      ],
    };
    const { posts } = checkRewrite(answer, [post({ id: 'a' })], svargaProfile());
    expect(posts[0].caption).toBe('Sore feet? 🌺\n\nWarm oil helps 🌸');
  });

  it('measures the hook, not the whole caption, for the first line flag', () => {
    const caption =
      `Sore shoulders after the surf? ${'Warm oil and slow hands on your back. '.repeat(8)}`.trim();
    expect(caption.length).toBeGreaterThanOrEqual(300);
    const { post: checked } = checkPost(raw({ caption }), svargaProfile(), 'p1');
    expect(checked?.unchecked.filter((f) => f.kind === 'firstLine')).toEqual([]);
  });

  it("leaves an owner's one-block caption as typed", () => {
    const caption = 'Sore feet? 🌺 Warm oil helps. Rest well.';
    const edited = applyEdit(
      post(),
      { caption, hashtags: 'spa', altText: 'Hands' },
      svargaProfile(),
    );
    expect(edited.caption).toBe(caption);
  });
});

describe('checkPlan', () => {
  // docs/specs/posts/two-suggestions
  it('keeps 2 of 3 posts', () => {
    const types = ['offer', 'moment', 'local'] as const;
    const posts = types.map((type, i) => post({ id: `p${i}`, type }));
    const result = checkPlan(posts, [], svargaProfile());
    expect(result.posts.map((p) => p.id)).toEqual(['p0', 'p1']);
    expect(result.dropped).toContainEqual({ field: 'posts', reason: 'more than 2 posts' });
  });

  it('keeps a short batch from a thin profile without failing', () => {
    const profile = profileWithPrice('IDR 450,000');
    profile.highlights = [];
    profile.essence.promise = null;
    const posts = ['offer', 'moment', 'local', 'tip'].map((type, i) =>
      post({ id: `p${i}`, type: type as 'offer' }),
    );
    const result = checkPlan(posts.slice(0, 1), [], profile);
    expect(result.posts).toHaveLength(1);
  });

  it('records no offer post', () => {
    const posts = ['moment', 'local'].map((type, i) =>
      post({ id: `p${i}`, type: type as 'moment', scene: 'detail' }),
    );
    const dropped = checkPlan(posts, [], svargaProfile()).dropped;
    expect(dropped).toContainEqual({ field: 'mix', reason: 'no offer post' });
    expect(dropped.some((d) => d.reason === 'fewer than 2 offer posts')).toBe(false);
  });

  it('an offer post and another: nothing recorded on the mix', () => {
    const posts = [
      post({ id: 'p0', type: 'offer', scene: 'treatment', caption: 'Sore legs? Warm oil.' }),
      post({
        id: 'p1',
        type: 'moment',
        scene: 'detail',
        caption: 'Long walk? Slow hands.',
      }),
    ];
    expect(checkPlan(posts, [], svargaProfile()).dropped.filter((d) => d.field === 'mix')).toEqual(
      [],
    );
  });
});

// docs/specs/posts/day-and-night-copy, "Code's checks".
describe('repeats in a plan and a rewrite', () => {
  const ending = 'Wake up light tomorrow.';
  // Posts 1 and 2: an attempt keeps two (docs/specs/posts/two-suggestions).
  const captions = [
    `Sore legs? Warm oil. ${ending}`,
    `Long walk? Slow hands. ${ending}`,
    'Busy day? Rest.',
  ];
  const record = { field: 'mix', reason: `last sentence "${ending}" in p0, p1` };

  it('checkPlan records them and keeps the posts', () => {
    const posts = captions.map((caption, i) =>
      post({ id: `p${i}`, caption, type: (['offer', 'tip', 'local'] as const)[i] }),
    );
    const result = checkPlan(posts, [], svargaProfile());
    expect(result.dropped).toContainEqual(record);
    expect(result.posts.map((p) => p.caption)).toEqual(captions.slice(0, 2));
  });

  it('checkRewrite records them', () => {
    const originals = captions.map((_, i) => post({ id: `p${i}` }));
    const answer = {
      posts: captions.map((caption, i) => ({
        id: `p${i}`,
        caption,
        hashtags: ['canggu'],
        altText: 'Hands',
        storyText: `Story ${i}.`,
      })),
    };
    // Code adds Svarga's flower, then removes the stop before it.
    expect(checkRewrite(answer, originals, svargaProfile()).dropped).toContainEqual({
      field: 'mix',
      reason: `last sentence "Wake up light tomorrow" in p0, p1`,
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
      caption: 'New words 🌸',
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

  // docs/specs/posts/marketing-copy, "The offer's end, by the WhatsApp line".
  it('gives only a post that carries the offer its end before the WhatsApp line', () => {
    const { post: carrying } = checkPost(raw({ type: 'offer' }), profile(), 'post-1', {
      offer,
      carries: true,
    });
    expect(carrying?.cta).toBe('Offer ends Tuesday 27 October. Book on WhatsApp: +6281234567890');
    const { post: other } = checkPost(raw({ type: 'moment' }), profile(), 'post-3', {
      offer,
      carries: false,
    });
    expect(other?.cta).toBe('Book on WhatsApp: +6281234567890');
  });

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

  // The offer line, first (docs/specs/posts/offer-line-first), second after
  // the question from 2026-11-10, and first again since
  // docs/specs/posts/short-captions was amended 2026-11-12.
  const LINE = '10% off our 90-minute Thai Massage, until Tuesday 27 October.';
  // The line as the owner sees it before an emoji (docs/specs/posts/day-and-night-copy).
  const SHOWN = LINE.slice(0, -1);
  const thaiSetup: Setup = {
    treatment: 'Thai Massage',
    look: 'plain',
    guests: 'man',
    therapists: 1,
    bodyPart: 'back',
    scene: 'treatment',
    locals: 'Balinese',
  };
  const offerRecords = (dropped: { field: string; reason: string }[]) =>
    dropped.filter((d) => d.field === 'offer');

  it('checkPost puts the offer line before the question, and sets the story text', () => {
    const { post: checked, dropped } = checkPost(
      raw({
        type: 'offer',
        caption: `Long flight? 🌸 ${LINE} Feel light again.`,
        storyText: 'Long flight? 🌸',
      }),
      profile(),
      'post-1',
      { offer, carries: true },
      thaiSetup,
    );
    expect(checked?.caption).toBe(`${LINE}\n\nLong flight? 🌸 Feel light again 🌸`);
    expect(checked?.storyText).toBe(`${SHOWN} 🌸`);
    expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: offer line put first' });
    expect(dropped).toContainEqual({
      field: 'offer',
      reason: 'post-1: story text set to the offer line',
    });
  });

  it('checkPost adds a missing offer line, and the last day is no longer flagged', () => {
    const { post: checked, dropped } = checkPost(
      raw({ type: 'offer' }),
      profile(),
      'post-2',
      { offer, carries: true },
      thaiSetup,
    );
    expect(paragraphsOf(checked?.caption ?? '')[0]?.startsWith(SHOWN)).toBe(true);
    expect(offerFlags(checked?.unchecked ?? [])).toEqual([]);
    expect(dropped).toContainEqual({ field: 'offer', reason: 'post-2: offer line added' });
  });

  it('checkPost keeps a post that is already right, with no offer record', () => {
    const caption = `${SHOWN} 🌺\n\nLong flight? We come to your villa.\n\nWarm oil and slow hands 🌸`;
    const { post: checked, dropped } = checkPost(
      raw({ type: 'offer', caption, storyText: `${LINE} 🌺` }),
      profile(),
      'post-1',
      { offer, carries: true },
      thaiSetup,
    );
    expect(checked?.caption).toBe(caption);
    expect(checked?.storyText).toBe(`${SHOWN} 🌺`);
    expect(offerRecords(dropped)).toEqual([]);
  });

  it('a post that does not carry the offer gets no offer step', () => {
    const { post: checked, dropped } = checkPost(
      raw({ type: 'moment', caption: 'Long flight? 🌸 Warm oil and slow hands.' }),
      profile(),
      'post-3',
      { offer, carries: false },
      thaiSetup,
    );
    expect(checked?.caption).toBe('Long flight? 🌸\n\nWarm oil and slow hands 🌸');
    expect(offerRecords(dropped)).toEqual([]);
  });

  it("uses the caption's treatment when the set-up's is not on offer, else records none", () => {
    const { post: named } = checkPost(
      raw({ type: 'offer', caption: 'Long flight? Our thai massage waits.' }),
      profile(),
      'post-3',
      { offer, carries: true },
      { ...thaiSetup, treatment: 'Hot Stone' },
    );
    expect(paragraphsOf(named?.caption ?? '')[0]?.startsWith(SHOWN)).toBe(true);
    const { post: left, dropped } = checkPost(
      raw({ type: 'offer', caption: 'Long flight? Warm oil.' }),
      profile(),
      'post-3',
      { offer, carries: true },
    );
    // Only the spa's flower and the hook's line touch it.
    expect(left?.caption).toBe('Long flight? 🌸\n\nWarm oil 🌸');
    expect(dropped).toContainEqual({
      field: 'offer',
      reason: 'post-3: no treatment for the offer line',
    });
  });

  it('checkPost removes a price after the line, as from any caption', () => {
    const caption = `${LINE} 🌸\n\nLong flight? Warm oil. Only IDR 450,000 tonight.\n\nWake up light.`;
    const { post: checked, dropped } = checkPost(
      raw({ type: 'offer', caption, storyText: `${LINE} 🌸` }),
      profile(),
      'post-1',
      { offer, carries: true },
      thaiSetup,
    );
    expect(checked?.caption).toBe(`${SHOWN} 🌸\n\nLong flight? Warm oil.\n\nWake up light 🌸`);
    expect(checked?.unchecked.map((f) => f.kind)).not.toContain('price');
    expect(dropped).toContainEqual({
      field: 'price',
      reason: 'post-1: price removed "Only IDR 450,000 tonight."',
    });
    const { post: other } = checkPost(
      raw({ type: 'offer', caption: 'Warm oil. Only IDR 450,000 tonight. 🌸' }),
      profile(),
      'post-3',
      { offer, carries: false },
      thaiSetup,
    );
    // Not the offer's, but never a price (docs/specs/posts/two-suggestions).
    expect(other?.caption).not.toContain('IDR 450,000');
  });

  it('checkRewrite keeps a line the model copied without its stop', () => {
    const shown = `${SHOWN} 🌸\n\nLong flight? We come to your villa.\n\nWarm oil 🌸`;
    const original = post({ id: 'a', offer: true, caption: shown, setup: thaiSetup });
    const answer = {
      posts: [
        { id: 'a', caption: shown, hashtags: ['canggu'], altText: 'x', storyText: `${SHOWN} 🌸` },
      ],
    };
    const { posts, dropped } = checkRewrite(answer, [original], profile(), offer);
    expect(posts[0].caption).toBe(shown);
    expect(posts[0].storyText).toBe(`${SHOWN} 🌸`);
    expect(offerRecords(dropped)).toEqual([]);
  });

  it('checkRewrite puts the line first on an old post without a set-up', () => {
    const original = post({ id: 'a', offer: true, caption: `${LINE} Warm oil.` });
    const answer = {
      posts: [
        {
          id: 'a',
          caption: 'Long flight? Our thai massage, 10% off until 27 Oct.',
          hashtags: ['canggu'],
          altText: 'x',
          storyText: 'Long flight?',
        },
      ],
    };
    const { posts, dropped } = checkRewrite(answer, [original], profile(), offer);
    expect(paragraphsOf(posts[0].caption)[0]?.startsWith(SHOWN)).toBe(true);
    expect(posts[0].storyText).toBe(`${SHOWN} 🌸`);
    expect(dropped).toContainEqual({ field: 'offer', reason: 'a: offer line put first' });
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
    expect(checked?.caption).toBe('Warm oil and slow hands tonight 🌸');
    expect(checked?.storyText).toBe('Relax tonight in your room! 🌸');
    expect(dropped).toEqual([
      { field: 'emoji', reason: 'post-1: caption removed 💆' },
      { field: 'emoji', reason: 'post-1: caption added 🌸' },
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

  it('removes a story text that was only a price', () => {
    const { post: checked } = checkPost(
      raw({ storyText: 'Only VND 900k tonight 🌸' }),
      profileWithPrice('VND 500k'),
      'post-1',
    );
    expect(checked?.storyText).toBeUndefined();
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
    expect(posts[0].storyText).toBe('New story 🌺');
    expect(posts[1].storyText).toBeUndefined();
    expect(posts[1].storyUnchecked).toBeUndefined();
  });
});

// docs/specs/posts/short-captions, "At most three short paragraphs".
describe('short captions', () => {
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const line = '10% off our 90-minute Balinese massage, until Tuesday 27 October';
  // Three paragraphs, over 400 characters in all.
  const long = 'Warm oil and slow hands work the knots out of your back. '.repeat(4).trim();

  it('counts a first line of two sentences as two, and keeps the last', () => {
    const { post: checked, dropped } = checkPost(
      raw({
        caption:
          'Sore legs after Mount Batur? 🌸 Our therapists come to your villa.\n\nNo deposit needed.\n\nFree travel in Canggu.',
      }),
      svargaProfile(),
      'post-1',
    );
    expect(checked?.caption).toBe(
      'Sore legs after Mount Batur? 🌸\n\nOur therapists come to your villa.\n\nFree travel in Canggu 🌸',
    );
    expect(dropped).toContainEqual({
      field: 'caption',
      reason: 'post-1: paragraph dropped "No deposit needed."',
    });
  });

  it('holds a caption update to three paragraphs', () => {
    const answer = {
      posts: [
        {
          id: 'a',
          caption: 'Sore feet? 🌺\n\nWarm oil helps.\n\nThen rest.\n\nSleep well.\n\nFree travel.',
          hashtags: ['canggu'],
          altText: 'Alt',
          storyText: 'Rest well 🌸',
        },
      ],
    };
    const { posts, dropped } = checkRewrite(answer, [post({ id: 'a' })], svargaProfile());
    expect(posts[0].caption).toBe('Sore feet? 🌺\n\nWarm oil helps.\n\nFree travel 🌸');
    expect(dropped.filter((d) => d.field === 'caption')).toHaveLength(2);
  });

  // Amended 2026-11-12: the offer line first, the question after it, kept
  // with its answer.
  it('keeps an offer caption of five paragraphs to its line, its question with its answer, and its last', () => {
    const { post: checked } = checkPost(
      raw({
        caption:
          'Long flight? 🌸\n\nOur Balinese massage eases it.\n\nTwo.\n\nThree.\n\nNo deposit needed.',
      }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.caption).toBe(
      `${line}.\n\nLong flight? 🌸 Our Balinese massage eases it.\n\nNo deposit needed 🌸`,
    );
  });

  it('puts the offer line first when the model wrote it second', () => {
    const { post: checked, dropped } = checkPost(
      raw({
        caption: `Tight hips after a day in Canggu? 🌸\n\n${line}.\n\nWe come to your villa.`,
      }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.caption).toBe(
      `${line}.\n\nTight hips after a day in Canggu? 🌸\n\nWe come to your villa 🌸`,
    );
    expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: offer line put first' });
  });

  it('adds the offer line first when the model left it out', () => {
    const { post: checked, dropped } = checkPost(
      raw({ caption: 'Tight hips after a day in Canggu? 🌸 Our Balinese massage loosens them.' }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.caption).toBe(
      `${line}.\n\nTight hips after a day in Canggu? 🌸 Our Balinese massage loosens them 🌸`,
    );
    expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: offer line added' });
  });

  it('removes a price after the line on an offer post', () => {
    const { post: checked } = checkPost(
      raw({
        caption: `Tight hips in Canggu? 🌸\n\n${line}.\n\nOnly IDR 250k for an hour. No deposit needed.`,
      }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.caption).toBe(`${line}.\n\nTight hips in Canggu? 🌸\n\nNo deposit needed 🌸`);
  });

  // The spec's scenarios, for a business that isn't a spa; the set-up gives
  // the line its treatment.
  const cafe = () => ({ ...svargaProfile(), category: 'cafe' });
  const balinese: Setup = {
    treatment: 'Balinese massage',
    look: 'plain',
    guests: 'man',
    therapists: 1,
    bodyPart: 'back',
    scene: 'treatment',
    locals: 'Balinese',
  };

  it('the offer line goes first', () => {
    const { post: checked, dropped } = checkPost(
      raw({
        caption: `Tight hips after a day exploring Da Nang?\n\n${line}.\n\nWe come to your hotel.`,
      }),
      cafe(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.caption).toBe(
      `${line}.\n\nTight hips after a day exploring Da Nang?\n\nWe come to your hotel.`,
    );
    expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: offer line put first' });
  });

  it('the offer line added first', () => {
    const { post: checked, dropped } = checkPost(
      raw({ caption: 'Tight hips after a day exploring Da Nang? We come to your hotel.' }),
      cafe(),
      'post-1',
      { offer, carries: true },
      balinese,
    );
    expect(checked?.caption).toBe(
      `${line}.\n\nTight hips after a day exploring Da Nang? We come to your hotel.`,
    );
    expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: offer line added' });
  });

  it('keeps the answer of an offer caption written with single line breaks', () => {
    const { post: checked, dropped } = checkPost(
      raw({
        caption: `${line}.\nTight hips in Canggu? 🌸\nWe come to your villa.\nFree travel in Canggu.`,
      }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    expect(checked?.caption).toBe(
      `${line}.\n\nTight hips in Canggu? 🌸 We come to your villa.\n\nFree travel in Canggu 🌸`,
    );
    expect(dropped.filter((d) => d.field === 'caption')).toEqual([]);
  });

  it("gives a spa's offer caption exactly two flowers", () => {
    const { post: checked } = checkPost(
      raw({
        caption: `Tight hips in Canggu? 🌸\n\n${line}. 🌺\n\nWe come to your villa. 🌼 Free travel. 🌷`,
      }),
      svargaProfile(),
      'post-1',
      { offer, carries: true },
    );
    const flowers = emojisIn(checked?.caption ?? '').filter((e) =>
      (FLOWERS as readonly string[]).includes(e),
    );
    expect(flowers).toHaveLength(2);
  });

  it('never joins a question in the second paragraph of a post without the offer', () => {
    const { post: checked } = checkPost(
      raw({
        type: 'moment',
        caption: 'Sore legs? 🌸\n\nTired feet?\n\nWe come to you.\n\nFree travel in Canggu.',
      }),
      svargaProfile(),
      'post-2',
    );
    expect(checked?.caption).toBe('Sore legs? 🌸\n\nTired feet?\n\nFree travel in Canggu 🌸');
  });

  it("gives a spa's caption a flower back when its only one went", () => {
    const { post: checked, dropped } = checkPost(
      raw({
        type: 'moment',
        caption:
          'Sore legs?\n\nOur therapists come to you.\n\nWarm oil 🌺 for tired feet.\n\nFree travel in Canggu.',
      }),
      svargaProfile(),
      'post-2',
    );
    const caption = checked?.caption ?? '';
    expect(paragraphsOf(caption)).toHaveLength(3);
    // Two, since docs/specs/posts/short-captions was amended 2026-11-10.
    expect(
      emojisIn(caption).filter((e) => (FLOWERS as readonly string[]).includes(e)),
    ).toHaveLength(2);
    expect(dropped).toContainEqual({
      field: 'emoji',
      reason: 'post-2: caption added 🌸, added 🌸',
    });
  });

  it('flags nothing in a paragraph that went', () => {
    const { post: checked } = checkPost(
      raw({
        type: 'moment',
        caption:
          'Sore legs? 🌸\n\nOur therapists come to you.\n\nA 45 minutes ritual.\n\nThen rest.\n\nFree travel in Canggu.',
      }),
      svargaProfile(),
      'post-2',
    );
    expect(checked?.unchecked.filter((f) => f.kind === 'duration')).toEqual([]);
  });

  it('cuts three long paragraphs at 400 characters, on a full sentence', () => {
    const profile = { ...svargaProfile(), category: 'cafe' };
    const { post: checked } = checkPost(
      raw({ caption: `Sore back after the hike?\n\n${long}\n\n${long}` }),
      profile,
      'post-1',
    );
    const caption = checked?.caption ?? '';
    expect(caption.length).toBeLessThanOrEqual(400);
    expect(caption.endsWith('back.')).toBe(true);
  });

  it("gives a spa's cut caption its flower back", () => {
    const { post: checked } = checkPost(
      raw({ caption: `Sore back after the hike?\n\n${long}\n\n${long} 🌸` }),
      svargaProfile(),
      'post-1',
    );
    expect(checked?.caption.endsWith('back 🌸')).toBe(true);
  });

  it("keeps a spa caption's first two flowers", () => {
    const { post: checked, dropped } = checkPost(
      raw({ caption: 'Sore legs in Canggu? 🌸\n\nWarm oil 🌺 helps.\n\nFree travel. 🌼' }),
      svargaProfile(),
      'post-1',
    );
    expect(checked?.caption).toBe('Sore legs in Canggu? 🌸\n\nWarm oil 🌺 helps.\n\nFree travel.');
    expect(dropped).toContainEqual({
      field: 'emoji',
      reason: 'post-1: caption removed 🌼 over 2 flowers',
    });
  });

  it("keeps an owner's caption of five paragraphs", () => {
    const caption = 'A.\n\nB.\n\nC.\n\nD.\n\nE.';
    const edited = applyEdit(
      post(),
      { caption, hashtags: 'spa', altText: 'Hands' },
      svargaProfile(),
    );
    expect(edited.caption).toBe(caption);
  });
});
