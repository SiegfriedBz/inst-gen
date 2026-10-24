import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from '@ai-sdk/google';
import { APICallError, Output, streamText } from 'ai';
import { type DeepPartial, type ModelProfile, modelProfileSchema } from '@/lib/brand/profile';

// The app's only door to a text model (decision 0003). Callers see the
// TextModel interface, so tests swap in a replayer and never call the network.

export const TEXT_MODELS = { brand: 'gemini-3.8-flash', light: 'gemini-3.5-flash-lite' } as const;

export type BrandModelInput = {
  system: string;
  text: string;
  images: { url: string; data: Uint8Array; mediaType: string }[];
};

// Partial objects as they stream; `final` settles once the stream has been
// iterated to the end.
export type ModelStream<T> = AsyncIterable<DeepPartial<T>> & { final: Promise<T> };

export interface TextModel {
  streamBrandProfile(input: BrandModelInput, signal: AbortSignal): ModelStream<ModelProfile>;
}

export class ModelError extends Error {
  constructor(
    readonly kind: 'busy' | 'failed',
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = 'ModelError';
  }
}

// Wraps a generator whose return value is the final object.
export function toModelStream<T>(generator: AsyncGenerator<DeepPartial<T>, T>): ModelStream<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const final = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  // Callers that only read the partials must not leave an unhandled rejection.
  final.catch(() => {});
  async function* iterate() {
    try {
      for (;;) {
        const step = await generator.next();
        if (step.done) {
          resolve(step.value);
          return;
        }
        yield step.value;
      }
    } catch (error) {
      reject(error);
      throw error;
    }
  }
  return Object.assign(iterate(), { final });
}

function toModelError(error: unknown): ModelError {
  if (error instanceof ModelError) return error;
  for (let e = error; e instanceof Error; e = e.cause) {
    if (APICallError.isInstance(e) && (e.statusCode === 429 || e.statusCode === 503)) {
      return new ModelError('busy', e.message, { cause: error });
    }
  }
  return new ModelError('failed', error instanceof Error ? error.message : String(error), {
    cause: error,
  });
}

export function geminiTextModel(): TextModel {
  return {
    streamBrandProfile(input, signal) {
      async function* run(): AsyncGenerator<DeepPartial<ModelProfile>, ModelProfile> {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) throw new ModelError('failed', 'GOOGLE_GENERATIVE_AI_API_KEY is not set');
        const google = createGoogleGenerativeAI({ apiKey });
        let streamError: unknown;
        const result = streamText({
          model: google(TEXT_MODELS.brand),
          system: input.system,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: input.text },
                ...input.images.map((image) => ({
                  type: 'image' as const,
                  image: image.data,
                  mediaType: image.mediaType,
                })),
              ],
            },
          ],
          output: Output.object({ schema: modelProfileSchema }),
          providerOptions: {
            google: {
              thinkingConfig: { thinkingLevel: 'low' },
            } satisfies GoogleLanguageModelOptions,
          },
          abortSignal: signal,
          // A retry spends free quota and the 30 s budget; the caller reports
          // model_busy instead.
          maxRetries: 0,
          onError: ({ error }) => {
            streamError = error;
          },
        });
        try {
          for await (const partial of result.partialOutputStream) {
            yield partial as DeepPartial<ModelProfile>;
          }
          if (streamError) throw streamError;
          return await result.output;
        } catch (error) {
          if (signal.aborted) throw signal.reason;
          throw toModelError(streamError ?? error);
        }
      }
      return toModelStream(run());
    },
  };
}
