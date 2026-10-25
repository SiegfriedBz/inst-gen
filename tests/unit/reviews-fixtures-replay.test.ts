import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import type { Recording } from '@/lib/ai/replay';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureProfile } from '@/lib/brand/fixtures';
import { replyBodyFor } from '@/lib/reviews/client';
import type { ScreenLocale } from '@/lib/reviews/reply';
import { REPLY_PROMPT_VERSION } from '@/lib/reviews/reply-prompt';
import { runReply } from '@/lib/reviews/reply-run';

// The made-up reviews, replayed from `pnpm eval:replies --record`
// (docs/specs/reviews/reply-drafts, "Prompt and eval").
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
  return out.response;
}

const EMOJI = /\p{Extended_Pictographic}/u;

describe('recorded replies', () => {
  test('all seven reviews are recorded with the current prompt', () => {
    expect(fixtures).toHaveLength(7);
    for (const fixture of fixtures) {
      expect(fixture.recording?.promptVersion, fixture.slug).toBe(REPLY_PROMPT_VERSION);
    }
  });

  test.each(fixtures.map((f) => f.slug))('%s passes code checks', async (slug) => {
    const fixture = fixtures.find((f) => f.slug === slug);
    const answer = await replay(slug);
    for (const reply of [answer.short.text, answer.warm.text]) {
      if (fixture?.name) expect(reply, slug).toContain('{name}');
      else expect(reply, slug).not.toContain('{name}');
    }
    if (fixture?.business === 'svarga') {
      expect(JSON.stringify(answer)).not.toContain('🪷');
    }
  });

  test('a review in the screen language gets no translation', async () => {
    const answer = await replay('sen-vi');
    expect(answer.reviewTranslation).toBeNull();
    expect(answer.short.translation).toBeNull();
    expect(answer.warm.translation).toBeNull();
  });

  test('a foreign review is translated for the owner', async () => {
    const answer = await replay('svarga-ru');
    expect(answer.reviewLanguage).toBe('ru');
    expect(answer.reviewTranslation).not.toBeNull();
    expect(answer.short.translation).not.toBeNull();
  });

  test('the abusive review is flagged, with no emoji', async () => {
    const answer = await replay('sen-abusive');
    expect(answer.abusive).toBe(true);
    expect(EMOJI.test(answer.short.text)).toBe(false);
    expect(EMOJI.test(answer.warm.text)).toBe(false);
  });
});
