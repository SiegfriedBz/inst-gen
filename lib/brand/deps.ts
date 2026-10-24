import { geminiTextModel } from '@/lib/ai/text-model';
import { undiciTransport } from './fetch-safe';
import type { ReadDeps } from './read';
import { formatReadLog } from './read-log';

// The real network and model, for the route. Tests replace this module.
export function defaultDeps(): ReadDeps {
  return {
    transport: undiciTransport(),
    model: geminiTextModel(),
    log: (entry) => console.info(formatReadLog(entry)),
  };
}
