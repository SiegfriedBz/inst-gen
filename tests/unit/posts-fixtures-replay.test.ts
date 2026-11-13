import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { FIXTURES_DIR, fixtureOffer, fixtureProfile, loadFixture } from '@/lib/brand/fixtures';
import type { PlanResult } from '@/lib/posts/batch';
import { emojisIn, FLOWERS } from '@/lib/posts/emoji';
import { dropForeignTags } from '@/lib/posts/foreign-tags';
import { offerLine, offerTreatment } from '@/lib/posts/offer-line';
import { paragraphsOf } from '@/lib/posts/paragraphs';
import { streamNewTexts, streamPlan } from '@/lib/posts/run';
import { type BodyPart, seededRandom } from '@/lib/posts/setup';
import { repeatRecords } from '@/lib/posts/variety';

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
    // Recorded as six (posts-11); an attempt keeps two (docs/specs/posts/two-suggestions).
    expect(final.posts.length).toBeLessThanOrEqual(2);
    for (const post of final.posts) {
      if (profile.contact.whatsapp) expect(post.cta).toMatch(/^Book on WhatsApp: /);
      expect(post.hashtags.length).toBeGreaterThanOrEqual(1);
      expect(post.hashtags.length).toBeLessThanOrEqual(5);
      for (const tag of post.hashtags) expect(tag).toMatch(/^[a-z0-9]+$/);
      // No town of another country (docs/specs/posts/marketing-copy).
      expect(dropForeignTags(post.hashtags, profile).dropped).toEqual([]);
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

// A currency next to a number, or a number with k: "IDR 250k", "VND 500k".
const STOP_BEFORE_EMOJI = /(?<!\.)\.\s*\p{Extended_Pictographic}/u;
const PRICE = /(?:IDR|VND|USD|Rp|đ|\$)\s?\d|\d[\d.,]*\s?(?:k|VND|IDR|USD|đ)\b/i;

// Sen's and Svarga's plans (docs/specs/posts/story-text, "Tests and
// evaluation"), all four on posts-11 (docs/specs/posts/day-and-night-copy).
// Every post has a story text that fits, and every text holds flowers and no
// other emoji; no two captions end on the same sentence.
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
    expect(repeatRecords(result.posts).filter((d) => d.reason.startsWith('last sentence'))).toEqual(
      [],
    );
    // Every hook is a question, an offer post's too, right after its line
    // (docs/specs/posts/short-captions, amended 2026-11-10 and 2026-11-12).
    expect(
      result.dropped.filter(
        (d) =>
          d.reason.endsWith('hook is no question') ||
          d.reason.endsWith('no question after the offer line'),
      ),
    ).toEqual([]);
    for (const post of result.posts) {
      // A story text that only asked to book went whole, and code says so
      // (docs/specs/posts/story-text): Svarga's posts-15 plan has one
      // (docs/specs/posts/short-captions, journal).
      if (!post.storyText) {
        expect(result.dropped).toContainEqual({
          field: 'story',
          reason: `${post.id}: no story text`,
        });
      }
      const story = post.storyText ?? '';
      expect(story.length).toBeLessThanOrEqual(120);
      // Two flowers in a caption, one in a story text (docs/specs/posts/short-captions,
      // amended 2026-11-10).
      if (story) expect(flowers(story)).toBe(1);
      expect(others(story)).toEqual([]);
      // No call to action is left (amended 2026-10-27).
      expect(story).not.toMatch(/\b(book|whatsapp|dm|link in bio)\b/i);
      expect(flowers(post.caption)).toBe(2);
      expect(others(post.caption)).toEqual([]);
      // No stop right before an emoji (docs/specs/posts/day-and-night-copy).
      expect(post.caption).not.toMatch(STOP_BEFORE_EMOJI);
      // The hook alone on its first line; one over 125 characters is flagged
      // (docs/specs/posts/marketing-copy, amended 2026-11-08).
      const hook = post.caption.split('\n')[0];
      if (hook.length > 125) expect(post.unchecked.map((f) => f.kind)).toContain('firstLine');
      expect(hook.match(/[.!?](?=\s|$)/g)?.length ?? 0).toBeLessThanOrEqual(1);
      expect(story).not.toMatch(STOP_BEFORE_EMOJI);
      // An offer post's first paragraph is its line, and its story text is
      // that line and a flower (docs/specs/posts/offer-line-first; first again
      // since docs/specs/posts/short-captions was amended 2026-11-12).
      if (post.offer && result.offer) {
        const treatment = offerTreatment(result.offer, post.setup?.treatment, post.caption);
        const line = offerLine(result.offer, treatment ?? '').replace(/\.$/, '');
        expect(paragraphsOf(post.caption)[0]?.startsWith(line)).toBe(true);
        expect(story.startsWith(line)).toBe(true);
        expect(flowers(story.slice(line.length))).toBe(1);
        expect(story.slice(line.length).trim()).toMatch(/^\p{Extended_Pictographic}$/u);
        // The offer's end before WhatsApp (docs/specs/posts/marketing-copy).
        expect(post.cta.startsWith(`Offer ends ${result.offer.lastDay}. Book on WhatsApp: `)).toBe(
          true,
        );
      }
      // At most three paragraphs, the hook counted
      // (docs/specs/posts/short-captions).
      expect(paragraphsOf(post.caption).length).toBeLessThanOrEqual(3);
      // Never a price, in any caption or story text
      // (docs/specs/posts/two-suggestions).
      expect(post.caption).not.toMatch(PRICE);
      expect(story).not.toMatch(PRICE);
    }
  });
});

