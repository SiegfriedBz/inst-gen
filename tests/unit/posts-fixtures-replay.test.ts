import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureProfile, loadFixture } from '@/lib/brand/fixtures';
import { streamPlan } from '@/lib/posts/run';

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
      { model },
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
