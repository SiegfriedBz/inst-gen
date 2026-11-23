import { describe, expect, it } from 'vitest';
import type { Profile } from '@/lib/brand/profile';
import type { Post } from '@/lib/posts/batch';
import { reasonRecords } from '@/lib/posts/reason-records';
import { SAMPLES } from '@/lib/posts/samples';
import type { Reason, Setup } from '@/lib/posts/setup';
import { SITE, svargaProfile } from './helpers/brand';
import { post, setupAt } from './helpers/posts';

// Code's records on the posts of a business that comes to its guests
// (docs/specs/posts/reasons-to-book, "Code's records").

const SEN_HIGHLIGHTS = [
  'Trained local Vietnamese therapists',
  'Free travel in our core areas',
  'Professional therapeutic massage only',
  'No upfront deposit required',
];
const sen: Profile = {
  ...svargaProfile(),
  highlights: SEN_HIGHLIGHTS.map((value) => ({ value, source: SITE })),
};

function reasonPost(
  reason: Reason,
  caption: string,
  storyText?: string,
  setup: Partial<Setup> = {},
): Post {
  return post({
    id: 'post-1',
    caption,
    ...(storyText ? { storyText } : {}),
    setup: setupAt('night', { reason, ...setup }),
  });
}

const reasons = (posts: Post[], profile: Profile = sen) =>
  reasonRecords(posts, profile).map((d) => d.reason);

describe('a question in the first person', () => {
  it('is recorded', () => {
    expect(
      reasonRecords(
        [reasonPost('stayIn', 'Can a therapist bring oils to my hotel tonight? 🌸\n\nWe do.')],
        sen,
      ),
    ).toContainEqual({ field: 'mix', reason: 'post-1: question in the first person' });
  });

  // Sen's own beach, and its neighbours' sites, start with "My".
  it('a place that starts with My is no first person', () => {
    for (const question of [
      'Sore shoulders after a surf at My Khe?',
      'Legs heavy after a day at Mỹ Khê?',
      'Back stiff after the walk to My Son?',
    ]) {
      expect(reasons([reasonPost('dayOut', `${question} 🌸\n\nWe come to you.`)])).not.toContain(
        'post-1: question in the first person',
      );
    }
    expect(
      reasons([reasonPost('dayOut', 'My shoulders hurt after the beach? 🌸\n\nWe come to you.')]),
    ).toContain('post-1: question in the first person');
  });

  it("on an offer post, it's the first sentence after the offer line", () => {
    const offerPost = {
      ...reasonPost(
        'stayIn',
        '10% off our 90-minute Thai Massage, until Sunday 1 November. 🌸\n\nCan we come to your room tonight? Yes.',
      ),
      offer: true as const,
    };
    expect(reasons([offerPost])).toContain('post-1: question in the first person');
  });
});

describe('a question that misses its reason', () => {
  const surf = 'Sore shoulders after a surf at My Khe? 🌸\n\nWe come to you.';

  it('is recorded with its reason', () => {
    expect(reasonRecords([reasonPost('laptop', surf)], sen)).toContainEqual({
      field: 'mix',
      reason: 'post-1: question misses its reason (laptop)',
    });
  });

  it('a day out names a part of the body', () => {
    expect(reasons([reasonPost('dayOut', surf)])).toEqual([]);
    expect(reasons([reasonPost('dayOut', 'Tired in Da Nang? 🌸\n\nWe come to you.')])).toContain(
      'post-1: question misses its reason (dayOut)',
    );
  });
});

describe('a highlight that turns a request away', () => {
  it('is recorded in a caption', () => {
    const caption =
      'Late in Da Nang? 🌸\n\nWe offer professional therapeutic massage only in your hotel room.';
    expect(reasonRecords([reasonPost('stayIn', caption)], sen)).toContainEqual({
      field: 'words',
      reason: 'post-1: "professional therapeutic massage only"',
    });
  });
});

describe('a copied sample', () => {
  it("is recorded by the sample's phrase", () => {
    const caption = "Late in Da Nang? 🌸\n\nThen a shower, and you're in bed by ten.";
    expect(reasonRecords([reasonPost('stayIn', caption)], sen)).toContainEqual({
      field: 'words',
      reason: 'post-1 copies a sample: "in bed by ten"',
    });
  });

  it("and by Maré's places, accents ignored", () => {
    expect(
      reasons([reasonPost('dayOut', 'Legs sore after a day at Belem? 🌸\n\nWe come to you.')]),
    ).toContain('post-1 copies a sample: "Belém"');
  });

  it('what every post is asked to say is no copy', () => {
    expect(
      reasons([
        reasonPost(
          'firstNight',
          'Just landed after a long flight? 🌸\n\nWe come to you tonight.',
          'Just landed? We come to you tonight 🌸',
        ),
      ]),
    ).toEqual([]);
  });
});

describe('a caption for two on an image of one', () => {
  const both = 'Both of you, side by side? 🌸\n\nWe come to your room tonight.';
  const record = 'post-1: caption for two guests, image of one';

  it('is recorded on a one-guest post', () => {
    expect(reasonRecords([reasonPost('stayIn', both)], sen)).toContainEqual({
      field: 'mix',
      reason: record,
    });
  });

  it('two therapists on four hands for one guest, or two guests on a couple massage, are not', () => {
    const fourHands = reasonPost(
      'stayIn',
      'Late tonight? 🌸\n\nTwo therapists work on your back.',
      undefined,
      { look: 'fourHands', therapists: 2 },
    );
    const couple = reasonPost('stayIn', both, undefined, {
      look: 'couple',
      guests: 'couple',
      therapists: 2,
    });
    expect(reasons([fourHands, couple])).not.toContain(record);
  });
});

describe('the records run only on posts with a reason', () => {
  it('a post dealt a kind of question gets none of them', () => {
    const asked = post({
      id: 'post-1',
      caption:
        'Can a therapist bring oils to my hotel tonight? 🌸\n\nWe offer professional therapeutic massage only.',
      setup: { ...setupAt('night'), reason: undefined, question: 'ask' },
    });
    expect(reasons([asked])).toEqual([]);
  });

  it('the samples pass every record but the copy', () => {
    const posts = SAMPLES.map((sample) =>
      post({
        id: `post-${sample.reason}`,
        caption: sample.caption,
        storyText: sample.story,
        setup: setupAt(sample.light, {
          reason: sample.reason,
          ...(sample.guests === 'two'
            ? { look: 'couple' as const, guests: 'couple' as const, therapists: 2 as const }
            : {}),
        }),
      }),
    );
    const found = reasons(posts, svargaProfile());
    expect(found.filter((r) => !r.includes('copies a sample'))).toEqual([]);
  });
});
