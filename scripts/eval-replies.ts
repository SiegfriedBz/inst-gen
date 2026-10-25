// Writes the two replies to made-up reviews with the real Flash-Lite, and
// prints each answer after code's checks for the developer to read back
// (docs/specs/reviews/reply-drafts, "Prompt and eval"). Spends 1 Flash-Lite
// request per review from the app's daily pool. Never on a pilot day.
//
// Usage: pnpm eval:replies [slug…] [--record]
// --record saves the call in tests/fixtures/reviews/<slug>.json.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Recording, recordingTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { replyBodyFor } from '@/lib/reviews/client';
import { fillName } from '@/lib/reviews/name';
import type { ScreenLocale } from '@/lib/reviews/reply';
import { REPLY_PROMPT_VERSION } from '@/lib/reviews/reply-prompt';
import { formatReplyLog, runReply } from '@/lib/reviews/reply-run';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const DIR = 'tests/fixtures/reviews';
const args = process.argv.slice(2);
const record = args.includes('--record');
const wanted = args.filter((a) => !a.startsWith('--'));
const slugs =
  wanted.length > 0
    ? wanted
    : readdirSync(DIR)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/, ''));

type ReviewFixture = {
  business: string;
  locale: ScreenLocale;
  name: string;
  review: string;
  recording?: Recording;
};

let written = 0;
for (const slug of slugs) {
  const file = join(DIR, `${slug}.json`);
  try {
    const fixture = JSON.parse(readFileSync(file, 'utf8')) as ReviewFixture;
    const profile = await fixtureProfile(join(FIXTURES_DIR, fixture.business));
    let recording: Recording | null = null;
    const model = recordingTextModel(
      geminiTextModel(),
      { modelId: TEXT_MODELS.light, promptVersion: REPLY_PROMPT_VERSION },
      () => {},
      () => {},
      () => {},
      () => {},
      (r) => {
        recording = r;
      },
    );
    const out = await runReply(
      replyBodyFor({ ...fixture, profile, avoid: null }),
      'eval',
      { model, log: (entry) => console.log(`    ${formatReplyLog(entry)}`) },
      new AbortController().signal,
    );
    if (!out.ok) {
      console.log(`${slug.padEnd(18)}${out.code}`);
      continue;
    }
    written++;
    const a = out.response;
    const show = (text: string | null) => (text === null ? '-' : fillName(text, fixture.name));
    console.log(`${slug.padEnd(18)}${a.reviewLanguage}${a.abusive ? ' · abusive' : ''}`);
    console.log(`  review:  ${fixture.review}`);
    console.log(`  in ${fixture.locale}:   ${show(a.reviewTranslation)}`);
    console.log(`  short:   ${show(a.short.text)}`);
    console.log(`           ${show(a.short.translation)}`);
    console.log(`  warm:    ${show(a.warm.text)}`);
    console.log(`           ${show(a.warm.translation)}`);
    if (record && recording) {
      writeFileSync(file, `${JSON.stringify({ ...fixture, recording }, null, 2)}\n`);
    }
  } catch (error) {
    console.log(
      `${slug.padEnd(18)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `replies: ${written}/${slugs.length} · prompt ${REPLY_PROMPT_VERSION} · model ${TEXT_MODELS.light}`,
);
