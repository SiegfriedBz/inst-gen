import { describe, expect, test, vi } from 'vitest';
import { replaySearchTool } from '@/lib/search/replay';
import { SearchError } from '@/lib/search/search-tool';
import { tavilySearchTool } from '@/lib/search/tavily';

const OPTIONS = { country: 'vietnam' as const, excludeDomains: ['sendanangmassage.com'] };

function fakeFetch(status: number, body: unknown = { results: [] }) {
  return vi.fn(
    async (_url: string | URL | Request, _init?: RequestInit) =>
      new Response(JSON.stringify(body), { status }),
  );
}

function sentBody(fetch: ReturnType<typeof fakeFetch>): Record<string, unknown> {
  return JSON.parse(String(fetch.mock.calls[0]?.[1]?.body));
}

describe('the Tavily search tool', () => {
  test('sends a basic search with the fixed options', async () => {
    const fetch = fakeFetch(200);
    const tool = tavilySearchTool({ fetch, apiKey: 'test-key' });
    await tool.search('massage spa Da Nang', OPTIONS, new AbortController().signal);
    expect(fetch.mock.calls[0]?.[0]).toBe('https://api.tavily.com/search');
    expect(sentBody(fetch)).toEqual({
      query: 'massage spa Da Nang',
      search_depth: 'basic',
      auto_parameters: false,
      max_results: 5,
      topic: 'general',
      country: 'vietnam',
      exclude_domains: ['sendanangmassage.com'],
    });
    const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers);
    expect(headers.get('authorization')).toBe('Bearer test-key');
  });

  test('leaves country out when it is null', async () => {
    const fetch = fakeFetch(200);
    const tool = tavilySearchTool({ fetch, apiKey: 'test-key' });
    await tool.search('q', { ...OPTIONS, country: null }, new AbortController().signal);
    expect(sentBody(fetch)).not.toHaveProperty('country');
  });

  test('keeps only title, url and content', async () => {
    const fetch = fakeFetch(200, {
      results: [
        {
          title: 'Da Nang',
          url: 'https://vietnam.travel/da-nang',
          content: 'Surf at My Khe',
          score: 0.9,
          favicon: 'x',
        },
      ],
    });
    const tool = tavilySearchTool({ fetch, apiKey: 'test-key' });
    expect(await tool.search('q', OPTIONS, new AbortController().signal)).toEqual([
      { title: 'Da Nang', url: 'https://vietnam.travel/da-nang', content: 'Surf at My Khe' },
    ]);
  });

  test('is unavailable without a key', async () => {
    const fetch = fakeFetch(200);
    const tool = tavilySearchTool({ fetch, apiKey: '' });
    await expect(tool.search('q', OPTIONS, new AbortController().signal)).rejects.toMatchObject({
      kind: 'unavailable',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  test.each([429, 432, 433])('is busy on %i', async (status) => {
    const tool = tavilySearchTool({ fetch: fakeFetch(status), apiKey: 'test-key' });
    const error = await tool.search('q', OPTIONS, new AbortController().signal).catch((e) => e);
    expect(error).toBeInstanceOf(SearchError);
    expect(error.kind).toBe('busy');
  });

  test('fails on any other status', async () => {
    const tool = tavilySearchTool({ fetch: fakeFetch(500), apiKey: 'test-key' });
    await expect(tool.search('q', OPTIONS, new AbortController().signal)).rejects.toMatchObject({
      kind: 'failed',
    });
  });

  test('passes the abort signal to fetch', async () => {
    const fetch = fakeFetch(200);
    const signal = new AbortController().signal;
    await tavilySearchTool({ fetch, apiKey: 'test-key' }).search('q', OPTIONS, signal);
    expect(fetch.mock.calls[0]?.[1]?.signal).toBe(signal);
  });
});

describe('the replayed search tool', () => {
  const recording = {
    queries: [{ query: 'q', results: [{ title: 't', url: 'https://a.example/', content: 'c' }] }],
  };

  test('answers a recorded query, and nothing for another', async () => {
    const tool = replaySearchTool(recording);
    const signal = new AbortController().signal;
    expect(await tool.search('q', OPTIONS, signal)).toEqual(recording.queries[0]?.results);
    expect(await tool.search('other', OPTIONS, signal)).toEqual([]);
  });

  test('replays an error', async () => {
    const tool = replaySearchTool(recording, { error: 'busy' });
    await expect(tool.search('q', OPTIONS, new AbortController().signal)).rejects.toMatchObject({
      kind: 'busy',
    });
  });
});
