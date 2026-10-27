import { noteUsage } from '@/lib/usage/client';
import { isUsageCode, type UsageCode } from '@/lib/usage/codes';
import { hashText } from './input';
import {
  TRANSLATE_ERROR_CODES,
  type TranslateErrorCode,
  type TranslateLocale,
  translateResponseSchema,
} from './translate';
import { loadTranslation, saveTranslation } from './translation-store';

// A caption in the owner's language from the browser
// (docs/specs/posts/editor-download): the one kept on the phone while the
// caption is unchanged, otherwise one request, kept under the caption it was
// asked for, so an answer for an older caption is never shown for a new one.

export type TranslationResult =
  | { ok: true; text: string; story?: string }
  | { ok: false; code: TranslateErrorCode | UsageCode | 'offline' | 'signedOut' };

type Deps = { fetch: typeof fetch; now: () => Date };

const defaultDeps = (): Deps => ({ fetch: (...args) => fetch(...args), now: () => new Date() });

function isErrorCode(value: unknown): value is TranslateErrorCode {
  return (TRANSLATE_ERROR_CODES as readonly unknown[]).includes(value);
}

type TranslationInput = {
  ownerId: string;
  batchId: string;
  postId: string;
  caption: string;
  // The post's story text, translated in the same request
  // (docs/specs/posts/story-text, "The owner's language").
  story?: string;
  locale: TranslateLocale;
};

// Requests on their way, so the caption's link and the story text's, tapped
// one after the other, share one; settled ones are the store's.
const pending = new Map<string, Promise<TranslationResult>>();

export function getTranslation(
  input: TranslationInput,
  deps: Deps = defaultDeps(),
): Promise<TranslationResult> {
  const key = [
    input.batchId,
    input.postId,
    input.locale,
    hashText(input.caption),
    input.story ? hashText(input.story) : '',
  ].join('|');
  const running = pending.get(key);
  if (running) return running;
  const request = translate(input, deps).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

async function translate(input: TranslationInput, deps: Deps): Promise<TranslationResult> {
  const saved = await loadTranslation(
    input.batchId,
    input.postId,
    input.locale,
    input.caption,
    input.story,
  );
  if (saved) return { ok: true, text: saved.text, ...(saved.story ? { story: saved.story } : {}) };
  let response: Response;
  try {
    response = await deps.fetch('/api/posts/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        text: input.caption,
        ...(input.story ? { story: input.story } : {}),
        locale: input.locale,
      }),
    });
  } catch {
    return { ok: false, code: 'offline' };
  }
  // Settled: the usage bar reads again.
  noteUsage();
  if (response.status === 401) return { ok: false, code: 'signedOut' };
  try {
    const body: unknown = await response.json();
    if (!response.ok) {
      const code = body && typeof body === 'object' ? (body as { error?: unknown }).error : null;
      return { ok: false, code: isErrorCode(code) || isUsageCode(code) ? code : 'model_failed' };
    }
    const answer = translateResponseSchema.parse(body);
    await saveTranslation({
      batchId: input.batchId,
      postId: input.postId,
      ownerId: input.ownerId,
      locale: input.locale,
      captionHash: hashText(input.caption),
      text: answer.text,
      ...(input.story && answer.story
        ? { storyHash: hashText(input.story), story: answer.story }
        : {}),
      model: answer.model,
      promptVersion: answer.promptVersion,
      createdAt: deps.now().toISOString(),
    });
    return { ok: true, text: answer.text, ...(answer.story ? { story: answer.story } : {}) };
  } catch {
    return { ok: false, code: 'model_failed' };
  }
}
