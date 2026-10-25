import { describe, expect, it } from 'vitest';
import { BANNED_WORDS } from '@/lib/posts/banned';
import { POST_TYPES, SCENES } from '@/lib/posts/batch';
import { postsModelInput } from '@/lib/posts/input';
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

  it('has a version', () => {
    expect(POSTS_PROMPT_VERSION).toBe('posts-1');
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
