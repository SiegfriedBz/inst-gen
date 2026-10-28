import { castLine, type Locals, type Setup } from './setup';

// What the image model reads: code's cast line from the post's set-up
// (docs/specs/posts/varied-images), the post's image prompt, then a fixed
// style line from decision 0004's bake-off, plus one rule so the 4:5 post
// crop keeps the subject (docs/specs/posts/generate-images, "The model
// step"), lit at golden hour in the place's own room
// (docs/specs/posts/golden-hour-images). Bump the version with every change.

export const IMAGE_PROMPT_VERSION = 'images-7';

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

// With the set-up's locals, the cast line names the therapists' origin, so
// the style line says "local"; a post saved before set-ups has none, so the
// style line names them Southeast Asian and takes that row's place.
export function imageStyle(locals?: Locals): string {
  const who = locals ? 'local' : 'Southeast Asian';
  const place = PLACES[locals ?? 'Southeast Asian'];
  return (
    'Vertical photograph for an Instagram story, shot on a full-frame camera with a 50mm lens. ' +
    'Golden hour: the low, warm sun of late afternoon comes in through open doors or a wide window, ' +
    'and lamps or candles are lit; the room glows honey and amber. ' +
    'Bright and happy, never harsh midday sun, a grey sky, mist or rain, never a dark or dim room. ' +
    'A warm, bright and happy holiday mood: calm and restful, a treat the guest has earned. ' +
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
    'Whatever the scene says, the light is golden hour: the low warm sun from outside, with lamps or candles lit. ' +
    `When the room shows, it is ${place.room}, open onto ${place.view}, lit by the golden sun; ` +
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

// Every image is lit at golden hour (docs/specs/posts/golden-hour-images);
// decision 0004 keeps out grey skies, mist, rain and damp. The post plan's
// model doesn't always listen, and posts saved with posts-5 say the light is
// low ("Soft low lighting"), so code swaps dark, dusk and midday words before
// the image model reads them. The order matters: "bright sunlight" becomes
// "low golden sun", which the "low" row leaves alone. Whole words only; the
// first letter's case is kept.
const LIGHT: [RegExp, string][] = [
  [/\bbright (?:sunlight|sunshine|sun)\b/gi, 'low golden sun'],
  [/\bsunny\b/gi, 'golden'],
  [/\bdaylight\b/gi, 'golden-hour light'],
  [/\b(?:in the (?:morning|afternoon|evening)|at (?:dusk|night))\b/gi, 'at golden hour'],
  [/\b(?:morning|midday|noon|daytime|dusk|evening|night)\b/gi, 'golden hour'],
  [/\bdimly lit\b/gi, 'warmly lit'],
  [/\b(?:dim|darkened)\b/gi, 'warm'],
  [/\blow\b(?=(?:,?\s+(?:and\s+)?(?:soft|warm))*,?\s+(?:light|lighting)\b)/gi, 'golden-hour'],
  [/\ban? (?:overcast |grey |gray )+sky\b/gi, 'a golden sky'],
  [/\b(?:overcast |grey |gray )+sky\b/gi, 'golden sky'],
  [/\bovercast\b/gi, 'calm'],
  [/\b(?:misty|foggy)\b/gi, 'quiet'],
  [/\b(?:damp|wet)\b/gi, 'clean'],
  [/\b(?:rainy|rain|mist|fog)\b/gi, ''],
];

function keepCase(found: string, replacement: string): string {
  if (!replacement || found[0] !== found[0].toUpperCase()) return replacement;
  return replacement[0].toUpperCase() + replacement.slice(1);
}

export function cleanLight(text: string): string {
  let out = text;
  for (const [pattern, replacement] of LIGHT) {
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
  const style = imageStyle(setup?.locals);
  return `${cast}${cleanLight(postPrompt.trim())}${asks} ${style}`;
}
