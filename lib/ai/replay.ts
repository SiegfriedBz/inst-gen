import type { DeepPartial, ModelProfile } from '@/lib/brand/profile';
import type { SearchModelAnswer } from '@/lib/brand/search/prompt';
import type { ModelPostPlan, ModelRewrite } from '@/lib/posts/batch';
import type { ModelReplies } from '@/lib/reviews/reply';
import { ModelError, type ModelStream, type TextModel, toModelStream } from './text-model';

// Recorded model calls: unit tests replay them, and `pnpm eval:brand --record`
// writes them.

export type Recording = {
  modelId: string;
  promptVersion: string;
  partials: unknown[];
  final: unknown;
};

function waitForAbort(signal: AbortSignal): Promise<never> {
  return new Promise((_resolve, reject) => {
    if (signal.aborted) reject(signal.reason);
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return Promise.race([
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
    waitForAbort(signal),
  ]);
}

export function replayTextModel(
  recording: Recording,
  opts: {
    delayMs?: number;
    hang?: boolean;
    error?: 'busy' | 'failed';
    // The essence search's answer; without one, searchEssence fails.
    searchAnswer?: SearchModelAnswer;
    // A post plan or rewrite; without one, both posts calls fail.
    posts?: Recording;
    // A caption's translation, its `final` the text; without one, it fails.
    translation?: Recording;
    // A review's two replies, its `final` the answer; without one, it fails.
    replies?: Recording;
  } = {},
): TextModel {
  function replay<T>(recording: Recording | undefined, signal: AbortSignal) {
    async function* run(): AsyncGenerator<DeepPartial<T>, T> {
      if (opts.error) throw new ModelError(opts.error, `replayed ${opts.error}`);
      if (opts.hang) await waitForAbort(signal);
      if (!recording) throw new ModelError('failed', 'no recorded posts');
      for (const partial of recording.partials) {
        if (opts.delayMs) await sleep(opts.delayMs, signal);
        if (signal.aborted) throw signal.reason;
        yield partial as DeepPartial<T>;
      }
      return recording.final as T;
    }
    return toModelStream(run());
  }
  return {
    streamPostPlan(_input, signal) {
      return replay<ModelPostPlan>(opts.posts, signal);
    },
    streamPostRewrite(_input, signal) {
      return replay<ModelRewrite>(opts.posts, signal);
    },
    async translateCaption(_text, _locale, signal) {
      if (opts.error) throw new ModelError(opts.error, `replayed ${opts.error}`);
      if (opts.hang) await waitForAbort(signal);
      if (!opts.translation) throw new ModelError('failed', 'no recorded translation');
      return opts.translation.final as string;
    },
    async writeReplies(_input, signal) {
      if (opts.error) throw new ModelError(opts.error, `replayed ${opts.error}`);
      if (opts.hang) await waitForAbort(signal);
      if (!opts.replies) throw new ModelError('failed', 'no recorded replies');
      return opts.replies.final as ModelReplies;
    },
    async searchEssence(_input, signal) {
      if (opts.error) throw new ModelError(opts.error, `replayed ${opts.error}`);
      if (opts.hang) await waitForAbort(signal);
      if (!opts.searchAnswer) throw new ModelError('failed', 'no recorded search answer');
      return opts.searchAnswer;
    },
    streamBrandProfile(_input, signal) {
      async function* run(): AsyncGenerator<DeepPartial<ModelProfile>, ModelProfile> {
        if (opts.error) throw new ModelError(opts.error, `replayed ${opts.error}`);
        if (opts.hang) await waitForAbort(signal);
        for (const partial of recording.partials) {
          if (opts.delayMs) await sleep(opts.delayMs, signal);
          if (signal.aborted) throw signal.reason;
          yield partial as DeepPartial<ModelProfile>;
        }
        return recording.final as ModelProfile;
      }
      return toModelStream(run());
    },
  };
}

export function recordingTextModel(
  inner: TextModel,
  meta: { modelId: string; promptVersion: string },
  onDone: (recording: Recording) => void,
  onSearch: (answer: SearchModelAnswer) => void = () => {},
  onPosts: (recording: Recording) => void = () => {},
  onTranslation: (recording: Recording) => void = () => {},
  onReplies: (recording: Recording) => void = () => {},
): TextModel {
  function record<T>(stream: ModelStream<T>) {
    async function* run(): AsyncGenerator<DeepPartial<T>, T> {
      const partials: unknown[] = [];
      for await (const partial of stream) {
        partials.push(partial);
        yield partial;
      }
      const final = await stream.final;
      onPosts({ ...meta, partials, final });
      return final;
    }
    return toModelStream(run());
  }
  return {
    streamPostPlan(input, signal) {
      return record(inner.streamPostPlan(input, signal));
    },
    streamPostRewrite(input, signal) {
      return record(inner.streamPostRewrite(input, signal));
    },
    async translateCaption(text, locale, signal) {
      const final = await inner.translateCaption(text, locale, signal);
      onTranslation({ ...meta, partials: [], final });
      return final;
    },
    async writeReplies(input, signal) {
      const final = await inner.writeReplies(input, signal);
      onReplies({ ...meta, partials: [], final });
      return final;
    },
    async searchEssence(input, signal) {
      const answer = await inner.searchEssence(input, signal);
      onSearch(answer);
      return answer;
    },
    streamBrandProfile(input, signal) {
      const stream = inner.streamBrandProfile(input, signal);
      async function* run(): AsyncGenerator<DeepPartial<ModelProfile>, ModelProfile> {
        const partials: unknown[] = [];
        for await (const partial of stream) {
          partials.push(partial);
          yield partial;
        }
        const final = await stream.final;
        onDone({ ...meta, partials, final });
        return final;
      }
      return toModelStream(run());
    },
  };
}
