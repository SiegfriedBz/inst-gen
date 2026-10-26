// Images are on for every signed-in owner when the paid project's key is set
// (decision 0004); usage counters cap them (docs/specs/platform/usage-counters,
// "Images for every owner").

type Env = Record<string, string | undefined>;

let missingKeyLogged = false;

export function imagesOn(env: Env = process.env): boolean {
  if (!env.GOOGLE_IMAGE_API_KEY) {
    if (!missingKeyLogged) {
      missingKeyLogged = true;
      console.error('images: GOOGLE_IMAGE_API_KEY is not set, so images are off');
    }
    return false;
  }
  return true;
}
