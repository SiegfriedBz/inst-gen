import { afterEach, describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { ModelError } from '@/lib/ai/text-model';

const owner = { id: 'sen' as string | null };
const behaviour = { mode: 'ok' as 'ok' | 'busy' };
const sent: string[] = [];

vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => owner.id }));
vi.mock('@/lib/brand/deps', () => ({
  defaultTranslateDeps: () => ({
    model: {
      ...replayTextModel({ modelId: 'm', promptVersion: 'p', partials: [], final: {} }),
      async translateCaption(text: string) {
        sent.push(text);
        if (behaviour.mode === 'busy') throw new ModelError('busy', 'quota');
        return 'Dầu ấm.';
      },
    },
  }),
}));

const route = await import('@/app/api/posts/translate/route');

afterEach(() => {
  owner.id = 'sen';
  behaviour.mode = 'ok';
  sent.length = 0;
});

const request = (body: unknown) =>
  new Request('http://localhost/api/posts/translate', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

describe('POST /api/posts/translate', () => {
  test('runs on Node.js', () => {
    expect(route.runtime).toBe('nodejs');
  });

  test('a caption comes back translated, no-store', async () => {
    const res = await route.POST(request({ text: 'Warm oil.', locale: 'vi' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({
      text: 'Dầu ấm.',
      model: 'gemini-3.5-flash-lite',
      promptVersion: 'translate-1',
    });
    expect(sent).toEqual(['Warm oil.']);
  });

  test('a bad locale or a long text is 400 invalid_request', async () => {
    for (const body of [
      { text: 'Warm oil.', locale: 'en' },
      { text: 'a'.repeat(2201), locale: 'vi' },
      'not json',
    ]) {
      const res = await route.POST(request(body));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid_request' });
    }
    expect(sent).toEqual([]);
  });

  test('busy is 503 model_busy', async () => {
    behaviour.mode = 'busy';
    const res = await route.POST(request({ text: 'Warm oil.', locale: 'id' }));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'model_busy' });
  });

  test('no session is 401', async () => {
    owner.id = null;
    const res = await route.POST(request({ text: 'Warm oil.', locale: 'vi' }));
    expect(res.status).toBe(401);
  });
});
