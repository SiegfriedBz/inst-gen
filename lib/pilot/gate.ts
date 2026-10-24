// What the gate does with one request: let it through, send it to the
// passphrase screen (or home, if already signed in), refuse an API call, or
// refuse everything because the app isn't configured.
import type { PilotConfigResult } from './config';
import { readSession } from './session';

export type GateDecision =
  | { kind: 'pass' }
  | { kind: 'redirect'; to: '/enter' | '/' }
  | { kind: 'unauthorized' }
  | { kind: 'misconfigured' };

const PUBLIC_EXACT = ['/robots.txt', '/favicon.ico', '/_next/image'];
const PUBLIC_PREFIXES = ['/_next/static/'];
// Next.js icon routes: /icon, /icon.png, /icon1.png, /icon/small, and the same for apple-icon.
const ICON_ROUTE = /^\/(apple-)?icon(\d*\.[a-z]+|\d+)?(\/|$)/;

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_EXACT.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix)) ||
    ICON_ROUTE.test(pathname)
  );
}

export async function decide(
  pathname: string,
  cookie: string | undefined,
  config: PilotConfigResult,
  now: Date,
): Promise<GateDecision> {
  if (!config.ok) return { kind: 'misconfigured' };
  if (isPublicPath(pathname)) return { kind: 'pass' };

  const session = await readSession(cookie, config.config, now);
  if (pathname === '/enter') return session ? { kind: 'redirect', to: '/' } : { kind: 'pass' };
  if (session) return { kind: 'pass' };
  return pathname === '/api' || pathname.startsWith('/api/')
    ? { kind: 'unauthorized' }
    : { kind: 'redirect', to: '/enter' };
}