// The words for each part of the body an image shows (lib/posts/setup.ts);
// "whole body" names none in particular.
const PART_WORDS: Partial<Record<BodyPart, string[]>> = {
  back: ['back'],
  'shoulders and neck': ['shoulder', 'neck'],
  legs: ['leg', 'calf', 'calves', 'thigh', 'knee'],
  feet: ['foot', 'feet', 'ankle', 'sole', 'heel'],
  'arms and hands': ['arm', 'hand', 'wrist'],
  head: ['head', 'temple', 'scalp'],
};

// The new texts recorded by `pnpm eval:posts sen svarga --new-texts --record`
// (docs/specs/platform/easier-to-use, "Tests"): the plan replayed to its two
// posts, then the first one's new words, through today's checks.
describe('recorded new texts', () => {
  test.each(['sen', 'svarga'])(
    '%s gets new words for the same post',
    { timeout: 20_000 },
    async (slug) => {
      const dir = join(FIXTURES_DIR, slug);
      const fixture = loadFixture(dir);
      if (!fixture.posts) throw new Error(`no posts.json for ${slug}`);
      if (!fixture.newTexts) throw new Error(`no new-texts.json for ${slug}`);
      const profile = await fixtureProfile(dir);
      const signal = new AbortController().signal;
      let plan: PlanResult | null = null;
      for await (const line of streamPlan(
        { profile, recent: [] },
        {
          model: replayTextModel(noBrandRead, { posts: fixture.posts.recording }),
          random: seededRandom(slug),
        },
        signal,
      )) {
        if (line.type === 'final') plan = line.result;
      }
      if (!plan) throw new Error('no plan');
      const [post, other] = plan.posts;
      let result: PlanResult | null = null;
      for await (const line of streamNewTexts(
        { profile, post, other },
        { model: replayTextModel(noBrandRead, { posts: fixture.newTexts.recording }) },
        signal,
      )) {
        if (line.type === 'error') throw new Error(line.code);
        if (line.type === 'final') result = line.result;
      }
      if (!result) throw new Error('no final line');
      const fresh = result.posts[0];
      expect(fresh.id).toBe(post.id);
      expect(fresh.caption).not.toBe(post.caption);
      expect(fresh.storyText).toBeTruthy();
      expect(fresh.storyText).not.toBe(post.storyText);
      // The image, its set-up and the hashtags stay.
      expect(fresh.imagePrompt).toBe(post.imagePrompt);
      expect(fresh.setup).toEqual(post.setup);
      expect(fresh.hashtags).toEqual(post.hashtags);
      expect(paragraphsOf(fresh.caption).length).toBeLessThanOrEqual(3);
      expect(fresh.caption).not.toMatch(PRICE);
      // A sore question names the part of the body the image shows
      // (Svarga's first real answer moved it to the shoulders, 2026-11-13).
      const part = fresh.setup?.bodyPart;
      if (fresh.setup?.question === 'sore' && part && PART_WORDS[part]) {
        const question = (fresh.offer ? paragraphsOf(fresh.caption)[1] : fresh.caption)
          ?.split('?')[0]
          .toLowerCase();
        expect(PART_WORDS[part].some((word) => question?.includes(word))).toBe(true);
      }
      // Not the other post's opening.
      const opening = repeatRecords([fresh, other]).filter((d) =>
        d.reason.startsWith('first sentence'),
      );
      expect(opening).toEqual([]);
    },
  );
});
