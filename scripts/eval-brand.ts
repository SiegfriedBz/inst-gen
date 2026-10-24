// Runs the brand read on saved fixtures with the real model, and scores each
// profile against its expected.json. Spends real Gemini quota: one Flash
// request per fixture, about 20 a day for the whole app. Never on a pilot day.
//
// Usage: pnpm eval:brand [slug…] [--record]
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { recordingTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import { scoreFixture } from '@/lib/brand/eval/score';
import { undiciTransport } from '@/lib/brand/fetch-safe';
import { CACHE_DIR, FIXTURES_DIR, fixtureTransport, loadFixture } from '@/lib/brand/fixtures';
import { BRAND_PROMPT_VERSION } from '@/lib/brand/prompt';
import { prepareRead, streamProfile } from '@/lib/brand/read';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const args = process.argv.slice(2);
const record = args.includes('--record');
const wanted = args.filter((a) => !a.startsWith('--'));
const slugs = (wanted.length > 0 ? wanted : readdirSync(FIXTURES_DIR)).filter(
  (slug) => !slug.startsWith('_') && existsSync(join(FIXTURES_DIR, slug, 'expected.json')),
);

let passed = 0;
let scored = 0;
let busy = false;
for (const slug of slugs) {
  const dir = join(FIXTURES_DIR, slug);
  const fixture = loadFixture(dir);
  const gemini = geminiTextModel();
  const model = record
    ? recordingTextModel(
        gemini,
        { modelId: TEXT_MODELS.brand, promptVersion: BRAND_PROMPT_VERSION },
        (recording) =>
          writeFileSync(join(dir, 'recording.json'), `${JSON.stringify(recording, null, 2)}\n`),
      )
    : gemini;
  const deps = {
    transport: fixtureTransport(dir, {
      imageCache: join(CACHE_DIR, slug),
      live: undiciTransport(),
    }),
    model,
  };
  const signal = new AbortController().signal;
  const started = Date.now();
  let line = `${slug.padEnd(24)}`;
  try {
    const prepared = await prepareRead(fixture.manifest.siteUrl, deps, signal);
    let outcome: string | null = null;
    for await (const streamed of streamProfile(prepared, deps, signal)) {
      if (streamed.type === 'error') outcome = streamed.code;
      if (streamed.type === 'final') {
        const score = scoreFixture(streamed.profile, fixture.expected, prepared.pages);
        scored++;
        if (score.pass) passed++;
        outcome = `${score.pass ? 'PASS' : 'FAIL'}  ${score.failures.join(',') || '-'}  dropped=${streamed.profile.dropped.length}`;
        console.log(
          `    tone: ${streamed.profile.tone.join(', ')} · style: ${streamed.profile.visualStyle?.summary ?? 'none'}`,
        );
      }
    }
    if (outcome === 'model_busy') busy = true;
    line += `${outcome ?? 'no final'}  ${Date.now() - started} ms`;
  } catch (error) {
    line += `ERROR ${error instanceof Error ? error.message : String(error)}`;
  }
  console.log(line);
  if (busy) {
    console.log('Gemini quota used up: stopping.');
    break;
  }
}

console.log(
  `brand eval: ${passed}/${scored} passed · prompt ${BRAND_PROMPT_VERSION} · model ${TEXT_MODELS.brand}`,
);
process.exit(busy ? 2 : 0);
