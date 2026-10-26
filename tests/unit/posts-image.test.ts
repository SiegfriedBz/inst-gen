import { describe, expect, test, vi } from 'vitest';
import { IMAGE_ERROR_STATUS, imageBodySchema, imageResponseSchema } from '@/lib/posts/image';
import { imagesOn } from '@/lib/posts/image-access';
import {
  cleanHint,
  IMAGE_PROMPT_VERSION,
  IMAGE_STYLE,
  imagePrompt,
} from '@/lib/posts/image-prompt';

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
    const p = imagePrompt('  Warm oil on shoulders at dusk. ');
    expect(p.startsWith('Warm oil on shoulders at dusk. ')).toBe(true);
    expect(p).toContain(
      'Keep the subject in the middle of the frame, with calm space above and below it.',
    );
    expect(p).toMatch(/no text, letters, labels, logos or watermarks/i);
    expect(IMAGE_PROMPT_VERSION).toBe('images-4');
  });
});

describe("the owner's hint", () => {
  test('a hint goes before the style line', () => {
    expect(imagePrompt('A room at dusk.', 'more green')).toBe(
      `A room at dusk. The owner asks: more green. ${IMAGE_STYLE}`,
    );
    expect(imagePrompt('A room at dusk.')).toBe(`A room at dusk. ${IMAGE_STYLE}`);
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

describe('light and weather in the post prompt', () => {
  // 2.2's plan wrote "sunlit" for Sen although its prompt forbids bright sun
  // (journal, final eval); decision 0004 rejects daylight, grey skies and damp.
  test("Sen's sunlit room becomes lamp-lit", () => {
    const p = imagePrompt(
      'Vertical 9:16 photo of a professional massage treatment in a clean, sunlit Da Nang hotel room.',
    );
    expect(p).toContain('in a clean, lamp-lit Da Nang hotel room.');
    expect(p).not.toMatch(/sunlit/i);
  });

  test.each([
    ['A sunny balcony', 'A warm balcony'],
    ['Bright sunlight on the towels', 'Warm lamplight on the towels'],
    ['A villa in the morning', 'A villa at dusk'],
    ['Daylight through the window', 'Lamplight through the window'],
    ['Midday on the terrace', 'Dusk on the terrace'],
    ['A massage in a bright, tidy hotel room', 'A massage in a warm, tidy hotel room'],
  ])('%s → %s', (input, output) => {
    expect(imagePrompt(input).startsWith(`${output} `)).toBe(true);
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
