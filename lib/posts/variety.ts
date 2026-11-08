import type { Profile } from '@/lib/brand/profile';
import type { Dropped, Post } from './batch';
import { emojisIn } from './emoji';
import { sentences } from './story';

// Code's records on a batch's copy (docs/specs/posts/day-and-night-copy,
// "Code's checks"): sentences two posts share, and words of the other time of
// day. Records only: a post is never changed, and the owner never sees them.

// Night words on a day post, and day words on a night post. Not "bed": the
// massage bed is in day posts too.
const WRONG_WORDS = {
  day: ['sleep', 'asleep', 'bedtime', 'wake', 'waking', 'tomorrow morning'],
  night: ['this afternoon', 'this morning', 'midday', 'noon'],
} as const;

// An emoji ends a sentence, as a stop does: code removes the stop before it
// (docs/specs/posts/day-and-night-copy, "No stop before an emoji").
const BREAK = '\u0000';

// The sentences of a text, emoji removed, empty ones left out: a flower
// after the last stop is not a sentence of its own.
function plainSentences(text: string): string[] {
  let out = text;
  for (const emoji of new Set(emojisIn(text))) out = out.replaceAll(emoji, BREAK);
  return out
    .split(BREAK)
    .flatMap(sentences)
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter((s) => /[\p{L}\p{N}]/u.test(s));
}

// "…tomorrow 🌺" and "…tomorrow." are the same sentence.
function keyOf(sentence: string): string {
  return sentence.replace(/[.!?]+$/, '').toLowerCase();
}

// Posts that share a sentence, in post order: one record per sentence.
function shared(posts: Post[], pick: (post: Post) => string | undefined, what: string): Dropped[] {
  const groups = new Map<string, { shown: string; ids: string[] }>();
  for (const post of posts) {
    const sentence = pick(post);
    if (!sentence) continue;
    const key = keyOf(sentence);
    const group = groups.get(key) ?? { shown: sentence, ids: [] };
    group.ids.push(post.id);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({ field: 'mix', reason: `${what} "${g.shown}" in ${g.ids.join(', ')}` }));
}

export function repeatRecords(posts: Post[]): Dropped[] {
  // An offer post opens on its offer line, by design: two on the same
  // treatment share it.
  return [
    ...shared(
      posts.filter((p) => !p.offer),
      (p) => plainSentences(p.caption)[0],
      'first sentence',
    ),
    ...shared(posts, (p) => plainSentences(p.caption).at(-1), 'last sentence'),
    // Its story text is that line too.
    ...shared(
      posts.filter((p) => !p.offer),
      (p) => plainSentences(p.storyText ?? '').at(-1),
      'story text',
    ),
  ];
}

export function lightRecords(post: Post): Dropped[] {
  // A post without a set-up, or a set-up without a light, is a day.
  const light = post.setup?.light ?? 'day';
  const text = `${post.caption}\n${post.storyText ?? ''}`;
  return WRONG_WORDS[light]
    .filter((word) => new RegExp(`\\b${word}\\b`, 'i').test(text))
    .map((word) => ({ field: 'light', reason: `${post.id} (${light}): "${word}"` }));
}

// The copy records of docs/specs/posts/marketing-copy ("Code's records"), in
// its order: question hooks, stock words, endings, places, story texts and
// calls to action. Records only, on the captions as code leaves them.

// Words the captions lean on, recorded in 2 captions or more, both of a plan
// (amended 2026-11-08); the list may grow.
const STOCK_WORDS = [
  'feel',
  'completely',
  'deeply',
  'truly',
  'ultimate',
  'pure',
  'melt',
  'unwind',
  'indulge',
  'bliss',
  'golden oil',
];
const STOCK_AT = 2;

// A sentence that asks the guest to act. One that only names WhatsApp ("we
// reply on WhatsApp within about 5 minutes") answers a doubt, and isn't one.
const ASKS =
  /\b(?:book (?:now|today|your|a)|message us|contact us|call us|dm us|write to us|link in bio|tap the link|click)\b/i;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Whole words: "feeling" doesn't hold "feel".
