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
    expect(POSTS_PROMPT_VERSION).toBe('posts-7');
  });
});

// docs/specs/posts/day-and-night-images
describe('day, night and the place', () => {
  it('the light follows the set-up', () => {
    const prompt = planPrompt();
    expect(prompt).toContain("Light follows the set-up's last word.");
    expect(prompt).toContain(
      'Day: late afternoon, lamps lit inside and soft natural daylight from the garden through open doors or a wide window; soft and warm, never sunbeams across the room or harsh sun.',
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
    expect(text.endsWith(`### Image set-ups\n${lines}`)).toBe(true);
  });

  it('no set-ups, no section', () => {
    expect(planUserText(postsModelInput(svargaProfile()), [])).not.toContain('Image set-ups');
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
      '"90-minute"',
      '"until"',
      'never a price',
      "Each offer post's first line states the offer",
      'Posts 1 and 2 are the two offer posts.',
      '"<percentage> off our 90-minute <treatment>, until <last day>."',
      '"Free <free treatment> with a 90-minute <treatment>, until <last day>."',
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  it('ends the plan text with the offer', () => {
    const setups = dealSetups(svargaProfile(), offer, seededRandom('t'));
    const text = planUserText(postsModelInput(svargaProfile()), [], offer, setups);
    expect(text).toContain('### Image set-ups');
    expect(
      text.endsWith(
        '### Special offer\n- 10% off\n- On: Balinese massage\n- Sessions: 90 minutes or longer\n- Until: Tuesday 27 October',
      ),
    ).toBe(true);
    expect(planUserText(postsModelInput(svargaProfile()), [], free)).toContain(
      '- Free: Foot Reflexology, with a paid session',
    );
    expect(planUserText(postsModelInput(svargaProfile()), [])).not.toContain('Special offer');
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
    expect(planPrompt()).toContain('Story text: a short version of its own caption');
    expect(planPrompt()).toContain('at most 100 characters, emoji included');
    expect(planPrompt()).toContain('no call to action: the owner adds a link sticker');
  });

  it('orders a caption from its hook to a positive ending', () => {
    const prompt = planPrompt();
    for (const part of [
      'Each caption sells, in this order: a hook',
      'what the guest will feel, rather than what the business does',
      'one concrete detail that makes it real',
      'a last sentence on a positive note',
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
      "Each offer post's story text is its first line, word for word, followed by one flower.",
    );
    expect(planPrompt(true, false)).toContain(
      "Each offer post's story text is its first line, word for word.",
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
    expect(rewritePrompt(true, true)).toContain(
      "in its caption's first line and as its story text",
    );
  });
});
