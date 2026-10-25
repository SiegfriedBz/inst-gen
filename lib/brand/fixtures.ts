import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { z } from 'zod';
import { type Recording, replayTextModel } from '@/lib/ai/replay';
import type { TextModel } from '@/lib/ai/text-model';
import { replaySearchTool, type SearchRecording } from '@/lib/search/replay';
import { type Expected, expectedSchema } from './eval/score';
import { type Fetched, type Transport, undiciTransport } from './fetch-safe';
import type { Profile } from './profile';
import { prepareRead, streamProfile } from './read';
import type { SearchModelAnswer } from './search/prompt';
import type { SearchBody } from './search/queries';
import { runSearch } from './search/run';
import { mergeSearch } from './search-client';
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

// An essence search recorded for a fixture by `pnpm eval:search --record`.
export type SearchFixture = {
  modelId: string;
  promptVersion: string;
  body: SearchBody;
  queries: SearchRecording['queries'];
  answer: SearchModelAnswer;
};

// A post plan recorded for a fixture by `pnpm eval:posts --record`.
export type PostsFixture = {
  modelId: string;
  promptVersion: string;
  recording: Recording;
};

export type Fixture = {
  manifest: Manifest;
  expected: Expected;
  recording: Recording | null;
  search: SearchFixture | null;
  posts: PostsFixture | null;
};

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8'));

export function loadFixture(dir: string): Fixture {
  const recordingPath = join(dir, 'recording.json');
  const searchPath = join(dir, 'search.json');
  const postsPath = join(dir, 'posts.json');
  return {
    manifest: manifestSchema.parse(readJson(join(dir, 'manifest.json'))),
    expected: expectedSchema.parse(readJson(join(dir, 'expected.json'))),
    recording: existsSync(recordingPath) ? (readJson(recordingPath) as Recording) : null,
    search: existsSync(searchPath) ? (readJson(searchPath) as SearchFixture) : null,
    posts: existsSync(postsPath) ? (readJson(postsPath) as PostsFixture) : null,
  };
}

// The fixture's profile from its recorded brand read: no model call.
export async function replayedProfile(dir: string): Promise<Profile> {
  const fixture = loadFixture(dir);
  if (!fixture.recording) throw new Error('no recording.json');
  const deps = { transport: fixtureTransport(dir), model: replayTextModel(fixture.recording) };
  const signal = new AbortController().signal;
  const prepared = await prepareRead(fixture.manifest.siteUrl, deps, signal);
  for await (const line of streamProfile(prepared, deps, signal)) {
    if (line.type === 'final') return line.profile;
    if (line.type === 'error') throw new Error(line.code);
  }
  throw new Error('no final line');
}

// The profile an owner would have: the recorded brand read, with the
// recorded essence search merged in when the fixture has one.
export async function fixtureProfile(dir: string): Promise<Profile> {
  const profile = await replayedProfile(dir);
  const { search, recording } = loadFixture(dir);
  if (!search || !recording) return profile;
  const answer = await runSearch(
    search.body,
    {
      tool: replaySearchTool({ queries: search.queries }),
      model: replayTextModel(recording, { searchAnswer: search.answer }),
      now: () => new Date(profile.readAt),
    },
    new AbortController().signal,
  );
  return mergeSearch(profile, answer);
}

// A cached image's file name: a hash of its URL, short enough for any filesystem.
export const imageCacheName = (url: string) => createHash('sha256').update(url).digest('hex');

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
      const cached = opts.imageCache ? join(opts.imageCache, imageCacheName(href)) : null;
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
  searchEssence() {
    throw new Error('saving a fixture makes no model call');
  },
  streamPostPlan() {
    throw new Error('saving a fixture makes no model call');
  },
  streamPostRewrite() {
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
      writeFileSync(join(cache, imageCacheName(f.finalUrl.href)), f.body);
      manifest.images.push({ url: f.finalUrl.href, contentType: f.contentType });
    }
  }
  writeFileSync(join(dir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
