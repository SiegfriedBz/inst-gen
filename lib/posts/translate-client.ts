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
  | { ok: true; text: string }
  | { ok: false; code: TranslateErrorCode | 'offline' | 'signedOut' };

type Deps = { fetch: typeof fetch; now: () => Date };

const defaultDeps = (): Deps => ({ fetch: (...args) => fetch(...args), now: () => new Date() });

function isErrorCode(value: unknown): value is TranslateErrorCode {
  return (TRANSLATE_ERROR_CODES as readonly unknown[]).includes(value);
}

export async function getTranslation(
  input: {
    ownerId: string;
    batchId: string;
    postId: string;
    caption: string;
    locale: TranslateLocale;
  },
  deps: Deps = defaultDeps(),
): Promise<TranslationResult> {
  const saved = await loadTranslation(input.batchId, input.postId, input.locale, input.caption);
  if (saved) return { ok: true, text: saved.text };
  let response: Response;
  try {
    response = await deps.fetch('/api/posts/translate', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: input.caption, locale: input.locale }),
    });
  } catch {
    return { ok: false, code: 'offline' };
  }
  if (response.status === 401) return { ok: false, code: 'signedOut' };
  try {
    const body: unknown = await response.json();
    if (!response.ok) {
      const code = body && typeof body === 'object' ? (body as { error?: unknown }).error : null;
      return { ok: false, code: isErrorCode(code) ? code : 'model_failed' };
    }
    const answer = translateResponseSchema.parse(body);
    await saveTranslation({
      batchId: input.batchId,
      postId: input.postId,
      ownerId: input.ownerId,
      locale: input.locale,
      captionHash: hashText(input.caption),
      text: answer.text,
      model: answer.model,
      promptVersion: answer.promptVersion,
      createdAt: deps.now().toISOString(),
    });
    return { ok: true, text: answer.text };
  } catch {
    return { ok: false, code: 'model_failed' };
  }
}
