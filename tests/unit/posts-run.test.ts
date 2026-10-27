import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { type TextModel, toModelStream } from '@/lib/ai/text-model';
import { profileHash } from '@/lib/posts/input';
import type { PostsLog } from '@/lib/posts/log';
import type { Offer } from '@/lib/posts/offer';
import { streamPlan, streamRewrite } from '@/lib/posts/run';
import { dealSetups, seededRandom, setupLine } from '@/lib/posts/setup';
import type { PostsLine } from '@/lib/posts/stream';
import { svargaProfile } from './helpers/brand';
import { modelPost, planRecording, post } from './helpers/posts';

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

describe('streamPlan', () => {
  test('yields six post lines then a final', async () => {
    const model = replayTextModel(brand, { posts: planRecording() });
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(lines.map((l) => l.type)).toEqual([
      'post',
      'post',
      'post',
      'post',
      'post',
      'post',
      'final',
    ]);
    expect(lines.slice(0, 6).map((l) => (l.type === 'post' ? l.index : -1))).toEqual([
      0, 1, 2, 3, 4, 5,
    ]);
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
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
    const final = lines.at(-1);
    expect(final).toMatchObject({
      type: 'final',
      result: {
        promptVersion: 'posts-5',
        model: 'gemini-3.5-flash-lite',
        profileHash: profileHash(svargaProfile()),
      },
    });
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts).toHaveLength(6);
    expect(final.result.posts[0].cta).toBe('Book on WhatsApp: +6281234567890');
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
    expect(final.result.posts[0].storyText).toBe('Professional massage in your room. 🌸');
    expect(final.result.dropped).toContainEqual({
      field: 'story',
      reason: 'post-1: story text removed "🌸 Book on WhatsApp."',
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
      kept: 6,
      outcome: 'final',
    });
    expect(JSON.stringify(entries[0])).not.toContain('Caption');
  });
  test('counts story cuts and emoji fixes in its log entry', async () => {
    const entries: PostsLog[] = [];
    const recording = planRecording();
    const third = recording.final.posts[2] as ReturnType<typeof modelPost> & { storyText?: string };
    third.storyText = `${'Calm tonight. '.repeat(10)}Wake up light! 🌺`;
    const model = replayTextModel(brand, { posts: recording });
    await drain(
      streamPlan(
        body(),
        deps(model, { log: (e) => entries.push(e) }),
        new AbortController().signal,
      ),
    );
    // Svarga is a spa: six captions gain a flower, and the cut story text too.
    expect(entries[0]).toMatchObject({ storyCuts: 1, emojiFixes: 7 });
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
      ['Deck at dusk', 'New caption a. 🌸'],
      ['A glass', 'New caption b. 🌸'],
    ]);
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
    expect(final.result.posts[0].caption).toBe('New caption a. 🌸');
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

  test('the first two offer posts carry it; a third is flagged', async () => {
    const model = replayTextModel(brand, { posts: threeOffers() });
    const lines = await drain(
      streamPlan({ ...body(), offer }, deps(model), new AbortController().signal),
    );
    const final = lines.at(-1);
    if (final?.type !== 'final') throw new Error('no final');
    expect(final.result.posts.map((p) => p.offer === true)).toEqual([
      true,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(final.result.posts[2].unchecked).toContainEqual({ kind: 'offer', text: '10%' });
    expect(final.result.offer).toEqual(offer);
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
  const dealt = () => dealSetups(svargaProfile(), undefined, seededRandom('t'));

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
    const lines = await drain(streamPlan(body(), deps(model), new AbortController().signal));
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

  test('a dropped post takes its set-up with it', async () => {
    const posts = Array.from({ length: 6 }, (_, i) => modelPost(i));
    posts[1] = { ...posts[1], type: 'banana' };
    const { result } = await finalOf(recordingOf(posts));
    expect(result.posts).toHaveLength(5);
    expect(result.posts[1].setup).toEqual(dealt()[2]);
  });

  test('a seventh post gets no set-up and is cut', async () => {
    const { lines, result } = await finalOf(planRecording(7));
    const seventh = lines[6];
    if (seventh.type !== 'post') throw new Error('no seventh post line');
    expect(seventh.post.setup).toBeUndefined();
    expect(result.posts).toHaveLength(6);
  });

  test('a plan of five posts uses set-ups 1 to 5', async () => {
    const { result } = await finalOf(planRecording(5));
    expect(result.posts.map((p) => p.setup)).toEqual(dealt().slice(0, 5));
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
    await drain(streamPlan(body(), deps(model), new AbortController().signal));
    expect(text).toContain('### Image set-ups');
    expect(text).toContain(`1. ${setupLine(dealt()[0])}`);
  });

  test('the image prompts are checked against their set-ups', async () => {
    const { result } = await finalOf(planRecording());
    expect(result.dropped.some((d) => d.field === 'image')).toBe(true);
  });
});
