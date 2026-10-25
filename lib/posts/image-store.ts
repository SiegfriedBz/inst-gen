import { openStore } from '@/lib/brand/store';
import type { ImageResponse } from './image';

// Images kept on the phone, apart from their batches so batches stay light
// (docs/specs/posts/generate-images, "On the phone"). Without IndexedDB
// nothing is kept.

export type SavedImage = {
  postId: string;
  batchId: string;
  ownerId: string;
  story: Blob;
  post: Blob;
  imagePrompt: string;
  model: string;
  promptVersion: string;
  createdAt: string;
};

export class ImageStoreFullError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('The phone is out of space for images', options);
    this.name = 'ImageStoreFullError';
  }
}

const isQuota = (error: unknown) =>
  error instanceof DOMException && error.name === 'QuotaExceededError';

export async function saveImage(image: SavedImage): Promise<void> {
  const db = await openStore();
  if (!db) return;
  try {
    await db.put('images', image);
  } catch (error) {
    throw isQuota(error) ? new ImageStoreFullError({ cause: error }) : error;
  }
}

// Post ids repeat in every batch (`post-1` to `post-6`), so an image is known
// by its batch and post together.
export function imageKey(batchId: string, postId: string): string {
  return `${batchId}/${postId}`;
}

// The owner's images by `imageKey`.
export async function loadImages(ownerId: string): Promise<Map<string, SavedImage>> {
  const db = await openStore();
  if (!db) return new Map();
  const all = await db.getAllFromIndex('images', 'ownerId', ownerId);
  return new Map(all.map((image) => [imageKey(image.batchId, image.postId), image]));
}

function jpeg(base64: string): Blob {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return new Blob([bytes], { type: 'image/jpeg' });
}

export function toSavedImage(
  response: ImageResponse,
  ctx: { batchId: string; ownerId: string; imagePrompt: string },
  now: Date,
): SavedImage {
  return {
    postId: response.postId,
    batchId: ctx.batchId,
    ownerId: ctx.ownerId,
    story: jpeg(response.story),
    post: jpeg(response.post),
    imagePrompt: ctx.imagePrompt,
    model: response.model,
    promptVersion: response.promptVersion,
    createdAt: now.toISOString(),
  };
}
