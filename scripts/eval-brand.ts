// Runs the brand read on saved fixtures with the real model, and scores each
// profile against its expected.json. Spends real Gemini quota: one Flash
// request per fixture, about 20 a day for the whole app. Never on a pilot day.
//
// Usage: pnpm eval:brand [slug…] [--record] [--model=<id>]
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
const verbose = args.includes('--verbose');
const modelId =
  args.find((a) => a.startsWith('--model='))?.slice('--model='.length) ?? TEXT_MODELS.brand;
const wanted = args.filter((a) => !a.startsWith('--'));
const slugs = (wanted.length > 0 ? wanted : readdirSync(FIXTURES_DIR)).filter(
  (slug) => !slug.startsWith('_') && existsSync(join(FIXTURES_DIR, slug, 'expected.json')),
);

let passed = 0;
let scored = 0;
let busy = false;
// A busy answer (a 503 "high demand", or the daily quota) is retried once,
// 10 s later; a second one stops the run.
const queue = [...slugs];
const retried = new Set<string>();
while (queue.length > 0) {
  const slug = queue.shift() as string;
  const dir = join(FIXTURES_DIR, slug);
  const fixture = loadFixture(dir);
  const gemini = geminiTextModel({ modelId });
  const model = record
    ? recordingTextModel(gemini, { modelId, promptVersion: BRAND_PROMPT_VERSION }, (recording) =>
        writeFileSync(join(dir, 'recording.json'), `${JSON.stringify(recording, null, 2)}\n`),
      )
    : gemini;
  const deps = {
    transport: fixtureTransport(dir, {
      imageCache: join(CACHE_DIR, slug),
      live: undiciTransport(),
    }),
    model,
    onModelError: (error: unknown) =>
      console.log(
        `    error: ${error instanceof Error ? error.message.slice(0, 400) : String(error)}`,
      ),
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
        const p = streamed.profile;
        console.log(`    tone: ${p.tone.join(', ')} · style: ${p.visualStyle?.summary ?? 'none'}`);
        const e = p.essence;
        console.log(
          `    essence: ${e.promise?.value ?? '-'} | ${e.feeling.join(', ')} | place: ${e.placeSymbols.join(', ')} | senses: ${e.senses.join(', ')} | moments: ${e.moments.map((m) => m.value).join(', ')}`,
        );
        if (verbose && !score.pass) {
          console.log(
            `    name=${p.name.value} town=${p.location.town?.value} wa=${p.contact.whatsapp?.value} colours=${p.colours.map((c) => `${c.hex}:${c.source}`).join(' ')}`,
          );
          console.log(`    offerings=${p.offerings.map((o) => o.name).join(' | ')}`);
          console.log(`    dropped=${p.dropped.map((d) => `${d.field}:${d.reason}`).join(' ')}`);
        }
      }
    }
    if (outcome === 'model_busy' && !retried.has(slug)) {
      retried.add(slug);
      console.log(`${slug.padEnd(24)}busy, retrying in 10 s`);
      await new Promise((resolve) => setTimeout(resolve, 10_000));
      queue.unshift(slug);
      continue;
    }
    if (outcome === 'model_busy') busy = true;
    line += `${outcome ?? 'no final'}  ${Date.now() - started} ms`;
  } catch (error) {
    line += `ERROR ${error instanceof Error ? error.message : String(error)}`;
  }
  console.log(line);
  if (busy) {
    console.log('Gemini is busy (daily quota used up, or high demand): stopping.');
    break;
  }
}

console.log(
  `brand eval: ${passed}/${scored} passed · prompt ${BRAND_PROMPT_VERSION} · model ${modelId}`,
);
process.exit(busy ? 2 : 0);
