import type { Transport } from '@/lib/brand/fetch-safe';

// A small website in memory, for brand-read tests: URL → response.
export type SiteFile =
  | { html: string }
  | { css: string }
  | { text: string }
  | { image: string }
  | { redirect: string }
  | { status: number }
  | { slowMs: number; html: string };

export function siteTransport(files: Record<string, SiteFile>) {
  const calls: string[] = [];
  const transport: Transport = async (url, init) => {
    calls.push(url.href);
    const file = files[url.href];
    if (!file) return new Response('not found', { status: 404 });
    if ('redirect' in file) {
      return new Response(null, { status: 301, headers: { location: file.redirect } });
    }
    if ('status' in file) return new Response('error', { status: file.status });
    if ('slowMs' in file) {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, file.slowMs);
        init.signal.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(init.signal.reason);
        });
      });
      return new Response(file.html, { headers: { 'content-type': 'text/html' } });
    }
    if ('html' in file)
      return new Response(file.html, { headers: { 'content-type': 'text/html' } });
    if ('css' in file) return new Response(file.css, { headers: { 'content-type': 'text/css' } });
    if ('text' in file)
      return new Response(file.text, { headers: { 'content-type': 'text/plain' } });
    return new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
      headers: { 'content-type': file.image },
    });
  };
  return { transport, calls };
}
