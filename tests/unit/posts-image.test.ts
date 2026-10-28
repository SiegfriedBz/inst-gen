import { describe, expect, test, vi } from 'vitest';
import { IMAGE_ERROR_STATUS, imageBodySchema, imageResponseSchema } from '@/lib/posts/image';
import { imagesOn } from '@/lib/posts/image-access';
import {
  cleanHint,
  cleanLight,
  IMAGE_PROMPT_VERSION,
  IMAGE_STYLE,
  imagePrompt,
  imageStyle,
} from '@/lib/posts/image-prompt';
import type { Setup } from '@/lib/posts/setup';

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
  test('every owner, with the key', () => {
    expect(imagesOn({ GOOGLE_IMAGE_API_KEY: 'k' })).toBe(true);
  });

  test('off for everyone without a key, logged once', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(imagesOn({})).toBe(false);
    expect(imagesOn({})).toBe(false);
    expect(error).toHaveBeenCalledTimes(1);
    expect(error.mock.calls[0][0]).toContain('GOOGLE_IMAGE_API_KEY');
    error.mockRestore();
  });
});

describe('the image prompt', () => {
  test('the prompt ends with the style line and asks for a centred subject', () => {
    const p = imagePrompt('  Warm oil on shoulders at golden hour. ');
    expect(p.startsWith('Warm oil on shoulders at golden hour. ')).toBe(true);
    expect(p).toContain(
      'Keep the subject in the middle of the frame, with calm space above and below it.',
    );
    expect(p).toMatch(/no text, letters, labels, logos or watermarks/i);
    expect(IMAGE_PROMPT_VERSION).toBe('images-6');
  });
});

describe("the owner's hint", () => {
  test('a hint goes before the style line', () => {
    expect(imagePrompt('A room at golden hour.', 'more green')).toBe(
      `A room at golden hour. The owner asks: more green. ${imageStyle('Southeast Asian')}`,
    );
    expect(imagePrompt('A room at golden hour.')).toBe(
      `A room at golden hour. ${imageStyle('Southeast Asian')}`,
    );
  });

  test('a hint is cleaned', () => {
    expect(cleanHint('  more\ngreen. ')).toBe('more green');
    expect(cleanHint(' a sunset\r\n balcony ')).toBe('a sunset balcony');
    expect(cleanHint('  ')).toBeUndefined();
    expect(cleanHint(undefined)).toBeUndefined();
  });

  test('a hint of 60 characters is taken, 61 is refused', () => {
    const body = { postId: 'p', imagePrompt: 'A room', scene: 'detail' };
    expect(imageBodySchema.safeParse({ ...body, hint: 'a'.repeat(60) }).success).toBe(true);
    expect(imageBodySchema.safeParse({ ...body, hint: 'a'.repeat(61) }).success).toBe(false);
  });
});

// The image prompts of Sen's and Svarga's posts-5 plans, as saved on the
// phones (tests/fixtures/sites/{sen,svarga}/posts.json before posts-6).
const POSTS_5_PROMPTS = [
  "A tall 9:16 photo showing a man lying relaxed on a massage bed in a hotel room. A female therapist's hands work with warm golden oil on his back. Low, soft and warm lighting, clean and tidy room, still air, no text.",
  "A tall 9:16 photo from the side showing a female therapist working on a man's arm on a massage bed. Warm golden oil is visible. Soft low lighting, clean boutique hotel room, still air, no text.",
  'A tall 9:16 photo showing a man sitting back in a reclining chair in a hotel room, with a female therapist seated at his feet. Soft warm lighting, clean linens, still air, no text.',
  "A tall 9:16 photo from above showing a woman lying on a massage bed. A female therapist's hands work on her shoulders and neck with warm golden oil. Low warm lighting, tidy room, still air, no text.",
  "A tall 9:16 close-up photo showing two female therapists working side by side on a guest's legs in a hotel room. Soft warm light, clean linens, still air, no text.",
  'A tall 9:16 photo showing a woman on a massage bed in a hotel room with a female therapist working on her arm using warm golden oil. Soft warm light, tidy room, still air, no text.',
  "A tall 9:16 photo of a female therapist's hands working with warm golden oil on a woman's back on a massage bed in a villa room, from the side. Soft warm lamp light, clean white linens, still air, no text.",
  'A tall 9:16 photo of a man sitting back in a reclining chair with feet resting on a towel, a female therapist seated at his feet, in a hotel room. Warm low light, clean interior, still air, no text.',
  "A tall 9:16 photo of a female therapist's hands working with warm golden oil on a man's arm on a massage bed, from the side. Soft lamp light, clean room, still air, no text.",
  "A tall 9:16 photo from above of a woman relaxed on a massage bed, a female therapist's hands spreading scrub, a bowl nearby. Warm lighting, clean white linens, still air, no text.",
  'A tall 9:16 photo of a man on a massage bed with two female therapists working in step, one on each side, focusing on the legs, in a villa room. Warm lamp light, clean linens, still air, no text.',
  "A tall 9:16 photo from above of a woman relaxed on a massage bed with warm golden oil, a female therapist's hands working on the shoulders and neck. Warm lighting, clean room, still air, no text.",
];

