// The four scenes of a post's image (docs/specs/posts/generate-copy), apart
// so that the set-ups and the batch schemas can both use them.

export const SCENES = ['treatment', 'detail', 'place', 'guest'] as const;
export type Scene = (typeof SCENES)[number];
