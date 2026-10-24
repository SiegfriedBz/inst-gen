import { describe, expect, test } from 'vitest';
import { displayName, findOwner, parsePilotConfig } from '@/lib/pilot/config';

const SECRET = 'a-session-secret-that-is-long-enough-000001';
const THREE = 'lotus-river-moon-sen,blue-wave-harbour-svarga,quiet-stone-path-dev';

function parse(passphrases?: string, secret: string | undefined = SECRET) {
  return parsePilotConfig({ PILOT_PASSPHRASES: passphrases, SESSION_SECRET: secret });
}

function entries(passphrases: string) {
  const result = parse(passphrases);
  if (!result.ok) throw new Error(result.problem);
  return result.config.entries;
}

describe('parsePilotConfig', () => {
  test('parses three entries', () => {
    const result = parse(THREE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.entries.map((e) => e.ownerId)).toEqual(['sen', 'svarga', 'dev']);
    expect(result.config.sessionSecret).toBe(SECRET);
  });

  test('tolerates spaces and a trailing comma', () => {
    expect(entries(' lotus-river-moon-sen , blue-wave-harbour-svarga ,')).toEqual([
      { ownerId: 'sen', passphrase: 'lotus-river-moon-sen' },
      { ownerId: 'svarga', passphrase: 'blue-wave-harbour-svarga' },
    ]);
  });

  test('refuses a short secret part', () => {
    const result = parse('blue-wave-sen');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem).toContain('sen');
    expect(result.problem).toContain('12');
    expect(result.problem).not.toContain('blue-wave');
  });

  test('refuses a duplicate owner', () => {
    const result = parse('lotus-river-moon-sen,blue-wave-harbour-sen');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.problem).toContain('duplicate');
    expect(result.problem).toContain('sen');
    expect(result.problem).not.toContain('lotus-river-moon');
    expect(result.problem).not.toContain('blue-wave-harbour');
  });

  test("refuses an owner id that isn't lowercase letters", () => {
    for (const bad of ['lotus-river-moon-Sen', 'lotus-river-moon-sen2', 'lotusrivermoonsen']) {
      const result = parse(bad);
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.problem).not.toContain('lotus');
    }
  });

  test('refuses a missing or short SESSION_SECRET', () => {
    expect(parsePilotConfig({ PILOT_PASSPHRASES: THREE }).ok).toBe(false);
    expect(parse(THREE, 'x'.repeat(31)).ok).toBe(false);
    expect(parse(THREE, 'x'.repeat(32)).ok).toBe(true);
  });

  test('refuses an empty list', () => {
    expect(parse('').ok).toBe(false);
    expect(parse(undefined).ok).toBe(false);
    expect(parse(' , ').ok).toBe(false);
  });
});

describe('findOwner', () => {
  const all = entries(THREE);

  test('matches and trims', () => {
    expect(findOwner(all, 'lotus-river-moon-sen\n')).toBe('sen');
    expect(findOwner(all, '  lotus-river-moon-sen ')).toBe('sen');
    expect(findOwner(all, 'blue-wave-harbour-svarga')).toBe('svarga');
  });

  test('is case-sensitive', () => {
    expect(findOwner(all, 'Lotus-river-moon-sen')).toBeNull();
    expect(findOwner(all, '')).toBeNull();
    expect(findOwner(all, 'lotus-river-moon-se')).toBeNull();
  });
});

describe('displayName', () => {
  test('capitalises', () => {
    expect(displayName('sen')).toBe('Sen');
    expect(displayName('svarga')).toBe('Svarga');
    expect(displayName('dev')).toBe('Dev');
  });
});
