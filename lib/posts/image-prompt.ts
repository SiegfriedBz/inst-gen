// What the image model reads: the post's image prompt, then a fixed style
// line from decision 0004's bake-off, plus one rule so the 4:5 post crop
// keeps the subject (docs/specs/posts/generate-images, "The model step").
// Bump the version with every change.

export const IMAGE_PROMPT_VERSION = 'images-1';

export const IMAGE_STYLE =
  'Vertical photograph for an Instagram story, shot on a full-frame camera with a 50mm lens. ' +
  'Low, soft, warm light: dim and intimate, gentle shadows, nothing bright, harsh or overexposed. ' +
  'A quiet, relaxing mood that invites introspection, as if time has slowed down. ' +
  'Realistic skin and textures, natural anatomy. No face is visible or recognisable. ' +
  'The image contains no text, letters, labels, logos or watermarks; bottles and jars are plain. ' +
  'Keep the subject in the middle of the frame, with calm space above and below it.';

export function imagePrompt(postPrompt: string): string {
  return `${postPrompt.trim()} ${IMAGE_STYLE}`;
}
