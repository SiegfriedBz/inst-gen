import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { recordingTextModel, replayTextModel } from '@/lib/ai/replay';
import { geminiTextModel, ModelError, TEXT_MODELS } from '@/lib/ai/text-model';

const input = { system: 'rules', text: 'pages', images: [] };
const rec = {
  modelId: 'gemini-3.8-flash',
  promptVersion: 'brand-1',
  partials: [{ category: 'spa' }, { category: 'spa', tone: ['calm'] }],
  final: { category: 'spa', tone: ['calm', 'warm', 'kind'] },
};

async function drain(iterable: AsyncIterable<unknown>): Promise<unknown[]> {
  const seen: unknown[] = [];
  for await (const item of iterable) seen.push(item);
  return seen;
}

describe('TEXT_MODELS', () => {
  test('match decision 0003', () => {
    expect(TEXT_MODELS).toEqual({
      brand: 'gemini-3.5-flash-lite',
      light: 'gemini-3.5-flash-lite',
      posts: 'gemini-3.5-flash-lite',
    });
  });
});

describe('replayTextModel', () => {
  test('yields the partials in order, then final', async () => {
    const stream = replayTextModel(rec).streamBrandProfile(input, new AbortController().signal);
    expect(await drain(stream)).toEqual(rec.partials);
    expect(await stream.final).toEqual(rec.final);
  });

  test('hang never resolves until aborted, then rejects with the abort', async () => {
    const controller = new AbortController();
    const stream = replayTextModel(rec, { hang: true }).streamBrandProfile(
      input,
      controller.signal,
    );
    const drained = drain(stream);
    setTimeout(() => controller.abort(), 20);
    await expect(drained).rejects.toMatchObject({ name: 'AbortError' });
    await expect(stream.final).rejects.toMatchObject({ name: 'AbortError' });
  });

  test('error busy rejects with ModelError busy', async () => {
    const stream = replayTextModel(rec, { error: 'busy' }).streamBrandProfile(
      input,
      new AbortController().signal,
    );
    await expect(drain(stream)).rejects.toMatchObject({ kind: 'busy' });
    await expect(stream.final).rejects.toBeInstanceOf(ModelError);
  });
});

describe('recordingTextModel', () => {
  test('hands over what the inner model streamed', async () => {
    const done = vi.fn();
    const model = recordingTextModel(
      replayTextModel(rec),
      { modelId: 'm', promptVersion: 'p' },
      done,
    );
    const stream = model.streamBrandProfile(input, new AbortController().signal);
    await drain(stream);
    await stream.final;
    expect(done).toHaveBeenCalledWith({
      modelId: 'm',
      promptVersion: 'p',
      partials: rec.partials,
      final: rec.final,
    });
  });
});

describe('geminiTextModel', () => {
  afterEach(() => vi.unstubAllEnvs());

  test('without a key, fails with ModelError failed and calls nothing', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const stream = geminiTextModel().streamBrandProfile(input, new AbortController().signal);
    await expect(drain(stream)).rejects.toMatchObject({ kind: 'failed' });
    await expect(stream.final).rejects.toMatchObject({ kind: 'failed' });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  test('a 429 is busy, and is not retried', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key-not-real');
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({ error: { code: 429, message: 'quota', status: 'RESOURCE_EXHAUSTED' } }),
          {
            status: 429,
            headers: { 'content-type': 'application/json' },
          },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    try {
      const stream = geminiTextModel().streamBrandProfile(input, new AbortController().signal);
      await expect(drain(stream)).rejects.toMatchObject({ kind: 'busy' });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

describe('post plan', () => {
  const posts = {
    modelId: 'gemini-3.5-flash-lite',
    promptVersion: 'posts-1',
    partials: [{ posts: [{ type: 'offer' }] }, { posts: [{ type: 'offer' }, { type: 'tip' }] }],
    final: { posts: [{ type: 'offer' }, { type: 'tip' }] },
  };
  const call = { system: 'rules', text: 'profile' };

  test('replayTextModel replays a posts recording', async () => {
    const stream = replayTextModel(rec, { posts }).streamPostPlan(
      call,
      new AbortController().signal,
    );
    expect(await drain(stream)).toEqual(posts.partials);
    expect(await stream.final).toEqual(posts.final);
  });

  test('recordingTextModel records a post plan', async () => {
    let recorded: unknown = null;
    const model = recordingTextModel(
      replayTextModel(rec, { posts }),
      { modelId: 'm', promptVersion: 'posts-1' },
      () => {},
      () => {},
      (r) => {
        recorded = r;
      },
    );
    await drain(model.streamPostPlan(call, new AbortController().signal));
    expect(recorded).toMatchObject({ partials: posts.partials, final: posts.final });
  });

  test('without a key, the plan fails with ModelError failed', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
    try {
      const stream = geminiTextModel().streamPostPlan(call, new AbortController().signal);
      await expect(drain(stream)).rejects.toMatchObject({ kind: 'failed' });
      const rewrite = geminiTextModel().streamPostRewrite(call, new AbortController().signal);
      await expect(drain(rewrite)).rejects.toMatchObject({ kind: 'failed' });
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('searchEssence', () => {
  const searchInput = { system: 'rules', text: 'results' };
  const answer = { searchTerms: ['hotel massage da nang'], moments: [], placeSymbols: [] };

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  test('a replayed model answers its recorded search answer', async () => {
    const model = replayTextModel(rec, { searchAnswer: answer });
    expect(await model.searchEssence(searchInput, new AbortController().signal)).toEqual(answer);
  });

  test('a recording model hands over the search answer', async () => {
    const done = vi.fn();
    const model = recordingTextModel(
      replayTextModel(rec, { searchAnswer: answer }),
      { modelId: 'm', promptVersion: 'p' },
      () => {},
      done,
    );
    await model.searchEssence(searchInput, new AbortController().signal);
    expect(done).toHaveBeenCalledWith(answer);
  });

  test('calls the light model once, with no retries', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key-not-real');
    const fetchMock = vi.fn(
      async (_url: string | URL | Request, _init?: RequestInit) =>
        new Response(JSON.stringify({ error: { code: 503, message: 'busy' } }), {
          status: 503,
          headers: { 'content-type': 'application/json' },
        }),
    );
    vi.stubGlobal('fetch', fetchMock);
    await geminiTextModel()
      .searchEssence(searchInput, new AbortController().signal)
      .catch(() => {});
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(TEXT_MODELS.light);
  });

  test('a 429 is busy', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', 'test-key-not-real');
    vi.stubGlobal(
      'fetch',
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: { code: 429, message: 'quota' } }), {
            status: 429,
            headers: { 'content-type': 'application/json' },
          }),
      ),
    );
    await expect(
      geminiTextModel().searchEssence(searchInput, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'busy' });
  });

  test('without a key, fails with ModelError failed', async () => {
    vi.stubEnv('GOOGLE_GENERATIVE_AI_API_KEY', '');
    await expect(
      geminiTextModel().searchEssence(searchInput, new AbortController().signal),
    ).rejects.toMatchObject({ kind: 'failed' });
  });
});

describe('the Google provider', () => {
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (['node_modules', '.next', '.git', '.claude', '.superpowers'].includes(entry.name))
        return [];
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      return /\.(ts|tsx)$/.test(entry.name) ? [path] : [];
    });
  }

  test('is imported only by lib/ai/text-model.ts', () => {
    const importers = sourceFiles('.')
      .filter((file) => !file.startsWith('tests'))
      .filter((file) => readFileSync(file, 'utf8').includes("from '@ai-sdk/google'"));
    expect(importers).toEqual(['lib/ai/text-model.ts']);
  });
});
