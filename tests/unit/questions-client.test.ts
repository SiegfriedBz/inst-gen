import { describe, expect, test, vi } from 'vitest';
import { requestAnswer } from '@/lib/questions/client';
import { senProfile } from './helpers/brand';

// The answer request from the phone (docs/specs/questions/answer-drafts, "What
// leaves the phone" and "The model call").
const response = {
  questionLanguage: 'en',
  sexual: false,
  unanswered: false,
  questionTranslation: 'Giá?',
  answer: { text: 'Hello!\n\nThai Massage, 60 min.', translation: 'Xin chào!\n\nMassage Thái.' },
  guest: { place: null, day: null, time: null },
  flags: [],
  model: 'gemini-3.5-flash-lite',
  promptVersion: 'answer-1',
};

function fetchAnswering(status: number, json: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    Response.json(json, { status }),
  );
}

const input = {
  question: '  How much? Call me on +84 905 123 456, room 405\n',
  final: true,
  locale: 'vi' as const,
  profile: senProfile(),
  known: { place: 'Hyatt', day: null, time: null },
  avoid: 'Hello! Old answer.',
};

function sent(fetch: ReturnType<typeof fetchAnswering>) {
  return JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
}

describe('requestAnswer', () => {
  test('posts the question without its phone number, with the business and what the guest told', async () => {
    const fetch = fetchAnswering(200, response);
    expect(await requestAnswer(input, { fetch })).toEqual({ ok: true, answer: response });
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/questions/answer');
    const body = sent(fetch);
    expect(body.question).toBe('How much? Call me on [number], room 405');
    expect(JSON.stringify(body)).not.toContain('905 123 456');
    expect(body.final).toBe(true);
    expect(body.known).toEqual({ place: 'Hyatt', day: null, time: null });
    expect(body.avoid).toBe('Hello! Old answer.');
    expect(body.business.name).toBe(senProfile().name.value);
    expect(body.business.offerings.length).toBe(senProfile().offerings.length);
    expect(body.country).toBe('VN');
  });

  test('an error code, a session gone, a broken answer and no network', async () => {
    expect(
      await requestAnswer(input, { fetch: fetchAnswering(504, { error: 'model_timeout' }) }),
    ).toEqual({
      ok: false,
      code: 'model_timeout',
    });
    expect(await requestAnswer(input, { fetch: fetchAnswering(401, {}) })).toEqual({
      ok: false,
      code: 'signedOut',
    });
    expect(await requestAnswer(input, { fetch: fetchAnswering(200, { nope: 1 }) })).toEqual({
      ok: false,
      code: 'model_failed',
    });
    const offline = vi.fn(async () => {
      throw new TypeError('offline');
    });
    expect(await requestAnswer(input, { fetch: offline })).toEqual({ ok: false, code: 'offline' });
  });
});
