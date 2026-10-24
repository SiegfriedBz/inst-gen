import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { scoreFixture } from '@/lib/brand/eval/score';
import { fixtureTransport, loadFixture } from '@/lib/brand/fixtures';
import { prepareRead, streamProfile } from '@/lib/brand/read';

const DIR = 'tests/fixtures/sites/_sample';
const signal = () => new AbortController().signal;
const get = (transport: ReturnType<typeof fixtureTransport>, url: string) =>
  transport(new URL(url), { signal: signal(), headers: {} });

describe('fixtureTransport', () => {
  test('redirects the saved start URL to its final URL', async () => {
    const response = await get(fixtureTransport(DIR), 'https://lotusbay.example/');
    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('https://www.lotusbay.example/');
  });

  test("serves _sample's home page at its final URL", async () => {
    const response = await get(fixtureTransport(DIR), 'https://www.lotusbay.example/');
    expect(response.headers.get('content-type')).toBe('text/html');
    expect(await response.text()).toContain('Lotus Bay Spa');
  });

  test('returns 404 for an uncached image without live', async () => {
    const response = await get(
      fixtureTransport(DIR, { imageCache: '.fixtures-cache/_none' }),
      'https://www.lotusbay.example/river.jpg',
    );
    expect(response.status).toBe(404);
  });

  test('asks live for an image it does not hold', async () => {
    const live = async () =>
      new Response(new Uint8Array([1]), { headers: { 'content-type': 'image/jpeg' } });
    const response = await get(
      fixtureTransport(DIR, { imageCache: '.fixtures-cache/_none', live }),
      'https://www.lotusbay.example/river.jpg',
    );
    expect(response.status).toBe(200);
  });

  test('never asks live for a page it does not hold', async () => {
    let asked = false;
    const live = async () => {
      asked = true;
      return new Response('x');
    };
    const response = await get(
      fixtureTransport(DIR, { live }),
      'https://www.lotusbay.example/blog',
    );
    expect(response.status).toBe(404);
    expect(asked).toBe(false);
  });
});

describe('the _sample fixture', () => {
  test('prepareRead and the replayed model give a profile that passes its expected file', async () => {
    const fixture = loadFixture(DIR);
    if (!fixture.recording) throw new Error('no recording');
    const deps = { transport: fixtureTransport(DIR), model: replayTextModel(fixture.recording) };
    const prepared = await prepareRead(fixture.manifest.siteUrl, deps, signal());
    let final: unknown;
    for await (const line of streamProfile(prepared, deps, signal())) {
      if (line.type === 'error') throw new Error(line.code);
      if (line.type === 'final') final = line.profile;
    }
    if (!final) throw new Error('no final');
    const score = scoreFixture(final as never, fixture.expected, prepared.pages);
    expect(score).toEqual({ pass: true, failures: [] });
    expect(prepared.pagesRead).toEqual([
      'https://www.lotusbay.example/',
      'https://www.lotusbay.example/prices',
    ]);
  });
});
