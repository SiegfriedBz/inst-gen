import type { Profile } from '@/lib/brand/profile';
import { BANNED_WORDS } from './banned';
import {
  type Dropped,
  type Flag,
  type ModelPost,
  type ModelRewrite,
  POST_TYPES,
  POSTS_LIMITS,
  type Post,
  type PostType,
  SCENES,
  type Scene,
} from './batch';
import { ctaFor } from './input';
import { mentionsDay, OFFER_LIMITS, type Offer, PERCENT } from './offer';

// Code's checks on the model's posts (docs/specs/posts/generate-copy, "What
// code checks"): trim, drop or flag, record each change, and never refuse a
// whole batch for one bad item.

// A price: a currency mark next to a number, or a number with k/K. Compared on
// its amount (250k → 250000, 350.000đ → 350000). Best effort, as the spec says.
const PRICE =
  /(?:(?:\$|USD|VND|IDR|Rp\.?|đ)\s?\d[\d.,]*\s?[kK]?\b|\d[\d.,]*\s?(?:[kK]\b|VND\b|IDR\b|USD\b|đ|\$))/g;
const NUMBER = /\d[\d.,]*\s?[kK]?\b/g;
const DURATION = /(\d+(?:[.,]\d+)?)\s?(minutes?|mins?|hours?|hrs?|h)\b/gi;

function amount(text: string): number {
  const digits = text.match(/\d[\d.,]*/)?.[0].replace(/[.,]$/, '') ?? '';
  const last = Math.max(digits.lastIndexOf('.'), digits.lastIndexOf(','));
  // A separator followed by exactly three digits groups thousands; any other
  // is a decimal point.
  const value =
    last === -1 || digits.length - last - 1 === 3
      ? Number(digits.replace(/[.,]/g, ''))
      : Number(digits.replace(/[.,]/g, (_sep, i) => (i === last ? '.' : '')));
  return /k\s*$/i.test(text.trim()) ? value * 1000 : value;
}

function minutes(value: string, unit: string): number {
  const n = Number(value.replace(',', '.'));
  return unit.toLowerCase().startsWith('h') ? n * 60 : n;
}

function profilePrices(profile: Profile): Set<number> {
  const prices = profile.offerings.flatMap((o) => (o.price ? (o.price.match(NUMBER) ?? []) : []));
  return new Set(prices.map(amount));
}

