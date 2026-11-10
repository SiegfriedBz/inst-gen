import { describe, expect, it } from 'vitest';
import type { Post } from '@/lib/posts/batch';
import { dealSetups, seededRandom } from '@/lib/posts/setup';
import { copyRecords, lightRecords, repeatRecords, sentenceWords } from '@/lib/posts/variety';
import { senProfile, svargaProfile } from './helpers/brand';
import { post } from './helpers/posts';

// docs/specs/posts/day-and-night-copy, "Code's checks".
const [setup] = dealSetups(svargaProfile(), undefined, seededRandom('t'));

function at(
  n: number,
  caption: string,
  more: { light?: 'day' | 'night'; storyText?: string; offer?: true } = {},
): Post {
  const { light, ...rest } = more;
  return post({
    id: `post-${n}`,
    caption,
    ...(light ? { setup: { ...setup, light } } : {}),
    ...rest,
  });
}

describe('repeatRecords', () => {
  it('records a last sentence two captions share, flowers, case and spaces aside', () => {
    const posts = [
      at(1, 'Sore legs? Let warm oil work. Wake up light tomorrow. 🌺'),
      at(2, 'Busy day? Rest here. Feel new.'),
      at(3, 'Hot sun? Cool down. Smile again.'),
      at(4, 'Long walk? Slow hands help.  wake up light   tomorrow.'),
    ];
    expect(repeatRecords(posts)).toEqual([
      { field: 'mix', reason: 'last sentence "Wake up light tomorrow." in post-1, post-4' },
    ]);
  });

  it('records a first sentence two captions share', () => {
    const posts = [
      at(1, 'Feel new. Rest here.'),
      at(2, 'Long flight? 🌸 Let us ease it. Smile.'),
      at(3, 'Long flight? 🌺 Sleep it off. Breathe.'),
    ];
    expect(repeatRecords(posts)).toEqual([
      { field: 'mix', reason: 'first sentence "Long flight?" in post-2, post-3' },
    ]);
  });

  it('records a story text ending two posts share, but not on offer posts', () => {
    const story = (offer?: true) => [
      at(1, 'A. B.', { storyText: 'Tired? Sleep well. 🌸', offer }),
      at(2, 'C. D.', { storyText: 'Sore? sleep well. 🌺', offer }),
    ];
    expect(repeatRecords(story())).toEqual([
      { field: 'mix', reason: 'story text "Sleep well." in post-1, post-2' },
    ]);
    expect(repeatRecords(story(true))).toEqual([]);
  });

  it('leaves out offer posts opening on the same offer line', () => {
    const line = '10% off our 90-minute Balinese Massage, until Sunday 1 November.';
    const posts = [
      at(1, `${line} 🌸 Sore back? Rest.`, { offer: true }),
      at(2, `${line} 🌺 Long day? Unwind.`, { offer: true }),
    ];
    expect(repeatRecords(posts)).toEqual([]);
  });

  it('reads an emoji as the end of a sentence, and ignores the last stop', () => {
    const posts = [
      at(1, 'Rest here 🌸 Feel new 🌺'),
      at(2, 'Rest here. Smile.'),
      at(3, 'Busy day? Wake up light tomorrow 🌺'),
      at(4, 'Long walk? Wake up light tomorrow!'),
    ];
    expect(repeatRecords(posts)).toEqual([
      { field: 'mix', reason: 'first sentence "Rest here" in post-1, post-2' },
      { field: 'mix', reason: 'last sentence "Wake up light tomorrow" in post-3, post-4' },
    ]);
  });

  it('records nothing when every post differs', () => {
    const posts = Array.from({ length: 6 }, (_, i) =>
      at(i + 1, `Hook ${i}? Body ${i}. End ${i}. 🌸`, { storyText: `Story ${i}. 🌺` }),
    );
    expect(repeatRecords(posts)).toEqual([]);
  });
});

