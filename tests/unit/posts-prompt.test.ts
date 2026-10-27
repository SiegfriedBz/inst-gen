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
      'dusk',
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
      'curtains hang still',
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
    expect(POSTS_PROMPT_VERSION).toBe('posts-3');
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
    ]) {
      expect(prompt).toContain(rule);
    }
  });

  it('ends the plan text with the offer', () => {
    const text = planUserText(postsModelInput(svargaProfile()), [], offer);
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
