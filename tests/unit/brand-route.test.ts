import { describe, expect, test, vi } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { readLines, type StreamLine } from '@/lib/brand/stream';
import { siteTransport } from './helpers/site';

const SITE = 'https://sen.vn/';
const site = siteTransport({
  'https://sen.vn/robots.txt': { text: '' },
  [SITE]: {
    html: '<html><head><script type="application/ld+json">{"@type":"DaySpa","name":"Sen Spa"}</script></head><body><main><p>Massage at your hotel in Da Nang.</p></main></body></html>',
  },
});
const final = {
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

vi.mock('@/lib/brand/deps', () => ({
  defaultDeps: () => ({
    transport: site.transport,
    model: replayTextModel({ modelId: 'm', promptVersion: 'p', partials: [], final }),
  }),
}));

const { POST, maxDuration, runtime } = await import('@/app/api/brand/read/route');

const post = (body: string) =>
  POST(new Request('http://localhost/api/brand/read', { method: 'POST', body }));

describe('POST /api/brand/read', () => {
  test('runs on Node.js with a 30 s cap', () => {
    expect(runtime).toBe('nodejs');
    expect(maxDuration).toBe(30);
  });

  test.each(['not json', '{}', '{"url": 42}'])('%s is 400 invalid_url', async (body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'invalid_url' });
  });

  test('an error before the stream is JSON with its status', async () => {
    const response = await post(JSON.stringify({ url: 'http://10.0.0.5/' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'blocked_address' });
  });

  test('a read streams NDJSON lines ending with final', async () => {
    const response = await post(JSON.stringify({ url: 'sen.vn' }));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/x-ndjson');
    if (!response.body) throw new Error('no body');
    const lines: StreamLine[] = [];
    for await (const line of readLines(response.body)) lines.push(line);
    expect(lines[0].type).toBe('partial');
    expect(lines.at(-1)?.type).toBe('final');
  });
});
