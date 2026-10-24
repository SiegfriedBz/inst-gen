import { describe, expect, test } from 'vitest';
import { parsePilotConfig } from '@/lib/pilot/config';
import { decide } from '@/lib/pilot/gate';
import { createSession } from '@/lib/pilot/session';

const SECRET = 'a-session-secret-that-is-long-enough-000001';
const now = new Date('2026-10-24T08:00:00Z');
const good = parsePilotConfig({
  PILOT_PASSPHRASES: 'lotus-river-moon-sen,blue-wave-harbour-svarga',
  SESSION_SECRET: SECRET,
});
const bad = parsePilotConfig({ PILOT_PASSPHRASES: 'short-sen', SESSION_SECRET: SECRET });

async function senCookie() {
  if (!good.ok) throw new Error(good.problem);
  return createSession('sen', good.config, now);
}

describe('decide', () => {
  test('misconfigured app refuses everything', async () => {
    for (const path of ['/', '/enter', '/api/health']) {
      expect(await decide(path, undefined, bad, now)).toEqual({ kind: 'misconfigured' });
    }
  });

  test('no session: pages go to /enter, API is unauthorized, public paths pass', async () => {
    expect(await decide('/', undefined, good, now)).toEqual({ kind: 'redirect', to: '/enter' });
    expect(await decide('/anything', undefined, good, now)).toEqual({
      kind: 'redirect',
      to: '/enter',
    });
    expect(await decide('/api/health', undefined, good, now)).toEqual({ kind: 'unauthorized' });
    for (const path of [
      '/enter',
      '/robots.txt',
      '/favicon.ico',
      '/icon.svg',
      '/apple-icon.png',
      '/_next/static/x.js',
      '/_next/image',
    ]) {
      expect(await decide(path, undefined, good, now)).toEqual({ kind: 'pass' });
    }
  });

  test('a path that only starts like a public one is gated', async () => {
    expect(await decide('/enterprise', undefined, good, now)).toEqual({
      kind: 'redirect',
      to: '/enter',
    });
  });

  test('valid session passes, and /enter sends it home', async () => {
    const cookie = await senCookie();
    expect(await decide('/', cookie, good, now)).toEqual({ kind: 'pass' });
    expect(await decide('/api/health', cookie, good, now)).toEqual({ kind: 'pass' });
    expect(await decide('/enter', cookie, good, now)).toEqual({ kind: 'redirect', to: '/' });
  });

  test('old cookie after a passphrase change stays on /enter, no loop', async () => {
    const cookie = await senCookie();
    const changed = parsePilotConfig({
      PILOT_PASSPHRASES: 'new-lotus-river-sen,blue-wave-harbour-svarga',
      SESSION_SECRET: SECRET,
    });
    expect(await decide('/enter', cookie, changed, now)).toEqual({ kind: 'pass' });
    expect(await decide('/', cookie, changed, now)).toEqual({ kind: 'redirect', to: '/enter' });
  });
});
