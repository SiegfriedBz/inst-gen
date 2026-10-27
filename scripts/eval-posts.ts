// Plans posts for saved fixtures with the real Gemini, and prints each batch
// with code's checks, for the developer to judge against the spec's rubric
// (docs/specs/posts/generate-copy, "Tests and evaluation"). The profile comes
// from the fixture's recorded brand read and search, so only the plan spends
// quota: 1 Gemini request per fixture, from the app's daily pool. A few slugs
// at a time; never on a pilot day.
//
// With --offer, each plan carries the fixture's offer (fixtureOffer: 10% off
// its first two treatments) and --record saves it as posts-offer.json
// (docs/specs/posts/special-offer, "Checked with the real model").
//
// The image set-ups are dealt with a seed from the slug ("<slug>:offer" with
// --offer), so a replay of the recording deals the same ones
// (docs/specs/posts/varied-images).
//
// Usage: pnpm eval:posts [slug…] [--record] [--offer] [--model=<id>]
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Recording, recordingTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import {
  FIXTURES_DIR,
  fixtureOffer,
  fixtureProfile,
  type PostsFixture,
} from '@/lib/brand/fixtures';
import type { PlanResult } from '@/lib/posts/batch';
import { POSTS_PROMPT_VERSION } from '@/lib/posts/prompt';
import { streamPlan } from '@/lib/posts/run';
import { seededRandom, setupLine } from '@/lib/posts/setup';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const DEFAULT_SLUGS = ['sen', 'svarga'];
const args = process.argv.slice(2);
const record = args.includes('--record');
const withOffer = args.includes('--offer');
const modelId =
  args.find((a) => a.startsWith('--model='))?.slice('--model='.length) ?? TEXT_MODELS.posts;
const wanted = args.filter((a) => !a.startsWith('--'));
const slugs = wanted.length > 0 ? wanted : DEFAULT_SLUGS;

function print(result: PlanResult): void {
  for (const [i, post] of result.posts.entries()) {
    console.log(
      `\n  ${i + 1}. ${post.type} · ${post.scene} · ${post.topic}${post.offer ? ' · OFFER' : ''}`,
    );
    console.log(post.caption.replace(/^/gm, '     '));
    console.log(`     ${post.cta}`);
    console.log(`     ${post.hashtags.map((t) => `#${t}`).join(' ')}`);
    console.log(`     alt: ${post.altText}`);
    if (post.setup) console.log(`     set-up: ${setupLine(post.setup)}`);
    console.log(`     image: ${post.imagePrompt}`);
    for (const flag of post.unchecked) console.log(`     ⚠ ${flag.kind}: ${flag.text}`);
  }
  for (const d of result.dropped) console.log(`  dropped ${d.field}: ${d.reason}`);
}

let made = 0;
for (const slug of slugs) {
  const dir = join(FIXTURES_DIR, slug);
  const started = Date.now();
  try {
    const profile = await fixtureProfile(dir);
    let recording: Recording | null = null;
    const model = recordingTextModel(
      geminiTextModel({ postsModelId: modelId }),
      { modelId, promptVersion: POSTS_PROMPT_VERSION },
      () => {},
      () => {},
      (r) => {
        recording = r;
      },
    );
    let result: PlanResult | null = null;
    const offer = withOffer ? fixtureOffer(profile) : undefined;
    if (offer) console.log(`\n${slug} · offer: ${JSON.stringify(offer)}`);
    for await (const line of streamPlan(
      { profile, recent: [], offer },
      { model, modelId, random: seededRandom(withOffer ? `${slug}:offer` : slug) },
      new AbortController().signal,
    )) {
      if (line.type === 'error') throw new Error(line.code);
      if (line.type === 'final') result = line.result;
    }
    if (!result) throw new Error('no final line');
    made++;
    console.log(`\n${slug} · ${Date.now() - started} ms · ${result.posts.length} posts`);
    print(result);
    if (record && recording) {
      const saved: PostsFixture = { modelId, promptVersion: POSTS_PROMPT_VERSION, recording };
      const file = withOffer ? 'posts-offer.json' : 'posts.json';
      writeFileSync(join(dir, file), `${JSON.stringify(saved, null, 2)}\n`);
    }
  } catch (error) {
    console.log(
      `${slug.padEnd(24)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `\nposts eval: ${made}/${slugs.length} made · prompt ${POSTS_PROMPT_VERSION} · model ${modelId}`,
);
