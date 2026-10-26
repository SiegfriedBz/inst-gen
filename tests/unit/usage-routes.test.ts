import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { ModelError, type TextModel, toModelStream } from '@/lib/ai/text-model';
import { replaySearchTool } from '@/lib/search/replay';
import { usageDay } from '@/lib/usage/day';
import { OWNER_LIMITS } from '@/lib/usage/limits';
import { memoryStore, type UsageStore } from '@/lib/usage/store';
import { svargaProfile } from './helpers/brand';
import { fakeImageModel, tallPng } from './helpers/images';
import { modelPost, planRecording, post } from './helpers/posts';
import { siteTransport } from './helpers/site';

// Every counted route takes its count before the model, refuses past a
// limit without calling it, and gives the owner's count back on a failure
// that isn't the owner's (docs/specs/platform/usage-counters).

const SITE = 'https://sen.vn/';
const site = siteTransport({
  'https://sen.vn/robots.txt': { text: '' },
  [SITE]: {
    html: '<html><head><script type="application/ld+json">{"@type":"DaySpa","name":"Sen Spa"}</script></head><body><main><p>Massage at your hotel in Da Nang.</p></main></body></html>',
  },
});
const profileFinal = {
  name: { value: 'Sen Spa', source: SITE },
  summary: null,
  category: 'massage spa',
  offerings: [],
  highlights: [],
  location: { town: null, area: null, address: null, serviceArea: null },
  contact: { whatsapp: null, phone: null, email: null, instagram: null, bookingUrl: null },
  hours: null,
  tone: ['calm', 'warm', 'caring'],
  colours: [],
  visualStyle: null,
};
const rec = { modelId: 'm', promptVersion: 'p', partials: [], final: profileFinal };
const replies = {
  modelId: 'm',
  promptVersion: 'p',
  partials: [],
  final: {
    reviewLanguage: 'en',
    abusive: false,
    reviewTranslation: 'Tuyệt.',
    short: { text: 'Thank you, {name}! 🪷', translation: 'Cảm ơn {name}! 🪷' },
    warm: { text: 'Dear {name}, thank you. 🙏', translation: 'Thân mến {name}.' },
  },
};

const state = {
  owner: 'sen' as string | null,
  mode: 'ok' as 'ok' | 'busy' | 'midstream',
  calls: 0,
  store: memoryStore() as UsageStore,
};
let png: Uint8Array;

// Counts every model call, so a refusal can show none was made.
function counted(model: TextModel): TextModel {
  const out = {} as Record<string, unknown>;
  for (const [name, fn] of Object.entries(model)) {
    out[name] = (...args: unknown[]) => {
      state.calls += 1;
      return (fn as (...a: unknown[]) => unknown)(...args);
    };
  }
  return out as unknown as TextModel;
}

function textModel(): TextModel {
  const base = replayTextModel(rec, {
    ...(state.mode === 'busy' ? { error: 'busy' as const } : {}),
    posts: planRecording(),
    replies,
    translation: { ...rec, final: 'Dầu ấm.' },
    searchAnswer: { searchTerms: ['hotel massage da nang'], moments: [], placeSymbols: [] },
  });
  if (state.mode !== 'midstream') return counted(base);
  return counted({
    ...base,
    streamPostPlan() {
      async function* run(): AsyncGenerator<never, never> {
        yield { posts: [modelPost(0), modelPost(1)] } as never;
        throw new ModelError('failed', 'cut');
      }
      return toModelStream(run());
    },
  });
}

vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => state.owner }));
vi.mock('@/lib/usage/store', async (original) => ({
  ...(await original<typeof import('@/lib/usage/store')>()),
  getUsageStore: () => state.store,
}));
vi.mock('@/lib/brand/deps', () => ({
  defaultDeps: () => ({ transport: site.transport, model: textModel() }),
  defaultSearchDeps: () => ({ tool: replaySearchTool({ queries: [] }), model: textModel() }),
  defaultPostsDeps: () => ({ model: textModel() }),
  defaultTranslateDeps: () => ({ model: textModel() }),
  defaultReplyDeps: () => ({ model: textModel() }),
  defaultImageDeps: () =>
    process.env.GOOGLE_IMAGE_API_KEY
      ? {
          model: fakeImageModel(async () => {
            state.calls += 1;
            if (state.mode === 'busy') throw new Error('boom');
            return { data: png, mediaType: 'image/png' };
          }),
        }
      : null,
}));

const read = await import('@/app/api/brand/read/route');
const search = await import('@/app/api/brand/search/route');
const plan = await import('@/app/api/posts/plan/route');
const rewrite = await import('@/app/api/posts/rewrite/route');
const translate = await import('@/app/api/posts/translate/route');
const reply = await import('@/app/api/reviews/reply/route');
const image = await import('@/app/api/posts/image/route');

beforeAll(async () => {
  png = await tallPng();
});
beforeEach(() => {
  vi.spyOn(console, 'info').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.stubEnv('GOOGLE_IMAGE_API_KEY', 'test-key');
});
afterEach(() => {
  state.owner = 'sen';
  state.mode = 'ok';
  state.calls = 0;
  state.store = memoryStore();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const req = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: 'POST', body: JSON.stringify(body) });

