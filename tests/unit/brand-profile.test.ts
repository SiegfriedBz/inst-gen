import { describe, expect, test } from 'vitest';
import { ERROR_STATUS, profileSchema, upgradeProfile } from '@/lib/brand/profile';
import { SITE, senProfile, svargaProfile } from './helpers/brand';

describe('profileSchema', () => {
  test('accepts a full Svarga-like profile', () => {
    expect(profileSchema.safeParse(svargaProfile()).success).toBe(true);
  });

  test('rejects an empty-string field', () => {
    const p = svargaProfile();
    p.name = { value: '', source: SITE };
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('rejects a sixth colour', () => {
    const p = svargaProfile();
    p.colours = Array.from({ length: 6 }, () => ({
      hex: '#123456',
      role: 'accent' as const,
      source: 'model',
    }));
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('rejects a bad hex', () => {
    const p = svargaProfile();
    p.colours = [{ hex: '#12345', role: 'primary', source: 'model' }];
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('rejects tone with 6 words', () => {
    const p = svargaProfile();
    p.tone = ['calm', 'warm', 'kind', 'soft', 'quiet', 'local'];
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('visualStyle may be null', () => {
    const p = svargaProfile();
    p.visualStyle = null;
    expect(profileSchema.safeParse(p).success).toBe(true);
  });

  test('summary over 25 words fails', () => {
    const p = svargaProfile();
    p.summary = { value: Array.from({ length: 26 }, () => 'word').join(' '), source: SITE };
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('visualStyle summary over 12 words fails', () => {
    const p = svargaProfile();
    if (!p.visualStyle) throw new Error('fixture has a style');
    p.visualStyle.summary = Array.from({ length: 13 }, () => 'soft').join(' ');
    expect(profileSchema.safeParse(p).success).toBe(false);
  });
});

describe('ERROR_STATUS', () => {
  test.each([
    ['invalid_url', 400],
    ['blocked_address', 400],
    ['unreachable', 502],
    ['robots_disallowed', 403],
    ['model_busy', 503],
    ['model_timeout', 504],
    ['model_failed', 502],
  ] as const)('%s is %i', (code, status) => {
    expect(ERROR_STATUS[code]).toBe(status);
  });

  test('has exactly the seven codes', () => {
    expect(Object.keys(ERROR_STATUS)).toHaveLength(7);
  });
});

describe('profile version 2', () => {
  test('upgrades a v1 profile to v3 with empty search fields and no look', () => {
    const { searchedAt: _a, searchPromptVersion: _b, staffLook: _d, ...rest } = senProfile();
    const { searchTerms: _c, ...essence } = rest.essence;
    const v1 = { ...rest, schemaVersion: 1, essence };
    const up = profileSchema.parse(upgradeProfile(v1));
    expect(up.schemaVersion).toBe(4);
    expect(up.essence.searchTerms).toEqual([]);
    expect(up.searchedAt).toBeNull();
    expect(up.searchPromptVersion).toBeNull();
    expect(up.staffLook).toBeNull();
  });

  test('refuses a search term over 6 words', () => {
    const p = senProfile();
    p.essence.searchTerms = ['one two three four five six seven'];
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('refuses a ninth search term', () => {
    const p = senProfile();
    p.essence.searchTerms = Array.from({ length: 9 }, (_, i) => `term ${i}`);
    expect(profileSchema.safeParse(p).success).toBe(false);
  });
});

// The therapists' look (docs/specs/posts/therapists-look).
describe('profile version 3', () => {
  test('upgrades a v2 profile with no look, the rest as it was', () => {
    const { staffLook: _a, ...rest } = senProfile();
    const v2 = { ...rest, schemaVersion: 2 };
    expect(profileSchema.parse(upgradeProfile(v2))).toEqual(senProfile());
  });

  test('leaves a v4 profile as it is', () => {
    expect(upgradeProfile(senProfile())).toEqual(senProfile());
  });

  test('accepts a look', () => {
    const p = senProfile();
    p.staffLook = { value: 'a white tunic, white trousers', source: 'model' };
    expect(profileSchema.safeParse(p).success).toBe(true);
  });

  test('refuses a look over 30 words', () => {
    const p = senProfile();
    p.staffLook = { value: Array(31).fill('white').join(' '), source: 'model' };
    expect(profileSchema.safeParse(p).success).toBe(false);
  });

  test('refuses a look over 300 characters', () => {
    const p = senProfile();
    p.staffLook = { value: Array(25).fill('abcdefghijkl').join(' '), source: 'model' };
    expect(p.staffLook.value.length).toBe(324);
    expect(profileSchema.safeParse(p).success).toBe(false);
  });
});

// Every length of a treatment (docs/specs/questions/first-answer, "Every
// length and its price").
describe('profile version 4', () => {
  // A profile saved before the change: one price and one duration a treatment.
  function v3(offering: Record<string, string>) {
    const { offerings: _o, ...rest } = svargaProfile();
    return {
      ...rest,
      schemaVersion: 3,
      offerings: [{ name: 'Balinese massage', source: SITE, ...offering }],
    };
  }

  // Version 2 had no look; version 1 had no essence search either.
  function v2(offering: Record<string, string>) {
    const { staffLook: _l, ...rest } = v3(offering);
    return { ...rest, schemaVersion: 2 };
  }

  function v1(offering: Record<string, string>) {
    const { searchedAt: _a, searchPromptVersion: _b, ...rest } = v2(offering);
    const { searchTerms: _c, ...essence } = rest.essence;
    return { ...rest, schemaVersion: 1, essence };
  }

  test('a version-3 profile reads as version 4, its price and duration as one length', () => {
    const up = upgradeProfile(v3({ price: 'IDR 450,000', duration: '90 minutes' }));
    const parsed = profileSchema.safeParse(up);
    expect(parsed.success).toBe(true);
    expect(parsed.data?.schemaVersion).toBe(4);
    expect(parsed.data?.offerings[0]).toEqual({
      name: 'Balinese massage',
      source: SITE,
      lengths: [{ duration: '90 minutes', price: 'IDR 450,000' }],
    });
  });

  test('a version-3 treatment with a price alone keeps it; one with neither has no length', () => {
    const alone = profileSchema.parse(upgradeProfile(v3({ price: 'IDR 450,000' })));
    expect(alone.offerings[0].lengths).toEqual([{ price: 'IDR 450,000' }]);
    const none = profileSchema.parse(upgradeProfile(v3({})));
    expect(none.offerings[0].lengths).toEqual([]);
  });

  test.each([
    [1, v1],
    [2, v2],
  ])(
    'a version-%i profile reads as version 4, its price and duration as one length',
    (_, saved) => {
      const up = profileSchema.parse(
        upgradeProfile(saved({ price: 'IDR 450,000', duration: '90 minutes' })),
      );
      expect(up.schemaVersion).toBe(4);
      expect(up.offerings).toEqual([
        {
          name: 'Balinese massage',
          source: SITE,
          lengths: [{ duration: '90 minutes', price: 'IDR 450,000' }],
        },
      ]);
    },
  );

  test('a treatment holds at most 6 lengths, each with a duration or a price', () => {
    const p = svargaProfile();
    p.offerings[0].lengths = Array.from({ length: 7 }, (_, i) => ({ duration: `${i + 1}0 min` }));
    expect(profileSchema.safeParse(p).success).toBe(false);
    p.offerings[0].lengths = [{}];
    expect(profileSchema.safeParse(p).success).toBe(false);
    p.offerings[0].lengths = [{ duration: '60 min' }, { price: 'IDR 250k' }];
    expect(profileSchema.safeParse(p).success).toBe(true);
  });
});