describe('light and weather in the post prompt', () => {
  // Golden hour for every image (docs/specs/posts/golden-hour-images); grey
  // skies, mist, rain and damp stay out (decision 0004's bake-off).
  test.each([
    ['Bright sunlight on the towels', 'Low golden sun on the towels'],
    ['A sunny balcony', 'A golden balcony'],
    ['Daylight through the window', 'Golden-hour light through the window'],
    ['A villa in the morning', 'A villa at golden hour'],
    ['Oil on a back at dusk', 'Oil on a back at golden hour'],
    ['A balcony at night', 'A balcony at golden hour'],
    ['Midday on the terrace', 'Golden hour on the terrace'],
    ['A dimly lit room', 'A warmly lit room'],
    ['A dim room', 'A warm room'],
    ['A darkened villa', 'A warm villa'],
    ['Low, soft and warm lighting', 'Golden-hour, soft and warm lighting'],
    ['Soft low lighting', 'Soft golden-hour lighting'],
    ['Warm low light', 'Warm golden-hour light'],
    [
      'A dimly lit villa at dusk, sunny balcony at midday',
      'A warmly lit villa at golden hour, golden balcony at golden hour',
    ],
    ['an overcast sky over a misty, wet terrace', 'a golden sky over a quiet, clean terrace'],
  ])('%s → %s', (input, output) => {
    expect(cleanLight(input)).toBe(output);
  });

  test.each([
    'A clean, sunlit Da Nang hotel room',
    'Sunlight and sunshine on a bright villa room',
    'Late afternoon on the balcony',
    'Smooth dark stones along the back',
    'Golden oil in clear glass, never a small dark bottle',
    'A low table beside the bed',
  ])('%s stays as written', (text) => {
    expect(cleanLight(text)).toBe(text);
  });

  // "New image" on a post saved with posts-5 must not stay dim.
  test.each(POSTS_5_PROMPTS)('a posts-5 prompt loses its low light: %s', (prompt) => {
    const out = cleanLight(prompt);
    expect(out).not.toMatch(/\blow\b[^.]*\blight/i);
    expect(out).not.toMatch(/\b(?:dim|dusk)\b/i);
  });

  test('grey skies, mist, rain and damp are dropped', () => {
    const p = imagePrompt(
      'A balcony under an overcast grey sky, misty garden, rain on damp stone.',
    );
    expect(p).not.toMatch(/overcast|grey sky|mist|rain|damp/i);
  });

  test('words that only contain a light word are kept', () => {
    expect(
      imagePrompt('A sunflower on a brainstorming table').startsWith(
        'A sunflower on a brainstorming table ',
      ),
    ).toBe(true);
  });

  test('the style line repeats the image rules as a safety net', () => {
    const p = imagePrompt('x');
    for (const rule of [
      "The massage is under way in the frame, with the therapist's hands.",
      'A guest looks relaxed and alive, never lying still as if asleep.',
      'Beds and linens are neatly made; nothing is messy.',
      'The room is warm and homely, never clinical or hospital-like.',
      'Curtains hang still; there is no wind.',
      'Massage oil is golden oil in clear glass, never a small dark bottle.',
    ]) {
      expect(p).toContain(rule);
    }
  });

  test('the style line says the light wins over the scene', () => {
    expect(imagePrompt('x')).toContain(
      'Whatever the scene says, the light is dusk, lamps, lanterns or candles.',
    );
  });
});

describe('the set-up and the therapists', () => {
  const fourHandsMan: Setup = {
    treatment: 'Four-Hands Massage',
    look: 'fourHands',
    guests: 'man',
    therapists: 2,
    bodyPart: 'back',
    scene: 'guest',
    locals: 'Balinese',
  };
  const body = { postId: 'p', imagePrompt: 'A room', scene: 'detail' };

  test('cast line first, then the prompt, the hint, the style', () => {
    expect(imagePrompt('Oil on a back at golden hour.', 'more green', fourHandsMan)).toBe(
      `One guest, a man. Two therapists, both young Balinese women. Oil on a back at golden hour. The owner asks: more green. ${IMAGE_STYLE}`,
    );
  });

  test('without a set-up: no cast line, therapists read as Southeast Asian', () => {
    const p = imagePrompt('A room at golden hour.');
    expect(p).toBe(`A room at golden hour. ${imageStyle('Southeast Asian')}`);
    expect(p).toContain('Every therapist is a young Southeast Asian woman');
  });

  test("the style line holds the spec's therapist sentence", () => {
    expect(IMAGE_STYLE).toContain(
      'Every therapist is a young local woman with warm, golden-tan skin, as women from here have: smooth, healthy and glowing, yet real, with natural texture; never pale or white, never dark. Her hands and arms are perfectly formed and look healthy: five slender fingers on each hand, clean short nails, natural joints and wrists, no extra or missing fingers, hands or arms. Her face is turned away, lowered or out of frame.',
    );
  });

  test('never a full face, therapist or guest', () => {
    expect(IMAGE_STYLE).toContain(
      "Every guest's face is turned away, resting in the face cradle, covered or out of frame: never a full face.",
    );
  });

  test('the body accepts a set-up and accepts none', () => {
    expect(imageBodySchema.safeParse({ ...body, setup: fourHandsMan }).success).toBe(true);
    expect(imageBodySchema.safeParse(body).success).toBe(true);
  });

  test('the body refuses a set-up with three therapists', () => {
    expect(
      imageBodySchema.safeParse({ ...body, setup: { ...fourHandsMan, therapists: 3 } }).success,
    ).toBe(false);
  });
});
