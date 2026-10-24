import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { describe, expect, test } from 'vitest';
import {
  createFetcher,
  FetchError,
  type Transport,
  USER_AGENT,
  undiciTransport,
} from '@/lib/brand/fetch-safe';

type Route = () => Response | Promise<Response>;

function memoryTransport(routes: Record<string, Route>) {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  const transport: Transport = async (url, init) => {
    calls.push({ url: url.href, headers: init.headers });
    const route = routes[url.href];
    if (!route) return new Response('missing', { status: 404 });
    return route();
  };
  return { transport, calls };
}

const html =
  (body = '<p>hi</p>') =>
  () =>
    new Response(body, { headers: { 'content-type': 'text/html; charset=utf-8' } });
const redirect = (to: string) => () =>
  new Response(null, { status: 301, headers: { location: to } });

function fetcher(routes: Record<string, Route>, opts: { perResponseMs?: number } = {}) {
  const memory = memoryTransport(routes);
  return {
    ...memory,
    f: createFetcher({
      transport: memory.transport,
      budget: new AbortController().signal,
      ...opts,
    }),
  };
}

async function kindOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    if (error instanceof FetchError) return error.kind;
    throw error;
  }
}

describe('createFetcher', () => {
  test('sends the ShopfrontBot user agent', async () => {
    const { f, calls } = fetcher({ 'https://x.com/': html() });
    await f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false });
    expect(USER_AGENT).toBe('ShopfrontBot/1.0');
    expect(calls[0].headers['user-agent']).toBe('ShopfrontBot/1.0');
  });

  test('follows a same-site redirect and reports the final URL', async () => {
    const { f } = fetcher({
      'https://x.com/': redirect('https://www.x.com/'),
      'https://www.x.com/': html('<p>home</p>'),
    });
    const page = await f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false });
    expect(page.finalUrl.href).toBe('https://www.x.com/');
    expect(new TextDecoder().decode(page.body)).toBe('<p>home</p>');
  });

  test('a 4th redirect is unreachable', async () => {
    const { f } = fetcher({
      'https://x.com/': redirect('/1'),
      'https://x.com/1': redirect('/2'),
      'https://x.com/2': redirect('/3'),
      'https://x.com/3': redirect('/4'),
      'https://x.com/4': html(),
    });
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('unreachable');
  });

  test('three redirects are followed', async () => {
    const { f } = fetcher({
      'https://x.com/': redirect('/1'),
      'https://x.com/1': redirect('/2'),
      'https://x.com/2': redirect('/3'),
      'https://x.com/3': html(),
    });
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('ok');
  });

  test('refuses a redirect to the metadata address before calling it', async () => {
    const { f, calls } = fetcher({ 'https://x.com/': redirect('http://169.254.169.254/') });
    expect(await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: true }))).toBe(
      'blocked',
    );
    expect(calls.map((c) => c.url)).toEqual(['https://x.com/']);
  });

  test('refuses http://127.0.0.1/ without calling the transport', async () => {
    const { f, calls } = fetcher({});
    expect(
      await kindOf(f.fetchPage(new URL('http://127.0.0.1/'), { crossSiteRedirects: false })),
    ).toBe('blocked');
    expect(calls).toHaveLength(0);
  });

  test.each([
    'https://x.com:8443/a.css',
    'http://user:pw@x.com/about',
    'http://8.8.8.8:6379/x.png',
  ])('refuses %s found in a page, without calling the transport', async (url) => {
    const { f, calls } = fetcher({ [url]: html() });
    expect(await kindOf(f.fetchPage(new URL(url), { crossSiteRedirects: false }))).toBe('blocked');
    expect(calls).toHaveLength(0);
  });

  test('refuses a cross-site redirect unless allowed', async () => {
    const routes = { 'https://x.com/': redirect('https://y.com/'), 'https://y.com/': html() };
    const { f } = fetcher(routes);
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('unreachable');
    const page = await f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: true });
    expect(page.finalUrl.host).toBe('y.com');
  });

  test('a redirect to a non-default port is refused', async () => {
    const { f } = fetcher({ 'https://x.com/': redirect('https://x.com:8443/') });
    expect(await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: true }))).toBe(
      'blocked',
    );
  });

  test('cuts a body past 2 MB without reading it all', async () => {
    let pulled = 0;
    const chunk = new Uint8Array(64 * 1024);
    let cancelled = false;
    const endless = () =>
      new Response(
        new ReadableStream<Uint8Array>({
          pull(controller) {
            pulled += chunk.length;
            controller.enqueue(chunk);
          },
          cancel() {
            cancelled = true;
          },
        }),
        { headers: { 'content-type': 'text/html' } },
      );
    const { f } = fetcher({ 'https://x.com/': endless });
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('too_large');
    expect(pulled).toBeLessThanOrEqual(2_000_000 + 3 * chunk.length);
    expect(cancelled).toBe(true);
  });

  test('a page served as PDF is wrong_type', async () => {
    const pdf = () => new Response('%PDF', { headers: { 'content-type': 'application/pdf' } });
    const { f } = fetcher({ 'https://x.com/': pdf });
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('wrong_type');
  });

  test('an SVG is an image only when allowed', async () => {
    const svg = () => new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } });
    const { f } = fetcher({ 'https://x.com/logo.svg': svg });
    const url = new URL('https://x.com/logo.svg');
    expect(await kindOf(f.fetchImage(url, { allowSvg: false }))).toBe('wrong_type');
    expect(await kindOf(f.fetchImage(url, { allowSvg: true }))).toBe('ok');
  });

  test('a JPEG is an image', async () => {
    const jpeg = () => new Response('x', { headers: { 'content-type': 'image/jpeg' } });
    const { f } = fetcher({ 'https://x.com/a.jpg': jpeg });
    const image = await f.fetchImage(new URL('https://x.com/a.jpg'), { allowSvg: false });
    expect(image.contentType).toBe('image/jpeg');
  });

  test('a stylesheet must be text/css', async () => {
    const css = () => new Response(':root{}', { headers: { 'content-type': 'text/css' } });
    const { f } = fetcher({ 'https://x.com/a.css': css, 'https://x.com/b.css': html() });
    expect(await kindOf(f.fetchStylesheet(new URL('https://x.com/a.css')))).toBe('ok');
    expect(await kindOf(f.fetchStylesheet(new URL('https://x.com/b.css')))).toBe('wrong_type');
  });

  test('robots.txt accepts plain text', async () => {
    const robots = () =>
      new Response('User-agent: *', { headers: { 'content-type': 'text/plain' } });
    const { f } = fetcher({ 'https://x.com/robots.txt': robots });
    expect(await kindOf(f.fetchRobots(new URL('https://x.com/robots.txt')))).toBe('ok');
  });

  test('a response that never comes times out', async () => {
    const { f } = fetcher(
      { 'https://x.com/': () => new Promise<Response>(() => {}) },
      {
        perResponseMs: 50,
      },
    );
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('timeout');
  });

  test('the budget stops a fetch in flight', async () => {
    const budget = new AbortController();
    const transport: Transport = (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal.addEventListener('abort', () => reject(init.signal.reason));
      });
    const f = createFetcher({ transport, budget: budget.signal });
    const pending = kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false }));
    budget.abort();
    expect(await pending).toBe('timeout');
  });

  test('status 404 is unreachable', async () => {
    const { f } = fetcher({});
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('unreachable');
  });

  test('a lookup that blocks the address is blocked', async () => {
    const transport: Transport = async () => {
      const cause: NodeJS.ErrnoException = new Error('blocked');
      cause.code = 'BLOCKED_ADDRESS';
      throw new TypeError('fetch failed', { cause });
    };
    const f = createFetcher({ transport, budget: new AbortController().signal });
    expect(
      await kindOf(f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false })),
    ).toBe('blocked');
  });

  test('records each successful fetch', async () => {
    const seen: string[] = [];
    const memory = memoryTransport({ 'https://x.com/': html() });
    const f = createFetcher({
      transport: memory.transport,
      budget: new AbortController().signal,
      record: (fetched) => seen.push(fetched.url.href),
    });
    await f.fetchPage(new URL('https://x.com/'), { crossSiteRedirects: false });
    expect(seen).toEqual(['https://x.com/']);
  });
});

describe('undiciTransport', () => {
  test('refuses a server on localhost', async () => {
    let hits = 0;
    const server = createServer((_req, res) => {
      hits++;
      res.setHeader('content-type', 'text/html');
      res.end('<p>private</p>');
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const { port } = server.address() as AddressInfo;
    try {
      const f = createFetcher({
        transport: undiciTransport(),
        budget: new AbortController().signal,
      });
      const result = await kindOf(
        f.fetchPage(new URL(`http://localhost:${port}/`), { crossSiteRedirects: false }),
      );
      expect(result).toBe('blocked');
      expect(hits).toBe(0);
    } finally {
      server.close();
    }
  });
});
