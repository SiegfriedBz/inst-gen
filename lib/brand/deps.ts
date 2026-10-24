import { geminiTextModel } from '@/lib/ai/text-model';
import { tavilySearchTool } from '@/lib/search/tavily';
import { undiciTransport } from './fetch-safe';
import type { ReadDeps } from './read';
import { formatReadLog } from './read-log';
import { formatSearchLog } from './search/log';
import type { SearchDeps } from './search/run';

// The real network and model, for the route. Tests replace this module.
export function defaultDeps(): ReadDeps {
  return {
    transport: undiciTransport(),
    model: geminiTextModel(),
    log: (entry) => console.info(formatReadLog(entry)),
  };
}

// The real search tool and model, for the essence search route.
export function defaultSearchDeps(): SearchDeps {
  return {
    tool: tavilySearchTool(),
    model: geminiTextModel(),
    log: (entry) => console.info(formatSearchLog(entry)),
  };
}
