import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import type { Recording } from '@/lib/ai/replay';
import type { TextModel } from '@/lib/ai/text-model';
import { type Expected, expectedSchema } from './eval/score';
import { type Fetched, type Transport, undiciTransport } from './fetch-safe';
import { prepareRead } from './read';
import { cleanUrl } from './url';

// Saved sites for offline tests and the eval (spec, "Fixtures"). Pages,
// stylesheets and robots.txt are committed; images stay in a git-ignored
// cache, since they are other businesses' photos.

export const FIXTURES_DIR = 'tests/fixtures/sites';
export const CACHE_DIR = '.fixtures-cache';

const manifestSchema = z.object({
  siteUrl: z.string(),
  savedAt: z.string(),
  files: z.array(
    z.object({ path: z.string(), url: z.string(), finalUrl: z.string(), contentType: z.string() }),
  ),
  images: z.array(z.object({ url: z.string(), contentType: z.string() })),
});

export type Manifest = z.infer<typeof manifestSchema>;

export type Fixture = { manifest: Manifest; expected: Expected; recording: Recording | null };

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

export function loadFixture(dir: string): Fixture {
  const recordingPath = join(dir, 'recording.json');
  return {
    manifest: manifestSchema.parse(readJson(join(dir, 'manifest.json'))),
    expected: expectedSchema.parse(readJson(join(dir, 'expected.json'))),
    recording: existsSync(recordingPath) ? (readJson(recordingPath) as Recording) : null,
  };
}

const imageFile = (url: string) => Buffer.from(url).toString('base64url');

// Serves a saved site. Images come from the cache, else from `live` (the eval
// only), else 404. Pages are never fetched live.
export function fixtureTransport(
  dir: string,
  opts: { imageCache?: string; live?: Transport } = {},
): Transport {
  const manifest = manifestSchema.parse(readJson(join(dir, 'manifest.json')));
  return async (url, init) => {
    const href = url.href;
    const file =
      manifest.files.find((f) => f.finalUrl === href) ?? manifest.files.find((f) => f.url === href);
    if (file) {
      if (file.url === href && file.finalUrl !== href) {
        return new Response(null, { status: 301, headers: { location: file.finalUrl } });
      }
      return new Response(readFileSync(join(dir, file.path)), {
        headers: { 'content-type': file.contentType },
      });
    }
    const image = manifest.images.find((i) => i.url === href);
    if (image) {
      const cached = opts.imageCache ? join(opts.imageCache, imageFile(href)) : null;
      if (cached && existsSync(cached)) {
        return new Response(readFileSync(cached), {
          headers: { 'content-type': image.contentType },
        });
      }
      if (opts.live) return opts.live(url, init);
    }
    return new Response('not saved', { status: 404 });
  };
}

function stripScripts(html: string): string {
  const $ = cheerio.load(html);
  $('script:not([type="application/ld+json"])').remove();
  return $.html();
}

// A model that is never called: saving a fixture only fetches and extracts.
const noModel: TextModel = {
  streamBrandProfile() {
    throw new Error('saving a fixture makes no model call');
  },
};

export async function saveFixture(url: string, slug: string): Promise<Manifest> {
  const fetched: Fetched[] = [];
  await prepareRead(
    url,
    { transport: undiciTransport(), model: noModel, record: (f) => fetched.push(f) },
    new AbortController().signal,
  );
  const dir = join(FIXTURES_DIR, slug);
  const cache = join(CACHE_DIR, slug);
  rmSync(join(dir, 'pages'), { recursive: true, force: true });
  rmSync(join(dir, 'css'), { recursive: true, force: true });
  mkdirSync(join(dir, 'pages'), { recursive: true });
  mkdirSync(cache, { recursive: true });

  const manifest: Manifest = {
    siteUrl: cleanUrl(url)?.href ?? url,
    savedAt: new Date().toISOString(),
    files: [],
    images: [],
  };
  let pages = 0;
  let sheets = 0;
  for (const f of fetched) {
    const entry = { url: f.url.href, finalUrl: f.finalUrl.href, contentType: f.contentType };
    const text = () => new TextDecoder().decode(f.body);
    if (f.url.pathname === '/robots.txt') {
      writeFileSync(join(dir, 'robots.txt'), text());
      manifest.files.push({ path: 'robots.txt', ...entry, contentType: 'text/plain' });
    } else if (f.contentType === 'text/html') {
      const path = `pages/${pages++}.html`;
      writeFileSync(join(dir, path), stripScripts(text()));
      manifest.files.push({ path, ...entry });
    } else if (f.contentType === 'text/css') {
      mkdirSync(join(dir, 'css'), { recursive: true });
      const path = `css/${sheets++}.css`;
      writeFileSync(join(dir, path), text());
      manifest.files.push({ path, ...entry });
    } else if (f.contentType.startsWith('image/')) {
      writeFileSync(join(cache, imageFile(f.finalUrl.href)), f.body);
      manifest.images.push({ url: f.finalUrl.href, contentType: f.contentType });
    }
  }
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
