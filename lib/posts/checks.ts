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
import { dropStopsBeforeEmoji, isSpa, stripEmojis, twoFlowers } from './emoji';
import { dropForeignTags } from './foreign-tags';
import { hookOnItsLine } from './hook-line';
import { ctaFor } from './input';
import { mentionsDay, OFFER_LIMITS, type Offer, PERCENT } from './offer';
import { offerLine, offerStory, offerTreatment, putOfferLineFirst } from './offer-line';
import { factOnItsLine, joinQuestion, keepParagraphs } from './paragraphs';
import type { Setup } from './setup';
import { cleanStory, sentences } from './story';
import { copyRecords, lightRecords, repeatRecords, repeatsQuestion } from './variety';

// Code's checks on the model's posts (docs/specs/posts/generate-copy, "What
// code checks"): trim, drop or flag, record each change, and never refuse a
// whole batch for one bad item.

// A price: a currency mark next to a number, or a number with k/K (but not
// "10k steps" or "a 5K run"), rb or jt. Compared on its amount (250k →
// 250000, 350.000đ → 350000). Best effort, as the spec says; the currencies
// of the pilot and the fixtures (docs/specs/posts/two-suggestions).
const BEFORE = String.raw`\$|USD|VNĐ|VND|IDR|Rp\.?|đ|₫|€|EUR|£|฿|THB|Baht|RM|MYR`;
const AFTER = String.raw`VNĐ|VND|IDR|USD|đ|₫|\$|€|EUR|£|฿|THB|Baht|RM|MYR|rb|ribu|jt|juta`;
const NOT_MONEY = String.raw`\s*(?:steps?|runs?|races?|km|miles?|views?|followers?|likes?)\b`;
const PRICE = new RegExp(
  String.raw`(?:(?<!\p{L})(?:${BEFORE})\s?\d[\d.,]*\s?(?:[kK]|rb|ribu|jt|juta)?(?!\p{L})|\d[\d.,]*\s?(?:[kK](?!${NOT_MONEY})(?!\p{L})|(?:${AFTER})(?!\p{L})))`,
  'giu',
);
// The same, for one test at a time: a price goes from every caption and story
// text (docs/specs/posts/offer-line-first, docs/specs/posts/two-suggestions).
export const PRICE_PATTERN = new RegExp(PRICE.source, 'iu');
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
  const end = text.trim();
  if (/(?:jt|juta)$/i.test(end)) return value * 1_000_000;
  return /(?:k|rb|ribu)$/i.test(end) ? value * 1000 : value;
}

function minutes(value: string, unit: string): number {
  const n = Number(value.replace(',', '.'));
  return unit.toLowerCase().startsWith('h') ? n * 60 : n;
}

function profilePrices(profile: Profile): Set<number> {
  const prices = profile.offerings.flatMap((o) => (o.price ? (o.price.match(NUMBER) ?? []) : []));
  return new Set(prices.map(amount));
}

