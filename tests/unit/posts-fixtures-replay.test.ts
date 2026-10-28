import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureOffer, fixtureProfile, loadFixture } from '@/lib/brand/fixtures';
import type { PlanResult } from '@/lib/posts/batch';
import { emojisIn, FLOWERS } from '@/lib/posts/emoji';
import { streamPlan } from '@/lib/posts/run';
import { seededRandom } from '@/lib/posts/setup';

// The post plans recorded by `pnpm eval:posts --record`, replayed through the
// real checks: no network, no quota.

const SLUGS = ['sen', 'svarga', 'karsa-spa', 'serenity-bali', 'orient-spa'];
const noBrandRead = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };

describe('fixture profiles', () => {
  test("sen's profile carries its recorded search terms", async () => {
    const profile = await fixtureProfile(join(FIXTURES_DIR, 'sen'));
    expect(profile.name.value).toMatch(/Sen/);
    expect(profile.essence.searchTerms.length).toBeGreaterThan(0);
  });
});

describe('recorded post plans', () => {
  test('every slug has a recording', () => {
    expect(SLUGS.filter((slug) => !existsSync(join(FIXTURES_DIR, slug, 'posts.json')))).toEqual([]);
  });

  // About 3 s each alone (karsa-spa); the default 5 s is too tight when the
  // whole suite runs at once.
  test.each(SLUGS)('%s replays to a checked batch', { timeout: 20_000 }, async (slug) => {
    const dir = join(FIXTURES_DIR, slug);
    const fixture = loadFixture(dir);
    if (!fixture.posts) throw new Error(`no posts.json for ${slug}`);
    const profile = await fixtureProfile(dir);
    const model = replayTextModel(noBrandRead, { posts: fixture.posts.recording });
    let final = null;
    for await (const line of streamPlan(
      { profile, recent: [] },
      { model, random: seededRandom(slug) },
      new AbortController().signal,
    )) {
      if (line.type === 'error') throw new Error(line.code);
      if (line.type === 'final') final = line.result;
    }
    if (!final) throw new Error('no final line');
    expect(final.posts.length).toBeGreaterThanOrEqual(1);
    expect(final.posts.length).toBeLessThanOrEqual(6);
    for (const post of final.posts) {
      if (profile.contact.whatsapp) expect(post.cta).toMatch(/^Book on WhatsApp: /);
      expect(post.hashtags.length).toBeGreaterThanOrEqual(1);
      expect(post.hashtags.length).toBeLessThanOrEqual(5);
      for (const tag of post.hashtags) expect(tag).toMatch(/^[a-z0-9]+$/);
    }
    if (profile.highlights.length === 0 && !profile.essence.promise) {
      expect(final.posts.some((p) => p.type === 'proof')).toBe(false);
    }
  });
});

// The offer plans recorded by `pnpm eval:posts sen svarga --offer --record`
// (docs/specs/posts/special-offer, "Checked with the real model").
describe('recorded offer plans', () => {
  test.each(['sen', 'svarga'])('%s replays with its offer', { timeout: 20_000 }, async (slug) => {
    const dir = join(FIXTURES_DIR, slug);
    const fixture = loadFixture(dir);
    if (!fixture.postsOffer) throw new Error(`no posts-offer.json for ${slug}`);
    const profile = await fixtureProfile(dir);
    const offer = fixtureOffer(profile);
    const model = replayTextModel(noBrandRead, { posts: fixture.postsOffer.recording });
    let final = null;
    for await (const line of streamPlan(
      { profile, recent: [], offer },
      { model, random: seededRandom(`${slug}:offer`) },
      new AbortController().signal,
    )) {
      if (line.type === 'error') throw new Error(line.code);
      if (line.type === 'final') final = line.result;
    }
    if (!final) throw new Error('no final line');
    expect(final.offer).toEqual(offer);
    const carrying = final.posts.filter((p) => p.offer);
    expect(carrying.length).toBeGreaterThanOrEqual(1);
    expect(carrying.length).toBeLessThanOrEqual(2);
  });
});

// Sen's and Svarga's plans (docs/specs/posts/story-text, "Tests and
// evaluation"), re-recorded with posts-7 but for Svarga's offer plan, still
// posts-6 (docs/specs/posts/day-and-night-images, journal): every post has a
// story text that fits, and every text holds flowers and no other emoji.
describe('recorded story texts and flowers', () => {
  const flowers = (text: string) =>
    emojisIn(text).filter((e) => (FLOWERS as readonly string[]).includes(e)).length;
  const others = (text: string) =>
    emojisIn(text).filter((e) => !(FLOWERS as readonly string[]).includes(e));

  async function replay(slug: string, withOffer: boolean): Promise<PlanResult> {
    const dir = join(FIXTURES_DIR, slug);
    const fixture = loadFixture(dir);
    const recording = withOffer ? fixture.postsOffer : fixture.posts;
    if (!recording) throw new Error(`no recording for ${slug}`);
    const profile = await fixtureProfile(dir);
    const offer = withOffer ? fixtureOffer(profile) : undefined;
    const model = replayTextModel(noBrandRead, { posts: recording.recording });
    for await (const line of streamPlan(
      { profile, recent: [], ...(offer ? { offer } : {}) },
      { model, random: seededRandom(withOffer ? `${slug}:offer` : slug) },
      new AbortController().signal,
    )) {
      if (line.type === 'error') throw new Error(line.code);
      if (line.type === 'final') return line.result;
    }
    throw new Error('no final line');
  }

  test.each([
    ['sen', false],
    ['svarga', false],
    ['sen', true],
    ['svarga', true],
  ] as const)('%s (offer: %s)', { timeout: 20_000 }, async (slug, withOffer) => {
    const result = await replay(slug, withOffer);
    for (const post of result.posts) {
      expect(post.storyText).toBeTruthy();
      const story = post.storyText ?? '';
      expect(story.length).toBeLessThanOrEqual(120);
      expect(flowers(story)).toBeGreaterThanOrEqual(1);
      expect(flowers(story)).toBeLessThanOrEqual(2);
      expect(others(story)).toEqual([]);
      // No call to action is left (amended 2026-10-27).
      expect(story).not.toMatch(/\b(book|whatsapp|dm|link in bio)\b/i);
      expect(flowers(post.caption)).toBeGreaterThanOrEqual(1);
      expect(flowers(post.caption)).toBeLessThanOrEqual(3);
      expect(others(post.caption)).toEqual([]);
      // An offer post's story text is its offer line: the caption's first sentence.
      const offerLine = post.caption.match(/^[^\n]*?[.!?](?=\s|$)/)?.[0] ?? '';
      if (post.offer) expect(story.startsWith(offerLine)).toBe(true);
    }
  });
});
