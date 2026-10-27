import { ModelError, TEXT_MODELS, type TextModel } from '@/lib/ai/text-model';
import { describeModelError } from '@/lib/brand/read-log';
import type { TranslateBody, TranslateErrorCode, TranslateResponse } from './translate';
import { TRANSLATE_PROMPT_VERSION } from './translate-prompt';

// One caption translated for the owner to read (docs/specs/posts/editor-download,
// "The owner's-language view"): one Flash-Lite call, no retry inside it, and
// one log line that never holds the caption or its translation.

export type TranslateLog = {
  owner: string;
  locale: TranslateBody['locale'];
  model: string;
  promptVersion: string;
  charsIn: number;
  // null when no translation came back.
  charsOut: number | null;
  totalMs: number;
  outcome: 'ok' | 'aborted' | TranslateErrorCode;
  error?: string;
};

export type TranslateDeps = {
  model: TextModel;
  timeoutMs?: number;
  log?: (entry: TranslateLog) => void;
};

export const TRANSLATE_TIMEOUT_MS = 20_000;

export type TranslateOutcome =
  | { ok: true; response: TranslateResponse }
  | { ok: false; code: TranslateErrorCode | 'aborted' };

const ERROR_CHARS = 300;

export function formatTranslateLog(log: TranslateLog): string {
  const fields = [
    `owner=${log.owner}`,
    `locale=${log.locale}`,
    `model=${log.model}`,
    `prompt=${log.promptVersion}`,
    `chars_in=${log.charsIn}`,
    `chars_out=${log.charsOut ?? '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
  ];
  if (log.error !== undefined) {
    const message = log.error.replace(/\s+/g, ' ').slice(0, ERROR_CHARS);
    fields.push(`error="${message.replaceAll('"', '\\"')}"`);
  }
  return `translate ${fields.join(' ')}`;
}

export async function runTranslate(
  body: TranslateBody,
  ownerId: string,
  deps: TranslateDeps,
  signal: AbortSignal,
): Promise<TranslateOutcome> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(deps.timeoutMs ?? TRANSLATE_TIMEOUT_MS);
  const stepSignal = AbortSignal.any([signal, timeout]);
  const entry: TranslateLog = {
    owner: ownerId,
    locale: body.locale,
    model: TEXT_MODELS.light,
    promptVersion: TRANSLATE_PROMPT_VERSION,
    charsIn: body.text.length + (body.story?.length ?? 0),
    charsOut: null,
    totalMs: 0,
    outcome: 'aborted',
  };
  const end = (outcome: TranslateOutcome): TranslateOutcome => {
    entry.outcome = outcome.ok ? 'ok' : outcome.code;
    return outcome;
  };
  try {
    // The cut-off must end a model that never answers.
    const stopped = new Promise<never>((_resolve, reject) => {
      stepSignal.addEventListener('abort', () => reject(stepSignal.reason), { once: true });
    });
    stopped.catch(() => {});
    // With its story text, both in one call (docs/specs/posts/story-text).
    const { story } = body;
    const answer: { caption: string; story?: string } = story
      ? await Promise.race([
          deps.model.translatePost({ caption: body.text, story }, body.locale, stepSignal),
          stopped,
        ])
      : {
          caption: await Promise.race([
            deps.model.translateCaption(body.text, body.locale, stepSignal),
            stopped,
          ]),
        };
    const text = answer.caption;
    // A blocked or cut-off answer comes back empty; it is never kept.
    if (!text.trim() || (story && !answer.story?.trim())) {
      throw new ModelError('failed', 'empty translation');
    }
    entry.charsOut = text.length + (answer.story?.length ?? 0);
    return end({
      ok: true,
      response: {
        text,
        ...(story && answer.story ? { story: answer.story } : {}),
        model: TEXT_MODELS.light,
        promptVersion: TRANSLATE_PROMPT_VERSION,
      },
    });
  } catch (error) {
    if (signal.aborted) return end({ ok: false, code: 'aborted' });
    entry.error = describeModelError(error);
    if (timeout.aborted) return end({ ok: false, code: 'model_timeout' });
    if (error instanceof ModelError && error.kind === 'busy') {
      return end({ ok: false, code: 'model_busy' });
    }
    return end({ ok: false, code: 'model_failed' });
  } finally {
    entry.totalMs = Date.now() - started;
    deps.log?.(entry);
  }
}
