import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { type TextModel, toModelStream } from '@/lib/ai/text-model';
import { profileHash } from '@/lib/posts/input';
import type { PostsLog } from '@/lib/posts/log';
import { streamPlan, streamRewrite } from '@/lib/posts/run';
import type { PostsLine } from '@/lib/posts/stream';
import { svargaProfile } from './helpers/brand';
import { planRecording, post } from './helpers/posts';

const brand = { modelId: 'm', promptVersion: 'p', partials: [], final: {} };

async function drain(lines: AsyncIterable<PostsLine>): Promise<PostsLine[]> {
  const seen: PostsLine[] = [];
  for await (const line of lines) seen.push(line);
  return seen;
}

function deps(model: TextModel, extra: { timeoutMs?: number; log?: (e: PostsLog) => void } = {}) {
  return { model, ...extra };
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
        promptVersion: 'posts-1',
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
      ['Deck at dusk', 'New caption a.'],
      ['A glass', 'New caption b.'],
    ]);
  });
});