// The offerings' durations, and those a highlight or the promise gives
// ("WhatsApp replies in ~5 mins": docs/specs/posts/marketing-copy, amended
// 2026-11-08).
function profileDurations(profile: Profile): Set<number> {
  const texts = [
    ...profile.offerings.map((o) => o.duration ?? ''),
    ...profile.highlights.map((h) => h.value),
    profile.essence.promise?.value ?? '',
  ];
  const found = texts.flatMap((text) =>
    [...text.matchAll(DURATION)].map((m) => minutes(m[1], m[2])),
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

type Words = Pick<
  Post,
  'caption' | 'cta' | 'hashtags' | 'altText' | 'unchecked' | 'storyText' | 'storyUnchecked'
>;

// A spa's caption keeps up to 3 flowers and no other emoji, and has at least
// one (docs/specs/posts/story-text, "Code's checks").
function spaCaption(caption: string, id: string): { caption: string; dropped: Dropped[] } {
  const stripped = stripEmojis(caption, POSTS_LIMITS.captionFlowers);
  // One record per fixed text, however many changes it took.
  const dropped =
    stripped.fixes.length > 0
      ? [{ field: 'emoji', reason: `${id}: caption ${stripped.fixes.join(', ')}` }]
      : [];
  return { caption: stripped.text, dropped };
}

// At most three paragraphs, counted as the owner sees them once the hook is
// alone on its line, then the cut (docs/specs/posts/short-captions). A spa's
// caption then gets its two flowers, so neither step removes one (amended
// 2026-11-10). On a post with its offer line, a question alone after the line
// keeps its answer, and a fact the model joined to the answer goes on its own
// line (amended 2026-11-12).
function shortCaption(
  caption: string,
  id: string,
  spa: boolean,
  lined = false,
): { caption: string; dropped: Dropped[] } {
  const split = hookOnItsLine(caption);
  const kept = keepParagraphs(lined ? joinQuestion(split) : split, id);
  const cut = cutCaption(factOnItsLine(kept.caption, lined));
  if (!spa) return { caption: cut, dropped: kept.dropped };
  const added = twoFlowers(cut);
  const back =
    added.fixes.length > 0
      ? [{ field: 'emoji', reason: `${id}: caption ${added.fixes.join(', ')}` }]
      : [];
  return { caption: added.text, dropped: [...kept.dropped, ...back] };
}

const LINE_FIXES = { 'put first': 'offer line put first', added: 'offer line added' } as const;
const STORY_FIXES = {
  set: 'story text set to the offer line',
  'too long': 'offer line too long for the story text',
} as const;

// A rewrite's model sees the offer line as the owner does, its stop gone
// before the flower (docs/specs/posts/day-and-night-copy), and may copy it so:
// the stop comes back for the offer steps, and goes again at the end.
function withLineStop(text: string, line: string): string {
  const shown = line.replace(/\.$/, '');
  const rest = text.slice(shown.length);
  return text.startsWith(shown) && /^\s*\p{Extended_Pictographic}/u.test(rest)
    ? `${line}${rest}`
    : text;
}

// A post that carries the offer has its line, written by code, as its first
// paragraph, its question after it (docs/specs/posts/offer-line-first; first
// again since docs/specs/posts/short-captions was amended 2026-11-12): null
// when no treatment gives one.
function lineFirst(
  caption: string,
  id: string,
  { offer }: OfferContext,
  setupTreatment?: string,
): { line: string | null; caption: string; dropped: Dropped[] } {
  const treatment = offerTreatment(offer, setupTreatment, caption);
  if (!treatment) {
    return {
      line: null,
      caption,
      dropped: [{ field: 'offer', reason: `${id}: no treatment for the offer line` }],
    };
  }
  const line = offerLine(offer, treatment);
  const fixed = putOfferLineFirst(caption, line, offer);
  return {
    line,
    caption: fixed.caption,
    dropped: fixed.fix ? [{ field: 'offer', reason: `${id}: ${LINE_FIXES[fixed.fix]}` }] : [],
  };
}

// The parts of a post the model writes again on a rewrite, and what code
// changed in them.
function checkedWords(
  raw: Pick<ModelPost, 'caption' | 'hashtags' | 'altText' | 'storyText'>,
  profile: Profile,
  id: string,
  context?: OfferContext,
  setupTreatment?: string,
): { words: Words; dropped: Dropped[] } {
  const spa = isSpa(profile.category);
  const offered = context?.carries
    ? lineFirst(raw.caption, id, context, setupTreatment)
    : { line: null, caption: raw.caption, dropped: [] };
  // Never a price: the offer line holds none, so every caption goes the same
  // way (docs/specs/posts/two-suggestions).
  const priced = withoutPrices(offered.caption, id);
  const { caption, dropped } = spa
    ? spaCaption(priced.text, id)
    : { caption: priced.text, dropped: [] };
  const storyPriced = raw.storyText
    ? withoutPrices(raw.storyText, id)
    : { text: raw.storyText, dropped: [] };
  const story = cleanStory(storyPriced.text?.trim() || undefined, { id, spa });
  let storyText = story.storyText;
  const storyDropped = [...storyPriced.dropped, ...story.dropped];
  if (offered.line) {
    const fixed = offerStory(
      offered.line,
      caption,
      storyText && withLineStop(storyText, offered.line),
      spa,
    );
    storyText = fixed.storyText;
    if (fixed.fix)
      storyDropped.push({ field: 'offer', reason: `${id}: ${STORY_FIXES[fixed.fix]}` });
  }
  // The hook goes alone on its line, after the flowers and the offer steps,
  // then the paragraphs and the cut; the stops before an emoji go last, once
  // every step that finds sentences by their stop is done. The flags quote the
  // text the owner sees.
  const short = shortCaption(caption, id, spa, offered.line !== null);
  const shown = dropStopsBeforeEmoji(short.caption);
  if (storyText) storyText = dropStopsBeforeEmoji(storyText);
  const tags = dropForeignTags(cleanHashtags(raw.hashtags), profile);
  const tagsDropped = tags.dropped.map(({ tag, place }) => ({
    field: 'hashtags',
    reason: `${id}: "${tag}" names ${place}`,
  }));
  return {
    words: {
      caption: shown,
      cta: ctaFor(profile, context?.carries ? context.offer : undefined) ?? '',
      hashtags: tags.tags,
      altText: cutChars(raw.altText.replace(/^(an? )?image of /i, ''), POSTS_LIMITS.altTextChars),
      unchecked: findFlags(shown, profile, context),
      ...(storyText
        ? {
            storyText,
            storyUnchecked: findFlags(storyText, profile, context),
          }
        : {}),
    },
    dropped: [
      ...offered.dropped,
      ...priced.dropped,
      ...dropped,
      ...short.dropped,
      ...storyDropped,
      ...tagsDropped,
    ],
  };
}

// With a set-up, the post takes its scene from it: the model's is not read.
export function checkPost(
  raw: ModelPost,
  profile: Profile,
  id: string,
  context?: OfferContext,
  setup?: Setup,
): { post: Post | null; dropped: Dropped[] } {
  const type = raw.type.trim().toLowerCase();
  const scene = setup?.scene ?? raw.scene.trim().toLowerCase();
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
  const { words, dropped } = checkedWords(raw, profile, id, context, setup?.treatment);
  if (!hasWords(words.caption)) {
    return { post: null, dropped: [...dropped, { field: 'posts', reason: 'empty caption' }] };
  }
  return {
    post: {
      id,
      type,
      scene,
      topic: cutWords(raw.topic, POSTS_LIMITS.topicWords) || type,
      imagePrompt: cutWords(raw.imagePrompt, POSTS_LIMITS.imagePromptWords),
      ...words,
      ...(context?.carries ? { offer: true as const } : {}),
      ...(setup ? { setup } : {}),
    },
    dropped,
  };
}

// The image prompt names the guests and the two therapists its set-up has
// (docs/specs/posts/varied-images, "Code's checks"). Flagged, never dropped:
// code's cast line still tells the image model.
export function setupFlags(post: Post): Dropped[] {
  if (!post.setup) return [];
  const { guests, therapists } = post.setup;
  const needed: { words: string; pattern: RegExp }[] = [];
  if (guests !== 'woman') needed.push({ words: 'man', pattern: /\bman\b/i });
  if (guests !== 'man') needed.push({ words: 'woman', pattern: /\bwoman\b/i });
  // One word may sit inside: "two women therapists".
  if (therapists === 2) {
    needed.push({ words: 'two therapists', pattern: /\btwo\s+(?:\w+\s+)?therapists\b/i });
  }
  return needed
    .filter(({ pattern }) => !pattern.test(post.imagePrompt))
    .map(({ words }) => ({
      field: 'image',
      reason: `${post.id}: no "${words}" in the image prompt`,
    }));
}

// The model wrote more posts than an attempt keeps.
export const MORE_POSTS: Dropped = {
  field: 'posts',
  reason: `more than ${POSTS_LIMITS.posts} posts`,
};

// Never a price, in a caption or a story text
// (docs/specs/posts/two-suggestions): each sentence or line that holds one
// goes, or the part of a sentence an emoji ends before a new capital ("…villa
// 🌸 IDR 250k for 60 min."). Line and paragraph breaks stay.
function withoutPrices(text: string, id: string): { text: string; dropped: Dropped[] } {
  const parts = sentences(text).flatMap((s) =>
    s.split(/(?<=\n)|(?<=\p{Extended_Pictographic}\uFE0F?)(?=\s+\p{Lu})/u),
  );
  const removed = parts.filter((part) => PRICE_PATTERN.test(part));
  if (removed.length === 0) return { text, dropped: [] };
  return {
    text: parts
      .filter((part) => !removed.includes(part))
      .join('')
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/ {2,}/g, ' ')
      .trim(),
    dropped: removed.map((s) => ({ field: 'price', reason: `${id}: price removed "${s.trim()}"` })),
  };
}

// A caption with no word left (every sentence held a price).
const hasWords = (text: string) => /\p{L}/u.test(text);

function overused<K extends string>(values: K[], max: number): [K, number][] {
  const counts = new Map<K, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts].filter(([, n]) => n > max);
}