function holdsWords(text: string, words: string): boolean {
  return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegex(words)}(?:$|[^\\p{L}\\p{N}])`, 'u').test(
    text,
  );
}

// Lower case, accents gone ("đ" as "d"), one space between words.
function folded(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

// The business's places: its town, area and service area, split at commas
// and "and", and its landmarks, the place symbols written as names ("My Khe
// beach", never "frangipani": amended 2026-11-08). A landmark that opens on two
// capitalised words or more also goes by them: "My Khe" for "My Khe beach at
// dusk".
function placeNames(profile: Profile): string[] {
  const { town, area, serviceArea } = profile.location;
  const names = new Set<string>();
  const given = [town, area, serviceArea]
    .flatMap((place) => (place?.value ?? '').split(/,|\band\b/))
    .concat(profile.essence.placeSymbols.filter((symbol) => /^\p{Lu}/u.test(symbol.trim())))
    .map((name) => name.trim())
    .filter(Boolean);
  for (const name of given) {
    names.add(folded(name));
    const words = name.split(/\s+/);
    const lead = words.findIndex((word) => !/^\p{Lu}/u.test(word));
    if (lead >= 2) names.add(folded(words.slice(0, lead).join(' ')));
  }
  return [...names];
}

function questionHooks(posts: Post[]): Dropped[] {
  const ids = posts
    .filter((p) => !p.offer && plainSentences(p.caption)[0]?.endsWith('?'))
    .map((p) => p.id);
  return ids.length > 1 ? [{ field: 'mix', reason: `question hooks in ${ids.join(', ')}` }] : [];
}

function stockWords(posts: Post[]): Dropped[] {
  return STOCK_WORDS.flatMap((word) => {
    const ids = posts.filter((p) => holdsWords(folded(p.caption), word)).map((p) => p.id);
    return ids.length >= STOCK_AT
      ? [{ field: 'words', reason: `"${word}" in ${ids.join(', ')}` }]
      : [];
  });
}

// Last sentences that start with the same word, shown as the first writes it.
function endings(posts: Post[]): Dropped[] {
  const groups = new Map<string, { shown: string; ids: string[] }>();
  for (const post of posts) {
    const word = plainSentences(post.caption)
      .at(-1)
      ?.match(/[\p{L}\p{N}']+/u)?.[0];
    if (!word) continue;
    const group = groups.get(word.toLowerCase()) ?? { shown: word, ids: [] };
    group.ids.push(post.id);
    groups.set(word.toLowerCase(), group);
  }
  return [...groups.values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({
      field: 'mix',
      reason: `endings start with "${g.shown}" in ${g.ids.join(', ')}`,
    }));
}

// A profile with no place has nothing to name.
function placeRecords(posts: Post[], profile: Profile): Dropped[] {
  const names = placeNames(profile);
  if (names.length === 0) return [];
  return posts
    .filter((p) => !names.some((name) => holdsWords(folded(p.caption), name)))
    .map((p) => ({ field: 'words', reason: `${p.id} names no place` }));
}

// An offer post's story text is its offer line, by design.
function storyRecords(post: Post): Dropped[] {
  const story = post.storyText?.trim();
  if (post.offer || !story) return [];
  const records: Dropped[] = [];
  const treatment = post.setup?.treatment;
  if (treatment && folded(story).startsWith(folded(treatment))) {
    records.push({ field: 'story', reason: `${post.id}: story text starts with "${treatment}"` });
  }
  const first = plainSentences(post.caption)[0];
  if (first && folded(story).includes(folded(keyOf(first)))) {
    records.push({
      field: 'story',
      reason: `${post.id}: story text holds the caption's first sentence`,
    });
  }
  return records;
}

function askRecords(post: Post): Dropped[] {
  return plainSentences(post.caption)
    .filter((sentence) => ASKS.test(sentence))
    .map((sentence) => ({ field: 'cta', reason: `${post.id}: "${sentence}"` }));
}

export function copyRecords(posts: Post[], profile: Profile): Dropped[] {
  return [
    ...questionHooks(posts),
    ...stockWords(posts),
    ...endings(posts),
    ...placeRecords(posts, profile),
    ...posts.flatMap(storyRecords),
    ...posts.flatMap(askRecords),
  ];
}
