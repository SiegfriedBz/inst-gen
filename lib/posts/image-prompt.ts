// What the image model reads: the post's image prompt, then a fixed style
// line from decision 0004's bake-off, plus one rule so the 4:5 post crop
// keeps the subject (docs/specs/posts/generate-images, "The model step").
// Bump the version with every change.

export const IMAGE_PROMPT_VERSION = 'images-4';

export const IMAGE_STYLE =
  'Vertical photograph for an Instagram story, shot on a full-frame camera with a 50mm lens. ' +
  'Low, soft, warm light: dim and intimate, gentle shadows, nothing bright, harsh or overexposed. ' +
  'A quiet, relaxing mood that invites introspection, as if time has slowed down. ' +
  'Realistic skin and textures, natural anatomy. No face is visible or recognisable. ' +
  'The image contains no text, letters, labels, logos or watermarks; bottles and jars are plain. ' +
  'Keep the subject in the middle of the frame, with calm space above and below it. ' +
  // The maintainer's verdicts on the first images (journal, 2026-10-25),
  // repeated from 2.2's image rules in case a post prompt drifts.
  "The massage is under way in the frame, with the therapist's hands. " +
  'A guest looks relaxed and alive, never lying still as if asleep. ' +
  'Beds and linens are neatly made; nothing is messy. ' +
  'The room is warm and homely, never clinical or hospital-like. ' +
  'Curtains hang still; there is no wind. ' +
  'Massage oil is golden oil in clear glass, never a small dark bottle. ' +
  'Whatever the scene says, the light is dusk, lamps, lanterns or candles.';

// Decision 0004: never daylight, grey skies, mist, rain or damp. The post
// plan's prompt says so too, but its model doesn't always listen (Sen's
// "sunlit" room, journal), so code swaps those words before the image model
// reads them. Whole words only; the first letter's case is kept.
const LIGHT: [RegExp, string][] = [
  [/\bbright (?:sunlight|sunshine|sun)\b/gi, 'warm lamplight'],
  [/\bsunlit\b/gi, 'lamp-lit'],
  [/\bbright\b/gi, 'warm'],
  [/\bsunny\b/gi, 'warm'],
  [/\b(?:sunlight|sunshine|daylight)\b/gi, 'lamplight'],
  [/\bin the (?:morning|afternoon)\b/gi, 'at dusk'],
  [/\b(?:morning|afternoon|midday|noon|daytime)\b/gi, 'dusk'],
  [/\b(?:overcast |grey |gray )+sky\b/gi, 'dusk sky'],
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

// The hint comes before the style line, so the style's rules still come last
// and win.
export function imagePrompt(postPrompt: string, hint?: string): string {
  const asks = hint ? ` The owner asks: ${hint}.` : '';
  return `${cleanLight(postPrompt.trim())}${asks} ${IMAGE_STYLE}`;
}
