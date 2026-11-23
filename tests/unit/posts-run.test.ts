import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { type TextModel, toModelStream } from '@/lib/ai/text-model';
import { profileHash } from '@/lib/posts/input';
import type { PostsLog } from '@/lib/posts/log';
import type { Offer } from '@/lib/posts/offer';
import { planPrompt } from '@/lib/posts/prompt';
import { LOOK_REASONS } from '@/lib/posts/reasons';
import { reasonsPlanPrompt } from '@/lib/posts/reasons-prompt';
import { streamNewTexts, streamPlan, streamRewrite } from '@/lib/posts/run';
import { dealSetups, seededRandom, setupLine } from '@/lib/posts/setup';
import type { PostsLine } from '@/lib/posts/stream';
import { SITE, svargaProfile } from './helpers/brand';
import { modelPost, planRecording, post, setupAt } from './helpers/posts';

const brand = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };

async function drain(lines: AsyncIterable<PostsLine>): Promise<PostsLine[]> {
  const seen: PostsLine[] = [];
  for await (const line of lines) seen.push(line);
  return seen;
}

function deps(model: TextModel, extra: { timeoutMs?: number; log?: (e: PostsLog) => void } = {}) {
  return { model, random: seededRandom('t'), ...extra };
}

const body = () => ({ profile: svargaProfile(), recent: [] });

// A spa guests go to: no service area, so posts-18 and its set-ups
// (docs/specs/posts/reasons-to-book, "Who it's for").
const atTheSpa = () => ({
  ...svargaProfile(),
  location: { ...svargaProfile().location, serviceArea: null },
});
const spaBody = () => ({ profile: atTheSpa(), recent: [] });

