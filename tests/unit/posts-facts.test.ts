import { describe, expect, it } from 'vitest';
import type { Profile } from '@/lib/brand/profile';
import {
  dealFacts,
  factsOf,
  keptFact,
  newFact,
  onlySaysWhere,
  postsPromptInput,
  turnsAway,
} from '@/lib/posts/facts';
import { postsModelInput } from '@/lib/posts/input';
import { seededRandom } from '@/lib/posts/setup';
import { SITE, svargaProfile } from './helpers/brand';
import { setupAt } from './helpers/posts';

// The fact that ends each caption, dealt by code (docs/specs/posts/reasons-to-book,
// "The fact, dealt by code").

const SEN = [
  'Trained local Vietnamese therapists',
  'Free travel in our core areas',
  'Linens, towels and oils included',
  'Professional therapeutic massage only',
  'No upfront deposit required',
];
const TURNED_AWAY = 'Professional therapeutic massage only';
const HOURS = '08:30-23:00 daily';
const SEEDS = Array.from({ length: 100 }, (_, i) => `f${i}`);

function withHighlights(values: string[], hours: string | null = null): Profile {
  return {
    ...svargaProfile(),
    highlights: values.map((value) => ({ value, source: SITE })),
    hours: hours ? { value: hours, source: SITE } : null,
  };
}

describe('what makes a fact', () => {
  it('a highlight that turns a request away', () => {
    expect(turnsAway(TURNED_AWAY)).toBe(true);
    expect(turnsAway('Strictly no sexual services')).toBe(true);
    expect(turnsAway('No upfront deposit required')).toBe(false);
    expect(turnsAway('Free travel in our core areas')).toBe(false);
  });

  it('a short highlight that only says where', () => {
    expect(onlySaysWhere('Massage at your villa or hotel')).toBe(true);
    expect(onlySaysWhere('No upfront deposit for villas and hotels')).toBe(false);
    expect(onlySaysWhere('Fresh linens, towels, and natural oils brought to you')).toBe(false);
  });

  it("Sen's facts are its highlights but the one that turns a request away", () => {
    expect(factsOf(withHighlights(SEN))).toEqual(SEN.filter((h) => h !== TURNED_AWAY));
  });
});

describe('dealFacts', () => {
  it('never the same fact twice, never the turned-away one, the hours only at night', () => {
    const profile = withHighlights(SEN, HOURS);
    let hoursAtNight = false;
    for (const seed of SEEDS) {
      const [day, night] = dealFacts(
        profile,
        [setupAt('day'), setupAt('night')],
        seededRandom(seed),
      );
      expect(day.fact).toBeDefined();
      expect(day.fact).not.toBe(night.fact);
      expect(day.fact).not.toMatch(/^Hours: /);
      expect([day.fact, night.fact]).not.toContain(TURNED_AWAY);
      if (night.fact === `Hours: ${HOURS}`) hoursAtNight = true;
    }
    expect(hoursAtNight).toBe(true);
  });

  it('no fact when none is left', () => {
    const none = withHighlights([TURNED_AWAY]);
    expect(
      dealFacts(none, [setupAt('day'), setupAt('night')], seededRandom('x')).map((s) => s.fact),
    ).toEqual([undefined, undefined]);
    const one = withHighlights(['No upfront deposit required']);
    expect(
      dealFacts(one, [setupAt('day'), setupAt('day')], seededRandom('x')).map((s) => s.fact),
    ).toEqual(['No upfront deposit required', undefined]);
  });
});

describe('a fact for new words, or kept', () => {
  it("new texts get neither their own fact nor the other post's while another is left", () => {
    const profile = withHighlights(SEN);
    const [first, second] = factsOf(profile);
    for (const seed of SEEDS) {
      const fact = newFact(
        profile,
        setupAt('day', { fact: first }),
        setupAt('night', { fact: second }),
        seededRandom(seed),
      );
      expect(fact).toBeDefined();
      expect([first, second]).not.toContain(fact);
    }
    const alone = withHighlights(['No upfront deposit required']);
    expect(
      newFact(
        alone,
        setupAt('day', { fact: 'No upfront deposit required' }),
        undefined,
        seededRandom('x'),
      ),
    ).toBe('No upfront deposit required');
  });

  it('a kept fact while the profile still holds it', () => {
    const fact = 'Free travel in our core areas';
    expect(keptFact(withHighlights(SEN), setupAt('day', { fact }))).toBe(fact);
    expect(
      keptFact(withHighlights(SEN.filter((h) => h !== fact)), setupAt('day', { fact })),
    ).toBeUndefined();
    const hours = `Hours: ${HOURS}`;
    expect(keptFact(withHighlights(SEN, HOURS), setupAt('night', { fact: hours }))).toBe(hours);
    expect(keptFact(withHighlights(SEN, HOURS), setupAt('day', { fact: hours }))).toBeUndefined();
    expect(
      keptFact(withHighlights(SEN, '09:00-22:00 daily'), setupAt('night', { fact: hours })),
    ).toBeUndefined();
  });
});

describe("the model's profile", () => {
  it('never holds a highlight that turns a request away; the hashed one still does', () => {
    const profile = withHighlights(SEN);
    expect(postsPromptInput(profile).highlights.map((h) => h.value)).not.toContain(TURNED_AWAY);
    expect(postsModelInput(profile).highlights.map((h) => h.value)).toContain(TURNED_AWAY);
  });
});
