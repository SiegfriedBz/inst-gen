import { afterEach, describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { tavilySearchTool } from '@/lib/search/tavily';

// The developer: no owner limits get in the way (docs/specs/platform/usage-counters).
vi.mock('@/lib/pilot/current-owner', () => ({ getCurrentOwner: async () => 'dev' }));
vi.mock('@/lib/brand/deps', () => ({
  defaultSearchDeps: () => ({
    tool: tavilySearchTool(),
    model: replayTextModel({ modelId: 'm', promptVersion: 'p', partials: [], final: {} }),
  }),
}));

const { POST, maxDuration, runtime } = await import('@/app/api/brand/search/route');

const body = {
  siteUrl: 'https://sendanangmassage.com/',
  category: 'massage spa',
  town: 'Da Nang',
  area: null,
  serviceArea: null,
  country: 'VN',
  essence: { feeling: [], placeSymbols: [], senses: [], moments: [], searchTerms: [] },
};
const post = (value: unknown) =>
  POST(
    new Request('http://localhost/api/brand/search', {
      method: 'POST',
      body: typeof value === 'string' ? value : JSON.stringify(value),
    }),
  );

afterEach(() => vi.unstubAllEnvs());

describe('POST /api/brand/search', () => {
  test('runs on Node.js with a 60 s ceiling, above the 20 s step', () => {
    expect(runtime).toBe('nodejs');
    expect(maxDuration).toBe(60);
  });

  test('answers 400 search_failed on a body without a town', async () => {
    const response = await post({ ...body, town: '' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'search_failed' });
  });

  test('answers 400 search_failed on a body that is not JSON', async () => {
    const response = await post('not json');
    expect(response.status).toBe(400);
  });

  test('answers 503 search_unavailable without TAVILY_API_KEY', async () => {
    vi.stubEnv('TAVILY_API_KEY', '');
    const response = await post(body);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'search_unavailable' });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
