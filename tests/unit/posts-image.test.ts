import { describe, expect, test, vi } from 'vitest';
import { IMAGE_ERROR_STATUS, imageBodySchema, imageResponseSchema } from '@/lib/posts/image';
import { imageOwners, imagesOn } from '@/lib/posts/image-access';
import { IMAGE_PROMPT_VERSION, imagePrompt } from '@/lib/posts/image-prompt';

describe('the image request', () => {
  test('a prompt of 80 words is taken', () => {
    const prompt = Array.from({ length: 80 }, () => 'word').join(' ');
    expect(
      imageBodySchema.safeParse({ postId: 'p', imagePrompt: prompt, scene: 'detail' }).success,
    ).toBe(true);
  });

  test('a prompt over 80 words is refused', () => {
    const long = Array.from({ length: 81 }, () => 'word').join(' ');
    expect(
      imageBodySchema.safeParse({ postId: 'p', imagePrompt: long, scene: 'detail' }).success,
    ).toBe(false);
  });

  test('an unknown scene is refused', () => {
    expect(
      imageBodySchema.safeParse({ postId: 'p', imagePrompt: 'Oil at dusk', scene: 'room' }).success,
    ).toBe(false);
  });

  test('an empty prompt is refused', () => {
    expect(
      imageBodySchema.safeParse({ postId: 'p', imagePrompt: '', scene: 'detail' }).success,
    ).toBe(false);
  });

  test('a response holds base64 story and post', () => {
    const ok = {
      postId: 'p',
      story: 'AAEC',
      post: 'AAEC',
      model: 'm',
      promptVersion: 'images-1',
      ms: 10,
    };
    expect(imageResponseSchema.safeParse(ok).success).toBe(true);
    expect(imageResponseSchema.safeParse({ ...ok, story: 'not base64!' }).success).toBe(false);
  });

  test('error statuses', () => {
    expect(IMAGE_ERROR_STATUS).toEqual({
      invalid_request: 400,
      images_off: 403,
      images_paused: 503,
      image_blocked: 502,
      image_timeout: 504,
      image_failed: 502,
    });
  });
});

describe('who can make images', () => {
  test('owner list is trimmed and lower-cased', () => {
    expect(imageOwners({ IMAGE_OWNERS: ' Sen, svarga ,' })).toEqual(['sen', 'svarga']);
  });

  test('images are on for a listed owner with a key', () => {
    expect(imagesOn('sen', { IMAGE_OWNERS: 'sen', GOOGLE_IMAGE_API_KEY: 'k' })).toBe(true);
  });

  test('off for an owner not listed', () => {
    expect(imagesOn('dev', { IMAGE_OWNERS: 'sen,svarga', GOOGLE_IMAGE_API_KEY: 'k' })).toBe(false);
  });

  test('off for everyone without a key, logged once', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(imagesOn('sen', { IMAGE_OWNERS: 'sen' })).toBe(false);
    expect(imagesOn('sen', { IMAGE_OWNERS: 'sen' })).toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toContain('GOOGLE_IMAGE_API_KEY');
    error.mockRestore();
  });

  test('off with an empty list', () => {
    expect(imagesOn('sen', { IMAGE_OWNERS: '', GOOGLE_IMAGE_API_KEY: 'k' })).toBe(false);
  });
});

describe('the image prompt', () => {
  test('the prompt ends with the style line and asks for a centred subject', () => {
    const p = imagePrompt('  Warm oil on shoulders at dusk. ');
    expect(p.startsWith('Warm oil on shoulders at dusk. ')).toBe(true);
    expect(p).toContain(
      'Keep the subject in the middle of the frame, with calm space above and below it.',
    );
    expect(p).toMatch(/no text, letters, labels, logos or watermarks/i);
    expect(IMAGE_PROMPT_VERSION).toBe('images-1');
  });
});
