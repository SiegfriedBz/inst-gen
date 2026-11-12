import type { Profile } from '@/lib/brand/profile';
import { type Dropped, POSTS_LIMITS, type Post } from './batch';
import { emojisIn } from './emoji';
import { paragraphsOf } from './paragraphs';
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
// its order: hooks (that aren't questions since
// docs/specs/posts/short-captions, amended 2026-11-10), stock words, endings,
// places, story texts and calls to action. Records only, on the captions as
// code leaves them.

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

// Where whole words start in a text, or -1.
function wordAt(text: string, words: string): number {
  const match = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegex(words)}(?=$|[^\\p{L}\\p{N}])`,
    'u',
  ).exec(text);
  return match ? match.index + match[1].length : -1;
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

// Every hook is a question, an offer post's too: right after its line, its
// first paragraph (amended 2026-11-12).
function questionOf(post: Post): string | undefined {
  return plainSentences(post.offer ? (paragraphsOf(post.caption)[1] ?? '') : post.caption)[0];
}

function hookRecords(posts: Post[]): Dropped[] {
  return posts
    .filter((p) => !questionOf(p)?.endsWith('?'))
    .map((p) => ({
      field: 'mix',
      reason: p.offer
        ? `${p.id}: no question after the offer line`
        : `${p.id}: hook is no question`,
    }));
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

// The records of docs/specs/posts/short-captions ("Code's records"):
// sentences longer than the prompt asks, and the words of a setting the photo
// already shows. "light" alone isn't one: "feel light" is no setting. The list
// may grow.
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu;
const SETTING_WORDS = [
  'glow',
  'lamp',
  'lamps',
  'candle',
  'candles',
  'candlelight',
  'lantern',
  'lanterns',
  'sunset',
  'sunlight',
  'sky',
  'garden',
  'linen',
  'linens',
  'breeze',
  'quiet',
  'calm',
  'peaceful',
  'serene',
  'tranquil',
  'afternoon light',
  'evening light',
  'soft light',
  'golden light',
];

// The words in each sentence of a text, emoji aside.
export function sentenceWords(text: string): number[] {
  return plainSentences(text).map((sentence) => sentence.match(WORD)?.length ?? 0);
}

// An offer post's first paragraph is its offer line, and its story text is
// that line: code writes both.
function longSentences(post: Post): Dropped[] {
  const caption = paragraphsOf(post.caption)
    .filter((_, i) => !post.offer || i !== 0)
    .flatMap(plainSentences);
  const story = post.offer ? [] : plainSentences(post.storyText ?? '');
  return [...caption, ...story].flatMap((sentence) => {
    const words = sentence.match(WORD) ?? [];
    if (words.length <= POSTS_LIMITS.sentenceWords) return [];
    const opening = words.slice(0, 4).join(' ');
    return [{ field: 'words', reason: `${post.id}: ${words.length} words in "${opening}…"` }];
  });
}

// The setting's words a text holds, in the order they first appear.
function settingWords(text: string): string[] {
  const plain = folded(text);
  return SETTING_WORDS.map((words) => ({ words, at: wordAt(plain, words) }))
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ words }) => `"${words}"`);
}

function settingRecords(post: Post): Dropped[] {
  const records: Dropped[] = [];
  const caption = settingWords(post.caption);
  if (caption.length > 0) {
    records.push({
      field: 'words',
      reason: `${post.id} describes the setting: ${caption.join(', ')}`,
    });
  }
  const story = settingWords(post.storyText ?? '');
  if (story.length > 0) {
    records.push({
      field: 'words',
      reason: `${post.id}'s story text describes the setting: ${story.join(', ')}`,
    });
  }
  return records;
}

// The records of docs/specs/posts/short-captions, amended 2026-11-12: a
// sore question names a part of the body ("muscles" and "body" aren't one);
// clichés and the em dash; story texts of ten words at most. The lists may
// grow.
const BODY_WORDS = [
  'back',
  'shoulder',
  'shoulders',
  'neck',
  'leg',
  'legs',
  'calf',
  'calves',
  'thigh',
  'thighs',
  'knee',
  'knees',
  'foot',
  'feet',
  'ankle',
  'ankles',
  'arm',
  'arms',
  'hand',
  'hands',
  'wrist',
  'wrists',
  'hip',
  'hips',
  'head',
];
const CLICHES = [
  'unwind',
  'unwinding',
  'indulge',
  'indulgent',
  'indulgence',
  'pamper',
  'pampering',
  'oasis',
  'escape',
  'melt away',
  'melts away',
  'soothe',
  'soothes',
  'soothing',
];
const EM_DASH = '—';

function bodyRecords(post: Post): Dropped[] {
  if (post.setup?.question !== 'sore') return [];
  const question = folded(questionOf(post) ?? '');
  return BODY_WORDS.some((word) => holdsWords(question, word))
    ? []
    : [{ field: 'mix', reason: `${post.id}: question names no part of the body` }];
}

// The clichés a text holds, and its em dash, in the order they first appear.
function clichesIn(text: string): string[] {
  const plain = folded(text);
  return [
    ...CLICHES.map((words) => ({ shown: words, at: wordAt(plain, words) })),
    { shown: EM_DASH, at: plain.indexOf(EM_DASH) },
  ]
    .filter(({ at }) => at >= 0)
    .sort((a, b) => a.at - b.at)
    .map(({ shown }) => `"${shown}"`);
}

function clicheRecords(post: Post): Dropped[] {
  const records: Dropped[] = [];
  const caption = clichesIn(post.caption);
  if (caption.length > 0) {
    records.push({ field: 'words', reason: `${post.id}: ${caption.join(', ')}` });
  }
  const story = clichesIn(post.storyText ?? '');
  if (story.length > 0) {
    records.push({ field: 'words', reason: `${post.id}'s story text: ${story.join(', ')}` });
  }
  return records;
}

// An offer post's story text is its offer line, by design.
function storyLengthRecords(post: Post): Dropped[] {
  if (post.offer || !post.storyText) return [];
  const words = post.storyText.match(WORD)?.length ?? 0;
  return words > POSTS_LIMITS.storyWords
    ? [{ field: 'story', reason: `${post.id}: story text of ${words} words` }]
    : [];
}

export function copyRecords(posts: Post[], profile: Profile): Dropped[] {
  return [
    ...hookRecords(posts),
    ...posts.flatMap(bodyRecords),
    ...stockWords(posts),
    ...endings(posts),
    ...placeRecords(posts, profile),
    ...posts.flatMap(storyRecords),
    ...posts.flatMap(askRecords),
    ...posts.flatMap(longSentences),
    ...posts.flatMap(settingRecords),
    ...posts.flatMap(clicheRecords),
    ...posts.flatMap(storyLengthRecords),
  ];
}
