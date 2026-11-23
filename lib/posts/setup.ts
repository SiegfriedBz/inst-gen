import { z } from 'zod';
import { countryOf } from '@/lib/brand/country';
import type { Profile } from '@/lib/brand/profile';
import { hashText } from './input';
import type { Offer } from './offer';
import { SCENES, type Scene } from './scene';

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

// Not a treatment either, unless the name also says it is one: "Afternoon
// Tea" is left out, "Green Tea Body Scrub" and "In-Room Massage" are not.
const NOT_A_TREATMENT = ['night', 'nights', 'room', 'drink', 'tea', 'transfer', 'class', 'yoga'];
const TREATMENT = [
  'massage',
  'scrub',
  'facial',
  'reflexology',
  'wrap',
  'stone',
  'therapy',
  'treatment',
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
  if (holds(text, NOT_A_TREATMENT) && !holds(text, TREATMENT)) return 'excluded';
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

// Day or night (docs/specs/posts/day-and-night-images); a set-up saved before
// lights were dealt has none, and is a day.
export const LIGHTS = ['day', 'night'] as const;
export type Light = (typeof LIGHTS)[number];

// How each caption opened (docs/specs/posts/marketing-copy, "Hook styles,
// dealt by code"): no longer dealt, kept so a set-up saved with one loads.
export const HOOKS = ['question', 'scene', 'place', 'number', 'fact', 'promise'] as const;
export type Hook = (typeof HOOKS)[number];

// The kind of question each caption asks (docs/specs/posts/short-captions,
// amended 2026-11-12): the guest's sore spot and its moment, or what a guest
// asks before booking. A set-up dealt before them has none.
export const QUESTIONS = ['sore', 'ask'] as const;
export type Question = (typeof QUESTIONS)[number];

export const setupSchema = z.object({
  treatment: z.string().min(1).optional(),
  look: z.enum(LOOKS),
  guests: z.enum(['man', 'woman', 'couple']),
  therapists: z.union([z.literal(1), z.literal(2)]),
  bodyPart: z.enum(BODY_PARTS),
  scene: z.enum(SCENES),
  locals: z.enum(LOCALS),
  light: z.enum(LIGHTS).optional(),
  hook: z.enum(HOOKS).optional(),
  question: z.enum(QUESTIONS).optional(),
});
export type Setup = z.infer<typeof setupSchema>;

// Two suggestions an attempt (docs/specs/posts/two-suggestions); the same
// number as POSTS_LIMITS.posts, which can't be imported here.
const SETUPS = 2;

// Where the hands work for a look; the others take the free parts. Thai's
// legs are a leg stretch, its back a palm press (docs/specs/posts/normal-bodies).
const FIXED_PARTS: Partial<Record<LookKey, readonly BodyPart[]>> = {
  foot: ['feet'],
  thai: ['legs', 'back'],
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

// The treatments: the offer's first, then the least-used eligible
// offering each time, so each is used once before any twice, the offer's
// included.
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
  // One name, one treatment, however many durations the profile lists.
  const eligible = [
    ...new Set(profile.offerings.map((o) => o.name).filter((n) => lookOf(n) !== 'excluded')),
  ];
  if (!eligible.length) return [...out, ...Array(SETUPS - out.length).fill(undefined)];
  while (out.length < SETUPS) {
    const uses = eligible.map((name) => out.filter((t) => t === name).length);
    const least = Math.min(...uses);
    out.push(
      pick(
        eligible.filter((_, i) => uses[i] === least),
        random,
      ),
    );
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

  // Each scene once to draw from, so the two differ; a couple never takes the
  // close-up, which can't show both guests on their beds.
  const pool = shuffled(SCENES, random);
  const take = (fits: (scene: Scene) => boolean) => {
    const i = pool.findIndex(fits);
    return pool.splice(i === -1 ? 0 : i, 1)[0];
  };
  const scenes: Scene[] = Array(SETUPS);
  for (const [i, { look }] of looks.entries()) {
    if (look === 'couple') scenes[i] = take((scene) => scene !== 'detail');
  }
  for (const [i, { look }] of looks.entries()) {
    if (look !== 'couple') scenes[i] = take(() => true);
  }

  // Half days and half nights, drawn last.
  const half = SETUPS / 2;
  const lights = shuffled(
    [...Array(half).fill('day'), ...Array(half).fill('night')] as Light[],
    random,
  );

  // One kind of question each, with or without an offer. Drawn last, where
  // the hook styles were, so a seed still deals the set-ups it dealt before
  // (docs/specs/posts/short-captions, amended 2026-11-12).
  const questions = shuffled(QUESTIONS, random);

  return looks.map(({ treatment, look }, i) => ({
    ...(treatment ? { treatment } : {}),
    look,
    guests: guests[i],
    therapists: look === 'fourHands' || look === 'couple' ? 2 : 1,
    bodyPart: bodyParts[i],
    scene: scenes[i],
    locals,
    light: lights[i] ?? 'day',
    question: questions[i],
  }));
}

// The set-up in words: one line of the post plan's "### Image set-ups", and
// the cast line code puts first in the image prompt.

const GUESTS: Record<Setup['guests'], string> = {
  man: 'one guest, a man,',
  woman: 'one guest, a woman,',
  couple: 'two guests, a man and a woman,',
};

// The poses of docs/specs/posts/normal-bodies, as the plan reads them; the
// words about clothes are today's. Thai's back is a palm press, any other
// part (the legs, or the whole body of a set-up saved before) a leg stretch.
const LOOK_WORDS_FOR: Record<Exclude<LookKey, 'thai'>, string> = {
  fourHands:
    'face down on a massage bed; two therapists working in step, one standing on each side of the bed',
  couple:
    'face down on two massage beds side by side, a little apart; one therapist at the outer side of each bed, one for each guest',
  foot: 'sitting back in a reclining chair, feet on a towel; the therapist seated at the feet',
  stone:
    "face down on a massage bed, smooth dark stones laid along the back; the therapist's hands holding one",
  head: "lying face up on a massage bed, eyes covered by a folded towel; the therapist's hands at the head or shoulders",
  scrub:
    "face down on a massage bed, scrub on the skin, a bowl of it nearby; the therapist's hands spreading it",
  pregnancy:
    "lying on her side on a massage bed, propped on pillows; the therapist's hands working gently",
  plain: "face down on a massage bed, with warm golden oil; the therapist's hands working",
};
const THAI_WORDS = {
  stretch:
    'on a floor mattress, in loose cotton clothes, lying on the back, a towel over the eyes; the therapist kneeling beside, stretching one bent leg, a hand on the knee and one on the foot',
  press:
    'on a floor mattress, in loose cotton clothes, lying face down; the therapist kneeling beside the hip, pressing both palms on the back',
};

function lookWords(setup: Setup): string {
  if (setup.look !== 'thai') return LOOK_WORDS_FOR[setup.look];
  return setup.bodyPart === 'back' ? THAI_WORDS.press : THAI_WORDS.stretch;
}

const CAMERAS: Record<Setup['scene'], string> = {
  treatment: 'from the side',
  detail: 'a close view of the hands on the body',
  place: 'the room with the treatment in it',
  guest: 'from above',
};

export function setupLine(setup: Setup): string {
  const what = setup.treatment ?? 'A massage';
  return `${what}: ${GUESTS[setup.guests]} ${lookWords(setup)}; the ${setup.bodyPart}; scene ${setup.scene}, ${CAMERAS[setup.scene]}; ${setup.light ?? 'day'}.`;
}

// The pose line code puts right after the cast line in the image prompt
// (docs/specs/posts/normal-bodies): where the guest lies, where each
// therapist is and what her hands do; never clothes or colours.
const POSES: Record<Exclude<LookKey, 'thai'>, (part: BodyPart) => string> = {
  plain: (part) =>
    `the guest lies face down on a massage bed, face in the face hole. The therapist stands at the side of the bed and massages the ${part} with both hands and warm golden oil.`,
  stone: () =>
    'the guest lies face down on a massage bed, smooth dark stones laid along the back. The therapist stands at the side of the bed, one stone in her hand, her other hand on the back.',
  scrub: (part) =>
    `the guest lies face down on a massage bed, scrub on the skin of the ${part}, a bowl of it nearby. The therapist stands at the side of the bed and spreads it with both hands.`,
  fourHands: (part) =>
    `the guest lies face down on a massage bed, face in the face hole. The two therapists stand on opposite sides of the bed, one on each side and apart, each massaging the ${part} on her side with both hands, in step.`,
  couple: (part) =>
    `two massage beds side by side, a little apart; on each, one guest lies face down, face in the face hole. Each therapist stands at the outer side of her guest's bed and massages that guest's ${part} with both hands; the two therapists are apart, one for each guest.`,
  foot: () =>
    "the guest sits back in a reclining chair, feet on a towel. The therapist sits on a low stool at the guest's feet and massages one foot with both hands.",
  head: () =>
    "the guest lies face up on a massage bed, a folded towel over the eyes. The therapist sits or stands at the head of the bed, both hands at the guest's temples or shoulders.",
  pregnancy: () =>
    'the guest lies on her side on a massage bed, a pillow under her head and one between her knees. The therapist stands behind her and massages her lower back with both hands.',
};
const THAI_POSES = {
  stretch:
    "the guest lies on their back on a low mattress, head on a pillow, a folded towel over the eyes, arms resting by the sides. One leg lies straight; the other is bent at the knee and raised toward the chest. The therapist kneels upright on the mattress beside the bent leg, her own knees clear of the guest's legs; one hand holds the knee, the other the foot or ankle, and she presses the knee gently toward the chest.",
  press:
    "the guest lies face down on a low mattress, forehead on a pillow, arms by the sides, legs straight. The therapist kneels upright beside the mattress, level with the guest's hip, and presses both palms flat on the back.",
};

export function poseLine(setup: Setup): string {
  const pose =
    setup.look === 'thai'
      ? THAI_POSES[setup.bodyPart === 'back' ? 'press' : 'stretch']
      : POSES[setup.look](setup.bodyPart);
  return `Pose: ${pose}`;
}

// With the therapists' look (docs/specs/posts/therapists-look), the
// therapists are named with it, and two are dressed alike.
export function castLine(setup: Setup, staffLook?: string): string {
  const guests =
    setup.guests === 'couple'
      ? 'Two guests, a man and a woman, on two beds side by side.'
      : `One guest, a ${setup.guests}.`;
  const two = setup.therapists === 2;
  const therapists = two
    ? `Two therapists, both young ${setup.locals} women${staffLook ? ', dressed alike' : ''}.`
    : `One therapist, a young ${setup.locals} woman.`;
  const look = staffLook ? ` ${two ? 'Their' : 'Her'} look: ${staffLook}.` : '';
  return `${guests} ${therapists}${look}`;
}
