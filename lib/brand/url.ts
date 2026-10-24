// Cleans the website link an owner submits, before anything is fetched.
// Only http(s) on the default port, without credentials, is allowed.
export function cleanUrl(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const withScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (url.port !== '' || url.username !== '' || url.password !== '') return null;
  if (!url.hostname) return null;
  url.hash = '';
  return url;
}

function pathKey(value: string): string {
  const url = new URL(value);
  return `${url.host}${url.pathname.replace(/\/+$/, '')}`;
}

// Two links point at the same page once the query and a trailing slash are dropped.
export function samePath(a: string, b: string): boolean {
  return pathKey(a) === pathKey(b);
}
