import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { type Recording, replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { runAnswer } from '@/lib/questions/answer-run';
import { questionBodyFor } from '@/lib/questions/client';
import type { Guest } from '@/lib/questions/question';
import type { ScreenLocale } from '@/lib/reviews/reply';

// The made-up guests' questions recorded by `pnpm eval:answers --record`,
// replayed through code's building and checks: no network, no quota
// (docs/specs/questions/answer-drafts, "Prompt and eval").

type Fixture = {
  slug: string;
  business: string;
  locale: ScreenLocale;
  language: string;
  final: boolean;
  known: Guest;
  question: string;
  recording?: Recording;
};

const DIR = 'tests/fixtures/questions';
const fixtures: Fixture[] = readdirSync(DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    slug: file.replace(/\.json$/, ''),
    ...JSON.parse(readFileSync(join(DIR, file), 'utf8')),
  }));
// The three that ask for sex; the Vietnamese one holds no word from code's list.
const SEX = ['sen-happy-ending-en', 'sen-special-vi', 'svarga-intim-ru'];
const noBrandRead = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };
// Code replaces flowers, and takes every emoji out of an answer about sex.
const plain = (text: string) =>
  text
    .replace(/\p{Extended_Pictographic}|\uFE0F/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
const recordedCall = (fixture: Fixture) => {
  const final = fixture.recording?.final as { callToAction: { text: string } } | undefined;
  return plain(final?.callToAction.text ?? '');
};

describe('recorded answers', () => {
  test('every made-up question has its recording', () => {
    expect(fixtures).toHaveLength(8);
    expect(fixtures.filter((f) => !f.recording).map((f) => f.slug)).toEqual([]);
  });

  test.each(fixtures)('$slug replays to a checked answer', async (fixture) => {
    const profile = await fixtureProfile(join(FIXTURES_DIR, fixture.business));
    const out = await runAnswer(
      questionBodyFor({ ...fixture, profile, avoid: null }),
      'replay',
      { model: replayTextModel(noBrandRead, { answers: fixture.recording }) },
      new AbortController().signal,
    );
    if (!out.ok) throw new Error(out.code);
    const answer = out.response;
    expect(answer.questionLanguage.split('-')[0]).toBe(fixture.language);
    // The line on every question that mentions sex, and on none of the others.
    expect(answer.sexual).toBe(SEX.includes(fixture.slug));
    if (fixture.slug === 'svarga-card-en') expect(answer.unanswered).toBe(true);
    // No price, duration or number the details don't hold.
    expect(answer.flags).toEqual([]);
    if (fixture.language === fixture.locale) expect(answer.answer.translation).toBeNull();
    // The recorded call to book ends each final answer; the others have none.
    if (fixture.final) {
      expect(recordedCall(fixture)).not.toBe('');
      expect(plain(answer.answer.text.split('\n\n').at(-1) ?? '')).toBe(recordedCall(fixture));
    } else expect(recordedCall(fixture)).toBe('');
  });
});
