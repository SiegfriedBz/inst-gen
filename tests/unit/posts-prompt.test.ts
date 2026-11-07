import { describe, expect, it } from 'vitest';
import { BANNED_WORDS } from '@/lib/posts/banned';
import { POST_TYPES, SCENES } from '@/lib/posts/batch';
import { postsModelInput } from '@/lib/posts/input';
import type { Offer } from '@/lib/posts/offer';
import {
  POSTS_PROMPT_VERSION,
  planPrompt,
  planUserText,
  rewritePrompt,
  rewriteUserText,
} from '@/lib/posts/prompt';
import { dealSetups, seededRandom, setupLine } from '@/lib/posts/setup';
import { svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

describe('planPrompt', () => {
  it('holds every rule of the spec', () => {
    const prompt = planPrompt();
    for (const word of [...POST_TYPES, ...SCENES, ...BANNED_WORDS]) expect(prompt).toContain(word);
    for (const rule of [
      '125',
      '700',
      '80 words',
      'never from behind',
      'No text',
      'late afternoon',
      'lanterns',
      'No call to action',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  // The maintainer's verdicts on the first images (generate-images journal).
  it('asks for the massage in every image, from what the business offers', () => {
    const prompt = planPrompt();
    for (const rule of [
      "The massage is in every image: a therapist's hands working on a guest, or oil or towels being used for a treatment.",
      'Only what the business offers',
      'Never a guest alone, never an empty room, never a drink or a prop on its own.',
      'relaxed and alive',
      'neatly made',
      'never clinical or hospital-like',
      'curtains open and hanging still',
      'golden oil in a clear glass bottle',
      'never a small dark bottle',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  it('says every scene shows the massage, and no longer offers stones by default', () => {
    const prompt = planPrompt();
    expect(prompt).toContain('every scene shows the massage');
    expect(prompt).not.toMatch(/stones/);
  });

  it('has a version', () => {
    expect(POSTS_PROMPT_VERSION).toBe('posts-12');
  });
});

// docs/specs/posts/day-and-night-images
describe('day, night and the place', () => {
  it('the light follows the set-up', () => {
    const prompt = planPrompt();
    expect(prompt).toContain("Light follows the set-up's last word.");
    expect(prompt).toContain(
      'Day: late afternoon, the lamps lit inside the main light, the garden outside, through open doors or a wide window, in soft shade with no sunlight on it; warm and calm, never sunbeams across the room, a sunlit garden or harsh sun.',
    );
    expect(prompt).toContain(
      'Never a grey sky, mist, rain or damp. Never call a room or its light bright.',
    );
    expect(prompt).toContain(
      'Night: evening, lamps and candles giving the room a warm, golden glow, the garden outside lit by lanterns under a deep blue sky; warm and inviting, never dark or gloomy.',
    );
    expect(prompt).toContain('Never a grey sky, mist, rain or damp.');
    expect(prompt).toContain('scene, camera and light');
    expect(prompt).not.toMatch(/golden hour|\bdusk\b/i);
  });

  it('the visual style gives palette and textures, not light', () => {
    expect(planPrompt()).toContain("Use the visual style's palette and textures");
    const profile = svargaProfile();
    const light = profile.visualStyle?.light as string;
    const text = planUserText(postsModelInput(profile), []);
    expect(light).toBeTruthy();
    expect(text).not.toContain(light);
    expect(text).toContain(profile.visualStyle?.palette as string);
    expect(postsModelInput(profile).visualStyle?.light).toBe(light);
  });

  it('a profile with no visual style still plans', () => {
    const input = { ...postsModelInput(svargaProfile()), visualStyle: null };
    expect(planUserText(input, [])).toContain('"visualStyle": null');
  });

  it('the rewrite still reads the whole visual style', () => {
    const profile = svargaProfile();
    expect(rewriteUserText(postsModelInput(profile), [post()])).toContain(
      profile.visualStyle?.light as string,
    );
  });

  it('opens the room onto the place', () => {
    expect(planPrompt()).toContain(
      'The room opens onto the outside: open doors, a wide window or a balcony onto green plants that grow in that place, and the sea or a pool where the place has one.',
    );
  });

  it("allows a sign of the guest's day only in a moment post", () => {
    const prompt = planPrompt();
    expect(prompt).toContain(
      "Only in a moment post's image, one small, plain object from that moment may show",
    );
    expect(prompt).toContain('far in the background, half hidden and out of focus');
    expect(prompt).toContain('Most images have none.');
  });
});

describe('the image set-ups', () => {
  it('planPrompt says post n uses set-up n and never changes it', () => {
    const prompt = planPrompt();
    for (const rule of [
      '### Image set-ups',
      'Post 1 uses set-up 1',
      'never changes them, and never adds a guest or a therapist',
      '"a man" or "a woman"',
      '"two therapists"',
      "An offer post leads on its set-up's treatment",
      "copy the set-up's scene",
    ]) {
      expect(prompt).toContain(rule);
    }
    expect(prompt).not.toContain('At most 2 posts of any scene');
    expect(prompt).toContain('never writes "scene" or "set-up" in it');
  });

  it('the user text lists the set-ups in order, before the offer', () => {
    const setups = dealSetups(svargaProfile(), undefined, seededRandom('t'));
    const text = planUserText(postsModelInput(svargaProfile()), [], undefined, setups);
    const lines = setups.map((s, i) => `${i + 1}. ${setupLine(s)}`).join('\n');
    // Their hook styles follow them (docs/specs/posts/marketing-copy).
    expect(text).toContain(`### Image set-ups\n${lines}\n\n### Hooks\n`);
  });

  it('no set-ups, no section', () => {
    expect(planUserText(postsModelInput(svargaProfile()), [])).not.toContain('Image set-ups');
    expect(planUserText(postsModelInput(svargaProfile()), [])).not.toContain('### Hooks');
  });
});

describe('planUserText', () => {
  it('lists recent topics', () => {
    const text = planUserText(postsModelInput(svargaProfile()), [
      { type: 'offer', topic: 'Balinese massage at sunset' },
    ]);
    expect(text).toContain('offer: Balinese massage at sunset');
  });

  it('says none when there are no recent posts', () => {
    expect(planUserText(postsModelInput(svargaProfile()), [])).toContain('### Recent posts\nNone');
  });

  it('holds no WhatsApp number', () => {
    const text = planUserText(postsModelInput(svargaProfile()), []);
    expect(text.toLowerCase()).not.toContain('whatsapp');
    expect(text).not.toContain('+6281234567890');
  });
});

describe('rewritePrompt', () => {
  it('keeps type, topic, scene and image prompt', () => {
    expect(rewritePrompt()).toContain("Keep each post's type, topic, scene and image prompt");
  });

  it('gives the model each post with its id', () => {
    const text = rewriteUserText(postsModelInput(svargaProfile()), [post({ id: 'abc' })]);
    expect(text).toContain('"id": "abc"');
    expect(text).not.toContain('Book on WhatsApp');
  });
});

describe('the special offer', () => {
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };
  const free: Offer = {
    kind: 'freeExtra',
    gift: 'Foot Reflexology',
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };

  it('is not in the prompts without an offer', () => {
    expect(planPrompt()).not.toContain('special offer');
    expect(rewritePrompt()).not.toContain('special offer');
  });

  it("says the plan's offer rules with an offer", () => {
    const prompt = planPrompt(true);
    for (const rule of [
      'Exactly 2 offer posts carry the special offer',
      'never mention a discount, a free treatment or a deadline',
      'never a price',
      'Posts 1 and 2 are the two offer posts.',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  it('says the order once, by the hook: the offer line comes first', () => {
    const prompt = planPrompt(true, true);
    expect(prompt).toContain(
      'on a post that carries the special offer, the hook is its offer line, word for word, with nothing before it.',
    );
    expect(prompt).toContain(
      `Each offer post's caption starts with its offer line, given under "### Special offer", word for word.`,
    );
    expect(prompt).not.toContain('<percentage>');
    // posts-9 dropped 2.11's "as given" sentence, and 4 of 6 offer posts then
    // quoted a price (docs/specs/posts/offer-line-first, journal); posts-12
    // gives no price on any post (docs/specs/posts/marketing-copy).
    expect(prompt).toContain(
      'Never a bigger discount, never other terms, never a price, never another session length, never "today only" or "this week", anywhere in an offer post.',
    );
    expect(prompt).not.toContain('first line states the offer');
    expect(planPrompt(false, true)).not.toContain('offer line');
  });

  it('ends the plan text with the offer and its two lines, from set-ups 1 and 2', () => {
    const setups = dealSetups(svargaProfile(), offer, seededRandom('t'));
    const text = planUserText(postsModelInput(svargaProfile()), [], offer, setups);
    expect(text).toContain('### Image set-ups');
    expect(
      text.endsWith(
        "### Special offer\n- 10% off\n- On: Balinese massage\n- Sessions: 90 minutes or longer\n- Until: Tuesday 27 October\n- Post 1's offer line: 10% off our 90-minute Balinese massage, until Tuesday 27 October.\n- Post 2's offer line: 10% off our 90-minute Balinese massage, until Tuesday 27 October.",
      ),
    ).toBe(true);
    expect(planUserText(postsModelInput(svargaProfile()), [], free)).toContain(
      '- Free: Foot Reflexology, with a paid session',
    );
    expect(planUserText(postsModelInput(svargaProfile()), [])).not.toContain('Special offer');
  });

  it("gives a rewrite each carrying post's line, by id", () => {
    const text = rewriteUserText(
      postsModelInput(svargaProfile()),
      [
        post({ id: 'post-1', offer: true, caption: 'Our Balinese massage.' }),
        post({ id: 'post-3' }),
      ],
      offer,
    );
    expect(text).toContain(
      "- post-1's offer line: 10% off our 90-minute Balinese massage, until Tuesday 27 October.",
    );
    expect(text).not.toContain("post-3's offer line");
    expect(rewritePrompt(true, true)).toContain(
      'A post marked offer: true keeps the offer: its caption starts with its offer line, given under "### Special offer", word for word, and its story text is that line, followed by one flower; the other posts never mention it.',
    );
  });

  it('keeps the offer in the posts that carry it on a rewrite', () => {
    expect(rewritePrompt(true)).toContain('A post marked offer: true keeps the offer');
    const text = rewriteUserText(
      postsModelInput(svargaProfile()),
      [post({ id: 'a', offer: true })],
      offer,
    );
    expect(text).toContain('"offer": true');
    expect(text).toContain('### Special offer');
  });
});

// Hooks, positive endings, the story text and flowers (docs/specs/posts/story-text).
describe('the story text and the captions that sell', () => {
  it('asks for a story text with every post', () => {
    expect(planPrompt()).toContain(
      'Each post has a type, a topic, a scene, a caption, a story text, hashtags, alt text and an image prompt.',
    );
    expect(planPrompt()).toContain('Story text: its own line');
    expect(planPrompt()).toContain('at most 100 characters, emoji included');
    expect(planPrompt()).toContain('no call to action, and never the words');
    expect(planPrompt()).toContain('the sticker asks');
  });

  it('gives each type its job', () => {
    const prompt = planPrompt();
    for (const part of [
      'The mix, each type with its own job:',
      'Only offer posts sell a treatment',
      'what the guest will feel, rather than what the business does',
      'How a caption ends follows its type.',
      'Every ending stays warm',
    ]) {
      expect(prompt).toContain(part);
    }
  });

  it("gives a spa flowers only, and another business today's rule", () => {
    expect(planPrompt(false, true)).toContain(
      'Emoji: flowers only, from 🌸 🌺 🌼 🌷 🪷: 1 to 3 in the caption and 1 or 2 in the story text. No other emoji.',
    );
    expect(planPrompt(false, false)).toContain(
      'At most 2 emoji in the caption and at most 2 in the story text.',
    );
    expect(planPrompt(false, false)).not.toContain('🌸');
    expect(planPrompt(false, true)).not.toContain('at most 2 emoji');
  });

  it("makes an offer post's story text its offer line", () => {
    expect(planPrompt(true, true)).toContain(
      "Each offer post's story text is its offer line, word for word, followed by one flower.",
    );
    expect(planPrompt(true, false)).toContain(
      "Each offer post's story text is its offer line, word for word.",
    );
    expect(planPrompt(true, true)).toContain(
      'The other four posts never mention a discount, a free treatment or a deadline, in their captions or story texts.',
    );
  });

  it('rewrites the story texts too', () => {
    expect(rewritePrompt(false, true)).toContain(
      'You rewrite the captions, story texts, hashtags and alt text',
    );
    expect(rewritePrompt(false, true)).toContain('flowers only');
    expect(rewritePrompt(true, false)).toContain(
      'and its story text is that line; the other posts',
    );
  });
});

// docs/specs/posts/day-and-night-copy
describe('day and night copy', () => {
  const prompts = [
    ['plan', planPrompt(false, true)],
    ['plan with an offer', planPrompt(true, true)],
    ['rewrite', rewritePrompt(false, true)],
    ['rewrite with an offer', rewritePrompt(true, true)],
  ] as const;

  it.each(prompts)('the %s prompt quotes no example and asks for different posts', (_, prompt) => {
    expect(prompt).not.toContain('Wake up light');
    expect(prompt).not.toContain('Long flight?');
    expect(prompt).toContain(
      'Never reuse a phrase from these instructions or from the image set-ups',
    );
    expect(prompt).toContain('never the same first sentence, never the same last sentence');
  });

  it('the plan says the copy follows the set-up', () => {
    expect(planPrompt()).toContain(
      "Each caption and story text follows its post's light, the last word of its set-up.",
    );
  });

  it('the rewrite says the copy follows the post\'s "light"', () => {
    expect(rewritePrompt()).toContain(
      'Each caption and story text follows its post\'s light, its "light".',
    );
  });

  it('the rewrite gives each post its light, a day without a set-up', () => {
    const [setup] = dealSetups(svargaProfile(), undefined, seededRandom('t'));
    const text = rewriteUserText(postsModelInput(svargaProfile()), [
      post({ id: 'a', setup: { ...setup, light: 'night' } }),
      post({ id: 'b' }),
    ]);
    const posts = JSON.parse(text.split('### Posts\n')[1]);
    expect(posts.map((p: { light: string }) => p.light)).toEqual(['night', 'day']);
  });

  it('keeps the moments to post about in the mix', () => {
    expect(planPrompt()).toContain('(after a surf, a hike, a long flight)');
  });
});

// docs/specs/posts/marketing-copy
describe('marketing copy', () => {
  const prompts = [
    ['plan', planPrompt(false, true)],
    ['plan with an offer', planPrompt(true, true)],
    ['rewrite', rewritePrompt(false, true)],
    ['rewrite with an offer', rewritePrompt(true, true)],
  ] as const;
  const styles = [
    "- question: asks about the guest's own day.",
    '- scene: drops the guest into a moment they are living, in the present tense, with no question.',
    "- place: opens on one of the business's places or place symbols.",
    "- number: opens on a number that isn't a price: a duration, a time of day, a count.",
    '- fact: opens on a plain fact from the profile: a highlight, or its promise.',
    "- promise: opens on what the guest's body will feel after.",
  ];
  const jobs = [
    '- offer: makes the guest want one treatment or package now',
    '- moment: a reason people come (after a surf, a hike, a long flight)',
    "- local: the town or area and something it's known for",
    '- ritual: how a treatment unfolds, through the senses',
    '- tip: one piece of care advice a guest can use today, worth saving',
    '- proof: what the profile says about the business',
  ];
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };

  it.each(prompts)('the %s prompt gives the hook styles, the jobs and the rules', (_, prompt) => {
    for (const line of [...styles, ...jobs]) expect(prompt).toContain(line);
    for (const rule of [
      'Only offer posts sell a treatment',
      'alone on its line',
      'Never a price, anywhere.',
      'never asks the guest to book or message',
      'the sticker asks',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  it.each(prompts)('the %s prompt drops the words the model copied, and prices', (_, prompt) => {
    for (const gone of [
      'after the beach',
      'a walk round town',
      'a sunset, dinner',
      'canggu, danang',
      'massagedanang',
      'its price or duration',
      'Each caption sells',
      'a short version of its own caption',
    ]) {
      expect(prompt).not.toContain(gone);
    }
  });

  it('names the offer line as a hook only with an offer', () => {
    expect(planPrompt(true)).toContain(
      'A post that carries the special offer has none: its offer line is its hook.',
    );
    expect(planPrompt()).not.toContain('special offer');
    expect(rewritePrompt()).not.toContain('special offer');
  });

  it('lists the hooks after the set-ups', () => {
    const setups = dealSetups(svargaProfile(), undefined, seededRandom('t'));
    const text = planUserText(postsModelInput(svargaProfile()), [], undefined, setups);
    const hooks = setups.map((s, i) => `${i + 1}. ${s.hook}`).join('\n');
    expect(text).toContain(`### Hooks\n${hooks}`);
    expect(text.indexOf('### Hooks')).toBeGreaterThan(text.indexOf('### Image set-ups'));
  });

  it('gives the offer posts "offer line", the offer still last', () => {
    const setups = dealSetups(svargaProfile(), offer, seededRandom('t'));
    const text = planUserText(postsModelInput(svargaProfile()), [], offer, setups);
    expect(text).toContain('### Hooks\n1. offer line\n2. offer line\n3. ');
    expect(text.indexOf('### Special offer')).toBeGreaterThan(text.indexOf('### Hooks'));
  });

  it("gives a rewrite each post's hook, none without a set-up", () => {
    const [setup] = dealSetups(svargaProfile(), undefined, seededRandom('t'));
    const text = rewriteUserText(postsModelInput(svargaProfile()), [
      post({ id: 'a', setup: { ...setup, hook: 'place' } }),
      post({ id: 'b' }),
    ]);
    const posts = JSON.parse(text.split('### Posts\n')[1]);
    expect(posts[0].hook).toBe('place');
    expect('hook' in posts[1]).toBe(false);
  });
});