describe('streamPlan', () => {
  // Two suggestions an attempt (docs/specs/posts/two-suggestions).
  test('yields two post lines then a final', async () => {
    const model = replayTextModel(brand, { posts: planRecording(2) });
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(lines.map((l) => l.type)).toEqual(['post', 'post', 'final']);
    expect(lines.slice(0, 2).map((l) => (l.type === 'post' ? l.index : -1))).toEqual([0, 1]);
  });

  test('a model that writes six streams two, and the rest is recorded once', async () => {
    const model = replayTextModel(brand, { posts: planRecording(6) });
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(lines.filter((l) => l.type === 'post')).toHaveLength(2);
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts.map((p) => p.id)).toEqual(['post-1', 'post-2']);
    expect(final.result.dropped.filter((d) => d.reason === 'more than 2 posts')).toHaveLength(1);
  });

  test('counts price_fixes', async () => {
    const entries: PostsLog[] = [];
    const posts = [0, 1].map((i) => modelPost(i));
    posts[1] = { ...posts[1], type: 'moment', caption: 'Warm oil. Only 350k tonight. Rest well.' };
    const recording = {
      modelId: 'm',
      promptVersion: 'posts-12',
      partials: posts.map((_, i) => ({ posts: posts.slice(0, i + 1) })),
      final: { posts },
    };
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts[1].caption).not.toContain('350k');
    expect(entries[0].priceFixes).toBe(1);
  });

  test('a post line comes as soon as the next post starts', async () => {
    const recording = planRecording();
    let consumed = 0;
    const inner = replayTextModel(brand, { posts: recording });
    const model: TextModel = {
      ...inner,
      streamPostPlan(input, signal) {
        const stream = inner.streamPostPlan(input, signal);
        async function* counted() {
          for await (const partial of stream) {
            consumed += 1;
            yield partial;
          }
          return await stream.final;
        }
        return toModelStream(counted());
      },
    };
    const lines = streamPlan(body(), deps(model), new AbortController().signal);
    const first = await lines.next();
    expect(first.value).toMatchObject({ type: 'post', index: 0 });
    expect(consumed).toBeLessThanOrEqual(2);
    await lines.return(undefined);
  });

  test('final carries the prompt version, the model and the profile hash', async () => {
    const model = replayTextModel(brand, { posts: planRecording() });
    // A spa guests go to keeps posts-18 (docs/specs/posts/reasons-to-book).
    const lines = await drain(streamPlan(spaBody(), deps(model), new AbortController().signal));
    const final = lines.at(-1);
    expect(final).toMatchObject({
      type: 'final',
      result: {
        promptVersion: 'posts-18',
        model: 'gemini-3.5-flash-lite',
        profileHash: profileHash(atTheSpa()),
      },
    });
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts).toHaveLength(2);
    expect(final.result.posts[0].cta).toBe(
      '👉 Book Your Wellness on WhatsApp today: +6281234567890',
    );
    expect(final.result.posts[0].hashtags).toEqual(['canggu', 'balimassage', 'aftersurf']);
  });

  test('a busy model ends with model_busy', async () => {
    const model = replayTextModel(brand, { error: 'busy' });
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(lines).toEqual([{ type: 'error', code: 'model_busy' }]);
  });

  test('a model past the cut-off ends with model_timeout', async () => {
    const model = replayTextModel(brand, { posts: planRecording(), hang: true });
    const lines = await drain(
      streamPlan(body(), deps(model, { timeoutMs: 50 }), new AbortController().signal),
    );
    expect(lines).toEqual([{ type: 'error', code: 'model_timeout' }]);
  });

  test('any other model error ends with model_failed', async () => {
    const model = replayTextModel(brand, { error: 'failed' });
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(lines).toEqual([{ type: 'error', code: 'model_failed' }]);
  });

  // The spec's scenario "A call to action in the story text" (amended 2026-10-27).
  test('a call to action goes from the story text, counted story_ctas=1', async () => {
    const entries: PostsLog[] = [];
    const one = {
      ...modelPost(0),
      caption: 'Warm oil and slow hands after a day in Canggu. 🌸',
      storyText: 'Professional massage in your room. 🌸 Book on WhatsApp.',
    };
    const recording = {
      modelId: 'm',
      promptVersion: 'posts-5',
      partials: [{ posts: [one] }],
      final: { posts: [one] },
    };
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts[0].storyText).toBe('Professional massage in your room 🌸');
    expect(final.result.dropped).toContainEqual({
      field: 'story',
      reason: 'post-1: story text removed "Book on WhatsApp."',
    });
    expect(entries[0].storyCtas).toBe(1);
  });

  // The spec's scenario "Code fixes a spa's emojis".
  test('one fixed story text counts emoji_fixes=1', async () => {
    const entries: PostsLog[] = [];
    const one = {
      ...modelPost(0),
      caption: 'Warm oil and slow hands after a day in Canggu. 🌸',
      storyText: 'Relax tonight 💆 in your room!',
    };
    const recording = {
      modelId: 'm',
      promptVersion: 'posts-5',
      partials: [{ posts: [one] }],
      final: { posts: [one] },
    };
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts[0].storyText).toBe('Relax tonight in your room! 🌸');
    expect(final.result.dropped.filter((d) => d.field === 'emoji')).toEqual([
      { field: 'emoji', reason: 'post-1: story text removed 💆, added 🌸' },
    ]);
    expect(entries[0].emojiFixes).toBe(1);
  });

  test("a spa's plan and rewrite ask for flowers, another business's don't", async () => {
    const systems: string[] = [];
    const inner = replayTextModel(brand, { posts: planRecording() });
    const model: TextModel = {
      ...inner,
      streamPostPlan(input, signal) {
        systems.push(input.system);
        return inner.streamPostPlan(input, signal);
      },
      streamPostRewrite(input, signal) {
        systems.push(input.system);
        return inner.streamPostRewrite(input, signal);
      },
    };
    const bakery = { ...svargaProfile(), category: 'bakery' };
    await drain(streamPlan(body(), deps(model), new AbortController().signal));
    await drain(
      streamPlan({ profile: bakery, recent: [] }, deps(model), new AbortController().signal),
    );
    await drain(
      streamRewrite(
        { profile: svargaProfile(), posts: [post({ id: 'a' })] },
        deps(model),
        new AbortController().signal,
      ),
    );
    expect(systems.map((system) => system.includes('flowers only'))).toEqual([true, false, true]);
  });

  test("the model's input holds no WhatsApp number", async () => {
    const inner = replayTextModel(brand, { posts: planRecording() });
    let seen = '';
    const model: TextModel = {
      ...inner,
      streamPostPlan(input, signal) {
        seen = input.system + input.text;
        return inner.streamPostPlan(input, signal);
      },
    };
    await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(seen).not.toContain('+6281234567890');
    expect(seen).toContain('Svarga');
  });

  test('logs one entry without captions', async () => {
    const entries: PostsLog[] = [];
    const model = replayTextModel(brand, { posts: planRecording() });
    await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      host: 'svargabalimassage.com',
      kind: 'plan',
      kept: 2,
      outcome: 'final',
    });
    expect(JSON.stringify(entries[0])).not.toContain('Caption');
  });
  test('counts story cuts and emoji fixes in its log entry', async () => {
    const entries: PostsLog[] = [];
    const recording = planRecording();
    const second = recording.final.posts[1] as ReturnType<typeof modelPost> & {
      storyText?: string;
    };
    second.storyText = `${'Calm tonight. '.repeat(10)}Wake up light! 🌺`;
    const model = replayTextModel(brand, { posts: recording });
    await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    // Svarga is a spa: the two captions gain a flower, and the cut story text too.
    expect(entries[0]).toMatchObject({ storyCuts: 1, emojiFixes: 3 });
  });
});

