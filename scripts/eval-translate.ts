// Translates the first recorded caption of fixtures with the real Flash-Lite,
// and prints the caption and its translation for the developer to read back
// for added or lost facts (docs/specs/posts/editor-download, "Tests and
// evaluation"). Spends 1 Flash-Lite request per pair from the app's daily
// pool. Never on a pilot day.
//
// Usage: pnpm eval:translate [slug:locale…] [--record]
// --record writes tests/fixtures/sites/<slug>/translate-<locale>.json.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Recording, recordingTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import { FIXTURES_DIR } from '@/lib/brand/fixtures';
import type { ModelPostPlan } from '@/lib/posts/batch';
import { TRANSLATE_LOCALES, type TranslateLocale } from '@/lib/posts/translate';
import { TRANSLATE_PROMPT_VERSION } from '@/lib/posts/translate-prompt';
import { formatTranslateLog, runTranslate } from '@/lib/posts/translate-run';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const DEFAULT_PAIRS = ['sen:vi', 'svarga:id'];
const args = process.argv.slice(2);
const record = args.includes('--record');
const wanted = args.filter((a) => !a.startsWith('--'));
const pairs = wanted.length > 0 ? wanted : DEFAULT_PAIRS;

let translated = 0;
for (const pair of pairs) {
  const [slug, locale] = pair.split(':');
  if (!(TRANSLATE_LOCALES as readonly string[]).includes(locale)) {
    console.log(`${pair.padEnd(16)}skipped: locale must be id or vi`);
    continue;
  }
  const dir = join(FIXTURES_DIR, slug);
  try {
    const posts = JSON.parse(readFileSync(join(dir, 'posts.json'), 'utf8')) as {
      recording: Recording;
    };
    const caption = (posts.recording.final as ModelPostPlan).posts[0].caption;
    let recording: Recording | null = null;
    const out = await runTranslate(
      { text: caption, locale: locale as TranslateLocale },
      'eval',
      {
        model: recordingTextModel(
          geminiTextModel(),
          { modelId: TEXT_MODELS.light, promptVersion: TRANSLATE_PROMPT_VERSION },
          () => {},
          () => {},
          () => {},
          (r) => {
            recording = r;
          },
        ),
        log: (entry) => console.log(`    ${formatTranslateLog(entry)}`),
      },
      new AbortController().signal,
    );
    if (!out.ok) {
      console.log(`${pair.padEnd(16)}${out.code}`);
      continue;
    }
    translated++;
    console.log(`${pair.padEnd(16)}caption:     ${caption}`);
    console.log(`${''.padEnd(16)}translation: ${out.response.text}`);
    if (record && recording) {
      const saved = { ...(recording as Recording), caption };
      writeFileSync(join(dir, `translate-${locale}.json`), `${JSON.stringify(saved, null, 2)}\n`);
    }
  } catch (error) {
    console.log(
      `${pair.padEnd(16)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `translations: ${translated}/${pairs.length} · prompt ${TRANSLATE_PROMPT_VERSION} · model ${TEXT_MODELS.light}`,
);