async function drain(response: Response): Promise<string> {
  return response.body ? await new Response(response.body).text() : '';
}

type Case = {
  name: string;
  action: keyof typeof OWNER_LIMITS;
  call: () => Promise<Response>;
};

const cases: Case[] = [
  {
    name: 'brand read',
    action: 'reads',
    call: () => read.POST(req('/api/brand/read', { url: SITE })),
  },
  {
    name: 'posts plan',
    action: 'attempts',
    call: () => plan.POST(req('/api/posts/plan', { profile: svargaProfile(), recent: [] })),
  },
  {
    name: 'posts rewrite',
    action: 'rewrites',
    call: () =>
      rewrite.POST(req('/api/posts/rewrite', { profile: svargaProfile(), posts: [post()] })),
  },
  {
    name: 'translate',
    action: 'translations',
    call: () => translate.POST(req('/api/posts/translate', { text: 'Warm oil.', locale: 'vi' })),
  },
  {
    name: 'reply',
    action: 'replies',
    call: () =>
      reply.POST(
        req('/api/reviews/reply', {
          review: 'Lovely massage.',
          hasName: true,
          locale: 'vi',
          business: { name: 'Sen Spa', summary: null },
          country: 'VN',
          avoid: null,
        }),
      ),
  },
  {
    name: 'new image',
    action: 'newImages',
    call: () =>
      image.POST(
        req('/api/posts/image', {
          postId: 'post-1',
          imagePrompt: 'Hot stones on a balcony at dusk',
          scene: 'detail',
          first: false,
        }),
      ),
  },
];

const ownerCount = async (action: string, ownerId = 'sen') =>
  (await state.store.read([`usage:${usageDay(new Date())}:${ownerId}:${action}`]))[0];

async function fill(action: keyof typeof OWNER_LIMITS) {
  const key = `usage:${usageDay(new Date())}:sen:${action}`;
  for (let i = 0; i < OWNER_LIMITS[action]; i++) {
    await state.store.take([{ key, max: null, ttlSeconds: 60 }]);
  }
}

describe.each(cases)('$name', ({ action, call }) => {
  test('a success takes one', async () => {
    const response = await call();
    const text = await drain(response);
    expect(response.status).toBe(200);
    expect(text).not.toContain('"type":"error"');
    expect(await ownerCount(action)).toBe(1);
  });

  test('past the limit: 429 limit_reached, and no model call', async () => {
    await fill(action);
    const response = await call();
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body.error).toBe('limit_reached');
    expect(typeof body.resetsAt).toBe('string');
    expect(state.calls).toBe(0);
  });

  test('a model failure gives the count back', async () => {
    state.mode = 'busy';
    await drain(await call());
    expect(await ownerCount(action)).toBe(0);
  });

  test('dev passes the owner limit', async () => {
    state.owner = 'dev';
    await fill(action);
    const response = await call();
    await drain(response);
    expect(response.status).toBe(200);
  });
});

describe('streams and images', () => {
  test('a plan that fails after its first post gives the attempt back once', async () => {
    state.mode = 'midstream';
    const text = await drain(await cases[1].call());
    expect(text).toContain('"type":"post"');
    expect(text).toContain('"type":"error"');
    expect(await ownerCount('attempts')).toBe(0);
  });

  test('a first image is counted in the month, not the owner day', async () => {
    const response = await image.POST(
      req('/api/posts/image', { postId: 'p', imagePrompt: 'Hot stones at dusk', scene: 'detail' }),
    );
    expect(response.status).toBe(200);
    expect(await ownerCount('newImages')).toBe(0);
    const month = new Date().toISOString().slice(0, 7);
    expect(await state.store.read([`usage:${month}:images`])).toEqual([1]);
  });

  test('without the image key, images_off and nothing counted', async () => {
    vi.stubEnv('GOOGLE_IMAGE_API_KEY', '');
    const response = await cases[5].call();
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: 'images_off' });
    const month = new Date().toISOString().slice(0, 7);
    expect(await state.store.read([`usage:${month}:images`])).toEqual([0]);
  });

  test('a store that fails: images 503 usage_unavailable, text goes ahead', async () => {
    const down = async () => {
      throw new Error('down');
    };
    state.store = { take: down, giveBack: down, read: down };
    const img = await cases[5].call();
    expect(img.status).toBe(503);
    expect((await img.json()).error).toBe('usage_unavailable');
    expect((await cases[3].call()).status).toBe(200);
  });
});

describe('search', () => {
  const body = {
    siteUrl: 'https://sendanangmassage.com/',
    category: 'massage spa',
    town: 'Da Nang',
    area: null,
    serviceArea: null,
    country: 'VN',
    essence: { feeling: [], placeSymbols: [], senses: [], moments: [], searchTerms: [] },
  };

  test('a full month answers 503 search_unavailable, with no search', async () => {
    vi.stubEnv('SEARCHES_PER_MONTH', '1');
    await drain(await search.POST(req('/api/brand/search', body)));
    state.calls = 0;
    const response = await search.POST(req('/api/brand/search', body));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'search_unavailable' });
    expect(state.calls).toBe(0);
  });
});
