import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { FIXTURES_DIR, fixtureOffer, fixtureProfile, fixtureRecent } from '@/lib/brand/fixtures';
import type { Profile } from '@/lib/brand/profile';
import type { RecentPost } from '@/lib/posts/batch';
import type { Offer } from '@/lib/posts/offer';
import { comesToGuests, dealReasonSetups, REASON_PARTS, reasonFor } from '@/lib/posts/reasons';
import { REASONS, type Reason, seededRandom } from '@/lib/posts/setup';
import { senProfile, svargaProfile } from './helpers/brand';

// Reasons to book (docs/specs/posts/reasons-to-book).

describe('comesToGuests', () => {
  it('a spa with a service area comes to its guests', () => {
    expect(comesToGuests(svargaProfile())).toBe(true);
  });

  it('a spa with no service area does not', () => {
    // The helper's Sen has none.
    expect(comesToGuests(senProfile())).toBe(false);
  });

  it('a business that is no spa does not, service area or not', () => {
    expect(comesToGuests({ ...svargaProfile(), category: 'bakery' })).toBe(false);
  });

  it("Sen's and Svarga's saved reads do", async () => {
    for (const slug of ['sen', 'svarga']) {
      expect(comesToGuests(await fixtureProfile(join(FIXTURES_DIR, slug)))).toBe(true);
    }
  });
});

const BASE = svargaProfile(); // a spa with a service area
const guestsProfile = (names: string[]): Profile => ({
  ...BASE,
  offerings: names.map((name) => ({ name, lengths: [], source: BASE.siteUrl })),
});
const recentWith = (...reasons: Reason[]): RecentPost[] =>
  reasons.map((reason, i) => ({ type: 'offer', topic: `t${i}`, reason }));
const offerOn = (treatments: string[]): Offer => ({
  kind: 'discount',
  percent: 10,
  treatments,
  until: '2026-12-01',
  lastDay: 'Tuesday 1 December',
});
const SEEDS = Array.from({ length: 40 }, (_, i) => `s${i}`);
const dealt = (p: Profile, seed: string, recent: RecentPost[] = [], offer?: Offer) =>
  dealReasonSetups(p, offer, seededRandom(seed), recent);
const MIX = guestsProfile(['Balinese Massage', 'Couple Massage', 'Foot Reflexology']);
const reasonsOf = (p: Profile, seed: string, recent: RecentPost[] = [], offer?: Offer) =>
  dealt(p, seed, recent, offer).map((s) => s.reason);

