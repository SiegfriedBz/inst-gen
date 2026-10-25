import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { APICallError, generateText } from 'ai';

// The app's only door to an image model (decision 0004): Nano Banana 2.1, in
// the prepaid Google project, with its own key. Callers see the ImageModel
// interface, so tests swap in a fake and never call the network.

export const IMAGE_MODEL = 'gemini-nano-banana-2.1';

// About what one 9:16 2K image costs, measured in decision 0004's bake-off.
export const IMAGE_USD = 0.05;

export type ImageFile = { data: Uint8Array; mediaType: string };

export interface ImageModel {
  // null when the answer holds no image: a safety block, or text only.
  makeImage(prompt: string, signal: AbortSignal): Promise<ImageFile | null>;
}

export class ImageModelError extends Error {
  constructor(
    readonly kind: 'paused' | 'failed',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ImageModelError';
  }
}

// What Google answers once the prepaid balance is spent isn't documented;
// this is a best guess, checked the first time it happens (journal).
const SPENT = /billing|prepay|credit|balance/i;

export function toImageModelError(error: unknown): ImageModelError {
  if (error instanceof ImageModelError) return error;
  for (let e = error; e instanceof Error; e = e.cause) {
    if (!APICallError.isInstance(e)) continue;
    if (e.statusCode === 429) return new ImageModelError('paused', e.message, { cause: error });
    if ((e.statusCode === 400 || e.statusCode === 403) && SPENT.test(e.message)) {
      return new ImageModelError('paused', e.message, { cause: error });
    }
  }
  return new ImageModelError('failed', error instanceof Error ? error.message : String(error), {
    cause: error,
  });
}

export function geminiImageModel(apiKey: string, modelId: string = IMAGE_MODEL): ImageModel {
  const google = createGoogleGenerativeAI({ apiKey });
  return {
    async makeImage(prompt, signal) {
      try {
        const result = await generateText({
          model: google(modelId),
          prompt,
          providerOptions: {
            google: {
              responseModalities: ['IMAGE'],
              imageConfig: { aspectRatio: '9:16', imageSize: '2K' },
            },
          },
          abortSignal: signal,
          // A retry spends the prepaid balance; the caller reports instead.
          maxRetries: 0,
        });
        const file = result.files.find((f) => f.mediaType.startsWith('image/'));
        return file ? { data: file.uint8Array, mediaType: file.mediaType } : null;
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        throw toImageModelError(error);
      }
    },
  };
}
