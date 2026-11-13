import { ModelError, type ModelStream, TEXT_MODELS, type TextModel } from '@/lib/ai/text-model';
import { describeModelError } from '@/lib/brand/read-log';
import {
  type Dropped,
  type ModelPost,
  type NewTextsBody,
  type PlanBody,
  type PlanResult,
  POSTS_LIMITS,
  type Post,
  type PostsErrorCode,
  type RewriteBody,
} from './batch';
import {
  carries,
  checkNewTexts,
  checkPlan,
  checkPost,
  checkRewrite,
  MORE_POSTS,
  setupFlags,
} from './checks';
import { isSpa } from './emoji';
import { postsModelInput, profileHash } from './input';
import type { PostsLog } from './log';
import type { Offer } from './offer';
import {
  newTextsPrompt,
  newTextsUserText,
  POSTS_PROMPT_VERSION,
  planPrompt,
  planUserText,
  rewritePrompt,
  rewriteUserText,
} from './prompt';
import { dealSetups, type Setup } from './setup';
import type { PostsLine } from './stream';

// The post plan and its rewrite, end to end: one streamed model call, each
// post checked as soon as it is complete, the batch checked at the end
// (docs/specs/posts/generate-copy). No retry: a retry spends free quota.

export type PostsDeps = {
  model: TextModel;
  // The model the TextModel calls, for the final line and the log.
  modelId?: string;
  timeoutMs?: number;
  log?: (entry: PostsLog) => void;
  // Deals the image set-ups; seeded in tests and evals.
  random?: () => number;
};

export const POSTS_TIMEOUT_MS = 60_000;

