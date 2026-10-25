import { afterEach, describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';

const owner = { id: 'sen' as string | null };
const behaviour = { mode: 'ok' as 'ok' | 'busy' };
const answer = {
  reviewLanguage: 'en',
  abusive: false,
  reviewTranslation: 'Massage tuyệt vời.',
  short: { text: 'Thank you, {name}! 🪷', translation: 'Cảm ơn {name}! 🪷' },
  warm: { text: 'Dear {name}, thank you so much. 🙏', translation: 'Thân mến {name}.' },
};
const rec = { modelId: 'm', promptVersion: 'p', partials: [], final: answer };

vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => owner.id }));
vi.mock('@/lib/brand/deps', () => ({
  defaultReplyDeps: () => ({
    model: replayTextModel(rec, behaviour.mode === 'busy' ? { error: 'busy' } : { replies: rec }),
  }),
}));

const route = await import('@/app/api/reviews/reply/route');

afterEach(() => {
  owner.id = 'sen';
  behaviour.mode = 'ok';
});

const body = {
  review: 'Lovely massage.',
  hasName: true,
  locale: 'vi',
  business: { name: 'Sen Spa', summary: null },
  country: 'VN',
  avoid: null,
};

const request = (payload: unknown) =>
  new Request('http://localhost/api/reviews/reply', {
    method: 'POST',
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });

describe('POST /api/reviews/reply', () => {
  test('runs on Node.js', () => {
    expect(route.runtime).toBe('nodejs');
  });

  test('two replies come back, no-store', async () => {
    const res = await route.POST(request(body));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(await res.json()).toEqual({
      ...answer,
      model: 'gemini-3.5-flash-lite',
      promptVersion: 'reply-2',
    });
  });

  test('a bad body or no JSON is 400 invalid_request', async () => {
    for (const payload of [{ ...body, review: '' }, { ...body, locale: 'fr' }, 'not json']) {
      const res = await route.POST(request(payload));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid_request' });
    }
  });

  test('busy is 503 model_busy', async () => {
    behaviour.mode = 'busy';
    const res = await route.POST(request(body));
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'model_busy' });
  });

  test('no session is 401', async () => {
    owner.id = null;
    const res = await route.POST(request(body));
    expect(res.status).toBe(401);
  });
});
