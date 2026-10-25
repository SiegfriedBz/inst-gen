// Who can make images until usage counters (roadmap 2.6) count their cost:
// the owners listed in IMAGE_OWNERS, and only with the paid project's key
// (decision 0004; docs/specs/posts/generate-images, "Who can make images").

type Env = Record<string, string | undefined>;

let missingKeyLogged = false;

export function imageOwners(env: Env = process.env): string[] {
  return (env.IMAGE_OWNERS ?? '')
    .split(',')
    .map((id) => id.trim().toLowerCase())
    .filter(Boolean);
}

export function imagesOn(ownerId: string, env: Env = process.env): boolean {
  if (!env.GOOGLE_IMAGE_API_KEY) {
    if (!missingKeyLogged) {
      missingKeyLogged = true;
      console.error('images: GOOGLE_IMAGE_API_KEY is not set, so images are off');
    }
    return false;
  }
  return imageOwners(env).includes(ownerId);
}
