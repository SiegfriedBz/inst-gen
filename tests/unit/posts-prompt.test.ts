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
      '280',
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

  // docs/specs/posts/two-suggestions
  it('plans two posts: an offer post and one of another type', () => {
    const prompt = planPrompt();
    expect(prompt).toContain('You plan two Instagram posts');
    expect(prompt).toContain(
      'Post 1 is an offer post. Post 2 is one of the other types: moment, local, ritual, tip or proof. Never repeat the topic of a recent post.',
    );
    expect(prompt).not.toMatch(/six|At least 2 offer posts|at least 4 different types/);
  });

  it('with an offer, both posts are offer posts', () => {
    const prompt = planPrompt(true);
    expect(prompt).toContain(
      'Posts 1 and 2 are both offer posts. Never repeat the topic of a recent post.',
    );
    expect(prompt).not.toContain('Post 2 is one of the other types');
  });

  it('never a price, in a plan or a caption update', () => {
    for (const prompt of [
      planPrompt(),
      planPrompt(true, true),
      rewritePrompt(),
      rewritePrompt(true),
    ]) {
      expect(prompt).toContain('- Never a price, in a caption or a story text.');
      expect(prompt).not.toMatch(/its price|with its price|a price, a duration/);
    }
    expect(planPrompt()).toContain(
      '- offer: makes the guest want one treatment or package now: the sore spot it answers and what changes after; its duration when the profile gives it.',
    );
  });

  it('has a version', () => {
    expect(POSTS_PROMPT_VERSION).toBe('posts-17');
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
    // No hook styles follow them (docs/specs/posts/short-captions, amended
    // 2026-11-10).
    expect(text).toContain(`### Image set-ups\n${lines}`);
    expect(text).not.toContain('### Hooks');
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
      'Both carry the special offer',
      'never a price',
      'Posts 1 and 2 are the two offer posts.',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  // Amended 2026-11-10: the question first, the offer line second
  // (docs/specs/posts/short-captions).
  it('says the order: the question, then the offer line', () => {
    const prompt = planPrompt(true, true);
    expect(prompt).toContain(
      'A post that carries the special offer opens on its question too; its offer line comes right after it.',
    );
    expect(prompt).toContain(
      `Each offer post's caption opens on its question, then its offer line, given under "### Special offer", word for word, as its second paragraph.`,
    );
    expect(prompt).not.toContain('<percentage>');
    // posts-9 dropped 2.11's "as given" sentence, and 4 of 6 offer posts then
    // quoted a price (docs/specs/posts/offer-line-first, journal); since
    // posts-12, no post gives one (docs/specs/posts/two-suggestions).
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
      'A post marked offer: true keeps the offer: its caption opens on its question, then its offer line, given under "### Special offer", word for word, as its second paragraph, and its story text is that line, followed by one flower; the other posts never mention it.',
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
      'says what the massage does for the guest, plainly',
      'The caption ends on its fact, warm and plain',
    ]) {
      expect(prompt).toContain(part);
    }
  });

  it("gives a spa flowers only, and another business today's rule", () => {
    expect(planPrompt(false, true)).toContain(
      'Emoji: flowers only, from 🌸 🌺 🌼 🌷 🪷: exactly 2 in the caption, one right after the question and one at its very end, and exactly 1 in the story text, at its end. No other emoji.',
    );
    expect(planPrompt(false, false)).toContain(
      'At most 2 emoji in the caption and at most 1 in the story text.',
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
    expect(planPrompt(true, true)).not.toContain('other four');
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
      "A caption or story text that says when follows its post's light, the last word of its set-up",
    );
  });

  it('the rewrite says the copy follows the post\'s "light"', () => {
    expect(rewritePrompt()).toContain(
      'A caption or story text that says when follows its post\'s light, its "light"',
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
    '- scene: names a moment the guest is living, in a few plain words, in the present tense, with no question.',
    "- place: opens on one of the business's real places: its town or area, a place it serves, or a landmark.",
    "- number: opens on a number that isn't a price: a duration, a time of day, a count.",
    '- fact: opens on a plain fact from the profile: a highlight, or its promise.',
    "- promise: opens on what the guest's body will feel after.",
  ];
  const jobs = [
    '- offer: makes the guest want one treatment or package now',
    '- moment: a reason people come (after a surf, a hike, a long flight)',
    "- local: the town or area and something it's known for",
    '- ritual: the steps of one treatment, in plain words',
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

  // Amended 2026-11-10: no hook styles, every hook a question.
  it.each(prompts)('the %s prompt gives the jobs and the rules, no hook styles', (_, prompt) => {
    for (const line of jobs) expect(prompt).toContain(line);
    for (const line of styles) expect(prompt).not.toContain(line);
    for (const rule of [
      'Only offer posts sell a treatment',
      'alone on its line',
      '- Never a price, in a caption or a story text.',
      "Each caption names one of the business's real places, as its profile writes it",
      'A flower, a plant, an oil or an object is never a place',
      'never asks the guest to book or message',
      'the sticker asks',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  // Amended 2026-11-10: one shape for every caption, plan and rewrite
  // (docs/specs/posts/short-captions).
  it.each(prompts)('the %s prompt gives every caption three paragraphs', (_, prompt) => {
    expect(prompt).toContain(
      'Then two more paragraphs, with a blank line between them: three in all, never more.',
    );
    expect(prompt).toContain(
      "The third is one fact from the profile's highlights, stated plainly in one short sentence: never the same highlight in both captions.",
    );
    expect(prompt).not.toContain('Shapes:');
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

  it('names the offer line only with an offer', () => {
    expect(planPrompt(true)).toContain(
      'A post that carries the special offer opens on its question too',
    );
    expect(planPrompt()).not.toContain('special offer');
    expect(rewritePrompt()).not.toContain('special offer');
  });

  it('gives the model no hook styles, the offer still last', () => {
    const setups = dealSetups(svargaProfile(), offer, seededRandom('t'));
    const text = planUserText(postsModelInput(svargaProfile()), [], offer, setups);
    expect(text).not.toContain('### Hooks');
    expect(text.indexOf('### Special offer')).toBeGreaterThan(text.indexOf('### Image set-ups'));
  });

  it('gives a rewrite no hook style, even from a set-up that has one', () => {
    const [setup] = dealSetups(svargaProfile(), undefined, seededRandom('t'));
    const text = rewriteUserText(postsModelInput(svargaProfile()), [
      post({ id: 'a', setup: { ...setup, hook: 'place' } }),
    ]);
    const posts = JSON.parse(text.split('### Posts\n')[1]);
    expect('hook' in posts[0]).toBe(false);
  });
});

// docs/specs/posts/short-captions
describe('short captions', () => {
  const prompts = [
    ['plan', planPrompt(false, true)],
    ['plan with an offer', planPrompt(true, true)],
    ['rewrite', rewritePrompt(false, true)],
    ['rewrite with an offer', rewritePrompt(true, true)],
  ] as const;

  it.each(prompts)('the %s prompt asks for three short paragraphs, no setting', (_, prompt) => {
    for (const rule of [
      'a short question that ends with "?"',
      'three in all, never more',
      'a sentence holds at most 15 words',
      'one idea each',
      '80 to 280 characters in all',
      'Never describe the setting',
      'Never describe what the photo shows',
      'No call to action and no contact details, ever: the app adds its own booking line with the number after the caption, so the caption never writes one. Its last paragraph is its fact.',
      'Feelings and place symbols are yours to use, in a few words.',
      'It need not say when, and never describes the light.',
      'in its hook or the paragraph right after it',
      'characters in all, the hook included',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  it.each(prompts)('the %s prompt drops what made captions long', (_, prompt) => {
    for (const gone of [
      'what the guest will feel, rather than what the business does',
      'through the senses',
      'how it feels',
      'puts the guest back',
      'senses and place symbols are yours to use freely',
      '250 to 700',
      'as it may a sense',
      "draw on the profile's senses",
      'hook style',
      'Book on WhatsApp',
    ]) {
      expect(prompt).not.toContain(gone);
    }
  });
});
