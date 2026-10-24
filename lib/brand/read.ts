import { type BrandModelInput, ModelError, type TextModel } from '@/lib/ai/text-model';
import { hostIsIpLiteral, isPublicAddress } from './address';
import { codeProfile, finalise, mergeAndCheck, type PageTexts } from './checks';
import { brandColours, inlineCss, linkedStylesheets } from './extract/colours';
import { type CodeFacts, extractStructured } from './extract/structured';
import { shareTextBudget, visibleText } from './extract/text';
import { findLogo, photoCandidates } from './extract/visual';
import { createFetcher, FetchError, type Fetched, type Transport } from './fetch-safe';
import { choosePages, englishHome } from './pages';
import type { BrandErrorCode, PartialProfile } from './profile';
import { BRAND_PROMPT_VERSION, brandPrompt, brandUserText } from './prompt';
import { robotsAllows } from './robots';
import type { StreamLine } from './stream';
import { cleanUrl } from './url';

// The brand read, end to end: prepareRead fetches and extracts in code and
// fails before any stream starts; streamProfile runs the model call and yields
// checked lines (docs/specs/brand/extract-site/spec.md).

export class BrandReadError extends Error {
  constructor(readonly code: BrandErrorCode) {
    super(code);
    this.name = 'BrandReadError';
  }
}

export type ReadDeps = {
  transport: Transport;
  model: TextModel;
  now?: () => Date;
  limits?: { fetchMs: number; totalMs: number };
  record?: (fetched: Fetched) => void;
  // Told why a model step failed; the stream itself only carries the code.
  onModelError?: (error: unknown) => void;
};

export const DEFAULT_LIMITS = { fetchMs: 10_000, totalMs: 30_000 };
const PAGE_CONCURRENCY = 4;
const THIN_CHARS = 300;
// Gemini reads these; an SVG logo stays in the profile but isn't sent.
const MODEL_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export type PreparedRead = {
  siteUrl: URL;
  pagesRead: string[];
  facts: CodeFacts[];
  pages: PageTexts;
  modelInput: BrandModelInput;
  first: PartialProfile;
  thin: boolean;
  photoCount: number;
  // Fires when the whole request's time is up.
  deadline: AbortSignal;
};

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

const decode = (fetched: Fetched) => new TextDecoder().decode(fetched.body);
const pathKey = (url: URL) =>
  `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`;

function homeError(error: unknown): BrandReadError {
  if (error instanceof FetchError && error.kind === 'blocked') {
    return new BrandReadError('blocked_address');
  }
  return new BrandReadError('unreachable');
}