function profileDurations(profile: Profile): Set<number> {
  const found = profile.offerings.flatMap((o) =>
    o.duration ? [...o.duration.matchAll(DURATION)].map((m) => minutes(m[1], m[2])) : [],
  );
  return new Set(found);
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// The batch's special offer, and whether this post is one of the two that
// carry it (docs/specs/posts/special-offer, "Code's checks").
export type OfferContext = { offer: Offer; carries: boolean };

// The first two offer posts of a batch with an offer carry it.
export function carries(type: PostType, offerPostsBefore: number): boolean {
  return type === 'offer' && offerPostsBefore < 2;
}

function offerFlags(caption: string, { offer, carries }: OfferContext): Flag[] {
  const flags: Flag[] = [];
  for (const match of caption.matchAll(PERCENT)) {
    const n = Number(match[1]);
    // "100% natural" is never an offer.
    if (n > OFFER_LIMITS.percentMax) continue;
    if (!carries || offer.kind !== 'discount' || n !== offer.percent) {
      flags.push({ kind: 'offer', text: `${n}%` });
    }
  }
  if (carries && !mentionsDay(caption, offer.until)) {
    flags.push({ kind: 'offer', text: offer.lastDay });
  }
  return flags;
}

export function findFlags(caption: string, profile: Profile, context?: OfferContext): Flag[] {
  const flags: Flag[] = [];
  const prices = profilePrices(profile);
  for (const match of caption.match(PRICE) ?? []) {
    const text = match.trim().replace(/[.,]$/, '');
    if (!prices.has(amount(text))) flags.push({ kind: 'price', text });
  }
  const durations = profileDurations(profile);
  if (context?.carries) durations.add(OFFER_LIMITS.minutes);
  for (const match of caption.matchAll(DURATION)) {
    if (!durations.has(minutes(match[1], match[2]))) {
      flags.push({ kind: 'duration', text: match[0].trim() });
    }
  }
  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${escapeRegex(word)}\\b`, 'i').test(caption)) {
      flags.push({ kind: 'banned', text: word });
    }
  }
  const firstLine = caption.split('\n')[0];
  if (firstLine.length > POSTS_LIMITS.firstLineChars) {
    flags.push({ kind: 'firstLine', text: firstLine });
  }
  if (context) flags.push(...offerFlags(caption, context));
  return flags;
}

export function cutCaption(caption: string): string {
  const text = caption.trim();
  if (text.length <= POSTS_LIMITS.captionMax) return text;
  const head = text.slice(0, POSTS_LIMITS.captionMax);
  const ends = [...head.matchAll(/[.!?](?=\s|$)/g)];
  const end = ends.at(-1)?.index;
  if (end !== undefined) return head.slice(0, end + 1);
  return head.slice(0, head.lastIndexOf(' ')).trim();
}

function cutChars(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  const head = trimmed.slice(0, max + 1);
  const space = head.lastIndexOf(' ');
  return (space > 0 ? head.slice(0, space) : trimmed.slice(0, max)).trim();
}

function cutWords(text: string, max: number): string {
  return text.trim().split(/\s+/).slice(0, max).join(' ');
}

export function cleanHashtags(raw: string[]): string[] {
  // Any letter, its accents and any digit: Instagram takes `#đànẵng`.
  const tags = raw
    .map((tag) =>
      tag
        .normalize('NFC')
        .toLowerCase()
        .replace(/[^\p{L}\p{M}\p{N}]/gu, ''),
    )
    .filter(Boolean);
  return [...new Set(tags)].slice(0, POSTS_LIMITS.hashtags);
}

function isType(value: string): value is PostType {
  return (POST_TYPES as readonly string[]).includes(value);
}

function isScene(value: string): value is Scene {
  return (SCENES as readonly string[]).includes(value);
}

// The parts of a post the model writes again on a rewrite.
function checkedWords(
  raw: Pick<ModelPost, 'caption' | 'hashtags' | 'altText'>,
  profile: Profile,
  context?: OfferContext,
): Pick<Post, 'caption' | 'cta' | 'hashtags' | 'altText' | 'unchecked'> {
  const caption = cutCaption(raw.caption);
  return {
    caption,
    cta: ctaFor(profile) ?? '',
    hashtags: cleanHashtags(raw.hashtags),
    altText: cutChars(raw.altText.replace(/^(an? )?image of /i, ''), POSTS_LIMITS.altTextChars),
    unchecked: findFlags(caption, profile, context),
  };
}

export function checkPost(
  raw: ModelPost,
  profile: Profile,
  id: string,
  context?: OfferContext,
): { post: Post | null; dropped: Dropped[] } {
  const type = raw.type.trim().toLowerCase();
  const scene = raw.scene.trim().toLowerCase();
  if (!isType(type))
    return { post: null, dropped: [{ field: 'posts', reason: `unknown type "${raw.type}"` }] };
  if (!isScene(scene)) {
    return { post: null, dropped: [{ field: 'posts', reason: `unknown scene "${raw.scene}"` }] };
  }
  if (!raw.caption.trim())
    return { post: null, dropped: [{ field: 'posts', reason: 'empty caption' }] };
  if (!raw.imagePrompt.trim()) {
    return { post: null, dropped: [{ field: 'posts', reason: 'empty image prompt' }] };
  }
  return {
    post: {
      id,
      type,
      scene,
      topic: cutWords(raw.topic, POSTS_LIMITS.topicWords) || type,
      imagePrompt: cutWords(raw.imagePrompt, POSTS_LIMITS.imagePromptWords),
      ...checkedWords(raw, profile, context),
      ...(context?.carries ? { offer: true as const } : {}),
    },
    dropped: [],
  };
}

function overused<K extends string>(values: K[], max: number): [K, number][] {
  const counts = new Map<K, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, n]) => n > max);
}

export function checkPlan(
  posts: Post[],
  dropped: Dropped[],
  profile: Profile,
): { posts: Post[]; dropped: Dropped[] } {
  const out = [...dropped];
  if (posts.length > POSTS_LIMITS.posts) out.push({ field: 'posts', reason: 'more than 6 posts' });
  const kept = posts.slice(0, POSTS_LIMITS.posts);
  for (const [type, n] of overused(
    kept.map((p) => p.type),
    POSTS_LIMITS.perType,
  )) {
    out.push({ field: 'mix', reason: `type ${type} used ${n} times` });
  }
  for (const [scene, n] of overused(
    kept.map((p) => p.scene),
    POSTS_LIMITS.perScene,
  )) {
    out.push({ field: 'mix', reason: `scene ${scene} used ${n} times` });
  }
  const offers = kept.filter((p) => p.type === 'offer').length;
  if (profile.offerings.length >= 2 && offers < 2) {
    out.push({ field: 'mix', reason: 'fewer than 2 offer posts' });
  }
  return { posts: kept, dropped: out };
}

export function checkRewrite(
  raw: ModelRewrite,
  original: Post[],
  profile: Profile,
  offer?: Offer,
): { posts: Post[]; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const byId = new Map(raw.posts.map((p) => [p.id, p]));
  for (const id of byId.keys()) {
    if (!original.some((p) => p.id === id))
      dropped.push({ field: 'posts', reason: `unknown id ${id}` });
  }
  const posts = original.map((post) => {
    const answer = byId.get(post.id);
    if (!answer?.caption.trim()) {
      dropped.push({ field: 'posts', reason: `no rewrite for ${post.id}` });
      return post;
    }
    const context = offer ? { offer, carries: post.offer === true } : undefined;
    return { ...post, ...checkedWords(answer, profile, context) };
  });
  return { posts, dropped };
}
