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
// With --replay, the plan recorded for each fixture (posts.json, or
// posts-offer.json with --offer) goes through today's checks and is printed,
// with no request (docs/specs/posts/marketing-copy); --record with it is an
// error.
//
// Usage: pnpm eval:posts [slug…] [--record | --replay] [--offer] [--model=<id>]
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Recording, recordingTextModel, replayTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import {
  FIXTURES_DIR,
  fixtureOffer,
  fixtureProfile,
  loadFixture,
  type PostsFixture,
} from '@/lib/brand/fixtures';
import type { PlanResult } from '@/lib/posts/batch';
import { paragraphsOf } from '@/lib/posts/paragraphs';
import { POSTS_PROMPT_VERSION } from '@/lib/posts/prompt';
import { streamPlan } from '@/lib/posts/run';
import { seededRandom, setupLine } from '@/lib/posts/setup';
import { sentenceWords } from '@/lib/posts/variety';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const DEFAULT_SLUGS = ['sen', 'svarga'];
const args = process.argv.slice(2);
const record = args.includes('--record');
const withOffer = args.includes('--offer');
const replay = args.includes('--replay');
if (replay && record) {
  console.error('--replay makes no request: there is nothing to record.');
  process.exit(1);
}
// A replay never reads a site: the brand read's recording is empty.
const NO_BRAND_READ: Recording = {
  modelId: 'replay',
  promptVersion: 'replay',
  partials: [],
  final: {},
};
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
    // What docs/specs/posts/short-captions scores: paragraphs, length, the
    // longest sentence.
    const longest = Math.max(0, ...sentenceWords(post.caption));
    console.log(
      `     shape: ${paragraphsOf(post.caption).length} paragraphs · ${post.caption.length} chars · longest sentence ${longest} words`,
    );
    console.log(`     ${post.cta}`);
    console.log(`     ${post.hashtags.map((t) => `#${t}`).join(' ')}`);
    console.log(`     alt: ${post.altText}`);
    if (post.setup) console.log(`     set-up: ${setupLine(post.setup)}`);
    if (post.setup?.hook) console.log(`     hook: ${post.setup.hook}`);
    if (post.setup?.question) console.log(`     question: ${post.setup.question}`);
    console.log(`     image: ${post.imagePrompt}`);
    for (const flag of post.unchecked) console.log(`     ⚠ ${flag.kind}: ${flag.text}`);
    // The story text and its length as code counts it (docs/specs/posts/story-text).
    if (post.storyText) console.log(`     story (${post.storyText.length}): ${post.storyText}`);
    else console.log('     story: none');
    for (const flag of post.storyUnchecked ?? []) {
      console.log(`     ⚠ story ${flag.kind}: ${flag.text}`);
    }
  }
  for (const d of result.dropped) console.log(`  dropped ${d.field}: ${d.reason}`);
}

let made = 0;
for (const slug of slugs) {
  const dir = join(FIXTURES_DIR, slug);
  const started = Date.now();
  try {
    const profile = await fixtureProfile(dir);
    const fixture = replay ? loadFixture(dir) : null;
    const replayed = withOffer ? fixture?.postsOffer : fixture?.posts;
    if (replay && !replayed) {
      throw new Error(`no ${withOffer ? 'posts-offer.json' : 'posts.json'} to replay`);
    }
    let recording: Recording | null = null;
    const model = replayed
      ? replayTextModel(NO_BRAND_READ, { posts: replayed.recording })
      : recordingTextModel(
          geminiTextModel({ postsModelId: modelId }),
          { modelId, promptVersion: POSTS_PROMPT_VERSION },
          () => {},
          () => {},
          (r) => {
            recording = r;
          },
        );
    let result: PlanResult | null = null;
    let failed = '';
    let cause = '';
    const offer = withOffer ? fixtureOffer(profile) : undefined;
    if (offer) console.log(`\n${slug} · offer: ${JSON.stringify(offer)}`);
    for await (const line of streamPlan(
      { profile, recent: [], offer },
      {
        model,
        modelId: replayed?.modelId ?? modelId,
        random: seededRandom(withOffer ? `${slug}:offer` : slug),
        // The run's log says why a plan failed.
        log: (entry) => {
          cause = entry.error ?? '';
        },
      },
      new AbortController().signal,
    )) {
      if (line.type === 'error') failed = line.code;
      if (line.type === 'final') result = line.result;
    }
    // The run logs once its stream is done, after the error line.
    if (failed) throw new Error(cause ? `${failed}: ${cause}` : failed);
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
  `\nposts eval: ${made}/${slugs.length} made · prompt ${POSTS_PROMPT_VERSION} · model ${modelId}${replay ? ' · replayed, no request' : ''}`,
);
