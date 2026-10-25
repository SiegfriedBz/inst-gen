import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resetStoreForTests } from '@/lib/brand/store';
import { hashText } from '@/lib/posts/input';
import { getTranslation } from '@/lib/posts/translate-client';
import {
  loadTranslation,
  type SavedTranslation,
  saveTranslation,
} from '@/lib/posts/translation-store';

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  resetStoreForTests();
});

const CAPTION = 'Warm oil and slow hands.';

function saved(caption: string, locale: 'id' | 'vi' = 'vi'): SavedTranslation {
  return {
    batchId: 'b1',
    postId: 'post-1',
    ownerId: 'sen',
    locale,
    captionHash: hashText(caption),
    text: 'Dầu ấm và đôi tay chậm rãi.',
    model: 'gemini-3.5-flash-lite',
    promptVersion: 'translate-1',
    createdAt: '2026-10-25T10:00:00.000Z',
  };
}

const input = {
  ownerId: 'sen',
  batchId: 'b1',
  postId: 'post-1',
  caption: CAPTION,
  locale: 'vi' as const,
};

function deps(fetch: ReturnType<typeof vi.fn>) {
  return {
    fetch: fetch as unknown as typeof globalThis.fetch,
    now: () => new Date('2026-10-25T10:00:00Z'),
  };
}

describe('the translations store', () => {
  test('a saved translation is used while the caption matches', async () => {
    await saveTranslation(saved(CAPTION));
    expect((await loadTranslation('b1', 'post-1', 'vi', CAPTION))?.text).toBe(
      'Dầu ấm và đôi tay chậm rãi.',
    );
    expect(await loadTranslation('b1', 'post-1', 'id', CAPTION)).toBeNull();
    expect(await loadTranslation('b2', 'post-1', 'vi', CAPTION)).toBeNull();
  });

  test("a translation for an older caption isn't used", async () => {
    await saveTranslation(saved('The old caption.'));
    expect(await loadTranslation('b1', 'post-1', 'vi', CAPTION)).toBeNull();
  });
});

describe('getTranslation', () => {
  test('a saved translation makes no request', async () => {
    await saveTranslation(saved(CAPTION));
    const fetch = vi.fn();
    expect(await getTranslation(input, deps(fetch))).toEqual({
      ok: true,
      text: 'Dầu ấm và đôi tay chậm rãi.',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  test('an answer is asked for once, then kept under the caption asked for', async () => {
    const fetch = vi.fn(async () =>
      Response.json({
        text: 'Dầu ấm.',
        model: 'gemini-3.5-flash-lite',
        promptVersion: 'translate-1',
      }),
    );
    expect(await getTranslation(input, deps(fetch))).toEqual({ ok: true, text: 'Dầu ấm.' });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('/api/posts/translate');
    expect(JSON.parse(init.body as string)).toEqual({ text: CAPTION, locale: 'vi' });
    expect(await getTranslation(input, deps(fetch))).toEqual({ ok: true, text: 'Dầu ấm.' });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect((await loadTranslation('b1', 'post-1', 'vi', CAPTION))?.captionHash).toBe(
      hashText(CAPTION),
    );
  });

  test('an empty answer is never kept', async () => {
    const fetch = vi.fn(async () =>
      Response.json({ text: '', model: 'gemini-3.5-flash-lite', promptVersion: 'translate-1' }),
    );
    expect(await getTranslation(input, deps(fetch))).toEqual({ ok: false, code: 'model_failed' });
    expect(await loadTranslation('b1', 'post-1', 'vi', CAPTION)).toBeNull();
  });

  test('401 is signedOut, an error code is passed on, a network error is offline', async () => {
    expect(
      await getTranslation(input, deps(vi.fn(async () => new Response(null, { status: 401 })))),
    ).toEqual({ ok: false, code: 'signedOut' });
    expect(
      await getTranslation(
        input,
        deps(vi.fn(async () => Response.json({ error: 'model_busy' }, { status: 503 }))),
      ),
    ).toEqual({ ok: false, code: 'model_busy' });
    expect(
      await getTranslation(
        input,
        deps(
          vi.fn(async () => {
            throw new TypeError('offline');
          }),
        ),
      ),
    ).toEqual({ ok: false, code: 'offline' });
  });
});