export async function prepareRead(
  rawUrl: string,
  deps: ReadDeps,
  signal: AbortSignal,
): Promise<PreparedRead> {
  const limits = deps.limits ?? DEFAULT_LIMITS;
  const deadline = AbortSignal.any([signal, AbortSignal.timeout(limits.totalMs)]);
  const budget = AbortSignal.any([signal, AbortSignal.timeout(limits.fetchMs)]);

  const url = cleanUrl(rawUrl);
  if (!url) throw new BrandReadError('invalid_url');
  const ip = hostIsIpLiteral(url);
  if (ip !== null && !isPublicAddress(ip)) throw new BrandReadError('blocked_address');

  const fetcher = createFetcher({ transport: deps.transport, budget, record: deps.record });
  const tryFetch = async <T>(fetch: () => Promise<T>): Promise<T | null> => {
    try {
      return await fetch();
    } catch {
      return null;
    }
  };

  const robotsFor = async (site: URL) => {
    const robotsUrl = new URL('/robots.txt', site);
    const robots = await tryFetch(() => fetcher.fetchRobots(robotsUrl));
    return robotsAllows(robots ? decode(robots) : null, robotsUrl.href);
  };

  let allows = await robotsFor(url);
  if (!allows(url.href)) throw new BrandReadError('robots_disallowed');

  let home: Fetched;
  try {
    home = await fetcher.fetchPage(url, { crossSiteRedirects: true });
  } catch (error) {
    throw homeError(error);
  }
  // A redirect to another site makes that site the one read.
  if (home.finalUrl.hostname.replace(/^www\./, '') !== url.hostname.replace(/^www\./, '')) {
    allows = await robotsFor(home.finalUrl);
    if (!allows(home.finalUrl.href)) throw new BrandReadError('robots_disallowed');
  }
  let homeHtml = decode(home);
  let homeUrl = home.finalUrl;

  const english = englishHome(homeHtml, homeUrl);
  if (english && allows(english.href)) {
    const page = await tryFetch(() => fetcher.fetchPage(english, { crossSiteRedirects: false }));
    if (page) {
      homeHtml = decode(page);
      homeUrl = page.finalUrl;
    }
  }

  const extra = choosePages(homeHtml, homeUrl).filter((page) => allows(page.href));
  const fetchedPages = await mapLimit(extra, PAGE_CONCURRENCY, (page) =>
    tryFetch(() => fetcher.fetchPage(page, { crossSiteRedirects: false })),
  );
  const pageList = [{ url: homeUrl, html: homeHtml }];
  for (const page of fetchedPages) {
    if (!page || pageList.some((p) => pathKey(p.url) === pathKey(page.finalUrl))) continue;
    pageList.push({ url: page.finalUrl, html: decode(page) });
  }
  const pagesRead = pageList.map((p) => p.url.href);

  const facts = pageList.map((p) => extractStructured(p.html, p.url));
  const fullTexts = pageList.map((p) => ({ url: p.url.href, text: visibleText(p.html) }));
  const pages: PageTexts = new Map(fullTexts.map((p) => [p.url, p.text]));

  const sheets = await mapLimit(linkedStylesheets(homeHtml, homeUrl), 2, (sheet) =>
    tryFetch(() => fetcher.fetchStylesheet(sheet)),
  );
  const css = [
    ...pageList.flatMap((p) => inlineCss(p.html)),
    ...sheets.flatMap((sheet) => (sheet ? [decode(sheet)] : [])),
  ];
  const themeColor = facts.find((f) => f.meta.themeColor)?.meta.themeColor;
  const colours = brandColours(themeColor, css);

  const business = facts.find((f) => f.business)?.business;
  const logo = findLogo(homeHtml, homeUrl, business?.logo);
  const ogImage = facts.find((f) => f.meta.ogImage)?.meta.ogImage;
  const candidates = photoCandidates(pageList, ogImage);
  const [logoImage, ...photoImages] = await mapLimit(
    [logo, ...candidates],
    PAGE_CONCURRENCY,
    (image) =>
      image
        ? tryFetch(() => fetcher.fetchImage(image, { allowSvg: image === logo }))
        : Promise.resolve(null),
  );
  const photos = photoImages.filter((p): p is Fetched => p !== null);
  const images = [logoImage, ...photos]
    .filter((image): image is Fetched => image !== null)
    .filter((image) => MODEL_IMAGE_TYPES.includes(image.contentType))
    .map((image) => ({ url: image.finalUrl.href, data: image.body, mediaType: image.contentType }));

  const textChars = fullTexts.reduce((sum, p) => sum + p.text.length, 0);
  const thin = textChars < THIN_CHARS && !business;

  const photoUrls = photos.map((p) => p.url.href);
  const first = codeProfile(facts, {
    siteUrl: homeUrl.href,
    pagesRead,
    colours,
    logoUrl: logo ? { value: logo.href, source: homeUrl.href } : null,
    photoUrls,
  });

  return {
    siteUrl: homeUrl,
    pagesRead,
    facts,
    pages,
    modelInput: {
      system: brandPrompt(),
      text: brandUserText(shareTextBudget(fullTexts), facts),
      images,
    },
    first,
    thin,
    photoCount: photos.length,
    deadline,
  };
}

export async function* streamProfile(
  prepared: PreparedRead,
  deps: ReadDeps,
  signal: AbortSignal,
): AsyncGenerator<StreamLine> {
  const now = deps.now ?? (() => new Date());
  const ctx = {
    facts: prepared.facts,
    pages: prepared.pages,
    pagesRead: prepared.pagesRead,
    photos: prepared.photoCount,
  };
  yield { type: 'partial', profile: prepared.first };
  if (signal.aborted) return;

  const modelSignal = AbortSignal.any([signal, prepared.deadline]);
  let last = JSON.stringify(prepared.first);
  try {
    const stream = deps.model.streamBrandProfile(prepared.modelInput, modelSignal);
    for await (const partial of stream) {
      const { profile } = mergeAndCheck(prepared.first, partial, ctx);
      const encoded = JSON.stringify(profile);
      if (encoded === last) continue;
      last = encoded;
      yield { type: 'partial', profile };
    }
    const { profile, dropped } = mergeAndCheck(prepared.first, await stream.final, ctx);
    const final = finalise(profile, {
      readAt: now().toISOString(),
      promptVersion: BRAND_PROMPT_VERSION,
      thin: prepared.thin,
      dropped,
    });
    yield { type: 'final', profile: final };
  } catch (error) {
    if (signal.aborted) return;
    deps.onModelError?.(error);
    if (prepared.deadline.aborted) {
      yield { type: 'error', code: 'model_timeout' };
    } else if (error instanceof ModelError && error.kind === 'busy') {
      yield { type: 'error', code: 'model_busy' };
    } else {
      yield { type: 'error', code: 'model_failed' };
    }
  }
}