function errorCode(error: unknown): PostsErrorCode {
  return error instanceof ModelError && error.kind === 'busy' ? 'model_busy' : 'model_failed';
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

type Step<T> = {
  kind: PostsLog['kind'];
  open: (signal: AbortSignal) => ModelStream<T>;
  // The posts complete in a partial: all but the last, which may still grow.
  complete: (partial: T, done: boolean) => ModelPost[] | null;
  finish: (final: T, streamed: Post[], dropped: Dropped[]) => { posts: Post[]; dropped: Dropped[] };
};

async function* run<T>(
  profile: PlanBody['profile'],
  step: Step<T>,
  deps: PostsDeps,
  signal: AbortSignal,
  offer?: Offer,
  setups?: Setup[],
): AsyncGenerator<PostsLine> {
  const started = Date.now();
  const timeout = AbortSignal.timeout(deps.timeoutMs ?? POSTS_TIMEOUT_MS);
  const stepSignal = AbortSignal.any([signal, timeout]);
  const model = deps.modelId ?? TEXT_MODELS.posts;
  const entry: PostsLog = {
    host: hostOf(profile.siteUrl),
    kind: step.kind,
    model,
    promptVersion: POSTS_PROMPT_VERSION,
    kept: 0,
    flags: 0,
    storyCuts: 0,
    storyCtas: 0,
    emojiFixes: 0,
    offerFixes: 0,
    priceFixes: 0,
    repeats: 0,
    lightMisses: 0,
    modelMs: null,
    totalMs: 0,
    outcome: 'aborted',
  };
  const streamed: Post[] = [];
  const dropped: Dropped[] = [];
  let seen = 0;
  // Offer posts kept so far: the first two carry the special offer.
  let offerPosts = 0;
  function* emit(raws: ModelPost[]): Generator<PostsLine> {
    for (; seen < raws.length; seen += 1) {
      // An attempt keeps two posts (docs/specs/posts/two-suggestions): the
      // rest are never shown, and recorded once.
      if (streamed.length >= POSTS_LIMITS.posts) {
        if (!dropped.includes(MORE_POSTS)) dropped.push(MORE_POSTS);
        continue;
      }
      const type = raws[seen].type.trim().toLowerCase();
      const context = offer
        ? { offer, carries: type === 'offer' && carries('offer', offerPosts) }
        : undefined;
      // Set-up n belongs to the n-th post as streamed, dropped or not.
      const checked = checkPost(raws[seen], profile, `post-${seen + 1}`, context, setups?.[seen]);
      if (checked.post?.type === 'offer') offerPosts += 1;
      dropped.push(...checked.dropped);
      if (!checked.post) continue;
      dropped.push(...setupFlags(checked.post));
      streamed.push(checked.post);
      yield { type: 'post', index: streamed.length - 1, post: checked.post };
    }
  }
  try {
    const stream = step.open(stepSignal);
    // The timeout must end a model that never answers.
    const stopped = new Promise<never>((_resolve, reject) => {
      stepSignal.addEventListener('abort', () => reject(stepSignal.reason), { once: true });
    });
    stopped.catch(() => {});
    const iterator = stream[Symbol.asyncIterator]();
    for (;;) {
      const next = await Promise.race([iterator.next(), stopped]);
      if (next.done) break;
      const complete = step.complete(next.value as T, false);
      if (complete) yield* emit(complete);
    }
    const final = await Promise.race([stream.final, stopped]);
    entry.modelMs = Date.now() - started;
    const all = step.complete(final, true);
    if (all) yield* emit(all);
    const checked = step.finish(final, streamed, dropped);
    const result: PlanResult = {
      posts: checked.posts,
      dropped: checked.dropped,
      promptVersion: POSTS_PROMPT_VERSION,
      model,
      profileHash: profileHash(profile),
      ...(offer ? { offer } : {}),
    };
    entry.kept = result.posts.length;
    entry.flags = result.posts.reduce((n, p) => n + p.unchecked.length, 0);
    entry.storyCuts = result.dropped.filter(
      (d) => d.field === 'story' && d.reason.includes(' cut from '),
    ).length;
    entry.storyCtas = result.dropped.filter(
      (d) => d.field === 'story' && d.reason.includes(' story text removed "'),
    ).length;
    entry.emojiFixes = result.dropped.filter((d) => d.field === 'emoji').length;
    // A post without a treatment is left as written: not a fix.
    entry.offerFixes = result.dropped.filter(
      (d) => d.field === 'offer' && !d.reason.endsWith('no treatment for the offer line'),
    ).length;
    entry.priceFixes = result.dropped.filter((d) => d.field === 'price').length;
    entry.repeats = result.dropped.filter(
      (d) => d.field === 'mix' && /^(first sentence|last sentence|story text) "/.test(d.reason),
    ).length;
    entry.lightMisses = result.dropped.filter((d) => d.field === 'light').length;
    entry.outcome = 'final';
    yield { type: 'final', result };
  } catch (error) {
    if (signal.aborted) return;
    const code = timeout.aborted ? 'model_timeout' : errorCode(error);
    entry.outcome = code;
    entry.error = describeModelError(error);
    yield { type: 'error', code };
  } finally {
    entry.totalMs = Date.now() - started;
    deps.log?.(entry);
  }
}

export function streamPlan(
  body: PlanBody,
  deps: PostsDeps,
  signal: AbortSignal,
): AsyncGenerator<PostsLine> {
  const input = postsModelInput(body.profile);
  const setups = dealSetups(body.profile, body.offer, deps.random ?? Math.random);
  return run(
    body.profile,
    {
      kind: 'plan',
      open: (s) =>
        deps.model.streamPostPlan(
          {
            system: planPrompt(!!body.offer, isSpa(body.profile.category)),
            text: planUserText(input, body.recent, body.offer, setups),
          },
          s,
        ),
      complete: (partial, done) => {
        const posts = (partial.posts ?? []) as ModelPost[];
        return done ? posts : posts.slice(0, -1);
      },
      finish: (_final, streamed, dropped) => checkPlan(streamed, dropped, body.profile, body.offer),
    },
    deps,
    signal,
    body.offer,
    setups,
  );
}

export function streamRewrite(
  body: RewriteBody,
  deps: PostsDeps,
  signal: AbortSignal,
): AsyncGenerator<PostsLine> {
  const input = postsModelInput(body.profile);
  return run(
    body.profile,
    {
      kind: 'rewrite',
      open: (s) =>
        deps.model.streamPostRewrite(
          {
            system: rewritePrompt(!!body.offer, isSpa(body.profile.category)),
            text: rewriteUserText(input, body.posts, body.offer),
          },
          s,
        ),
      // A rewrite's posts are only shown once all are checked.
      complete: () => null,
      finish: (final) => checkRewrite(final, body.posts, body.profile, body.offer),
    },
    deps,
    signal,
    body.offer,
  );
}

// New words for one post, its images kept (docs/specs/platform/easier-to-use):
// one call on the rewrite's model method, with a prompt of its own. An answer
// with no usable caption ends in model_failed, so the count comes back.
export function streamNewTexts(
  body: NewTextsBody,
  deps: PostsDeps,
  signal: AbortSignal,
): AsyncGenerator<PostsLine> {
  const input = postsModelInput(body.profile);
  return run(
    body.profile,
    {
      kind: 'texts',
      open: (s) =>
        deps.model.streamPostRewrite(
          {
            system: newTextsPrompt(!!body.offer, isSpa(body.profile.category)),
            text: newTextsUserText(input, body.post, body.other, body.offer),
          },
          s,
        ),
      complete: () => null,
      finish: (final) => checkNewTexts(final, body.post, body.other, body.profile, body.offer),
    },
    deps,
    signal,
    body.offer,
  );
}
