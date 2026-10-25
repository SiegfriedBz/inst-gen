import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { imageResponseSchema } from '@/lib/posts/image';
import { fakeImageModel, tallPng } from './helpers/images';

let png: Uint8Array;
const owner = { id: 'sen' as string | null };

vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => owner.id }));
vi.mock('@/lib/brand/deps', () => ({
  defaultImageDeps: () =>
    process.env.GOOGLE_IMAGE_API_KEY
      ? { model: fakeImageModel(async () => ({ data: png, mediaType: 'image/png' })) }
      : null,
}));

const route = await import('@/app/api/posts/image/route');

beforeAll(async () => {
  png = await tallPng();
});

afterEach(() => {
  vi.unstubAllEnvs();
  owner.id = 'sen';
});

const good = { postId: 'post-1', imagePrompt: 'Hot stones on a balcony at dusk', scene: 'detail' };
const request = (body: unknown) =>
  new Request('http://localhost/api/posts/image', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

function allowed() {
  vi.stubEnv('IMAGE_OWNERS', 'sen,svarga');
  vi.stubEnv('GOOGLE_IMAGE_API_KEY', 'k');
}

describe('POST /api/posts/image', () => {
  test('runs on Node.js with a 300 s ceiling', () => {
    expect(route.runtime).toBe('nodejs');
    expect(route.maxDuration).toBe(300);
  });

  test('a bad body answers 400 invalid_request', async () => {
    allowed();
    const response = await route.POST(request('{not json'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_request' });
    const wrongScene = await route.POST(request({ ...good, scene: 'room' }));
    expect(wrongScene.status).toBe(400);
  });

  test('a hint over 60 characters answers 400 invalid_request', async () => {
    allowed();
    const res = await route.POST(request({ ...good, hint: 'a'.repeat(61) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid_request' });
  });

  test('an owner not listed answers 403 images_off', async () => {
    allowed();
    owner.id = 'dev';
    const response = await route.POST(request(good));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'images_off' });
  });

  test('no key answers 403 images_off', async () => {
    vi.stubEnv('IMAGE_OWNERS', 'sen');
    vi.stubEnv('GOOGLE_IMAGE_API_KEY', '');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const response = await route.POST(request(good));
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'images_off' });
  });

  test('no session answers 401', async () => {
    allowed();
    owner.id = null;
    const response = await route.POST(request(good));
    expect(response.status).toBe(401);
  });

  test('a listed owner gets 200 and an ImageResponse', async () => {
    allowed();
    const response = await route.POST(request(good));
    expect(response.status).toBe(200);
    expect(imageResponseSchema.parse(await response.json()).postId).toBe('post-1');
  });

  test('every answer is no-store', async () => {
    allowed();
    const ok = await route.POST(request(good));
    const bad = await route.POST(request('{'));
    owner.id = 'dev';
    const off = await route.POST(request(good));
    for (const response of [ok, bad, off]) {
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
  });
});
