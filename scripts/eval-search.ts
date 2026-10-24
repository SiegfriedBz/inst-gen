// Runs the essence search on saved fixtures with the real Tavily and Gemini,
// and prints each essence before and after, for the developer to judge
// (docs/specs/brand/search-essence, "Tests and evaluation"). The profile comes
// from the fixture's recorded brand read, so no brand quota is spent. Spends 3
// Tavily credits and 1 Flash-Lite request per fixture. Never on a pilot day.
//
// Usage: pnpm eval:search [slug…] [--record]
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordingTextModel, replayTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import {
  FIXTURES_DIR,
  fixtureTransport,
  loadFixture,
  type SearchFixture,
} from '@/lib/brand/fixtures';
import type { Profile } from '@/lib/brand/profile';
import { prepareRead, streamProfile } from '@/lib/brand/read';
import { SEARCH_PROMPT_VERSION, type SearchModelAnswer } from '@/lib/brand/search/prompt';
import { buildQueries } from '@/lib/brand/search/queries';
import { runSearch } from '@/lib/brand/search/run';
import { mergeSearch, searchBody } from '@/lib/brand/search-client';
import { recordingSearchTool, type SearchRecording } from '@/lib/search/replay';
import { tavilySearchTool } from '@/lib/search/tavily';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const DEFAULT_SLUGS = ['sen', 'svarga', 'karsa-spa', 'orient-spa', 'phin-coffee'];
const args = process.argv.slice(2);
const record = args.includes('--record');
const wanted = args.filter((a) => !a.startsWith('--'));
const slugs = wanted.length > 0 ? wanted : DEFAULT_SLUGS;

// The fixture's profile, from its recorded brand read: no model call.
async function replayedProfile(dir: string): Promise<Profile> {
  const fixture = loadFixture(dir);
  if (!fixture.recording) throw new Error('no recording.json');
  const deps = { transport: fixtureTransport(dir), model: replayTextModel(fixture.recording) };
  const signal = new AbortController().signal;
  const prepared = await prepareRead(fixture.manifest.siteUrl, deps, signal);
  for await (const line of streamProfile(prepared, deps, signal)) {
    if (line.type === 'final') return line.profile;
    if (line.type === 'error') throw new Error(line.code);
  }
  throw new Error('no final line');
}

function essenceLine(p: Profile): string {
  const e = p.essence;
  return `place: ${e.placeSymbols.join(', ')} | moments: ${e.moments.map((m) => m.value).join(', ')} | terms: ${e.searchTerms.join(', ')}`;
}

let answered = 0;
for (const slug of slugs) {
  const dir = join(FIXTURES_DIR, slug);
  const started = Date.now();
  try {
    const profile = await replayedProfile(dir);
    const body = searchBody(profile);
    if (!body) {
      console.log(`${slug.padEnd(24)}skipped: no town`);
      continue;
    }
    const queries: SearchRecording['queries'] = [];
    let modelAnswer: SearchModelAnswer | null = null;
    const answer = await runSearch(
      body,
      {
        tool: recordingSearchTool(tavilySearchTool(), (query, results) =>
          queries.push({ query, results }),
        ),
        model: recordingTextModel(
          geminiTextModel(),
          { modelId: TEXT_MODELS.light, promptVersion: SEARCH_PROMPT_VERSION },
          () => {},
          (a) => {
            modelAnswer = a;
          },
        ),
      },
      new AbortController().signal,
    );
    answered++;
    const merged = mergeSearch(profile, answer);
    console.log(`${slug.padEnd(24)}${Date.now() - started} ms · dropped=${answer.dropped.length}`);
    console.log(`    before: ${essenceLine(profile)}`);
    console.log(`    after:  ${essenceLine(merged)}`);
    for (const m of answer.moments) console.log(`    moment source: ${m.value} ← ${m.source}`);
    if (record) {
      const order = new Map(buildQueries(body).map((q, i) => [q, i]));
      const saved: SearchFixture = {
        modelId: TEXT_MODELS.light,
        promptVersion: SEARCH_PROMPT_VERSION,
        body,
        // In query order, whichever answered first.
        queries: [...queries].sort((a, b) => (order.get(a.query) ?? 0) - (order.get(b.query) ?? 0)),
        answer: modelAnswer ?? { searchTerms: [], moments: [], placeSymbols: [] },
      };
      writeFileSync(join(dir, 'search.json'), `${JSON.stringify(saved, null, 2)}\n`);
    }
  } catch (error) {
    console.log(
      `${slug.padEnd(24)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `essence search: ${answered}/${slugs.length} answered · prompt ${SEARCH_PROMPT_VERSION} · model ${TEXT_MODELS.light}`,
);
