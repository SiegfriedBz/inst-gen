import { countryOf } from '@/lib/brand/country';
import type { Profile } from '@/lib/brand/profile';
import { hashText } from './input';

// Each image's set-up, dealt by code before the post plan
// (docs/specs/posts/varied-images): which treatment it shows, who is in it,
// and from where.

export type LookKey =
  | 'fourHands'
  | 'couple'
  | 'thai'
  | 'foot'
  | 'stone'
  | 'head'
  | 'scrub'
  | 'pregnancy'
  | 'plain';

// Lower case, accents dropped, so "Thái" matches "thai".
function plain(text: string): string {
  return text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

function holds(text: string, words: readonly string[]): boolean {
  return words.some((word) => new RegExp(`(?:^|[^a-z0-9])${word}(?:$|[^a-z0-9])`).test(text));
}

// Offerings the images never show: not a treatment on a body, a child, or a
// treatment the looks below have no picture for.
const EXCLUDED = [
  'gift',
  'voucher',
  'card',
  'night',
  'nights',
  'room',
  'drink',
  'tea',
  'transfer',
  'class',
  'yoga',
  'kid',
  'kids',
  'child',
  'children',
  'anak',
  'manicure',
  'pedicure',
  'nail',
  'nails',
  'ear candling',
  'reiki',
  'singing bowl',
];

// The first row whose words a name holds gives its look; none gives plain.
const LOOK_WORDS: [Exclude<LookKey, 'plain'>, string[]][] = [
  ['pregnancy', ['pregnancy', 'pregnant', 'prenatal', 'maternity']],
  [
    'fourHands',
    ['four hands', 'four-hands', 'four hand', 'four-hand', '4 hands', '4-hands', '4-hand'],
  ],
  ['couple', ['couple', 'couples']],
  ['thai', ['thai', 'stretch', 'stretching']],
  ['foot', ['foot', 'feet', 'reflexology']],
  ['stone', ['hot stone', 'stone', 'stones']],
  ['head', ['head', 'scalp', 'face', 'facial']],
  ['scrub', ['scrub', 'body wrap', 'wrap']],
];

export function lookOf(name: string): LookKey | 'excluded' {
  const text = plain(name);
  if (holds(text, EXCLUDED)) return 'excluded';
  return LOOK_WORDS.find(([, words]) => holds(text, words))?.[0] ?? 'plain';
}

export type Locals = 'Vietnamese' | 'Balinese' | 'Indonesian' | 'Southeast Asian';

export const BALI_PLACES = [
  'Bali',
  'Denpasar',
  'Canggu',
  'Pererenan',
  'Seminyak',
  'Kerobokan',
  'Kuta',
  'Legian',
  'Sanur',
  'Ubud',
  'Uluwatu',
  'Jimbaran',
  'Nusa Dua',
  'Amed',
  'Lovina',
] as const;

function inBali(profile: Profile): boolean {
  const { town, area, serviceArea } = profile.location;
  const places = [town, area, serviceArea].map((p) => plain(p?.value ?? '')).join(' | ');
  if (holds(places, BALI_PLACES.map(plain))) return true;
  try {
    return new URL(profile.siteUrl).hostname.toLowerCase().includes('bali');
  } catch {
    return false;
  }
}

// Where the therapists are from: the women of the business's own place.
export function localsOf(profile: Profile): Locals {
  const country = countryOf(profile);
  if (country === 'VN') return 'Vietnamese';
  if (country === 'ID') return inBali(profile) ? 'Balinese' : 'Indonesian';
  return 'Southeast Asian';
}

// Mulberry32, seeded from the text's hash: the same seed deals the same
// set-ups, for tests and for replaying a recorded plan.
export function seededRandom(seed: string): () => number {
  let state = Number.parseInt(hashText(seed), 16);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
