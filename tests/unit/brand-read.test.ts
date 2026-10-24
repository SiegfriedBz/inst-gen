import { describe, expect, test } from 'vitest';
import { replayTextModel } from '@/lib/ai/replay';
import { BRAND_PROMPT_VERSION } from '@/lib/brand/prompt';
import { BrandReadError, prepareRead, type ReadDeps, streamProfile } from '@/lib/brand/read';
import type { StreamLine } from '@/lib/brand/stream';
import { type SiteFile, siteTransport } from './helpers/site';

const SITE = 'https://sen.vn/';

const homeHtml = `<html><head>
  <title>Sen Spa | Mobile massage in Da Nang</title>
  <meta name="theme-color" content="#1f6f5c">
  <script type="application/ld+json">${JSON.stringify({
    '@type': 'DaySpa',
    name: 'Sen Spa',
    address: { addressLocality: 'Da Nang', addressCountry: 'VN' },
    telephone: '+84 905 123 456',
  })}</script>
  <style>:root{--brand-accent:#e07a2f}</style>
</head><body>
  <header><img class="logo" src="/logo.png"></header>
  <main><h1>Sen Spa</h1><p>Massage at your hotel in Da Nang. Book on WhatsApp.</p>
  <img src="/hero.jpg" width="1600"><img src="/stones.jpg" width="1200"></main>
  <a href="/about">About us</a><a href="/services">Our services</a>
  <a href="https://wa.me/84905123456">WhatsApp</a>
</body></html>`;

const baseSite: Record<string, SiteFile> = {
  'https://sen.vn/robots.txt': { text: 'User-agent: *\nAllow: /\n' },
  [SITE]: { html: homeHtml },
  'https://sen.vn/about': { html: '<main><p>Our therapists come to you.</p></main>' },
  'https://sen.vn/services': {
    html: '<main><p>Aroma massage 450,000 VND, 90 minutes.</p></main>',
  },
  'https://sen.vn/logo.png': { image: 'image/png' },
  'https://sen.vn/hero.jpg': { image: 'image/jpeg' },
  'https://sen.vn/stones.jpg': { image: 'image/jpeg' },
};

const modelFinal = {
  name: { value: 'Sen Spa', source: SITE },
  summary: { value: 'Mobile massage at your hotel in Da Nang', source: SITE },
  category: 'massage spa',
  offerings: [
    {
      name: 'Aroma massage',
      price: '450,000 VND',
      duration: '90 minutes',
      source: 'https://sen.vn/services',
    },
  ],
  highlights: [{ value: 'Therapists come to you', source: 'https://sen.vn/about' }],
  location: { town: null, area: null, address: null, serviceArea: null },
  contact: { whatsapp: null, phone: null, email: null, instagram: null, bookingUrl: null },
  hours: null,
  tone: ['calm', 'warm', 'caring'],
  colours: [],
  visualStyle: {
    summary: 'soft light, natural textures',
    palette: 'green and sand',
    light: 'soft',
    textures: 'stone, linen',
    mood: 'calm',
  },
};

const recording = {
  modelId: 'gemini-3.8-flash',
  promptVersion: 'brand-1',
  partials: [
    { category: 'massage spa' },
    { category: 'massage spa', contact: { whatsapp: { value: '+84 911 000 999', source: SITE } } },
    { ...modelFinal, tone: ['calm'] },
  ],
  final: modelFinal,
};

function deps(files: Record<string, SiteFile>, extra: Partial<ReadDeps> = {}) {
  const site = siteTransport(files);
  return {
    site,
    deps: { transport: site.transport, model: replayTextModel(recording), ...extra } as ReadDeps,
  };
}

async function read(url: string, d: ReadDeps): Promise<StreamLine[]> {
  const signal = new AbortController().signal;
  const prepared = await prepareRead(url, d, signal);
  const lines: StreamLine[] = [];
  for await (const line of streamProfile(prepared, d, signal)) lines.push(line);
  return lines;
}

async function codeOf(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
    return 'ok';
  } catch (error) {
    if (error instanceof BrandReadError) return error.code;
    throw error;
  }
}

