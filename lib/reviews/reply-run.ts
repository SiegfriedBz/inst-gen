import { ModelError, TEXT_MODELS, type TextModel } from '@/lib/ai/text-model';
import { describeModelError } from '@/lib/brand/read-log';
import { checkReplies, flowerFor } from './checks';
import type { ReplyBody, ReplyErrorCode, ReplyResponse } from './reply';
import { REPLY_PROMPT_VERSION, replyPrompt } from './reply-prompt';

// Two replies to one review (docs/specs/reviews/reply-drafts, "The model
// call"): one Flash-Lite call, no retry inside it, code's checks on the
// answer, and one log line that never holds the review or the replies.

export type ReplyLog = {
  owner: string;
  model: string;
  promptVersion: string;
  charsIn: number;
  // null until replies came back.
  charsOut: number | null;
  language: string | null;
  abusive: boolean | null;
  totalMs: number;
  outcome: 'ok' | 'aborted' | ReplyErrorCode;
  error?: string;
};

export type ReplyDeps = {
  model: TextModel;
  timeoutMs?: number;
  log?: (entry: ReplyLog) => void;
};

export const REPLY_TIMEOUT_MS = 20_000;

export type ReplyOutcome =
  | { ok: true; response: ReplyResponse }
  | { ok: false; code: ReplyErrorCode | 'aborted' };

const ERROR_CHARS = 300;

export function formatReplyLog(log: ReplyLog): string {
  const fields = [
    `owner=${log.owner}`,
    `model=${log.model}`,
    `prompt=${log.promptVersion}`,
    `chars_in=${log.charsIn}`,
    `chars_out=${log.charsOut ?? '-'}`,
    `lang=${log.language ?? '-'}`,
    `abusive=${log.abusive ?? '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
  ];
  if (log.error !== undefined) {
    const message = log.error.replace(/\s+/g, ' ').slice(0, ERROR_CHARS);
    fields.push(`error="${message.replaceAll('"', '\\"')}"`);
  }
  return `reply ${fields.join(' ')}`;
}

export async function runReply(
  body: ReplyBody,
  ownerId: string,
  deps: ReplyDeps,
  signal: AbortSignal,
): Promise<ReplyOutcome> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(deps.timeoutMs ?? REPLY_TIMEOUT_MS);
  const stepSignal = AbortSignal.any([signal, timeout]);
  const flower = flowerFor(body.country);
  const entry: ReplyLog = {
    owner: ownerId,
    model: TEXT_MODELS.light,
    promptVersion: REPLY_PROMPT_VERSION,
    charsIn: body.review.length,
    charsOut: null,
    language: null,
    abusive: null,
    totalMs: 0,
    outcome: 'aborted',
  };
  const end = (outcome: ReplyOutcome): ReplyOutcome => {
    entry.outcome = outcome.ok ? 'ok' : outcome.code;
    return outcome;
  };
  try {
    // The cut-off must end a model that never answers.
    const stopped = new Promise<never>((_resolve, reject) => {
      stepSignal.addEventListener('abort', () => reject(stepSignal.reason), { once: true });
    });
    stopped.catch(() => {});
    const answer = await Promise.race([
      deps.model.writeReplies(replyPrompt(body, flower), stepSignal),
      stopped,
    ]);
    entry.language = answer.reviewLanguage;
    entry.abusive = answer.abusive;
    const checked = checkReplies(answer, { locale: body.locale, flower });
    // A blocked or cut-off answer leaves a reply empty; it is never shown.
    if (!checked) throw new ModelError('failed', 'empty reply');
    entry.charsOut = checked.short.text.length + checked.warm.text.length;
    return end({
      ok: true,
      response: { ...checked, model: TEXT_MODELS.light, promptVersion: REPLY_PROMPT_VERSION },
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
