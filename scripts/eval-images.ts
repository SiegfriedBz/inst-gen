// Makes the six images of saved fixtures with the real image model, and
// writes each story and post crop under .superpowers/eval-images/<slug>/,
// outside git, for the developer to judge against the spec's rubric
// (docs/specs/posts/generate-images, "Tests and evaluation"). The posts come
// from the fixture's recorded plan, so no text call is made.
// ⚠️ It spends about $0.30 of the prepaid image balance per fixture. A slug
// is required, so it never spends by accident.
//
// Usage: pnpm eval:images <slug…>
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { geminiImageModel, IMAGE_MODEL, IMAGE_USD } from '@/lib/ai/image-model';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureProfile, loadFixture } from '@/lib/brand/fixtures';
import type { Post } from '@/lib/posts/batch';
import type { ImageLog } from '@/lib/posts/image-log';
import { IMAGE_PROMPT_VERSION } from '@/lib/posts/image-prompt';
import { makePostImage } from '@/lib/posts/image-run';
import { streamPlan } from '@/lib/posts/run';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const slugs = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (slugs.length === 0) {
  console.error('Usage: pnpm eval:images <slug…> (about $0.30 per slug)');
  process.exit(1);
}
const apiKey = process.env.GOOGLE_IMAGE_API_KEY;
if (!apiKey) {
  console.error('GOOGLE_IMAGE_API_KEY is not set (.env.local)');
  process.exit(1);
}
const model = geminiImageModel(apiKey);
const OUT = join('.superpowers', 'eval-images');

async function recordedPosts(slug: string): Promise<Post[]> {
  const dir = join(FIXTURES_DIR, slug);
  const fixture = loadFixture(dir);
  if (!fixture.posts) throw new Error(`no posts.json for ${slug}`);
  const profile = await fixtureProfile(dir);
  const text = replayTextModel(fixture.posts.recording, { posts: fixture.posts.recording });
  for await (const line of streamPlan(
    { profile, recent: [] },
    { model: text },
    new AbortController().signal,
  )) {
    if (line.type === 'error') throw new Error(line.code);
    if (line.type === 'final') return line.result.posts;
  }
  throw new Error('no final line');
}

let spent = 0;
for (const slug of slugs) {
  try {
    const posts = await recordedPosts(slug);
    const dir = join(OUT, slug);
    mkdirSync(dir, { recursive: true });
    const started = Date.now();
    const logs: ImageLog[] = [];
    const outcomes = await Promise.all(
      posts.map((post) =>
        makePostImage(
          { postId: post.id, imagePrompt: post.imagePrompt, scene: post.scene },
          'eval',
          { model, log: (entry) => logs.push(entry) },
          new AbortController().signal,
        ),
      ),
    );
    console.log(`\n${slug} · ${Date.now() - started} ms for ${posts.length} images`);
    for (const [i, out] of outcomes.entries()) {
      const log = logs.find((l) => l.postId === posts[i].id);
      spent += log?.usd ?? 0;
      if (out.ok) {
        writeFileSync(join(dir, `${i + 1}-story.jpg`), Buffer.from(out.response.story, 'base64'));
        writeFileSync(join(dir, `${i + 1}-post.jpg`), Buffer.from(out.response.post, 'base64'));
      }
      console.log(
        `  ${i + 1}. ${posts[i].scene.padEnd(9)} ${String(log?.modelMs ?? '-').padStart(6)} ms  ` +
          `in ${log?.size ?? '-'}  story ${log?.storyBytes ?? '-'} B  post ${log?.postBytes ?? '-'} B  ` +
          `${out.ok ? 'ok' : out.code}`,
      );
      console.log(`     ${posts[i].imagePrompt}`);
    }
  } catch (error) {
    console.log(
      `${slug.padEnd(24)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `\nimages eval: ${slugs.length} fixture(s) · prompt ${IMAGE_PROMPT_VERSION} · model ${IMAGE_MODEL} · about $${spent.toFixed(2)} spent ($${IMAGE_USD} an image)`,
);
