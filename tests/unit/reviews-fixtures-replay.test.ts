import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Recording } from '@/lib/ai/replay';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { emojisIn } from '@/lib/posts/emoji';
import { flowerFor } from '@/lib/reviews/checks';
import { replyBodyFor } from '@/lib/reviews/client';
import { invitesIn } from '@/lib/reviews/notes';
import type { ScreenLocale } from '@/lib/reviews/reply';
import { REPLY_PROMPT_VERSION } from '@/lib/reviews/reply-prompt';
import { runReply } from '@/lib/reviews/reply-run';

// The made-up reviews, replayed from `pnpm eval:replies --record`
// (docs/specs/reviews/reply-drafts, "Prompt and eval", and
// docs/specs/reviews/better-replies-and-answers, "Prompt and eval").
const DIR = 'tests/fixtures/reviews';

type ReviewFixture = {
  business: 'sen' | 'svarga';
  locale: ScreenLocale;
  name: string;
  review: string;
  recording?: Recording;
};

const fixtures = readdirSync(DIR)
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({
    slug: file.replace(/\.json$/, ''),
    ...(JSON.parse(readFileSync(join(DIR, file), 'utf8')) as ReviewFixture),
  }));

async function replay(slug: string) {
  const fixture = fixtures.find((f) => f.slug === slug);
  if (!fixture?.recording) throw new Error(`${slug} has no recording`);
  const profile = await fixtureProfile(join(FIXTURES_DIR, fixture.business));
  const body = replyBodyFor({ ...fixture, profile, avoid: null });
  const out = await runReply(
    body,
    'replay',
    { model: replayTextModel(fixture.recording, { replies: fixture.recording }) },
    new AbortController().signal,
  );
  if (!out.ok) throw new Error(`${slug}: ${out.code}`);
  const complaint = (fixture.recording.final as { complaint?: boolean }).complaint === true;
  return { answer: out.response, body, fixture, complaint };
}

const EMOJI = /\p{Extended_Pictographic}/u;
// A review in these languages gets replies in their script (reply-3 answered
// a Russian review in Indonesian).
const SCRIPTS: Record<string, RegExp> = { ko: /\p{Script=Hangul}/u, ru: /\p{Script=Cyrillic}/u };
const STOP_BEFORE_EMOJI = /(?<!\.)\.\s*\p{Extended_Pictographic}/u;
// An emoji without its skin tone or variation selector.
const plain = (emoji: string) => emoji.replace(/[\u{1F3FB}-\u{1F3FF}️]/gu, '');
// Sentences end on a stop or on an emoji in its place.
const sentenceCount = (text: string) =>
  text.split(/[.!?]+|\p{Extended_Pictographic}/u).filter((s) => /\p{L}/u.test(s)).length;

describe('recorded replies', () => {
  test('all nine reviews are recorded with the current prompt', () => {
    expect(fixtures).toHaveLength(9);
    for (const fixture of fixtures) {
      expect(fixture.recording?.promptVersion, fixture.slug).toBe(REPLY_PROMPT_VERSION);
    }
  });

  test.each(fixtures.map((f) => f.slug))('%s passes code checks', async (slug) => {
    const { answer, body, fixture, complaint } = await replay(slug);
    const flower = flowerFor(body.country);
    const allowed = answer.abusive ? [] : complaint ? ['🙏', flower] : ['🙏', '😊', flower];
    const texts = [
      answer.short.text,
      answer.warm.text,
      answer.short.translation,
      answer.warm.translation,
    ].filter((text): text is string => text !== null);
    for (const text of texts) {
      expect(text, slug).not.toMatch(STOP_BEFORE_EMOJI);
      const emojis = emojisIn(text).map(plain);
      for (const emoji of emojis) expect(allowed, `${slug}: ${text}`).toContain(emoji);
      expect(new Set(emojis).size, `${slug}: ${text}`).toBe(emojis.length);
      if (!answer.abusive) expect(text.trimEnd().endsWith(flower), `${slug}: ${text}`).toBe(true);
    }
    const script = SCRIPTS[answer.reviewLanguage.split('-')[0]];
    for (const reply of [answer.short.text, answer.warm.text]) {
      if (script) expect(script.test(reply), `${slug}: ${reply}`).toBe(true);
      if (fixture.name) expect(reply, slug).toContain('{name}');
      else expect(reply, slug).not.toContain('{name}');
      // Sen and Svarga go to their guests: no reply invites a guest to them.
      expect(body.business.goesToGuests).toBe(true);
      expect(invitesIn(reply), `${slug}: ${reply}`).toEqual([]);
      // A friendly reply has its 😊 (the spec's "Success").
      if (!answer.abusive && !complaint) expect(reply, slug).toContain('😊');
    }
    if (fixture.business === 'svarga') {
      expect(JSON.stringify(answer)).not.toContain('🪷');
    }
  });

  test('a review of a few words gets three sentences, no treatment and no "amazing massage"', async () => {
    const { answer, body } = await replay('svarga-short-en');
    for (const reply of [answer.short.text, answer.warm.text]) {
      expect(reply.toLowerCase()).not.toContain('amazing massage');
      for (const name of body.business.offerings) {
        expect(reply.toLowerCase()).not.toContain(name.toLowerCase());
      }
      expect(sentenceCount(reply), reply).toBe(3);
    }
  });

  test('a review in the screen language gets no translation', async () => {
    const { answer } = await replay('sen-vi');
    expect(answer.reviewTranslation).toBeNull();
    expect(answer.short.translation).toBeNull();
    expect(answer.warm.translation).toBeNull();
  });

  test('a foreign review is translated for the owner', async () => {
    const { answer } = await replay('svarga-ru');
    expect(answer.reviewLanguage).toBe('ru');
    expect(answer.reviewTranslation).not.toBeNull();
    expect(answer.short.translation).not.toBeNull();
  });

  test('the abusive review is flagged, with no emoji', async () => {
    const { answer } = await replay('sen-abusive');
    expect(answer.abusive).toBe(true);
    expect(EMOJI.test(answer.short.text)).toBe(false);
    expect(EMOJI.test(answer.warm.text)).toBe(false);
  });
});
