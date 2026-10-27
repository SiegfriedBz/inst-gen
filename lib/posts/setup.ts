import { z } from 'zod';
import { countryOf } from '@/lib/brand/country';
import type { Profile } from '@/lib/brand/profile';
import { hashText } from './input';
import type { Offer } from './offer';
import { SCENES } from './scene';

// Each image's set-up, dealt by code before the post plan
// (docs/specs/posts/varied-images): which treatment it shows, who is in it,
// and from where.

export const LOOKS = [
  'fourHands',
  'couple',
  'thai',
  'foot',
  'stone',
  'head',
  'scrub',
  'pregnancy',
  'plain',
] as const;
export type LookKey = (typeof LOOKS)[number];

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

export const LOCALS = ['Vietnamese', 'Balinese', 'Indonesian', 'Southeast Asian'] as const;
export type Locals = (typeof LOCALS)[number];

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

export const BODY_PARTS = [
  'back',
  'shoulders and neck',
  'legs',
  'feet',
  'arms and hands',
  'head',
  'whole body',
] as const;
export type BodyPart = (typeof BODY_PARTS)[number];

export const setupSchema = z.object({
  treatment: z.string().min(1).optional(),
  look: z.enum(LOOKS),
  guests: z.enum(['man', 'woman', 'couple']),
  therapists: z.union([z.literal(1), z.literal(2)]),
  bodyPart: z.enum(BODY_PARTS),
  scene: z.enum(SCENES),
  locals: z.enum(LOCALS),
});
export type Setup = z.infer<typeof setupSchema>;

const SETUPS = 6;

// Where the hands work for a look; the others take the free parts.
const FIXED_PARTS: Partial<Record<LookKey, readonly BodyPart[]>> = {
  foot: ['feet'],
  thai: ['whole body'],
  stone: ['back'],
  head: ['head'],
  pregnancy: ['back'],
  scrub: ['back', 'arms and hands'],
};
const FREE_PARTS: readonly BodyPart[] = ['back', 'shoulders and neck', 'legs', 'arms and hands'];

function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

// The six treatments: the offer's first, then the eligible offerings in
// shuffled passes, each once before any twice.
function dealTreatments(
  profile: Profile,
  offer: Offer | undefined,
  random: () => number,
): (string | undefined)[] {
  const out: (string | undefined)[] = [];
  if (offer) {
    const offered = shuffled(offer.treatments, random);
    out.push(offered[0], offered[1] ?? offered[0]);
  }
  const eligible = profile.offerings
    .map((o) => o.name)
    .filter((name) => lookOf(name) !== 'excluded');
  if (!eligible.length) return [...out, ...Array(SETUPS - out.length).fill(undefined)];
  let pass = shuffled(
    eligible.filter((name) => !out.includes(name)),
    random,
  );
  while (out.length < SETUPS) {
    if (!pass.length) pass = shuffled(eligible, random);
    out.push(pass.shift());
  }
  return out;
}

export function dealSetups(
  profile: Profile,
  offer: Offer | undefined,
  random: () => number,
): Setup[] {
  const locals = localsOf(profile);
  const looks = dealTreatments(profile, offer, random).map((treatment) => {
    const look = treatment ? lookOf(treatment) : 'plain';
    return { treatment, look: look === 'excluded' ? ('plain' as const) : look };
  });

  const used = new Map<BodyPart, number>();
  const bodyParts = looks.map(({ look }) => {
    const choices = FIXED_PARTS[look] ?? FREE_PARTS;
    const least = Math.min(...choices.map((part) => used.get(part) ?? 0));
    const part = pick(
      choices.filter((c) => (used.get(c) ?? 0) === least),
      random,
    );
    used.set(part, (used.get(part) ?? 0) + 1);
    return part;
  });

  // Couples aren't counted; the rest half and half, the odd one a man.
  const counted = looks.filter(({ look }) => look !== 'couple').length;
  const pregnancies = looks.filter(({ look }) => look === 'pregnancy').length;
  const open = counted - pregnancies;
  const women = Math.max(0, Math.floor(counted / 2) - pregnancies);
  const free = shuffled(
    [...Array(open - women).fill('man'), ...Array(women).fill('woman')] as ('man' | 'woman')[],
    random,
  );
  const guests = looks.map(({ look }) =>
    look === 'couple' ? 'couple' : look === 'pregnancy' ? 'woman' : (free.shift() ?? 'man'),
  );

  const scenes = shuffled([...SCENES, ...SCENES], random).slice(0, SETUPS);

  return looks.map(({ treatment, look }, i) => ({
    ...(treatment ? { treatment } : {}),
    look,
    guests: guests[i],
    therapists: look === 'fourHands' || look === 'couple' ? 2 : 1,
    bodyPart: bodyParts[i],
    scene: scenes[i],
    locals,
  }));
}