export function checkPlan(
  posts: Post[],
  dropped: Dropped[],
  profile: Profile,
  offer?: Offer,
): { posts: Post[]; dropped: Dropped[] } {
  const out = [...dropped];
  if (posts.length > POSTS_LIMITS.posts) out.push(MORE_POSTS);
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
  // Post 1 sells (docs/specs/posts/two-suggestions).
  if (profile.offerings.length > 0 && !kept.some((p) => p.type === 'offer')) {
    out.push({ field: 'mix', reason: 'no offer post' });
  }
  // With an offer, its set-ups are 1 and 2: so are its posts.
  if (offer && kept.slice(0, 2).some((p) => p.type !== 'offer')) {
    out.push({ field: 'mix', reason: 'offer posts are not posts 1 and 2' });
  }
  out.push(...repeatRecords(kept), ...kept.flatMap(lightRecords), ...copyRecords(kept, profile));
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
    const checked = checkedWords(answer, profile, post.id, context, post.setup?.treatment);
    dropped.push(...checked.dropped);
    if (!hasWords(checked.words.caption)) {
      dropped.push({ field: 'posts', reason: `no rewrite for ${post.id}` });
      return post;
    }
    // The old story text goes with the old caption, even when no new one came.
    const { storyText: _story, storyUnchecked: _flags, ...rest } = post;
    return { ...rest, ...checked.words };
  });
  dropped.push(
    ...repeatRecords(posts),
    ...posts.flatMap(lightRecords),
    ...copyRecords(posts, profile),
  );
  return { posts, dropped };
}

