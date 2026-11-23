import type { Profile } from '@/lib/brand/profile';
import type { Post, RecentPost } from './batch';
import { isSpa } from './emoji';
import { dealFacts, keptFact, newFact, pickFact } from './facts';
import type { Offer } from './offer';
import {
  type BodyPart,
  dealGuests,
  dealOfferTreatments,
  dealScenes,
  eligibleNames,
  FIXED_PARTS,
  FREE_PARTS,
  type Light,
  type LookKey,
  leastUsed,
  localsOf,
  lookOfTreatment,
  pick,
  REASONS,
  type Reason,
  SETUPS,
  type Setup,
  shuffled,
} from './setup';

// Reasons to book (docs/specs/posts/reasons-to-book): for a business that
// comes to its guests, every post sells one reason to book today, dealt by
// code.

// A spa whose read found a service area: the only place the read writes that
// a business travels to its guests.
export function comesToGuests(profile: Profile): boolean {
  return isSpa(profile.category) && !!profile.location.serviceArea?.value.trim();
}

const ANY: readonly Reason[] = ['dayOut', 'stayIn', 'firstNight', 'laptop'];

// The reasons each look takes: two of you only on a couple massage, which
// also suits staying in; a foot massage never sells laptop days.
export const LOOK_REASONS: Record<LookKey, readonly Reason[]> = {
  couple: ['twoOfYou', 'stayIn'],
  foot: ['dayOut', 'stayIn', 'firstNight'],
  head: ['laptop', 'stayIn', 'firstNight'],
  pregnancy: ['stayIn'],
  fourHands: ANY,
  thai: ANY,
  stone: ANY,
  scrub: ANY,
  plain: ANY,
};

// The free parts of the body that fit each reason; a look's fixed part
// stays its own.
export const REASON_PARTS: Record<Reason, readonly BodyPart[]> = {
  dayOut: ['legs', 'back', 'shoulders and neck'],
  stayIn: FREE_PARTS,
  twoOfYou: FREE_PARTS,
  firstNight: ['back', 'shoulders and neck', 'legs'],
  laptop: ['shoulders and neck', 'back', 'arms and hands'],
};

// A reason for a post that has none (saved before reasons): one its look
// takes that no other post has, staying in when none is left.
export function reasonFor(look: LookKey, taken: readonly Reason[], random: () => number): Reason {
  const choices = LOOK_REASONS[look].filter((reason) => !taken.includes(reason));
  return choices.length ? pick(choices, random) : 'stayIn';
}

type Dealt = { treatment?: string; look: LookKey; reason: Reason };

// Two different reasons, the least used by the recent posts first, then the
// least used offering whose look takes each.
function reasonsFirst(
  profile: Profile,
  uses: (reason: Reason) => number,
  random: () => number,
): Dealt[] {
  const names = eligibleNames(profile);
  const looks: LookKey[] = names.length ? names.map(lookOfTreatment) : ['plain'];
  const open = REASONS.filter((reason) =>
    looks.some((look) => LOOK_REASONS[look].includes(reason)),
  );
  const reasons: Reason[] = [];
  while (reasons.length < SETUPS) {
    const left = open.filter((reason) => !reasons.includes(reason));
    reasons.push(left.length ? leastUsed(left, uses, random) : 'stayIn');
  }
  const used = new Map<string, number>();
  return reasons.map((reason) => {
    const fits = names.filter((name) => LOOK_REASONS[lookOfTreatment(name)].includes(reason));
    if (!fits.length) return { look: 'plain', reason };
    const treatment = leastUsed(fits, (name) => used.get(name) ?? 0, random);
    used.set(treatment, (used.get(treatment) ?? 0) + 1);
    return { treatment, look: lookOfTreatment(treatment), reason };
  });
}

// The offer's treatments first, then for each a reason its look takes.
function treatmentsFirst(
  offer: Offer,
  uses: (reason: Reason) => number,
  random: () => number,
): Dealt[] {
  const picks: Dealt[] = [];
  for (const treatment of dealOfferTreatments(offer, random)) {
    const look = lookOfTreatment(treatment);
    const taken = picks.map((p) => p.reason);
    const left = LOOK_REASONS[look].filter((reason) => !taken.includes(reason));
    picks.push({ treatment, look, reason: left.length ? leastUsed(left, uses, random) : 'stayIn' });
  }
  return picks;
}