describe('brand read', () => {
  test('full read on a small site', async () => {
    const { deps: d } = deps(baseSite);
    const lines = await read('sen.vn', d);
    expect(lines[0]).toMatchObject({
      type: 'partial',
      profile: {
        name: { value: 'Sen Spa' },
        contact: { whatsapp: { value: '+84905123456' }, phone: { value: '+84905123456' } },
        colours: [
          { hex: '#1f6f5c', role: 'primary' },
          { hex: '#e07a2f', role: 'accent' },
        ],
        logoUrl: { value: 'https://sen.vn/logo.png' },
      },
    });
    const last = lines.at(-1);
    expect(last?.type).toBe('final');
    if (last?.type !== 'final') throw new Error('no final');
    expect(last.profile.pagesRead).toEqual([
      SITE,
      'https://sen.vn/about',
      'https://sen.vn/services',
    ]);
    expect(last.profile.photoUrls).toEqual([
      'https://sen.vn/hero.jpg',
      'https://sen.vn/stones.jpg',
    ]);
    expect(last.profile.location.town?.value).toBe('Da Nang');
    expect(last.profile.offerings[0].price).toBe('450,000 VND');
    expect(last.profile.thin).toBe(false);
    expect(last.profile.promptVersion).toBe(BRAND_PROMPT_VERSION);
    expect(lines.filter((l) => l.type === 'final')).toHaveLength(1);
  });

  test('no partial ever holds a number that is not on its page', async () => {
    const { deps: d } = deps(baseSite);
    const lines = await read(SITE, d);
    expect(JSON.stringify(lines)).not.toContain('911');
  });

  test('robots_disallowed, with only robots.txt requested', async () => {
    const { deps: d, site } = deps({
      ...baseSite,
      'https://sen.vn/robots.txt': { text: 'User-agent: *\nDisallow: /\n' },
    });
    expect(await codeOf(prepareRead(SITE, d, new AbortController().signal))).toBe(
      'robots_disallowed',
    );
    expect(site.calls).toEqual(['https://sen.vn/robots.txt']);
  });

  test('a missing robots.txt allows the read', async () => {
    const { 'https://sen.vn/robots.txt': _, ...noRobots } = baseSite;
    const { deps: d } = deps(noRobots);
    expect((await read(SITE, d)).at(-1)?.type).toBe('final');
  });

  test('unreachable when the home page is 404', async () => {
    const { deps: d } = deps({ ...baseSite, [SITE]: { status: 404 } });
    expect(await codeOf(prepareRead(SITE, d, new AbortController().signal))).toBe('unreachable');
  });

  test('invalid_url for a bad scheme', async () => {
    const { deps: d, site } = deps(baseSite);
    expect(await codeOf(prepareRead('ftp://sen.vn', d, new AbortController().signal))).toBe(
      'invalid_url',
    );
    expect(site.calls).toEqual([]);
  });

  test('blocked_address for http://10.0.0.5/, with no transport call', async () => {
    const { deps: d, site } = deps(baseSite);
    expect(await codeOf(prepareRead('http://10.0.0.5/', d, new AbortController().signal))).toBe(
      'blocked_address',
    );
    expect(site.calls).toEqual([]);
  });

  test('blocked_address when the home page redirects to a private address', async () => {
    const { deps: d } = deps({ ...baseSite, [SITE]: { redirect: 'http://169.254.169.254/' } });
    expect(await codeOf(prepareRead(SITE, d, new AbortController().signal))).toBe(
      'blocked_address',
    );
  });

  test('a thin site comes back thin', async () => {
    const { deps: d } = deps({
      'https://sen.vn/robots.txt': { text: '' },
      [SITE]: {
        html: '<html><head><title>Sen Spa</title></head><body><div id="root">Loading Sen Spa, please wait a moment while we load.</div></body></html>',
      },
    });
    const thinModel = replayTextModel({
      ...recording,
      partials: [],
      final: { ...modelFinal, name: { value: 'Sen Spa', source: SITE } },
    });
    const lines = await read(SITE, { ...d, model: thinModel });
    const last = lines.at(-1);
    expect(last?.type).toBe('final');
    if (last?.type === 'final') expect(last.profile.thin).toBe(true);
  });

  test('no photos: visualStyle null, photoUrls empty', async () => {
    const noPhotos = {
      ...baseSite,
      [SITE]: { html: homeHtml.replace(/<img src="\/(hero|stones)\.jpg"[^>]*>/g, '') },
    };
    const { deps: d } = deps(noPhotos);
    const last = (await read(SITE, d)).at(-1);
    if (last?.type !== 'final') throw new Error('no final');
    expect(last.profile.visualStyle).toBeNull();
    expect(last.profile.photoUrls).toEqual([]);
  });

  test('a site with hreflang reads the English home page and skips /ko/ links', async () => {
    const koHome = `<html><head>
      <link rel="alternate" hreflang="ko" href="https://sen.vn/ko/">
      <link rel="alternate" hreflang="en" href="https://sen.vn/en/">
      <script type="application/ld+json">{"@type":"DaySpa","name":"Sen Spa"}</script>
    </head><body><a href="/ko/about">소개</a></body></html>`;
    const enHome = `<html><head>
      <link rel="alternate" hreflang="ko" href="https://sen.vn/ko/">
      <script type="application/ld+json">{"@type":"DaySpa","name":"Sen Spa"}</script>
    </head><body><main><p>Massage in Da Nang.</p></main><a href="/ko/about">About</a><a href="/en/about">About us</a></body></html>`;
    const { deps: d, site } = deps({
      'https://sen.vn/robots.txt': { text: '' },
      [SITE]: { html: koHome },
      'https://sen.vn/en/': { html: enHome },
      'https://sen.vn/en/about': { html: '<main><p>About Sen</p></main>' },
    });
    const prepared = await prepareRead(SITE, d, new AbortController().signal);
    expect(prepared.pagesRead).toEqual(['https://sen.vn/en/', 'https://sen.vn/en/about']);
    expect(site.calls).not.toContain('https://sen.vn/ko/about');
  });

  test('a stylesheet slower than the fetch budget is skipped, and the read finishes', async () => {
    const slowCss = {
      ...baseSite,
      [SITE]: {
        html: homeHtml.replace('</head>', '<link rel="stylesheet" href="/slow.css"></head>'),
      },
      'https://sen.vn/slow.css': { slowMs: 5_000, html: '' },
    };
    const { deps: d } = deps(slowCss, { limits: { fetchMs: 150, totalMs: 5_000 } });
    const started = Date.now();
    expect((await read(SITE, d)).at(-1)?.type).toBe('final');
    expect(Date.now() - started).toBeLessThan(2_000);
  });

  test('the model hangs: error line model_timeout', async () => {
    const { deps: d } = deps(baseSite, {
      model: replayTextModel(recording, { hang: true }),
      limits: { fetchMs: 200, totalMs: 300 },
    });
    const started = Date.now();
    const lines = await read(SITE, d);
    expect(lines.at(-1)).toEqual({ type: 'error', code: 'model_timeout' });
    expect(lines[0].type).toBe('partial');
    expect(Date.now() - started).toBeLessThan(1_000);
  });

  test('the model is busy: error line model_busy', async () => {
    const { deps: d } = deps(baseSite, { model: replayTextModel(recording, { error: 'busy' }) });
    expect((await read(SITE, d)).at(-1)).toEqual({ type: 'error', code: 'model_busy' });
  });

  test('a final that fails the schema: error line model_failed', async () => {
    const bad = replayTextModel({
      ...recording,
      partials: [],
      final: { ...modelFinal, category: '' },
    });
    const { deps: d } = deps(baseSite, { model: bad });
    expect((await read(SITE, d)).at(-1)).toEqual({ type: 'error', code: 'model_failed' });
  });

  test('a client that leaves ends the stream without an error line', async () => {
    const controller = new AbortController();
    const { deps: d } = deps(baseSite, { model: replayTextModel(recording, { hang: true }) });
    const prepared = await prepareRead(SITE, d, controller.signal);
    const lines: StreamLine[] = [];
    setTimeout(() => controller.abort(), 20);
    for await (const line of streamProfile(prepared, d, controller.signal)) lines.push(line);
    expect(lines.map((l) => l.type)).toEqual(['partial']);
  });
});
