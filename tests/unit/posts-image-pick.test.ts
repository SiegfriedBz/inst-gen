import { describe, expect, test } from 'vitest';
import type { Post } from '@/lib/posts/batch';
import { IMAGES_PER_ATTEMPT, imagePosts } from '@/lib/posts/image-pick';
import type { Light, Setup } from '@/lib/posts/setup';
import { post } from './helpers/posts';

function setup(light: Light): Setup {
  return {
    look: 'plain',
    guests: 'woman',
    therapists: 1,
    bodyPart: 'back',
    scene: 'treatment',
    locals: 'Balinese',
    light,
  };
}

// Six posts with these lights; `offers` lists the posts that carry the offer.
function attempt(lights: (Light | null)[], offers: number[] = []): { posts: Post[] } {
  return {
    posts: lights.map((light, i) =>
      post({
        id: `post-${i + 1}`,
        ...(light ? { setup: setup(light) } : {}),
        ...(offers.includes(i + 1) ? { offer: true as const } : {}),
      }),
    ),
  };
}

describe('the two posts of an attempt that get images', () => {
  test('IMAGES_PER_ATTEMPT is 2', () => {
    expect(IMAGES_PER_ATTEMPT).toBe(2);
  });

  test('two offer posts get the images', () => {
    const lights: Light[] = ['day', 'night', 'day', 'night', 'day', 'night'];
    expect(imagePosts(attempt(lights, [3, 5]))).toEqual(['post-3', 'post-5']);
  });

  test('one offer post, then the other light', () => {
    const lights: Light[] = ['day', 'night', 'night', 'day', 'day', 'night'];
    expect(imagePosts(attempt(lights, [2]))).toEqual(['post-1', 'post-2']);
  });

  test('one offer post on a day, then the first night', () => {
    const lights: Light[] = ['day', 'day', 'night', 'day', 'night', 'night'];
    expect(imagePosts(attempt(lights, [1]))).toEqual(['post-1', 'post-3']);
  });

  test('without an offer, the first day and the first night', () => {
    const lights: Light[] = ['day', 'day', 'night', 'day', 'night', 'night'];
    expect(imagePosts(attempt(lights))).toEqual(['post-1', 'post-3']);
  });

  test('a night first keeps the attempt order', () => {
    const lights: Light[] = ['night', 'night', 'day', 'day', 'night', 'day'];
    expect(imagePosts(attempt(lights))).toEqual(['post-1', 'post-3']);
  });

  test('all days, or no set-ups, give the first two', () => {
    expect(imagePosts(attempt(['day', 'day', 'day', 'day', 'day', 'day']))).toEqual([
      'post-1',
      'post-2',
    ]);
    expect(imagePosts(attempt([null, null, null, null, null, null]))).toEqual(['post-1', 'post-2']);
  });

  test('a set-up without a light is a day', () => {
    const posts = attempt(['night', 'night', null, 'night', 'night', 'night']).posts;
    const noLight = { ...posts[2], setup: { ...setup('day'), light: undefined } };
    expect(imagePosts({ posts: posts.map((p, i) => (i === 2 ? noLight : p)) })).toEqual([
      'post-1',
      'post-3',
    ]);
  });

  test('fewer than two posts', () => {
    expect(imagePosts(attempt(['night']))).toEqual(['post-1']);
    expect(imagePosts({ posts: [] })).toEqual([]);
  });
});
