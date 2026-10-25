import { createGoogleGenerativeAI, type GoogleLanguageModelOptions } from '@ai-sdk/google';
import { APICallError, generateText, Output, streamText } from 'ai';
import type { z } from 'zod';
import { type DeepPartial, type ModelProfile, modelProfileSchema } from '@/lib/brand/profile';
import { type SearchModelAnswer, searchModelAnswerSchema } from '@/lib/brand/search/prompt';
import {
  type ModelPostPlan,
  type ModelRewrite,
  modelPostPlanSchema,
  modelRewriteSchema,
} from '@/lib/posts/batch';
import type { TranslateLocale } from '@/lib/posts/translate';
import { translatePrompt } from '@/lib/posts/translate-prompt';

// The app's only door to a text model (decision 0003). Callers see the
// TextModel interface, so tests swap in a replayer and never call the network.

// The brand read moved from gemini-3.8-flash to flash-lite on 2026-10-24: on
// the free tier, flash took about 110 s a read, past the 30 s step limit
// (docs/specs/brand/extract-site/journal.md).
// The post plan starts on flash-lite for the same reason
// (docs/specs/posts/generate-copy, "The model step"); its eval decides.
export const TEXT_MODELS = {
  brand: 'gemini-3.5-flash-lite',
  light: 'gemini-3.5-flash-lite',
  posts: 'gemini-3.5-flash-lite',
} as const;

export type BrandModelInput = {
  system: string;
  text: string;
  images: { url: string; data: Uint8Array; mediaType: string }[];
};

// Partial objects as they stream; `final` settles once the stream has been
// iterated to the end.
export type ModelStream<T> = AsyncIterable<DeepPartial<T>> & { final: Promise<T> };

export type SearchModelInput = { system: string; text: string };

export type PostsModelCall = { system: string; text: string };

export interface TextModel {
  streamBrandProfile(input: BrandModelInput, signal: AbortSignal): ModelStream<ModelProfile>;
  // The essence search's one short call (docs/specs/brand/search-essence).
  searchEssence(input: SearchModelInput, signal: AbortSignal): Promise<SearchModelAnswer>;
  // Six posts from the profile, and their captions rewritten after a brand
  // edit (docs/specs/posts/generate-copy).
  streamPostPlan(input: PostsModelCall, signal: AbortSignal): ModelStream<ModelPostPlan>;
  streamPostRewrite(input: PostsModelCall, signal: AbortSignal): ModelStream<ModelRewrite>;
  // A caption in the owner's language, plain text, not streamed
  // (docs/specs/posts/editor-download).
  translateCaption(text: string, locale: TranslateLocale, signal: AbortSignal): Promise<string>;
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

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

// One structured text call, streamed: the post plan and its rewrite.
function streamTextObject<T>(
  schema: z.ZodType<T>,
  input: PostsModelCall,
  signal: AbortSignal,
  opts: { modelId: string; thinkingLevel: ThinkingLevel },
): ModelStream<T> {
  async function* run(): AsyncGenerator<DeepPartial<T>, T> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new ModelError('failed', 'GOOGLE_GENERATIVE_AI_API_KEY is not set');
    const google = createGoogleGenerativeAI({ apiKey });
    let streamError: unknown;
    const result = streamText({
      model: google(opts.modelId),
      system: input.system,
      prompt: input.text,
      output: Output.object({ schema }),
      providerOptions: {
        google: {
          thinkingConfig: { thinkingLevel: opts.thinkingLevel },
        } satisfies GoogleLanguageModelOptions,
      },
      abortSignal: signal,
      // A retry spends free quota and the step's time; the caller reports
      // model_busy instead.
      maxRetries: 0,
      onError: ({ error }) => {
        streamError = error;
      },
    });
    try {
      for await (const partial of result.partialOutputStream) {
        yield partial as DeepPartial<T>;
      }
      if (streamError) throw streamError;
      return (await result.output) as T;
    } catch (error) {
      if (signal.aborted) throw signal.reason;
      throw toModelError(streamError ?? error);
    }
  }
  return toModelStream(run());
}

export function geminiTextModel(
  opts: { thinkingLevel?: ThinkingLevel; modelId?: string; postsModelId?: string } = {},
): TextModel {
  const {
    thinkingLevel = 'low',
    modelId = TEXT_MODELS.brand,
    postsModelId = TEXT_MODELS.posts,
  } = opts;
  const posts = { modelId: postsModelId, thinkingLevel };
  return {
    streamPostPlan(input, signal) {
      return streamTextObject(modelPostPlanSchema, input, signal, posts);
    },

    streamPostRewrite(input, signal) {
      return streamTextObject(modelRewriteSchema, input, signal, posts);
    },

    streamBrandProfile(input, signal) {
      async function* run(): AsyncGenerator<DeepPartial<ModelProfile>, ModelProfile> {
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
        if (!apiKey) throw new ModelError('failed', 'GOOGLE_GENERATIVE_AI_API_KEY is not set');
        const google = createGoogleGenerativeAI({ apiKey });
        let streamError: unknown;
        const result = streamText({
          model: google(modelId),
          system: input.system,
          messages: [
            {
              role: 'user',
              content: [
                { type: 'text', text: input.text },
                ...input.images.map((image) => ({
                  type: 'file' as const,
                  data: image.data,
                  mediaType: image.mediaType,
                })),
              ],
            },
          ],
          output: Output.object({ schema: modelProfileSchema }),
          providerOptions: {
            google: {
              thinkingConfig: { thinkingLevel },
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

    async translateCaption(text, locale, signal) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new ModelError('failed', 'GOOGLE_GENERATIVE_AI_API_KEY is not set');
      const google = createGoogleGenerativeAI({ apiKey });
      try {
        const result = await generateText({
          model: google(TEXT_MODELS.light),
          system: translatePrompt(locale),
          prompt: text,
          providerOptions: {
            google: {
              thinkingConfig: { thinkingLevel: 'minimal' },
            } satisfies GoogleLanguageModelOptions,
          },
          abortSignal: signal,
          // A retry spends free quota; the caller reports model_busy instead.
          maxRetries: 0,
        });
        return result.text.trim();
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        throw toModelError(error);
      }
    },

    async searchEssence(input, signal) {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new ModelError('failed', 'GOOGLE_GENERATIVE_AI_API_KEY is not set');
      const google = createGoogleGenerativeAI({ apiKey });
      try {
        const result = await generateText({
          model: google(TEXT_MODELS.light),
          system: input.system,
          prompt: input.text,
          output: Output.object({ schema: searchModelAnswerSchema }),
          providerOptions: {
            google: { thinkingConfig: { thinkingLevel } } satisfies GoogleLanguageModelOptions,
          },
          abortSignal: signal,
          // A retry spends free quota; the caller reports model_busy instead.
          maxRetries: 0,
        });
        return result.output;
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        throw toModelError(error);
      }
    },
  };
}
