import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { type Recording, replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { emojisIn } from '@/lib/posts/emoji';
import { ANSWER_PROMPT_VERSION } from '@/lib/questions/answer-prompt';
import { runAnswer } from '@/lib/questions/answer-run';
import { questionBodyFor } from '@/lib/questions/client';
import type { Guest } from '@/lib/questions/question';
import { flowerFor } from '@/lib/reviews/checks';
import { invitesIn } from '@/lib/reviews/notes';
import type { ScreenLocale } from '@/lib/reviews/reply';

// The made-up guests' questions recorded by `pnpm eval:answers --record`,
// replayed through code's building and checks: no network, no quota
// (docs/specs/questions/answer-drafts, "Prompt and eval", and
// docs/specs/reviews/better-replies-and-answers, "Prompt and eval").

type Fixture = {
  slug: string;
  business: string;
  locale: ScreenLocale;
  language: string;
  final: boolean;
  // The first-message box (docs/specs/questions/first-answer).
  first?: boolean;
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
// A message in these languages gets an answer in their script (answer-3
// answered Korean and Russian in English).
const SCRIPTS: Record<string, RegExp> = { ko: /\p{Script=Hangul}/u, ru: /\p{Script=Cyrillic}/u };
const STOP_BEFORE_EMOJI = /(?<!\.)\.\s*\p{Extended_Pictographic}/u;
// An emoji without its skin tone or variation selector.
const plainEmoji = (emoji: string) => emoji.replace(/[\u{1F3FB}-\u{1F3FF}️]/gu, '');
// Code moves the flower and drops the stop before an emoji: compare words only.
const plain = (text: string) =>
  text
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.$/, '');
const recordedCall = (fixture: Fixture) => {
  const final = fixture.recording?.final as { callToAction: { text: string } } | undefined;
  return plain(final?.callToAction.text ?? '');
};

describe('recorded answers', () => {
  test('every made-up question is recorded with the current prompt', () => {
    expect(fixtures).toHaveLength(10);
    for (const fixture of fixtures) {
      expect(fixture.recording?.promptVersion, fixture.slug).toBe(ANSWER_PROMPT_VERSION);
    }
  });

  test.each(fixtures)('$slug replays to a checked answer', async (fixture) => {
    const profile = await fixtureProfile(join(FIXTURES_DIR, fixture.business));
    const first = fixture.first ?? false;
    const body = questionBodyFor({ ...fixture, first, profile, avoid: null });
    const out = await runAnswer(
      body,
      'replay',
      { model: replayTextModel(noBrandRead, { answers: fixture.recording }) },
      new AbortController().signal,
    );
    if (!out.ok) throw new Error(out.code);
    const answer = out.response;
    const sex = SEX.includes(fixture.slug);
    expect(answer.questionLanguage.split('-')[0]).toBe(fixture.language);
    const script = SCRIPTS[fixture.language];
    if (script) expect(script.test(answer.answer.text), answer.answer.text).toBe(true);
    // The line on every question that mentions sex, and on none of the others.
    expect(answer.sexual).toBe(sex);
    if (fixture.slug === 'svarga-card-en') expect(answer.unanswered).toBe(true);
    // Uluwatu isn't among Svarga's areas: the team checks, nothing is promised
    // ("Only the areas the website lists").
    if (fixture.slug === 'svarga-uluwatu-en') {
      expect(answer.unanswered).toBe(true);
      const offer = answer.answer.text.split('\n\n').at(-1) ?? '';
      expect(offer, offer).not.toMatch(/uluwatu/i);
      // Not even as "where you are staying" (answer-4 did): an offer to come
      // to the guest names the areas Svarga covers.
      if (/\bcom(?:e|es|ing)\b[^.!?]*\byou\b/i.test(offer)) {
        expect(offer, offer).toMatch(/Canggu|Pererenan|Seminyak|Kerobokan/);
      }
      // The hours answer the guest's "open at 10pm?" (answer-6 left it out).
      expect(answer.answer.text, answer.answer.text).toMatch(/23[:.]00|11 ?p\.?m/i);
      for (const sentence of answer.answer.text.split(/(?<=[.!?])\s+|\n+/)) {
        if (/uluwatu/i.test(sentence)) expect(sentence, sentence).toMatch(/check|outside/i);
      }
    }
    // No price, duration or number the details don't hold.
    expect(answer.flags).toEqual([]);
    if (fixture.language === fixture.locale) expect(answer.answer.translation).toBeNull();

    // 😊 and the flower, the flower last, no stop before an emoji; none on sex.
    const flower = flowerFor(body.country);
    const texts = [answer.answer.text, answer.answer.translation].filter(
      (text): text is string => text !== null,
    );
    for (const text of texts) {
      expect(text, fixture.slug).not.toMatch(STOP_BEFORE_EMOJI);
      const emojis = emojisIn(text).map(plainEmoji);
      if (sex) {
        expect(emojis, fixture.slug).toEqual([]);
        continue;
      }
      for (const emoji of emojis)
        expect(['😊', flower], `${fixture.slug}: ${text}`).toContain(emoji);
      expect(new Set(emojis).size, `${fixture.slug}: ${text}`).toBe(emojis.length);
      expect(text.trimEnd().endsWith(flower), `${fixture.slug}: ${text}`).toBe(true);
    }
    // A friendly answer has its 😊 (the spec's "Success").
    if (!sex) expect(answer.answer.text, fixture.slug).toContain('😊');
    // Sen and Svarga go to their guests: no answer invites a guest to them.
    expect(invitesIn(answer.answer.text), answer.answer.text).toEqual([]);

    // The call to book ends a final answer, the gentle offer every other one,
    // unless the question mentions sex.
    const last = plain(answer.answer.text.split('\n\n').at(-1) ?? '');
    if (fixture.final || !sex) {
      expect(recordedCall(fixture), fixture.slug).not.toBe('');
      expect(last).toBe(recordedCall(fixture));
    } else if (recordedCall(fixture) !== '') {
      expect(plain(answer.answer.text)).not.toContain(recordedCall(fixture));
    }

    // A gentle offer asks nothing about where the guest stays (answer-6's did);
    // a final answer in English names the day when the guest hasn't said it.
    const offer = answer.answer.text.split('\n\n').at(-1) ?? '';
    if (!fixture.final) expect(offer, offer).not.toMatch(/\b(?:which area|where)\b/i);
    if (fixture.final && fixture.language === 'en' && !fixture.known.day) {
      expect(offer, offer).toMatch(/\bday\b/i);
    }

    // The website only for the guest who asked for photos.
    if (fixture.slug === 'svarga-photos-en') {
      // The address the profile was read from, without its trailing "/".
      const site = body.business.website?.replace(/\/+$/, '') ?? 'no website';
      for (const text of texts) expect(text).toContain(site);
    } else {
      expect(answer.answer.text).not.toContain('http');
    }
  });
});
