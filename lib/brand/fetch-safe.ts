import { Agent, fetch as undiciFetch } from 'undici';
import { checkedLookup, hostIsIpLiteral, isPublicAddress } from './address';
import { cleanUrl } from './url';

// The only way the brand read reaches the outside world: pages, robots.txt,
// stylesheets, the logo and photos. The submitted URL is untrusted, so every
// hop is checked, and every response is capped in time and size.

export const USER_AGENT = 'ShopfrontBot/1.0';
export const MAX_REDIRECTS = 3;

// Called with "manual" redirects: a 3xx comes back as is.
export type Transport = (
  url: URL,
  init: { signal: AbortSignal; headers: Record<string, string> },
) => Promise<Response>;

export type FetchErrorKind = 'blocked' | 'unreachable' | 'too_large' | 'wrong_type' | 'timeout';

export class FetchError extends Error {
  constructor(
    readonly kind: FetchErrorKind,
    message: string,
  ) {
    super(message);
    this.name = 'FetchError';
  }
}

export type Fetched = { url: URL; finalUrl: URL; contentType: string; body: Uint8Array };

// Production transport: undici, connecting only to checked public addresses.
export function undiciTransport(): Transport {
  const dispatcher = new Agent({ connect: { lookup: checkedLookup() } });
  return async (url, init) =>
    (await undiciFetch(url, {
      dispatcher,
      redirect: 'manual',
      signal: init.signal,
      headers: init.headers,
    })) as unknown as Response;
}

const siteHost = (host: string) => host.replace(/^www\./, '');

function mediaType(response: Response): string {
  return (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) return Promise.reject(signal.reason);
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener('abort', onAbort, { once: true });
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      },
    );
  });
}

async function readCapped(
  response: Response,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await raceAbort(reader.read(), signal);
      if (done) break;
      size += value.length;
      if (size > maxBytes) throw new FetchError('too_large', `over ${maxBytes} bytes`);
      chunks.push(value);
    }
  } catch (error) {
    await reader.cancel().catch(() => {});
    throw error;
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

function isBlockedCause(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) {
    if ((e as NodeJS.ErrnoException).code === 'BLOCKED_ADDRESS') return true;
  }
  return false;
}

type Accept = (type: string) => boolean;

export function createFetcher(opts: {
  transport: Transport;
  budget: AbortSignal;
  perResponseMs?: number;
  maxBytes?: number;
  record?: (fetched: Fetched) => void;
}) {
  const { transport, budget, perResponseMs = 10_000, maxBytes = 2_000_000, record } = opts;

  async function get(start: URL, accept: Accept, crossSiteRedirects: boolean): Promise<Fetched> {
    const signal = AbortSignal.any([budget, AbortSignal.timeout(perResponseMs)]);
    let url = start;
    try {
      // Every URL, from the owner or found in a page, keeps to the same rules:
      // http(s), default port, no user name or password.
      if (!cleanUrl(start.href)) throw new FetchError('blocked', `refused URL: ${start.href}`);
      for (let hop = 0; ; hop++) {
        const ip = hostIsIpLiteral(url);
        if (ip !== null && !isPublicAddress(ip)) {
          throw new FetchError('blocked', `${url.host} is not a public address`);
        }
        const response = await raceAbort(
          transport(url, { signal, headers: { 'user-agent': USER_AGENT } }),
          signal,
        );
        const location = response.headers.get('location');
        if (response.status >= 300 && response.status < 400 && location) {
          await response.body?.cancel().catch(() => {});
          if (hop >= MAX_REDIRECTS) throw new FetchError('unreachable', 'too many redirects');
          const next = cleanUrl(new URL(location, url).href);
          if (!next) throw new FetchError('blocked', `redirect to a refused URL: ${location}`);
          if (!crossSiteRedirects && siteHost(next.hostname) !== siteHost(start.hostname)) {
            throw new FetchError('unreachable', `redirect off the site: ${next.host}`);
          }
          url = next;
          continue;
        }
        if (response.status >= 400) {
          await response.body?.cancel().catch(() => {});
          throw new FetchError('unreachable', `status ${response.status}`);
        }
        const contentType = mediaType(response);
        if (!accept(contentType)) {
          await response.body?.cancel().catch(() => {});
          throw new FetchError('wrong_type', `unexpected ${contentType || 'content type'}`);
        }
        const body = await readCapped(response, maxBytes, signal);
        const fetched = { url: start, finalUrl: url, contentType, body };
        record?.(fetched);
        return fetched;
      }
    } catch (error) {
      if (error instanceof FetchError) throw error;
      if (signal.aborted) throw new FetchError('timeout', `${url.href} took too long`);
      if (isBlockedCause(error)) throw new FetchError('blocked', `${url.host} is not public`);
      throw new FetchError('unreachable', error instanceof Error ? error.message : String(error));
    }
  }

  const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  return {
    fetchPage: (url: URL, { crossSiteRedirects }: { crossSiteRedirects: boolean }) =>
      get(url, (type) => type === 'text/html', crossSiteRedirects),
    fetchStylesheet: (url: URL) => get(url, (type) => type === 'text/css', false),
    fetchImage: (url: URL, { allowSvg }: { allowSvg: boolean }) =>
      get(
        url,
        (type) => IMAGE_TYPES.includes(type) || (allowSvg && type === 'image/svg+xml'),
        false,
      ),
    // Served as text/plain by most sites, but any type is read as text.
    fetchRobots: (url: URL) => get(url, () => true, false),
  };
}

export type Fetcher = ReturnType<typeof createFetcher>;
