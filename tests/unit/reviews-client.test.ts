import { describe, expect, test, vi } from 'vitest';
import { replyBodyFor, requestReplies } from '@/lib/reviews/client';
import { goesToGuests } from '@/lib/reviews/copy-rules';
import { senProfile, svargaProfile } from './helpers/brand';

// The reply request from the phone (docs/specs/reviews/reply-drafts, "The
// model call"). The guest's name stays on the phone.
const answer = {
  reviewLanguage: 'en',
  abusive: false,
  reviewTranslation: 'Massage tuyệt vời.',
  short: { text: 'Thank you, {name}! 🪷', translation: 'Cảm ơn {name}! 🪷' },
  warm: { text: 'Dear {name}, thank you. 🙏', translation: 'Thân mến {name}.' },
  model: 'gemini-3.5-flash-lite',
  promptVersion: 'reply-1',
};

function fetchAnswering(status: number, json: unknown) {
  return vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
    Response.json(json, { status }),
  );
}

const input = {
  review: '  Lovely hot stone massage.\n',
  name: 'Anna K.',
  locale: 'vi' as const,
  profile: senProfile(),
  avoid: null,
};

function sent(fetch: ReturnType<typeof fetchAnswering>) {
  return JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
}

describe('requestReplies', () => {
  test('posts the review with the business and no name, and answers the replies', async () => {
    const fetch = fetchAnswering(200, answer);
    expect(await requestReplies(input, { fetch })).toEqual({ ok: true, answer });
    expect(fetch.mock.calls[0]?.[0]).toBe('/api/reviews/reply');
    const body = sent(fetch);
    expect(body).toEqual({
      review: 'Lovely hot stone massage.',
      hasName: true,
      locale: 'vi',
      business: {
        name: senProfile().name.value,
        summary: senProfile().summary?.value ?? null,
        offerings: ['Vietnamese Traditional Massage', 'Foot Reflexology'],
        goesToGuests: false,
      },
      country: 'VN',
      avoid: null,
    });
    expect(String(fetch.mock.calls[0]?.[1]?.body)).not.toContain('Anna');
  });

  test('the review goes trimmed', async () => {
    const fetch = fetchAnswering(200, answer);
    await requestReplies(input, { fetch });
    expect(sent(fetch).review).toBe('Lovely hot stone massage.');
  });

  test("Svarga's country, no name and two replies to avoid", async () => {
    const fetch = fetchAnswering(200, answer);
    await requestReplies(
      {
        ...input,
        name: '  ',
        profile: svargaProfile(),
        avoid: ['Thank you, {name}!', 'Dear {name}.'],
      },
      { fetch },
    );
    const body = sent(fetch);
    expect(body.country).toBe('ID');
    expect(body.hasName).toBe(false);
    expect(body.avoid).toEqual(['Thank you, {name}!', 'Dear {name}.']);
  });

  test("sends Svarga's treatment names, and that a business with a service area goes to its guests", () => {
    const body = replyBodyFor({ ...input, profile: svargaProfile() });
    expect(body.business.offerings).toEqual(['Balinese massage']);
    expect(body.business.goesToGuests).toBe(true);
  });

  test('a blank service area goes nowhere; the first 20 treatments go, each cut at 200 characters', () => {
    const sen = senProfile();
    const profile = {
      ...sen,
      location: { ...sen.location, serviceArea: { value: '  ', source: sen.name.source } },
      offerings: Array.from({ length: 25 }, (_, i) => ({
        name: `${'x'.repeat(250)}${i}`,
        lengths: [],
        source: sen.name.source,
      })),
    };
    const body = replyBodyFor({ ...input, profile });
    expect(body.business.goesToGuests).toBe(false);
    expect(body.business.offerings).toHaveLength(20);
    expect(body.business.offerings[0]).toBe('x'.repeat(200));
  });

  test('fails as signed out, offline, busy or failed', async () => {
    expect(await requestReplies(input, { fetch: fetchAnswering(401, {}) })).toEqual({
      ok: false,
      code: 'signedOut',
    });
    const offline = vi.fn(async () => {
      throw new TypeError('network');
    });
    expect(await requestReplies(input, { fetch: offline })).toEqual({
      ok: false,
      code: 'offline',
    });
    expect(
      await requestReplies(input, { fetch: fetchAnswering(503, { error: 'model_busy' }) }),
    ).toEqual({ ok: false, code: 'model_busy' });
    expect(await requestReplies(input, { fetch: fetchAnswering(200, { nope: 1 }) })).toEqual({
      ok: false,
      code: 'model_failed',
    });
  });
});

describe('goesToGuests', () => {
  test('a service area means the business goes to its guests', () => {
    expect(goesToGuests('My Khe')).toBe(true);
    expect(goesToGuests('  ')).toBe(false);
    expect(goesToGuests(null)).toBe(false);
    expect(goesToGuests(undefined)).toBe(false);
  });
});