// New words for one post (docs/specs/platform/easier-to-use, "New texts for a
// suggestion"): its caption and story text, checked as a plan's are; its
// hashtags and alt text stay, as its image does. One post was asked for: the
// answer with its id, or else the first. With no usable caption, or one that
// repeats the post's question, there is nothing to show: the run fails.
export function checkNewTexts(
  raw: ModelRewrite,
  post: Post,
  other: Post | undefined,
  profile: Profile,
  offer?: Offer,
): { posts: Post[]; dropped: Dropped[] } {
  const answer = raw.posts.find((p) => p.id === post.id) ?? raw.posts[0];
  if (!answer?.caption.trim()) throw new Error('no new texts');
  const context = offer ? { offer, carries: post.offer === true } : undefined;
  const checked = checkedWords(
    {
      caption: answer.caption,
      storyText: answer.storyText,
      hashtags: post.hashtags,
      altText: post.altText,
    },
    profile,
    post.id,
    context,
    post.setup?.treatment,
  );
  if (!hasWords(checked.words.caption)) throw new Error('no new texts');
  const { storyText: _story, storyUnchecked: _flags, ...rest } = post;
  const fresh: Post = { ...rest, ...checked.words };
  // The same question, or the same caption, isn't new: the run fails and the
  // owner's count comes back (amended 2026-11-13, after Sen's first real
  // answer repeated its post word for word).
  if (fresh.caption === post.caption || repeatsQuestion(fresh, post)) {
    throw new Error('no new texts');
  }
  const pair = other ? [fresh, other] : [fresh];
  return {
    posts: [fresh],
    dropped: [
      ...checked.dropped,
      ...repeatRecords(pair),
      ...pair.flatMap(lightRecords),
      ...copyRecords(pair, profile),
    ],
  };
}
