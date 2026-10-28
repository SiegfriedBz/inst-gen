import { castLine, type Light, type Locals, type Setup } from './setup';

// What the image model reads: code's cast line from the post's set-up
// (docs/specs/posts/varied-images), the post's image prompt, then a style
// line from decision 0004's bake-off, plus one rule so the 4:5 post crop
// keeps the subject (docs/specs/posts/generate-images, "The model step"); the
// style line follows the set-up's day or night and the place's own room
// (docs/specs/posts/day-and-night-images). Bump the version with every change.

export const IMAGE_PROMPT_VERSION = 'images-8';

// The room a tourist pictures for their stay, the green plants of the place
// seen through its doors, and the place's flower, by the therapists' origin.
export const PLACES: Record<Locals, { room: string; view: string; flower: string }> = {
  Balinese: {
    room: 'a Balinese villa room with carved and natural wood, rattan and a thatched alang-alang roof',
    view: 'a tropical garden of frangipani trees, banana leaves, coconut palms and ferns',
    flower: 'frangipani flowers on the tray',
  },
  Indonesian: {
    room: 'an Indonesian villa room with natural wood and rattan',
    view: 'a tropical garden of banana leaves, palms and ferns',
    flower: 'frangipani flowers on the tray',
  },
  Vietnamese: {
    room: 'a Vietnamese boutique hotel room or villa with warm wood, rattan and bamboo',
    view: 'a garden of areca palms, bamboo, banana leaves and coconut palms',
    flower: 'a pink lotus floating in a bowl of water',
  },
  'Southeast Asian': {
    room: 'a tropical boutique hotel room or villa with warm wood and rattan',
    view: 'tropical greenery: palms, banana leaves and ferns',
    flower: 'orchids in a small vase',
  },
};

// Day at the brightness of Svarga's 27 Oct images, night a warm glow, never
// dark (the maintainer, 2026-10-28).
const LIGHTING: Record<Light, { light: string; whatever: string; view: string }> = {
  day: {
    light:
      'Late afternoon: lamps are lit inside, and soft natural daylight comes in from the garden through open doors or a wide window. ' +
      'Soft and warm, never sunbeams across the room, never harsh sun or blown-out windows, never a grey sky, mist or rain. ',
    whatever:
      'Whatever the scene says, it is late afternoon: soft daylight from outside, with lamps lit. ',
    view: 'in soft daylight',
  },
  night: {
    light:
      'Evening: lamps and candles give the room a warm, golden glow, and the garden outside is lit by lanterns under a deep blue sky. ' +
      'Warm and inviting, never dark, dim or gloomy, never a grey sky, mist or rain. ',
    whatever:
      'Whatever the scene says, it is evening: lamps and candles lit, the garden lit by lanterns under a deep blue sky. ',
    view: 'lit by lanterns at night',
  },
};

// With the set-up's locals, the cast line names the therapists' origin, so
// the style line says "local"; a post saved before set-ups has none, so the
// style line names them Southeast Asian and takes that row's place.
export function imageStyle(locals?: Locals, light: Light = 'day'): string {
  const who = locals ? 'local' : 'Southeast Asian';
  const place = PLACES[locals ?? 'Southeast Asian'];
  const lighting = LIGHTING[light];
  return (
    'Vertical photograph for an Instagram story, shot on a full-frame camera with a 50mm lens. ' +
    lighting.light +
    'A warm, happy holiday mood: calm and restful, a treat the guest has earned. ' +
    'Realistic skin and textures, natural anatomy. No face is visible or recognisable. ' +
    'The image contains no text, letters, labels, logos or watermarks; bottles and jars are plain. ' +
    'Keep the subject in the middle of the frame, with calm space above and below it. ' +
    // The maintainer's verdicts on the first images (journal, 2026-10-25),
    // repeated from 2.2's image rules in case a post prompt drifts.
    "The massage is under way in the frame, with the therapist's hands. " +
    'A guest looks relaxed and alive, never lying still as if asleep. ' +
    'Beds and linens are neatly made; nothing is messy. ' +
    'The room is warm and homely, never clinical or hospital-like. ' +
    'Curtains are open and hang still; there is no wind. ' +
    'Massage oil is golden oil in clear glass, never a small dark bottle. ' +
    lighting.whatever +
    `When the room shows, it is ${place.room}, open onto ${place.view}, ${lighting.view}; ` +
    'only green plants that grow here, never plants from elsewhere. ' +
    `When a tray, a table or the room shows, a touch of the place: ${place.flower}; no other kind of flower. ` +
    "Any object from the guest's day is small, far in the background and out of focus. " +
    `Every therapist is a young ${who} woman with warm, golden-tan skin, as women from here have: ` +
    'smooth, healthy and glowing, yet real, with natural texture; never pale or white, never dark. ' +
    'Her hands and arms are perfectly formed and look healthy: five slender fingers on each hand, ' +
    'clean short nails, natural joints and wrists, no extra or missing fingers, hands or arms. ' +
    // The maintainer's verdict on images-5: faces showed in profile.
    'Her face is turned away, lowered or out of frame. ' +
    "Every guest's face is turned away, resting in the face cradle, covered or out of frame: never a full face."
  );
}

