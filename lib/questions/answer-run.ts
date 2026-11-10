import { ModelError, TEXT_MODELS, type TextModel } from '@/lib/ai/text-model';
import { describeModelError } from '@/lib/brand/read-log';
import { isSpa } from '@/lib/posts/emoji';
import { flowerFor } from '@/lib/reviews/checks';
import { ANSWER_PROMPT_VERSION, answerPrompt } from './answer-prompt';
import { buildAnswer, type SexualBy } from './checks';
import type { AnswerResponse, QuestionBody, QuestionErrorCode } from './question';

// One answer to a guest's question (docs/specs/questions/answer-drafts, "The
// model call"): one Flash-Lite call, no retry inside it, code's building of
// the answer, and one log line that never holds the question, the answer or a
// detail the guest gave.

export type AnswerLog = {
  owner: string;
  model: string;
  promptVersion: string;
  charsIn: number;
  // null until an answer came back.
  charsOut: number | null;
  language: string | null;
  sexual: SexualBy;
  final: boolean;
  unanswered: boolean | null;
  // Which booking details are known, never their words.
  known: string[];
  totalMs: number;
  outcome: 'ok' | 'aborted' | QuestionErrorCode;
  error?: string;
};

export type AnswerDeps = {
  model: TextModel;
  timeoutMs?: number;
  log?: (entry: AnswerLog) => void;
};

export const ANSWER_TIMEOUT_MS = 20_000;

export type AnswerOutcome =
  | { ok: true; response: AnswerResponse }
  | { ok: false; code: QuestionErrorCode | 'aborted' };

const ERROR_CHARS = 300;

export function formatAnswerLog(log: AnswerLog): string {
  const fields = [
    `owner=${log.owner}`,
    `model=${log.model}`,
    `prompt=${log.promptVersion}`,
    `chars_in=${log.charsIn}`,
    `chars_out=${log.charsOut ?? '-'}`,
    `lang=${log.language ?? '-'}`,
    `sexual=${log.sexual ?? 'no'}`,
    `final=${log.final ? 'yes' : 'no'}`,
    `unanswered=${log.unanswered ?? '-'}`,
    `known=${log.known.length > 0 ? log.known.join(',') : '-'}`,
    `total_ms=${log.totalMs}`,
    `outcome=${log.outcome}`,
  ];
  if (log.error !== undefined) {
    const message = log.error.replace(/\s+/g, ' ').slice(0, ERROR_CHARS);
    fields.push(`error="${message.replaceAll('"', '\\"')}"`);
  }
  return `answer ${fields.join(' ')}`;
}

export async function runAnswer(
  body: QuestionBody,
  ownerId: string,
  deps: AnswerDeps,
  signal: AbortSignal,
): Promise<AnswerOutcome> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(deps.timeoutMs ?? ANSWER_TIMEOUT_MS);
  const stepSignal = AbortSignal.any([signal, timeout]);
  const flower = flowerFor(body.country);
  const entry: AnswerLog = {
    owner: ownerId,
    model: TEXT_MODELS.light,
    promptVersion: ANSWER_PROMPT_VERSION,
    charsIn: body.question.length,
    charsOut: null,
    language: null,
    sexual: null,
    final: body.final,
    unanswered: null,
    known: [],
    totalMs: 0,
    outcome: 'aborted',
  };
  const end = (outcome: AnswerOutcome): AnswerOutcome => {
    entry.outcome = outcome.ok ? 'ok' : outcome.code;
    return outcome;
  };
  try {
    // The cut-off must end a model that never answers.
    const stopped = new Promise<never>((_resolve, reject) => {
      stepSignal.addEventListener('abort', () => reject(stepSignal.reason), { once: true });
    });
    stopped.catch(() => {});
    const prompt = answerPrompt(body, flower, isSpa(body.business.category));
    const answer = await Promise.race([deps.model.writeAnswer(prompt, stepSignal), stopped]);
    entry.language = answer.questionLanguage;
    const built = buildAnswer(answer, { body, flower });
    // A blocked or cut-off answer leaves a part empty; it is never shown.
    if (!built) throw new ModelError('failed', 'empty answer part');
    const { sexualBy, ...response } = built;
    entry.sexual = sexualBy;
    entry.unanswered = response.unanswered;
    entry.known = (['place', 'day', 'time'] as const).filter((k) => response.guest[k] !== null);
    entry.charsOut = response.answer.text.length;
    return end({
      ok: true,
      response: { ...response, model: TEXT_MODELS.light, promptVersion: ANSWER_PROMPT_VERSION },
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