describe('dealReasonSetups', () => {
  it('two set-ups, two different reasons, no kind of question', () => {
    for (const seed of SEEDS) {
      const setups = dealt(MIX, seed);
      expect(setups).toHaveLength(2);
      expect(setups[0].reason).toBeDefined();
      expect(setups[0].reason).not.toBe(setups[1].reason);
      expect(setups.map((s) => s.question)).toEqual([undefined, undefined]);
      expect(setups.map((s) => s.hook)).toEqual([undefined, undefined]);
    }
  });

  it('the reasons least used by the recent posts come first', () => {
    for (const seed of SEEDS) {
      const reasons = reasonsOf(MIX, seed, recentWith('dayOut', 'stayIn'));
      expect(reasons).not.toContain('dayOut');
      expect(reasons).not.toContain('stayIn');
    }
  });

  it('recent posts without a reason count as none used', () => {
    for (const seed of SEEDS) {
      const [a, b] = reasonsOf(MIX, seed, [{ type: 'offer', topic: 'x' }]);
      expect(a).toBeDefined();
      expect(a).not.toBe(b);
    }
  });

  it('twoOfYou only with a couple massage', () => {
    const profile = guestsProfile(['Balinese Massage', 'Foot Reflexology']);
    for (const seed of SEEDS) expect(reasonsOf(profile, seed)).not.toContain('twoOfYou');
  });

  it('twoOfYou always on the couple massage, with two guests and two therapists', () => {
    const others = recentWith('dayOut', 'stayIn', 'firstNight', 'laptop');
    for (const seed of SEEDS) {
      for (const setup of [...dealt(MIX, seed), ...dealt(MIX, seed, others)]) {
        if (setup.reason === 'twoOfYou') {
          expect(setup).toMatchObject({
            treatment: 'Couple Massage',
            guests: 'couple',
            therapists: 2,
          });
        }
      }
      expect(reasonsOf(MIX, seed, others)).toContain('twoOfYou');
    }
  });

  it('each look takes only its reasons', () => {
    const profile = guestsProfile(['Head Massage', 'Balinese Massage']);
    for (const seed of SEEDS) {
      for (const reason of reasonsOf(profile, seed, [], offerOn(['Head Massage']))) {
        expect(['laptop', 'stayIn', 'firstNight']).toContain(reason);
      }
    }
  });

  it('the free parts fit the reason', () => {
    const profile = guestsProfile(['Balinese Massage', 'Couple Massage']);
    for (const seed of SEEDS) {
      for (const setup of dealt(profile, seed)) {
        if (!setup.reason) throw new Error('no reason');
        expect(REASON_PARTS[setup.reason]).toContain(setup.bodyPart);
      }
    }
  });

  it('the first night is the night post', () => {
    const profile = guestsProfile(['Balinese Massage']);
    for (const seed of SEEDS) {
      const setups = dealt(profile, seed, recentWith('dayOut', 'stayIn', 'laptop'));
      const first = setups.find((s) => s.reason === 'firstNight');
      expect(first?.light).toBe('night');
      expect(setups.find((s) => s !== first)?.light).toBe('day');
    }
  });

  it('one day and one night otherwise', () => {
    for (const seed of SEEDS) {
      expect(
        dealt(MIX, seed)
          .map((s) => s.light)
          .sort(),
      ).toEqual(['day', 'night']);
    }
  });

  it('with an offer, its treatments first, each with a reason it takes', () => {
    for (const seed of SEEDS) {
      const setups = dealt(MIX, seed, [], offerOn(['Couple Massage', 'Foot Reflexology']));
      expect(new Set(setups.map((s) => s.treatment))).toEqual(
        new Set(['Couple Massage', 'Foot Reflexology']),
      );
      const couple = setups.find((s) => s.treatment === 'Couple Massage');
      const foot = setups.find((s) => s.treatment === 'Foot Reflexology');
      expect(['twoOfYou', 'stayIn']).toContain(couple?.reason);
      expect(['dayOut', 'stayIn', 'firstNight']).toContain(foot?.reason);
      expect(couple?.reason).not.toBe(foot?.reason);
    }
  });

  it('stayIn when nothing else is left', () => {
    const profile = guestsProfile(['Pregnancy Massage']);
    for (const seed of SEEDS) expect(reasonsOf(profile, seed)).toEqual(['stayIn', 'stayIn']);
  });

  it('a couple massage alone: two of you, and staying in', () => {
    const profile = guestsProfile(['Couple Massage']);
    for (const seed of SEEDS) {
      expect(new Set(reasonsOf(profile, seed))).toEqual(new Set(['twoOfYou', 'stayIn']));
    }
  });

  it('the same seed deals the same', () => {
    for (const seed of SEEDS) expect(dealt(MIX, seed)).toEqual(dealt(MIX, seed));
  });
});

describe('reasonFor', () => {
  it('a reason the look takes and nobody has, stayIn when none is left', () => {
    for (const seed of SEEDS) {
      const random = seededRandom(seed);
      expect(reasonFor('couple', ['twoOfYou'], random)).toBe('stayIn');
      expect(reasonFor('pregnancy', ['stayIn'], random)).toBe('stayIn');
      expect(['laptop', 'stayIn', 'firstNight']).toContain(reasonFor('head', [], random));
    }
  });
});

describe('the facts of a reasons deal', () => {
  it('every set-up carries a fact, never one that turns a request away', () => {
    const highlights = [
      'Trained local Vietnamese therapists',
      'Free travel in our core areas',
      'Professional therapeutic massage only',
      'No upfront deposit required',
    ].map((value) => ({ value, source: BASE.siteUrl }));
    const profile = { ...MIX, highlights };
    for (const seed of SEEDS) {
      for (const setup of dealt(profile, seed)) {
        expect(setup.fact).toBeDefined();
        expect(setup.fact).not.toBe('Professional therapeutic massage only');
      }
    }
  });
});

// The eval and the replay deal these, so the maintainer judges every reason
// (docs/specs/posts/reasons-to-book, "Tests and evaluation").
describe('the recordings, steered', () => {
  it('the four recordings deal every reason, and the hours at night', async () => {
    const reasons = new Set<string>();
    let hours = false;
    for (const slug of ['sen', 'svarga']) {
      const profile = await fixtureProfile(join(FIXTURES_DIR, slug));
      for (const withOffer of [false, true]) {
        const offer = withOffer ? fixtureOffer(profile) : undefined;
        const random = seededRandom(withOffer ? `${slug}:offer` : slug);
        for (const setup of dealReasonSetups(
          profile,
          offer,
          random,
          fixtureRecent(slug, withOffer),
        )) {
          if (setup.reason) reasons.add(setup.reason);
          if (setup.light === 'night' && setup.fact?.startsWith('Hours: ')) hours = true;
        }
      }
    }
    expect([...reasons].sort()).toEqual([...REASONS].sort());
    expect(hours).toBe(true);
  });

  it('other slugs get no made-up recent posts', () => {
    expect(fixtureRecent('karsa-spa', false)).toEqual([]);
  });
});
