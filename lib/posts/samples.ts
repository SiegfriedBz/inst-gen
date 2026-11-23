import type { Light, Reason } from './setup';

// Five sample posts, one per reason to book, written by the developer for
// Maré, a made-up business that sends therapists to hotels and flats in
// Lisbon, and approved with docs/specs/posts/reasons-to-book ("Five sample
// posts"; the second amended at the maintainer's word). Lisbon shares no
// place, moment or fact with Sen or Svarga, so a copy shows at once.

export type Sample = {
  reason: Reason;
  light: Light;
  guests: 'one' | 'two';
  caption: string;
  story: string;
};

export const SAMPLES: readonly Sample[] = [
  {
    reason: 'dayOut',
    light: 'night',
    guests: 'one',
    caption:
      "Sore calves after all the stairs at Sintra? 🌸\n\nTonight a therapist comes to your room and works your legs. Then a shower, and you're in bed by ten.\n\nNo payment until after your massage 🌺",
    story: 'Sintra stairs in your calves? We come to you tonight 🌸',
  },
  {
    reason: 'stayIn',
    light: 'night',
    guests: 'two',
    caption:
      'Kids asleep, and neither of you can go out? 🌷\n\nWe send two therapists to your Alfama apartment for a Couple Massage. You lie side by side, and nobody needs a babysitter.\n\nOpen until midnight, every day 🌸',
    story: 'Kids asleep? A Couple Massage in your room 🌷',
  },
  {
    reason: 'twoOfYou',
    light: 'day',
    guests: 'two',
    caption:
      "Massage for two, side by side, in your own room? 🌼\n\nTwo therapists come to your Belém hotel, one for each of you. You're both done at the same time, with the afternoon ahead.\n\nMassage tables, towels and oils included 🌸",
    story: 'Two of you, two therapists, one room 🌼',
  },
  {
    reason: 'firstNight',
    light: 'night',
    guests: 'one',
    caption:
      'Stiff back after the long-haul flight into Lisbon? 🪷\n\nWe come to your hotel tonight. Your therapist works the flight out of your back before you sleep.\n\nA therapist at your door within the hour 🌺',
    story: 'Just landed? We bring the massage to your hotel 🪷',
  },
  {
    reason: 'laptop',
    light: 'day',
    guests: 'one',
    caption:
      "A week of laptop calls, and now your neck won't turn? 🌺\n\nTake an hour off this afternoon, without leaving your Chiado flat. Your therapist works your neck and shoulders loose before tomorrow's calls.\n\nFree travel in central Lisbon 🌸",
    story: 'Laptop neck? A therapist at your flat this afternoon 🌺',
  },
];

// Maré's highlights, made up.
export const SAMPLE_FACTS: readonly string[] = [
  'No payment until after your massage',
  'Open until midnight, every day',
  'Massage tables, towels and oils included',
  'A therapist at your door within the hour',
  'Free travel in central Lisbon',
];

// Maré and its places: in Sen's or Svarga's post, a copy.
export const SAMPLE_PLACES = ['Maré', 'Lisbon', 'Sintra', 'Alfama', 'Belém', 'Chiado'] as const;

// The samples' own phrases, which code records when a post holds one. The
// last three are Maré's made-up facts. The list may grow.
export const SAMPLE_PHRASES: readonly string[] = [
  'all the stairs at',
  'in bed by ten',
  'neither of you can go out',
  'you lie side by side',
  'babysitter',
  'side by side, in your own room',
  'both done at the same time',
  'works the flight out',
  'laptop calls',
  "neck won't turn",
  'take an hour off',
  'neck and shoulders loose',
  "tomorrow's calls",
  'two therapists, one room',
  'bring the massage to your hotel',
  'within the hour',
  'no payment until',
  'until midnight',
];

const GUESTS = { one: 'one guest', two: 'two guests on a couple massage' } as const;

// The samples as the prompt shows them: never those of the reasons the
// call's posts have, so a post can't copy its own reason's sample
// (docs/specs/posts/reasons-to-book, amended 2026-11-23).
export function samplesText(without: readonly Reason[] = []): string {
  const shown = SAMPLES.filter((s) => !without.includes(s.reason));
  const each =
    shown.length < SAMPLES.length ? 'one for each of the other reasons' : 'one for each reason';
  const posts = shown.map(
    (s) =>
      `${s.reason}, a ${s.light} post, ${GUESTS[s.guests]}:\n${s.caption}\nStory text: ${s.story}`,
  );
  return `Samples: ${shown.length} posts of Maré, a made-up business that sends therapists to hotels and flats in Lisbon, ${each}. They show the voice, the length and the three paragraphs. Write new posts for this business in the same spirit, and never a sample's words, places or facts: Maré, its places and its facts are not this business's.

Maré's facts: ${SAMPLE_FACTS.join('; ')}.

${posts.join('\n\n')}`;
}