// Each set-up's reason, treatment, part of the body, guests, scene and light
// (docs/specs/posts/reasons-to-book, "How code deals them"); no kind of
// question and no hook style.
export function dealReasonSetups(
  profile: Profile,
  offer: Offer | undefined,
  random: () => number,
  recent: readonly RecentPost[] = [],
): Setup[] {
  const uses = (reason: Reason) => recent.filter((post) => post.reason === reason).length;
  const picks = offer ? treatmentsFirst(offer, uses, random) : reasonsFirst(profile, uses, random);

  const usedParts = new Map<BodyPart, number>();
  const bodyParts = picks.map(({ look, reason }) => {
    // A look's fixed parts that fit the reason come first: Thai's leg stretch
    // or palm press (docs/specs/posts/normal-bodies), the back on a laptop post.
    const fits = (p: BodyPart) => REASON_PARTS[reason].includes(p);
    const fixed = FIXED_PARTS[look];
    const choices = fixed
      ? fixed.some(fits)
        ? fixed.filter(fits)
        : fixed
      : FREE_PARTS.filter(fits);
    const part = leastUsed(choices, (p) => usedParts.get(p) ?? 0, random);
    usedParts.set(part, (usedParts.get(part) ?? 0) + 1);
    return part;
  });
  const looks = picks.map(({ look }) => look);
  const guests = dealGuests(looks, random);
  const scenes = dealScenes(looks, random);
  // The first night is a night; otherwise one day and one night.
  const night = picks.findIndex(({ reason }) => reason === 'firstNight');
  const lights: Light[] =
    night === -1
      ? shuffled(['day', 'night'] as Light[], random)
      : picks.map((_, i) => (i === night ? 'night' : 'day'));
  const locals = localsOf(profile);

  const setups = picks.map(({ treatment, look, reason }, i) => ({
    ...(treatment ? { treatment } : {}),
    look,
    guests: guests[i],
    therapists: look === 'fourHands' || look === 'couple' ? (2 as const) : (1 as const),
    bodyPart: bodyParts[i],
    scene: scenes[i],
    locals,
    light: lights[i],
    reason,
  }));
  // The facts come last (docs/specs/posts/reasons-to-book, "The fact, dealt
  // by code").
  return dealFacts(profile, setups, random);
}

// A post's set-up with its reason and its fact: the old fact, and posts-18's
// kind of question and hook style, go (the review of 2026-11-23).
function withSetup(post: Post, reason: Reason, fact: string | undefined): Post {
  if (!post.setup) return post;
  const { fact: _old, question: _kind, hook: _style, ...setup } = post.setup;
  return { ...post, setup: { ...setup, reason, ...(fact ? { fact } : {}) } };
}

// The posts a caption update sends (docs/specs/posts/reasons-to-book, "Write
// new texts, and caption updates"): each keeps its reason, or a post saved
// before reasons gets one its look takes that no other post has; each keeps
// its fact while the profile holds it, or gets one no other post has. A post
// saved without a set-up goes as it is.
export function withReasons(posts: Post[], profile: Profile, random: () => number): Post[] {
  const out: Post[] = [];
  for (const [i, post] of posts.entries()) {
    if (!post.setup) {
      out.push(post);
      continue;
    }
    const others = [...out, ...posts.slice(i + 1)];
    const taken = others.flatMap((p) => (p.setup?.reason ? [p.setup.reason] : []));
    const reason = post.setup.reason ?? reasonFor(post.setup.look, taken, random);
    const fact =
      keptFact(profile, post.setup) ??
      pickFact(
        profile,
        post.setup.light ?? 'day',
        others.map((p) => p.setup?.fact),
        random,
      );
    out.push(withSetup(post, reason, fact));
  }
  return out;
}

// The post new texts are written for: its reason, or one its look takes that
// the other post doesn't have, and a new fact.
export function newTextsPost(
  post: Post,
  other: Post | undefined,
  profile: Profile,
  random: () => number,
): Post {
  if (!post.setup) return post;
  const taken = other?.setup?.reason ? [other.setup.reason] : [];
  const reason = post.setup.reason ?? reasonFor(post.setup.look, taken, random);
  return withSetup(post, reason, newFact(profile, post.setup, other?.setup, random));
}
