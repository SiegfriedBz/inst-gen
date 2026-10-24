import type { DeepPartial, ModelProfile } from '@/lib/brand/profile';
import { ModelError, type TextModel, toModelStream } from './text-model';

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
  opts: { delayMs?: number; hang?: boolean; error?: 'busy' | 'failed' } = {},
): TextModel {
  return {
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
): TextModel {
  return {
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
