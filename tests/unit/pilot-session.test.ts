import { describe, expect, test } from 'vitest';
import { type PilotConfig, parsePilotConfig } from '@/lib/pilot/config';
import { createSession, readSession, SESSION_MAX_AGE_SECONDS } from '@/lib/pilot/session';

const SECRET = 'a-session-secret-that-is-long-enough-000001';

function config(passphrases: string, secret = SECRET): PilotConfig {
  const result = parsePilotConfig({ PILOT_PASSPHRASES: passphrases, SESSION_SECRET: secret });
  if (!result.ok) throw new Error(result.problem);
  return result.config;
}

const BOTH = config('lotus-river-moon-sen,blue-wave-harbour-svarga');
const t0 = new Date('2026-10-24T08:00:00Z');
const later = (seconds: number) => new Date(t0.getTime() + seconds * 1000);
const DAY = 86_400;

describe('session', () => {
  test('lasts 30 days', () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(2_592_000);
  });

  test('round trip', async () => {
    const value = await createSession('sen', BOTH, t0);
    expect(await readSession(value, BOTH, later(10 * DAY))).toEqual({ ownerId: 'sen' });
  });

  test('expires after 30 days', async () => {
    const value = await createSession('sen', BOTH, t0);
    expect(await readSession(value, BOTH, later(SESSION_MAX_AGE_SECONDS))).toEqual({
      ownerId: 'sen',
    });
    expect(await readSession(value, BOTH, later(SESSION_MAX_AGE_SECONDS + 1))).toBeNull();
  });

  test('refuses a different secret', async () => {
    const value = await createSession('sen', BOTH, t0);
    const other = config(
      'lotus-river-moon-sen,blue-wave-harbour-svarga',
      'another-session-secret-long-enough-0000002',
    );
    expect(await readSession(value, other, t0)).toBeNull();
  });

  test('changed passphrase signs out only that owner', async () => {
    const sen = await createSession('sen', BOTH, t0);
    const svarga = await createSession('svarga', BOTH, t0);
    const changed = config('new-lotus-river-sen,blue-wave-harbour-svarga');
    expect(await readSession(sen, changed, t0)).toBeNull();
    expect(await readSession(svarga, changed, t0)).toEqual({ ownerId: 'svarga' });
  });

  test('removed owner', async () => {
    const svarga = await createSession('svarga', BOTH, t0);
    expect(await readSession(svarga, config('lotus-river-moon-sen'), t0)).toBeNull();
  });

  test('tampered or malformed values are no session', async () => {
    const value = await createSession('sen', BOTH, t0);
    const [payload, signature] = value.split('.');
    const flipped = (payload[0] === 'A' ? 'B' : 'A') + payload.slice(1);
    for (const bad of [
      `${flipped}.${signature}`,
      payload,
      `${payload}.`,
      'not-a-cookie',
      '%%%.###',
      '',
      undefined,
    ]) {
      await expect(readSession(bad, BOTH, t0)).resolves.toBeNull();
    }
  });

  test('a session from the future is no session', async () => {
    const value = await createSession('sen', BOTH, later(3600));
    expect(await readSession(value, BOTH, t0)).toBeNull();
  });

  test('an unknown owner cannot get a session', async () => {
    await expect(createSession('nobody', BOTH, t0)).rejects.toThrow();
  });
});