describe('streamRewrite', () => {
  test('keeps image prompts and rewrites captions', async () => {
    const originals = [
      post({ id: 'a', imagePrompt: 'Deck at dusk' }),
      post({ id: 'b', type: 'tip', scene: 'detail', imagePrompt: 'A glass' }),
    ];
    const answer = {
      posts: [
        { id: 'a', caption: 'New caption a.', hashtags: ['canggu'], altText: 'Alt a' },
        { id: 'b', caption: 'New caption b.', hashtags: ['tip'], altText: 'Alt b' },
      ],
    };
    const recording = { modelId: 'm', promptVersion: 'posts-1', partials: [answer], final: answer };
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(
      streamRewrite(
        { profile: svargaProfile(), posts: originals },
        deps(model),
        new AbortController().signal,
      ),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts.map((p) => [p.imagePrompt, p.caption])).toEqual([
      // Svarga is a spa: code adds its flower (docs/specs/posts/story-text).
      ['Deck at dusk', 'New caption a 🌸'],
      ['A glass', 'New caption b 🌸'],
    ]);
  });
});

// docs/specs/platform/easier-to-use, "New texts for a suggestion".
describe('streamNewTexts', () => {
  const texts = (posts: unknown[]) => {
    const answer = { posts };
    const recording = { modelId: 'm', promptVersion: 'posts-1', partials: [answer], final: answer };
    return replayTextModel(brand, { posts: recording });
  };
  const newBody = () => ({
    profile: svargaProfile(),
    post: post({ id: 'a', imagePrompt: 'Deck at dusk' }),
    other: post({ id: 'b', caption: 'The other caption.' }),
  });

  test('ends on one post with new words', async () => {
    const model = texts([
      { id: 'a', caption: 'New caption.', hashtags: ['x'], altText: 'x', storyText: 'New story.' },
    ]);
    const lines = await drain(streamNewTexts(newBody(), deps(model), new AbortController().signal));
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts).toHaveLength(1);
    expect(final.result.posts[0]).toMatchObject({
      id: 'a',
      imagePrompt: 'Deck at dusk',
      caption: 'New caption 🌸',
      storyText: 'New story 🌸',
    });
  });

  test('an answer with no caption ends in model_failed', async () => {
    const lines = await drain(
      streamNewTexts(newBody(), deps(texts([])), new AbortController().signal),
    );
    expect(lines).toEqual([{ type: 'error', code: 'model_failed' }]);
  });

  test('its log line says kind=texts', async () => {
    const entries: PostsLog[] = [];
    const model = texts([{ id: 'a', caption: 'New.', hashtags: [], altText: 'x' }]);
    await drain(
      streamNewTexts(
        newBody(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    expect(entries.map((e) => [e.kind, e.outcome])).toEqual([['texts', 'final']]);
  });
});

describe('an old post', () => {
  test('a rewrite keeps a post saved without a set-up', async () => {
    const answer = {
      posts: [{ id: 'a', caption: 'New caption a.', hashtags: ['canggu'], altText: 'Alt a' }],
    };
    const recording = { modelId: 'm', promptVersion: 'posts-1', partials: [answer], final: answer };
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(
      streamRewrite(
        { profile: svargaProfile(), posts: [post({ id: 'a' })] },
        deps(model),
        new AbortController().signal,
      ),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts[0].caption).toBe('New caption a 🌸');
    expect('setup' in final.result.posts[0]).toBe(false);
  });
});

describe('the special offer', () => {
  const offer: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-10-27',
    lastDay: 'Tuesday 27 October',
  };

  function threeOffers() {
    const posts = Array.from({ length: 6 }, (_, i) => modelPost(i));
    posts[2] = { ...posts[2], type: 'offer', caption: 'Now 10% off, until 27 Oct!' };
    return {
      modelId: 'm',
      promptVersion: 'posts-3',
      partials: posts.map((_, i) => ({ posts: posts.slice(0, i + 1) })),
      final: { posts },
    };
  }

  test('both offer posts carry it; a third post is cut', async () => {
    const model = replayTextModel(brand, { posts: threeOffers() });
    const lines = await drain(
      streamPlan({ ...body(), offer }, deps(model), new AbortController().signal),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts.map((p) => p.offer === true)).toEqual([true, true]);
    expect(final.result.dropped).toContainEqual({ field: 'posts', reason: 'more than 2 posts' });
    expect(final.result.offer).toEqual(offer);
  });

  test('counts offer_fixes, but not a post without a treatment', async () => {
    const entries: PostsLog[] = [];
    const model = replayTextModel(brand, { posts: threeOffers() });
    await drain(
      streamPlan(
        { ...body(), offer },
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    // Posts 1 and 2 lack the offer line and a story text: 2 added, 2 stories set.
    expect(entries[0].offerFixes).toBe(4);
  });

  // docs/specs/posts/day-and-night-copy: the six recorded captions share
  // their last sentence, and hold no word of the other time of day.
  test('counts repeats and light misses', async () => {
    const entries: PostsLog[] = [];
    const model = replayTextModel(brand, { posts: planRecording() });
    await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    expect(entries[0].repeats).toBe(1);
    expect(entries[0].lightMisses).toBe(0);
  });

  test('without an offer, no post carries one', async () => {
    const model = replayTextModel(brand, { posts: planRecording() });
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts.some((p) => p.offer)).toBe(false);
    expect(final.result.offer).toBeUndefined();
  });

  test("a rewrite checks the posts with the batch's offer", async () => {
    const recording = {
      modelId: 'm',
      promptVersion: 'posts-3',
      partials: [],
      final: {
        posts: [{ id: 'a', caption: '15% off, until 27 Oct.', hashtags: ['bali'], altText: 'x' }],
      },
    };
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(
      streamRewrite(
        { profile: svargaProfile(), posts: [post({ id: 'a', offer: true })], offer },
        deps(model),
        new AbortController().signal,
      ),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts[0].offer).toBe(true);
    expect(final.result.posts[0].unchecked).toContainEqual({ kind: 'offer', text: '15%' });
  });
});

describe('the image set-ups', () => {
  const dealt = () => dealSetups(atTheSpa(), undefined, seededRandom('t'));

  function recordingOf(posts: ReturnType<typeof modelPost>[]) {
    return {
      modelId: 'm',
      promptVersion: 'posts-4',
      partials: posts.map((_, i) => ({ posts: posts.slice(0, i + 1) })),
      final: { posts },
    };
  }

  async function finalOf(recording: ReturnType<typeof planRecording>) {
    const model = replayTextModel(brand, { posts: recording });
    const lines = await drain(streamPlan(spaBody(), deps(model), new AbortController().signal));
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    return { lines, result: final.result };
  }

  test('set-up n goes to the n-th streamed post', async () => {
    const { result } = await finalOf(planRecording());
    expect(result.posts.map((p) => p.setup)).toEqual(dealt());
  });

  test("the post's scene is its set-up's, whatever the model wrote", async () => {
    const { result } = await finalOf(planRecording());
    expect(result.posts.map((p) => p.scene)).toEqual(dealt().map((s) => s.scene));
  });

  test('a dropped post takes its set-up with it; the post after it has none', async () => {
    const posts = Array.from({ length: 3 }, (_, i) => modelPost(i));
    posts[1] = { ...posts[1], type: 'banana' };
    const { result } = await finalOf(recordingOf(posts));
    expect(result.posts).toHaveLength(2);
    expect(result.posts[0].setup).toEqual(dealt()[0]);
    expect(result.posts[1].setup).toBeUndefined();
  });

  test('a third post is never streamed and is cut', async () => {
    const { lines, result } = await finalOf(planRecording(3));
    expect(lines.filter((l) => l.type === 'post')).toHaveLength(2);
    expect(result.posts).toHaveLength(2);
    expect(result.dropped).toContainEqual({ field: 'posts', reason: 'more than 2 posts' });
  });

  test('a plan of one post uses set-up 1', async () => {
    const { result } = await finalOf(planRecording(1));
    expect(result.posts.map((p) => p.setup)).toEqual(dealt().slice(0, 1));
  });

  test("the model's text holds the set-ups", async () => {
    let text = '';
    const inner = replayTextModel(brand, { posts: planRecording() });
    const model: TextModel = {
      ...inner,
      streamPostPlan(input, signal) {
        text = input.text;
        return inner.streamPostPlan(input, signal);
      },
    };
    await drain(streamPlan(spaBody(), deps(model), new AbortController().signal));
    expect(text).toContain('### Image set-ups');
    expect(text).toContain(`1. ${setupLine(dealt()[0])}`);
  });

  test('the image prompts are checked against their set-ups', async () => {
    const { result } = await finalOf(planRecording());
    expect(result.dropped.some((d) => d.field === 'image')).toBe(true);
  });
});

// docs/specs/posts/reasons-to-book: a spa that comes to its guests.
describe('reasons to book in the runs', () => {
  const signal = () => new AbortController().signal;
  const answerOf = (posts: unknown[]) => {
    const answer = { posts };
    return { modelId: 'm', promptVersion: 'posts-19', partials: [answer], final: answer };
  };
  const planOf = (posts: ReturnType<typeof modelPost>[]) => ({
    modelId: 'm',
    promptVersion: 'posts-19',
    partials: posts.map((_, i) => ({ posts: posts.slice(0, i + 1) })),
    final: { posts },
  });
  function spying(recording: object) {
    const seen: { system: string; text: string }[] = [];
    const inner = replayTextModel(brand, { posts: recording as ReturnType<typeof planRecording> });
    const model: TextModel = {
      ...inner,
      streamPostPlan(input, s) {
        seen.push(input);
        return inner.streamPostPlan(input, s);
      },
      streamPostRewrite(input, s) {
        seen.push(input);
        return inner.streamPostRewrite(input, s);
      },
    };
    return { model, seen };
  }
  async function finalOf(lines: AsyncIterable<PostsLine>) {
    const all = await drain(lines);
    const final = all.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    return final.result;
  }
  const tipped = () => [modelPost(0), { ...modelPost(1), type: 'tip' }];
  const OFFER: Offer = {
    kind: 'discount',
    percent: 10,
    treatments: ['Balinese massage'],
    until: '2026-12-01',
    lastDay: 'Tuesday 1 December',
  };
  const withHighlights = (values: string[], hours = svargaProfile().hours) => ({
    ...svargaProfile(),
    highlights: values.map((value) => ({ value, source: SITE })),
    hours,
  });

  test('a plan with posts-19, its reasons and facts, and the types code gives', async () => {
    const { model, seen } = spying(planOf(tipped()));
    const entries: PostsLog[] = [];
    const result = await finalOf(
      streamPlan(body(), deps(model, { log: (e) => entries.push(e) }), signal()),
    );
    expect(seen[0].system).toBe(reasonsPlanPrompt(false, true));
    expect(seen[0].text).toContain('### Reasons');
    expect(seen[0].text).toContain('### Facts');
    expect(result.promptVersion).toBe('posts-19');
    expect(entries[0].promptVersion).toBe('posts-19');
    expect(result.posts.map((p) => p.type)).toEqual(['offer', 'moment']);
    for (const p of result.posts) expect(p.setup?.reason).toBeDefined();
  });

  test('with an offer, both are offer posts', async () => {
    const { model } = spying(planOf(tipped()));
    const result = await finalOf(streamPlan({ ...body(), offer: OFFER }, deps(model), signal()));
    expect(result.posts.map((p) => p.type)).toEqual(['offer', 'offer']);
  });

  test('a spa guests go to keeps posts-18', async () => {
    const { model, seen } = spying(planRecording(2));
    const result = await finalOf(streamPlan(spaBody(), deps(model), signal()));
    expect(seen[0].system).toBe(planPrompt(false, true));
    expect(seen[0].text).toContain('### Questions');
    expect(result.promptVersion).toBe('posts-18');
  });

  test("the recent posts' reasons stay out of the next attempt", async () => {
    const { model } = spying(planRecording(2));
    const recent = [
      { type: 'offer' as const, topic: 'a', reason: 'dayOut' as const },
      { type: 'moment' as const, topic: 'b', reason: 'stayIn' as const },
    ];
    const result = await finalOf(
      streamPlan({ profile: svargaProfile(), recent }, deps(model), signal()),
    );
    const reasons = result.posts.map((p) => p.setup?.reason);
    for (const reason of reasons) expect(reason).toBeDefined();
    expect(reasons).not.toContain('dayOut');
    expect(reasons).not.toContain('stayIn');
  });

  test('the model never sees a highlight that turns a request away', async () => {
    const { model, seen } = spying(planRecording(2));
    const profile = withHighlights([
      'Professional therapeutic massage only',
      'No upfront deposit required',
    ]);
    await drain(streamPlan({ profile, recent: [] }, deps(model), signal()));
    expect(seen[0].text).not.toContain('Professional therapeutic massage only');
  });

  test('no highlight and no hours: a checked batch, and no facts', async () => {
    const { model, seen } = spying(planRecording(2));
    const result = await finalOf(
      streamPlan({ profile: withHighlights([], null), recent: [] }, deps(model), signal()),
    );
    expect(result.posts.length).toBeGreaterThan(0);
    expect(seen[0].text).toContain('### Reasons');
    expect(seen[0].text).not.toContain('### Facts');
    for (const p of result.posts) expect(p.setup?.fact).toBeUndefined();
  });

  test('a caption update gives a post saved with a kind of question a reason its look takes', async () => {
    const [asked, second] = dealSetups(atTheSpa(), undefined, seededRandom('t'));
    const other = { ...second, reason: 'laptop' as const, fact: 'Therapists come to you' };
    delete other.question;
    const posts = [post({ id: 'a', setup: asked }), post({ id: 'b', setup: other })];
    const { model, seen } = spying(
      answerOf([
        { id: 'a', caption: 'New a.', hashtags: [], altText: 'x' },
        { id: 'b', caption: 'New b.', hashtags: [], altText: 'x' },
      ]),
    );
    const result = await finalOf(
      streamRewrite({ profile: svargaProfile(), posts }, deps(model), signal()),
    );
    const reason = result.posts[0].setup?.reason;
    expect(reason).toBeDefined();
    expect(LOOK_REASONS[asked.look]).toContain(reason);
    expect(reason).not.toBe('laptop');
    expect(seen[0].text).toContain(`"reason": "${reason}"`);
    expect(result.posts[1].setup?.fact).toBe('Therapists come to you');
  });

  test('a fact whose highlight is gone is replaced, never sent again', async () => {
    const gone = 'Free travel in our core areas';
    const posts = [post({ id: 'a', setup: setupAt('day', { fact: gone }) })];
    const { model, seen } = spying(
      answerOf([{ id: 'a', caption: 'New a.', hashtags: [], altText: 'x' }]),
    );
    const result = await finalOf(
      streamRewrite({ profile: svargaProfile(), posts }, deps(model), signal()),
    );
    expect(seen[0].text).not.toContain(gone);
    expect(result.posts[0].setup?.fact).toBe('Therapists come to you');
  });

  test('a post with no set-up goes as it is', async () => {
    const { model, seen } = spying(
      answerOf([{ id: 'a', caption: 'New a.', hashtags: [], altText: 'x' }]),
    );
    const result = await finalOf(
      streamRewrite(
        { profile: svargaProfile(), posts: [post({ id: 'a' })] },
        deps(model),
        signal(),
      ),
    );
    expect(seen[0].system.startsWith('The owner changed')).toBe(true);
    expect(seen[0].system).toContain('Who reads these posts');
    expect(seen[0].text).not.toContain('"reason"');
    expect(result.posts[0].setup).toBeUndefined();
  });

  // The review of 2026-11-23: a post saved before reasons reaches posts-19
  // without posts-18's type, topic or kind of question.
  const sentPosts = (text: string, heading: string) => {
    const start = text.indexOf(`${heading}\n`) + heading.length + 1;
    const end = text.indexOf('\n\n###', start);
    return JSON.parse(text.slice(start, end === -1 ? undefined : end));
  };

  test('an old tip post goes to a caption update with its reason, not its type, topic or kind', async () => {
    const [asked] = dealSetups(atTheSpa(), undefined, seededRandom('t'));
    const old = post({
      id: 'a',
      type: 'tip',
      topic: 'Drink water after your massage',
      setup: { ...asked, question: 'sore' },
    });
    const { model, seen } = spying(
      answerOf([{ id: 'a', caption: 'New a.', hashtags: [], altText: 'x' }]),
    );
    const result = await finalOf(
      streamRewrite({ profile: svargaProfile(), posts: [old] }, deps(model), signal()),
    );
    const [sent] = sentPosts(seen[0].text, '### Posts');
    expect(sent.reason).toBeDefined();
    for (const key of ['type', 'topic', 'question']) expect(key in sent).toBe(false);
    expect(seen[0].text).not.toContain('Drink water');
    expect(result.posts[0].setup?.question).toBeUndefined();
  });

  test("new texts for a post saved with a kind of question: a reason its look takes, never the other's", async () => {
    const [asked, second] = dealSetups(atTheSpa(), undefined, seededRandom('t'));
    const mine = post({ id: 'a', type: 'local', topic: 'Old topic', setup: asked });
    const other = post({
      id: 'b',
      caption: 'The other caption.',
      setup: { ...second, question: undefined, reason: 'laptop' },
    });
    const { model, seen } = spying(
      answerOf([
        { id: 'a', caption: 'New caption.', hashtags: [], altText: '', storyText: 'New story.' },
      ]),
    );
    const result = await finalOf(
      streamNewTexts({ profile: svargaProfile(), post: mine, other }, deps(model), signal()),
    );
    const sent = sentPosts(seen[0].text, '### Post');
    expect(LOOK_REASONS[asked.look]).toContain(sent.reason);
    expect(sent.reason).not.toBe('laptop');
    for (const key of ['type', 'topic', 'question']) expect(key in sent).toBe(false);
    expect(result.posts[0].setup?.reason).toBe(sent.reason);
    expect(result.posts[0].setup?.question).toBeUndefined();
  });

  test("new texts keep the reason, and take a fact neither theirs nor the other post's", async () => {
    const profile = withHighlights([
      'Free travel in Canggu',
      'No upfront deposit for villas and hotels',
      'WhatsApp replies in ~5 mins',
    ]);
    const mine = post({
      id: 'a',
      setup: setupAt('day', { reason: 'laptop', fact: 'Free travel in Canggu' }),
    });
    const other = post({
      id: 'b',
      caption: 'The other caption.',
      setup: setupAt('night', {
        reason: 'stayIn',
        fact: 'No upfront deposit for villas and hotels',
      }),
    });
    const { model } = spying(
      answerOf([
        { id: 'a', caption: 'New caption.', hashtags: [], altText: '', storyText: 'New story.' },
      ]),
    );
    const result = await finalOf(
      streamNewTexts({ profile, post: mine, other }, deps(model), signal()),
    );
    expect(result.posts[0].setup?.reason).toBe('laptop');
    expect(result.posts[0].setup?.fact).toBe('WhatsApp replies in ~5 mins');
  });
});