describe('lightRecords', () => {
  it('records a night word on a day post', () => {
    expect(lightRecords(at(2, 'Feel calm. Sleep deeply tonight.', { light: 'day' }))).toEqual([
      { field: 'light', reason: 'post-2 (day): "sleep"' },
    ]);
  });

  it('records a day word on a night post', () => {
    expect(lightRecords(at(3, 'Perfect this afternoon.', { light: 'night' }))).toEqual([
      { field: 'light', reason: 'post-3 (night): "this afternoon"' },
    ]);
  });

  it('matches whole words only', () => {
    expect(lightRecords(at(1, 'After wakeboarding, an awakening.', { light: 'day' }))).toEqual([]);
  });

  it('reads a post without a set-up as a day', () => {
    expect(lightRecords(at(4, 'Wake up fresh.'))).toEqual([
      { field: 'light', reason: 'post-4 (day): "wake"' },
    ]);
  });

  it('checks the story text too', () => {
    expect(
      lightRecords(at(5, 'Calm hands.', { light: 'night', storyText: 'Your midday break. 🌸' })),
    ).toEqual([{ field: 'light', reason: 'post-5 (night): "midday"' }]);
  });
});

// docs/specs/posts/marketing-copy, "Code's records".
describe('copyRecords', () => {
  // Svarga's places, as its read profile holds them: the town, the area and
  // the service area's towns. Its place symbols are no place (amended
  // 2026-11-08).
  const svarga = () => {
    const profile = svargaProfile();
    profile.essence.placeSymbols = ['frangipani', 'coconut oil'];
    return profile;
  };
  const at = (n: number, caption: string, more: Partial<Post> = {}) =>
    post({ id: `post-${n}`, caption, ...more });
  const reasons = (posts: Post[], profile = svarga()) =>
    copyRecords(posts, profile).map((d) => `${d.field}: ${d.reason}`);

  it('records nothing on a clean batch', () => {
    expect(
      reasons([
        at(1, 'Sore shoulders after the surf in Canggu? Warm hands help.'),
        at(2, 'Frangipani on the tray in Canggu. Slow strokes follow.'),
        at(3, 'Ninety minutes in Seminyak, start to end.'),
      ]),
    ).toEqual([]);
  });

  it('records two question hooks, never an offer post or one alone', () => {
    const offerPost = at(1, 'Long flight to Bali? Ten percent off.', { offer: true });
    expect(
      reasons([
        offerPost,
        at(2, 'Sore feet in Canggu? Warm oil helps.'),
        at(3, 'Firm hands in Ubud.'),
        at(4, 'Slow evening in Seminyak.'),
        at(5, 'Tired legs after Bali? Rest now.'),
      ]),
    ).toEqual(['mix: question hooks in post-2, post-5']);
    expect(reasons([offerPost, at(2, 'Sore feet in Canggu? Warm oil helps.')])).toEqual([]);
  });

  // Both captions of a plan (docs/specs/posts/marketing-copy, amended 2026-11-08).
  it('records a stock word in 2 captions, whole words, case aside', () => {
    expect(
      reasons([at(1, 'Completely loose in Canggu.'), at(2, 'Rest COMPLETELY in Ubud.')]),
    ).toEqual(['words: "completely" in post-1, post-2']);
    expect(
      reasons([at(1, 'Golden oil first, in Canggu.'), at(2, 'Then golden oil, in Ubud.')]),
    ).toEqual(['words: "golden oil" in post-1, post-2']);
    expect(reasons([at(1, 'A good feeling in Canggu.'), at(2, 'Feeling light in Ubud.')])).toEqual(
      [],
    );
    expect(reasons([at(1, 'Completely loose in Canggu.'), at(2, 'Rest now in Ubud.')])).toEqual([]);
  });

  it('records endings that start with the same word, as the first one writes it', () => {
    expect(
      reasons([
        at(1, 'Warm hands in Canggu.'),
        at(3, 'Canggu at dusk. Drift off slowly. 🌸'),
        at(4, 'Slow evening in Ubud.'),
        at(5, 'Canggu nights. drift away tonight.'),
      ]),
    ).toEqual(['mix: endings start with "Drift" in post-3, post-5']);
  });

  it('records a caption that names no real place: a flower or an oil is none', () => {
    expect(
      reasons([
        at(1, 'Slow hands on a long back.'),
        at(2, 'Frangipani on the tray.'),
        at(3, 'Warm coconut oil, slowly.'),
        at(4, "Canggu's busy lanes."),
        at(5, 'Seminyak, then rest.'),
      ]),
    ).toEqual([
      'words: post-1 names no place',
      'words: post-2 names no place',
      'words: post-3 names no place',
    ]);
  });

  it('reads a landmark by its leading capitalised words: My Khe for My Khe beach', () => {
    const profile = senProfile();
    profile.essence.placeSymbols = ['My Khe beach at dusk', 'Marble Mountains', 'lotus flowers'];
    profile.location.serviceArea = null;
    expect(
      reasons(
        [
          at(1, 'A swim at My Khe, then rest.'),
          at(2, 'Lotus flowers by the bed.'),
          at(3, 'Marble Mountains at dawn.'),
        ],
        profile,
      ),
    ).toEqual(['words: post-2 names no place']);
  });

  it('records a story text that starts with its treatment or holds the first sentence', () => {
    const [deal] = dealSetups(svarga(), undefined, seededRandom('t'));
    const treated = { ...deal, treatment: 'Deep Tissue Tension Release' };
    expect(
      reasons([
        at(3, 'Knots from the paddle in Canggu?', {
          setup: treated,
          storyText: 'deep tissue tension release tonight 🌸',
        }),
        at(4, 'Long day on the scooter in Ubud.', {
          storyText: 'Long day on the scooter in Ubud? We come to you 🌸',
        }),
        at(1, 'Long flight to Bali? Ten percent off.', {
          offer: true,
          setup: treated,
          storyText: 'Deep Tissue Tension Release, 10% off 🌸',
        }),
      ]),
    ).toEqual([
      'story: post-3: story text starts with "Deep Tissue Tension Release"',
      "story: post-4: story text holds the caption's first sentence",
    ]);
  });

  it('records a sentence that asks the guest to act, never one that names WhatsApp', () => {
    expect(
      reasons([
        at(4, 'Warm hands in Canggu. Message us on WhatsApp today.'),
        at(5, 'We reply on WhatsApp within about 5 minutes, in Ubud.'),
        at(6, 'Book now for tonight in Bali.'),
      ]),
    ).toEqual([
      'cta: post-4: "Message us on WhatsApp today."',
      'cta: post-6: "Book now for tonight in Bali."',
    ]);
  });

  // docs/specs/posts/short-captions, "Code's records".
  const fifteen = 'Warm hands work the knots out of your back after a long day in Canggu.';
  const sixteen = 'Warm hands work the knots out of your back after a long busy day in Canggu.';

  it('records a sentence of more than 15 words', () => {
    expect(reasons([at(2, fifteen)])).toEqual([]);
    expect(reasons([at(2, sixteen)])).toEqual([
      'words: post-2: 16 words in "Warm hands work the…"',
    ]);
  });

  it("never counts an offer post's offer line", () => {
    const second = 'Slow hands ease the stiff legs you carry home from a long busy day in Canggu.';
    expect(reasons([at(1, `${sixteen} ${second}`, { offer: true })])).toEqual([
      'words: post-1: 16 words in "Slow hands ease the…"',
    ]);
  });

  it('records the words of a setting, as they come, in a caption and a story text', () => {
    expect(
      reasons([at(1, 'Evening lamps cast a golden glow across fresh linens in Canggu.')]),
    ).toEqual(['words: post-1 describes the setting: "lamps", "glow", "linens"']);
    expect(
      reasons([
        at(1, 'Warm hands in Canggu.', { storyText: 'A soft glow waits in your room tonight 🌺' }),
      ]),
    ).toEqual(['words: post-1\'s story text describes the setting: "glow"']);
  });

  it('records no setting for a body that feels light', () => {
    expect(reasons([at(1, 'Your legs feel light again in Canggu.')])).toEqual([]);
  });
});

describe('sentenceWords', () => {
  it('counts the words of each sentence, emoji aside', () => {
    expect(sentenceWords('Sore legs? 🌸 Our therapists come to you.')).toEqual([2, 5]);
  });
});