// Each image is a day or a night (docs/specs/posts/day-and-night-images), and
// decision 0004 keeps out grey skies, mist, rain and damp. The post plan's
// model doesn't always listen, posts saved with posts-5 say the light is low
// ("Soft low lighting"), and the brand's own light can still slip in, so code
// swaps words of the other light, and of dark or harsh light, before the image
// model reads them: the day column for a day, the night column for a night,
// null where a word is kept. Rows run top to bottom: "bright sunlight" is
// swapped once, phrases go before their words, and the "low" row sees what the
// sun rows wrote. Whole words only; the first letter's case is kept.
const LIGHT: [RegExp, string | null, string | null][] = [
  [/\bbright (?:sunlight|sunshine|sun)\b/gi, 'soft daylight', 'lamplight'],
  [/\b(?:sunbeams?|sun rays)\b/gi, 'soft light', 'lamplight'],
  [/\b(?:sunset|sunrise)\b/gi, 'late afternoon', 'evening'],
  [/\b(?:sunlight|sunshine)\b/gi, 'soft daylight', 'lamplight'],
  [
    /\bsun\b(?! (?:loungers?|deck|hat|beds?|terrace|umbrella|shade|cream|screen)\b)/gi,
    'soft daylight',
    'lamplight',
  ],
  [/\bdaylight\b/gi, null, 'lamplight'],
  [/\bsunlit\b/gi, 'softly lit', 'lamp-lit'],
  [/\bsunny\b/gi, 'soft', 'warm'],
  [
    /\b(?:in the (?:morning|afternoon)|at golden[- ]hour)\b/gi,
    'in the late afternoon',
    'in the evening',
  ],
  [/\b(?:in the evening|at (?:dusk|night))\b/gi, 'in the late afternoon', null],
  [/\bgolden[- ]hour\b/gi, 'late afternoon', 'evening'],
  [/\b(?:morning|midday|noon|daytime)\b/gi, 'late afternoon', 'evening'],
  [/\b(?:late )?afternoon\b/gi, null, 'evening'],
  [/\b(?:dusk|evening|night)\b/gi, 'late afternoon', null],
  [/\b(?:dimly|low)[- ]lit\b/gi, 'softly lit', 'warmly lit'],
  [/\b(?:dim|darkened)\b/gi, 'soft', 'warm'],
  [/\blow-light\b/gi, 'soft light', 'warm light'],
  [
    /\blow\b(?=(?:,?\s+(?:and\s+)?(?:soft|warm|golden))*,?\s+(?:light|lighting|daylight|lamp ?light|candlelight)\b)/gi,
    'gentle',
    'glowing',
  ],
  [/\ban? (?:overcast |grey |gray )+sky\b/gi, 'a soft blue sky', 'a deep blue sky'],
  [/\b(?:overcast |grey |gray )+sky\b/gi, 'soft blue sky', 'deep blue sky'],
  [/\bovercast\b/gi, 'calm', 'calm'],
  [/\b(?:misty|foggy)\b/gi, 'quiet', 'quiet'],
  [/\b(?:damp|wet)\b/gi, 'clean', 'clean'],
  [/\b(?:rainy|rain|mist|fog)\b/gi, '', ''],
];

function keepCase(found: string, replacement: string): string {
  if (!replacement || found[0] !== found[0].toUpperCase()) return replacement;
  return replacement[0].toUpperCase() + replacement.slice(1);
}

export function cleanLight(text: string, light: Light = 'day'): string {
  let out = text;
  for (const [pattern, day, night] of LIGHT) {
    const replacement = light === 'day' ? day : night;
    if (replacement === null) continue;
    out = out.replace(pattern, (found) => keepCase(found, replacement));
  }
  return out.replace(/ {2,}/g, ' ').replace(/ ([,.;:])/g, '$1');
}

// The owner's hint for a new image, as one line (docs/specs/posts/editor-download,
// "A new image"); nothing when it's empty.
export function cleanHint(raw: string | undefined): string | undefined {
  const hint = raw
    ?.replace(/\s*[\r\n]+\s*/g, ' ')
    .trim()
    .replace(/\.+$/, '');
  return hint || undefined;
}

// The cast line comes first, so the image model reads the facts before the
// model's prose; the hint comes before the style line, so the style's rules
// still come last and win.
export function imagePrompt(postPrompt: string, hint?: string, setup?: Setup): string {
  const cast = setup ? `${castLine(setup)} ` : '';
  const asks = hint ? ` The owner asks: ${hint}.` : '';
  // A set-up saved before lights were dealt, or none, is a day.
  const light = setup?.light ?? 'day';
  const style = imageStyle(setup?.locals, light);
  return `${cast}${cleanLight(postPrompt.trim(), light)}${asks} ${style}`;
}
