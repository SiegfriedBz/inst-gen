import { afterEach, describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';

// POST /api/questions/answer (docs/specs/questions/answer-drafts, "The model call").
const owner = { id: 'sen' as string | null };
const behaviour = { mode: 'ok' as 'ok' | 'busy' };
const part = (text: string) => ({ text, translation: `vi: ${text}` });
const answer = {
  questionLanguage: 'en',
  sexual: false,
  unanswered: false,
  questionTranslation: 'vi: question',
  greeting: part('Hello!'),
  answer: part('Thai Massage, 60 min: VND 500k. 🌸'),
  professionalOnly: part('We offer only professional therapeutic massage.'),
  callToAction: part(''),
  guest: { place: null, day: null, time: null },
};
const rec = { modelId: 'm', promptVersion: 'p', partials: [], final: answer };

vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => owner.id }));
vi.mock('@/lib/brand/deps', () => ({
  defaultAnswerDeps: () => ({
    model: replayTextModel(rec, behaviour.mode === 'busy' ? { error: 'busy' } : { answers: rec }),
  }),
}));

const route = await import('@/app/api/questions/answer/route');

afterEach(() => {
  owner.id = 'sen';
  behaviour.mode = 'ok';
});

const body = {
  question: 'How much is a Thai massage?',
  final: false,
  locale: 'vi',
  business: {
    name: 'Sen',
    summary: null,
    category: 'mobile massage spa',
    offerings: [{ name: 'Thai Massage', duration: '60 min', price: 'VND 500k' }],
    highlights: [],
    hours: null,
    town: 'Da Nang',
    area: null,
    serviceArea: null,
    contact: { whatsapp: null, phone: null, email: null, instagram: null, bookingUrl: null },
  },
  country: 'VN',
  known: { place: null, day: null, time: null },
  avoid: null,
};

const request = (payload: unknown) =>
  new Request('http://localhost/api/questions/answer', {
    method: 'POST',
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });

describe('POST /api/questions/answer', () => {
  test('runs on Node.js', () => {
    expect(route.runtime).toBe('nodejs');
  });

  test('the built answer comes back, no-store', async () => {
    const res = await route.POST(request(body));
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    const json = await res.json();
    expect(json.answer.text).toBe('Hello!\n\nThai Massage, 60 min: VND 500k. 🪷');
    expect(json.model).toBe('gemini-3.5-flash-lite');
    expect(json.promptVersion).toBe('answer-1');
    expect(json).not.toHaveProperty('sexualBy');
  });

  test('a bad body or no JSON is 400 invalid_request', async () => {
    for (const payload of [{ ...body, question: '' }, { ...body, locale: 'fr' }, 'not json']) {
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
    expect((await route.POST(request(body))).status).toBe(401);
  });
});
