import { describe, expect, test, vi } from 'vitest';
import { IMAGE_ERROR_STATUS, imageBodySchema, imageResponseSchema } from '@/lib/posts/image';
import { imagesOn } from '@/lib/posts/image-access';
import {
  cleanHint,
  cleanLight,
  IMAGE_PROMPT_VERSION,
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
    const p = imagePrompt('  Warm oil on shoulders in the late afternoon. ');
    expect(p.startsWith('Warm oil on shoulders in the late afternoon. ')).toBe(true);
    expect(p).toContain(
      'Keep the subject in the middle of the frame, with calm space above and below it.',
    );
    expect(p).toMatch(/no text, letters, labels, logos or watermarks/i);
    expect(IMAGE_PROMPT_VERSION).toBe('images-8');
  });
});

describe("the owner's hint", () => {
  test('a hint goes before the style line', () => {
    expect(imagePrompt('A room in the late afternoon.', 'more green')).toBe(
      `A room in the late afternoon. The owner asks: more green. ${imageStyle()}`,
    );
    expect(imagePrompt('A room in the late afternoon.')).toBe(
      `A room in the late afternoon. ${imageStyle()}`,
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
// phones (tests/fixtures/sites/{sen,svarga}/posts.json and posts-offer.json
// before posts-6).
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
  // posts-offer.json, before posts-6.
  "A photo of a woman lying relaxed on a massage bed in a hotel room in Da Nang. A female therapist's hands are working on her legs, using warm golden oil. Low soft warm lighting, clean white linens, still air. No text.",
  'A photo of a man lying relaxed on a floor mattress in a hotel room in Da Nang, wearing loose cotton clothes. A female therapist is stretching his leg using palm pressure. Low soft warm lighting, tidy room, still air. No text.',
  'A photo of a man sitting relaxed in a reclining chair in a hotel room in Da Nang, with his feet resting on a clean towel. A female therapist is seated at his feet performing reflexology. Low soft warm lighting, tidy room. No text.',
  "A photo of a man lying relaxed on a massage bed in a hotel room in Da Nang. A female therapist's hands are working on his back using warm golden oil. Low soft warm lighting, clean linens, still air. No text.",
  "A photo from above of a woman lying relaxed on a massage bed in a hotel room in Da Nang. A female therapist's hands are working on her shoulders and neck with warm golden oil. Low soft warm lighting, tidy room. No text.",
  'A photo of a man and a woman lying relaxed on two massage beds side by side in a hotel room in Da Nang. Two female therapists are working on their arms and hands. Low soft warm lighting, clean linens, still air. No text.',
  "A woman relaxing on a massage bed in a warm, low-lit hotel room in Canggu. A therapist's hands work gently on her shoulders and neck using warm golden oil. Clean white linens, soft lamplight, tropical ambiance. Vertical 9:16 ratio.",
  'A man resting on a massage bed in a warmly lit villa room. Two female therapists work in step, one on each side, focusing on his legs. Soft ambient light, neat linens, serene atmosphere. Vertical 9:16 ratio.',
  "A close view of a female therapist's hands working on a woman's back with warm golden oil on a massage bed. Low soft light, clean room, peaceful mood. Vertical 9:16 ratio.",
  'A woman on a massage bed in a clean, warm villa room receiving a Balinese lulur scrub. A bowl of scrub is nearby, and a female therapist spreads it gently on her arm. Low soft lighting, tidy linens. Vertical 9:16 ratio.',
  'A man sitting back in a reclining chair with his feet on a towel in a warm, dimly lit room. A female therapist is seated at his feet performing reflexology. Soft lamp light, homely feel. Vertical 9:16 ratio.',
  "A man resting on a massage bed in a warm villa room. A female therapist's hands work deeply on his back. Low soft lighting, clean room, peaceful ambiance. Vertical 9:16 ratio.",
];

describe('light and weather in the post prompt', () => {
  // Words of the other light, and of dark or harsh light, are swapped by the
  // set-up's light (docs/specs/posts/day-and-night-images); grey skies, mist,
  // rain and damp stay out (decision 0004's bake-off).
  test.each([
    ['Bright sunlight on the towels', 'Soft daylight on the towels'],
    ['Sunbeams across the bed', 'Soft light across the bed'],
    ['A sunset balcony', 'A late afternoon balcony'],
    ['Golden hour sunlight flooding the room', 'Late afternoon soft daylight flooding the room'],
    ['low warm golden sun', 'gentle warm golden soft daylight'],
    ['A sunlit, sunny room', 'A softly lit, soft room'],
    ['A golden-hour glow', 'A late afternoon glow'],
    ['A villa at dusk', 'A villa in the late afternoon'],
    ['A balcony at night', 'A balcony in the late afternoon'],
    ['Evening on the terrace', 'Late afternoon on the terrace'],
    ['A villa in the morning', 'A villa in the late afternoon'],
    ['Midday on the terrace', 'Late afternoon on the terrace'],
    ['A warm, low-lit hotel room', 'A warm, softly lit hotel room'],
    ['A dimly lit room', 'A softly lit room'],
    ['A dimly-lit room', 'A softly lit room'],
    ['A dim, darkened room', 'A soft, soft room'],
    ['Low, soft and warm lighting', 'Gentle, soft and warm lighting'],
    ['Soft low lighting', 'Soft gentle lighting'],
    ['Low warm lamp light', 'Gentle warm lamp light'],
    ['Low-light interior', 'Soft light interior'],
    ['an overcast sky over a misty, wet terrace', 'a soft blue sky over a quiet, clean terrace'],
  ])('day: %s → %s', (input, output) => {
    expect(cleanLight(input, 'day')).toBe(output);
  });

  test.each([
    [
      'Golden hour light streams through a sunlit window',
      'Evening light streams through a lamp-lit window',
    ],
    ['Bright sunlight on the towels', 'Lamplight on the towels'],
    ['Sunbeams across the bed', 'Lamplight across the bed'],
    ['Daylight and sunshine', 'Lamplight and lamplight'],
    ['A sunny balcony', 'A warm balcony'],
    ['A villa in the afternoon', 'A villa in the evening'],
    ['Late afternoon on the terrace', 'Evening on the terrace'],
    ['A villa in the morning', 'A villa in the evening'],
    ['Midday on the terrace', 'Evening on the terrace'],
    ['A sunrise view', 'A evening view'],
    ['A warm, low-lit hotel room', 'A warm, warmly lit hotel room'],
    ['A dimly lit room', 'A warmly lit room'],
    ['A dim room', 'A warm room'],
    ['Low, soft and warm lighting', 'Glowing, soft and warm lighting'],
    ['Soft low candlelight', 'Soft glowing candlelight'],
    ['Low-light interior', 'Warm light interior'],
    ['an overcast sky', 'a deep blue sky'],
  ])('night: %s → %s', (input, output) => {
    expect(cleanLight(input, 'night')).toBe(output);
  });

  test.each([
    'A sunflower on a table',
    'Sunday',
    'A sun lounger by the pool',
    'A sun deck',
    'A bright villa room',
    'Smooth dark stones along the back',
    'Golden oil in clear glass, never a small dark bottle',
    'A low table beside the bed',
  ])('%s stays as written, day and night', (text) => {
    expect(cleanLight(text, 'day')).toBe(text);
    expect(cleanLight(text, 'night')).toBe(text);
  });

  test.each(['Late afternoon on the balcony', 'Daylight through the window'])(
    '%s stays as written by day',
    (text) => {
      expect(cleanLight(text, 'day')).toBe(text);
    },
  );

  test('a balcony at night stays as written by night', () => {
    expect(cleanLight('A balcony at night', 'night')).toBe('A balcony at night');
  });

  test('the light is day when none is given', () => {
    expect(cleanLight('A villa at dusk')).toBe('A villa in the late afternoon');
  });

  // "New image" on a post saved with posts-5 (no light: a day) must not stay
  // dim, nor turn sunny.
  test.each(POSTS_5_PROMPTS)('a posts-5 prompt, as a day, loses its low light: %s', (prompt) => {
    const out = cleanLight(prompt, 'day');
    expect(out).not.toMatch(/\blow\b[^.]*\blight/i);
    expect(out).not.toMatch(/\blow[- ]lit\b/i);
    expect(out).not.toMatch(/\b(?:dim|dimly|dusk)\b/i);
    expect(out).not.toMatch(/\bsun\b/i);
  });

  test('grey skies, mist, rain and damp are dropped', () => {
    const p = cleanLight('A balcony under an overcast grey sky, misty garden, rain on damp stone.');
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
      'Curtains are open and hang still; there is no wind.',
      'Massage oil is golden oil in clear glass, never a small dark bottle.',
    ]) {
      expect(p).toContain(rule);
    }
  });

  test('the style line says the light wins over the scene', () => {
    expect(imagePrompt('x')).toContain(
      'Whatever the scene says, it is late afternoon: soft daylight from outside, with lamps lit.',
    );
  });
});

describe('day, night and the place', () => {
  const setup: Setup = {
    look: 'plain',
    guests: 'woman',
    therapists: 1,
    bodyPart: 'back',
    scene: 'place',
    locals: 'Vietnamese',
  };

  test('a day image: late afternoon, soft daylight, no sunbeams', () => {
    const style = imageStyle('Vietnamese', 'day');
    expect(style).toContain(
      'Late afternoon: lamps are lit inside, and soft natural daylight comes in from the garden through open doors or a wide window.',
    );
    expect(style).toContain('never sunbeams across the room, never harsh sun or blown-out windows');
    expect(style).toContain(
      'Whatever the scene says, it is late afternoon: soft daylight from outside, with lamps lit.',
    );
    expect(style).toContain(
      'open onto a garden of areca palms, bamboo, banana leaves and coconut palms, in soft daylight;',
    );
    expect(style).not.toMatch(/golden hour|evening/i);
  });

  test('a night image: lamps, candles, lanterns, never dark', () => {
    const style = imageStyle('Balinese', 'night');
    expect(style).toContain(
      'Evening: lamps and candles give the room a warm, golden glow, and the garden outside is lit by lanterns under a deep blue sky.',
    );
    expect(style).toContain('Warm and inviting, never dark, dim or gloomy');
    expect(style).toContain(
      'Whatever the scene says, it is evening: lamps and candles lit, the garden lit by lanterns under a deep blue sky.',
    );
    expect(style).toContain('lit by lanterns at night;');
    expect(style).not.toMatch(/late afternoon|daylight/i);
  });

  test('day and night share the mood, never the old dim one', () => {
    for (const light of ['day', 'night'] as const) {
      const style = imageStyle('Vietnamese', light);
      expect(style).toContain(
        'A warm, happy holiday mood: calm and restful, a treat the guest has earned.',
      );
      expect(style).not.toMatch(/\bdusk\b|dim and intimate|introspection|golden hour/i);
    }
  });

  test('a night set-up swaps its prompt and gets the night line', () => {
    const p = imagePrompt('A sunlit room.', undefined, { ...setup, light: 'night' });
    expect(p).toContain('A lamp-lit room.');
    expect(p.endsWith(imageStyle('Vietnamese', 'night'))).toBe(true);
  });

  test('an old post is a day: no light in its set-up, or no set-up', () => {
    expect(imagePrompt('A warm, low-lit room at dusk.', undefined, setup)).toContain(
      'A warm, softly lit room in the late afternoon.',
    );
    expect(
      imagePrompt('A warm, low-lit room at dusk.', undefined, setup).endsWith(
        imageStyle('Vietnamese', 'day'),
      ),
    ).toBe(true);
    expect(imagePrompt('A room.').endsWith(imageStyle(undefined, 'day'))).toBe(true);
  });

  test("Sen's room: Vietnamese, palms and bamboo, a lotus, never frangipani", () => {
    const style = imageStyle('Vietnamese');
    expect(style).toContain('a Vietnamese boutique hotel room or villa');
    expect(style).toContain('areca palms, bamboo, banana leaves and coconut palms');
    expect(style).toContain('a pink lotus floating in a bowl of water');
    expect(style).not.toMatch(/frangipani/i);
  });

  test("Svarga's room: Balinese villa, frangipani, never a lotus", () => {
    const style = imageStyle('Balinese');
    expect(style).toContain('a Balinese villa room');
    expect(style).toContain('frangipani trees, banana leaves, coconut palms and ferns');
    expect(style).toContain('frangipani flowers on the tray');
    expect(style).not.toMatch(/lotus/i);
  });

  test('no set-up: Southeast Asian row and therapists', () => {
    const p = imagePrompt('A room.');
    expect(p).toBe(`A room. ${imageStyle()}`);
    expect(p).toContain('tropical greenery: palms, banana leaves and ferns');
    expect(p).toContain('orchids in a small vase');
    expect(p).toContain('Every therapist is a young Southeast Asian woman');
  });

  test('a set-up passes its locals to the style line', () => {
    expect(imagePrompt('A room.', undefined, setup)).toBe(
      `One guest, a woman. One therapist, a young Vietnamese woman. A room. ${imageStyle('Vietnamese')}`,
    );
  });

  test('only plants of the place, a discreet sign of the day', () => {
    const style = imageStyle('Balinese');
    expect(style).toContain('never plants from elsewhere');
    expect(style).toContain(
      "Any object from the guest's day is small, far in the background and out of focus.",
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
    expect(imagePrompt('Oil on a back in the late afternoon.', 'more green', fourHandsMan)).toBe(
      `One guest, a man. Two therapists, both young Balinese women. Oil on a back in the late afternoon. The owner asks: more green. ${imageStyle('Balinese')}`,
    );
  });

  test('without a set-up: no cast line, therapists read as Southeast Asian', () => {
    const p = imagePrompt('A room in the late afternoon.');
    expect(p).toBe(`A room in the late afternoon. ${imageStyle()}`);
    expect(p).toContain('Every therapist is a young Southeast Asian woman');
  });

  test("the style line holds the spec's therapist sentence", () => {
    expect(imageStyle('Balinese')).toContain(
      'Every therapist is a young local woman with warm, golden-tan skin, as women from here have: smooth, healthy and glowing, yet real, with natural texture; never pale or white, never dark. Her hands and arms are perfectly formed and look healthy: five slender fingers on each hand, clean short nails, natural joints and wrists, no extra or missing fingers, hands or arms. Her face is turned away, lowered or out of frame.',
    );
  });

  test('never a full face, therapist or guest', () => {
    expect(imageStyle('Balinese')).toContain(
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
