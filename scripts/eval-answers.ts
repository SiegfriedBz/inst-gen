// Answers the made-up guests' questions in tests/fixtures/questions/ (all, by
// default) with the real Flash-Lite, and prints each answer after code's
// building and checks, for reading back (docs/specs/questions/answer-drafts,
// "Prompt and eval"). --record saves each call for the replay test.
// ⚠️ 1 Flash-Lite request per question from the app's daily pool.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Recording, recordingTextModel } from '@/lib/ai/replay';
import { geminiTextModel, TEXT_MODELS } from '@/lib/ai/text-model';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { ANSWER_PROMPT_VERSION } from '@/lib/questions/answer-prompt';
import { formatAnswerLog, runAnswer } from '@/lib/questions/answer-run';
import { questionBodyFor } from '@/lib/questions/client';
import type { Guest } from '@/lib/questions/question';
import type { ScreenLocale } from '@/lib/reviews/reply';

if (existsSync('.env.local')) process.loadEnvFile('.env.local');

const DIR = 'tests/fixtures/questions';
const args = process.argv.slice(2);
const record = args.includes('--record');
const wanted = args.filter((a) => !a.startsWith('--'));
const slugs =
  wanted.length > 0
    ? wanted
    : readdirSync(DIR)
        .filter((file) => file.endsWith('.json'))
        .map((file) => file.replace(/\.json$/, ''));

export type QuestionFixture = {
  business: string;
  locale: ScreenLocale;
  // The question's language, for the replay test.
  language: string;
  final: boolean;
  known: Guest;
  question: string;
  recording?: Recording;
};

let written = 0;
for (const slug of slugs) {
  const file = join(DIR, `${slug}.json`);
  try {
    const fixture = JSON.parse(readFileSync(file, 'utf8')) as QuestionFixture;
    const profile = await fixtureProfile(join(FIXTURES_DIR, fixture.business));
    let recording: Recording | null = null;
    const model = recordingTextModel(
      geminiTextModel(),
      { modelId: TEXT_MODELS.light, promptVersion: ANSWER_PROMPT_VERSION },
      () => {},
      () => {},
      () => {},
      () => {},
      () => {},
      (r) => {
        recording = r;
      },
    );
    const out = await runAnswer(
      questionBodyFor({ ...fixture, profile, avoid: null }),
      'eval',
      { model, log: (entry) => console.log(`    ${formatAnswerLog(entry)}`) },
      new AbortController().signal,
    );
    if (!out.ok) {
      console.log(`${slug.padEnd(22)}${out.code}`);
      continue;
    }
    written++;
    const a = out.response;
    const notes = [
      a.sexual && 'sex',
      a.unanswered && 'unanswered',
      fixture.final && 'final',
    ].filter(Boolean);
    console.log(
      `${slug.padEnd(22)}${a.questionLanguage}${notes.length ? ` · ${notes.join(' · ')}` : ''}`,
    );
    console.log(`  question: ${fixture.question}`);
    console.log(`  in ${fixture.locale}:    ${a.questionTranslation ?? '-'}`);
    console.log(a.answer.text.replace(/^/gm, '  | '));
    if (a.answer.translation) console.log(a.answer.translation.replace(/^/gm, '  > '));
    console.log(`  told:     ${JSON.stringify(a.guest)}`);
    for (const flag of a.flags) console.log(`  ⚠ ${flag.kind}: ${flag.text}`);
    if (record && recording) {
      writeFileSync(file, `${JSON.stringify({ ...fixture, recording }, null, 2)}\n`);
    }
  } catch (error) {
    console.log(
      `${slug.padEnd(22)}ERROR ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

console.log(
  `answers: ${written}/${slugs.length} · prompt ${ANSWER_PROMPT_VERSION} · model ${TEXT_MODELS.light}`,
);
