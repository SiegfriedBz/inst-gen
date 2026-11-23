import type { Profile } from '@/lib/brand/profile';
import type { Dropped, Post } from './batch';
import { turnsAway } from './facts';
import { SAMPLE_PHRASES, SAMPLE_PLACES } from './samples';
import type { Reason } from './setup';
import { BODY_WORDS, folded, holdsWords, questionOf } from './variety';

// Code's records on the posts of a business that comes to its guests
// (docs/specs/posts/reasons-to-book, "Code's records"). Records only, like
// 2.15's and 2.18's: the owner never sees them, and `pnpm eval:posts` prints
// them. They run only on a post whose set-up has a reason, so every other
// business's posts get none of them. The lists may grow.

const FIRST_PERSON = ['i', "i'm", 'my', 'me', 'we', 'our', 'us'];

// The words a question names its reason by; a day out names a part of the
// body, as 2.18's sore question does.
const REASON_WORDS: Record<Reason, readonly string[]> = {
  dayOut: BODY_WORDS,
  stayIn: [
    'late',
    'tonight',
    'evening',
    'rain',
    'raining',
    'rainy',
    'kids',
    'children',
    'asleep',
    'stay',
    'staying',
    'out',
  ],
  twoOfYou: ['two', 'both', 'together', 'couple', 'partner', 'friend', 'friends'],
  firstNight: [
    'flight',
    'flights',
    'flew',
    'landed',
    'landing',
    'plane',
    'jet',
    'arrived',
    'arrival',
  ],
  laptop: ['laptop', 'screen', 'desk', 'work', 'working', 'calls', 'emails'],
};

// Words for two guests. Not "two therapists": a four-hands massage has them,
// for one guest.
const TWO_GUESTS = [
  'both of you',
  'the two of you',
  'each of you',
  'you both',
  'side by side',
  'couple',
];

// Lower case, accents gone, one kind of apostrophe.
const plain = (text: string) => folded(text).replace(/[’‘]/g, "'");

// "My Khe", "Mỹ Khê" and "My Son" are places, and "US" a country: never the
// first person. No "i" flag: with it, \p{Lu} would match small letters too.
const NAMES = /(^|[^\p{L}])(?:My|MY|Mỹ|MỸ)\s+\p{Lu}[\p{L}\p{M}]*|(^|[^\p{L}])US(?=$|[^\p{L}])/gu;
const withoutNames = (text: string) =>
  text.normalize('NFC').replace(NAMES, (_name, before, beforeUs) => `${before ?? beforeUs ?? ''} `);

function recordsOf(post: Post, reason: Reason, turnedAway: string[]): Dropped[] {
  const records: Dropped[] = [];
  const asked = questionOf(post) ?? '';
  const question = plain(asked);
  const speaker = plain(withoutNames(asked));
  const text = plain(`${post.caption}\n${post.storyText ?? ''}`);
  if (FIRST_PERSON.some((word) => holdsWords(speaker, word))) {
    records.push({ field: 'mix', reason: `${post.id}: question in the first person` });
  }
  if (!REASON_WORDS[reason].some((word) => holdsWords(question, word))) {
    records.push({ field: 'mix', reason: `${post.id}: question misses its reason (${reason})` });
  }
  const away = turnedAway.find((highlight) => text.includes(highlight));
  if (away) records.push({ field: 'words', reason: `${post.id}: "${away}"` });
  const copied = [...SAMPLE_PHRASES, ...SAMPLE_PLACES].find((phrase) =>
    holdsWords(text, plain(phrase)),
  );
  if (copied) records.push({ field: 'words', reason: `${post.id} copies a sample: "${copied}"` });
  if (post.setup?.guests !== 'couple' && TWO_GUESTS.some((words) => holdsWords(text, words))) {
    records.push({ field: 'mix', reason: `${post.id}: caption for two guests, image of one` });
  }
  return records;
}

export function reasonRecords(posts: Post[], profile: Profile): Dropped[] {
  // The highlights that turn a request away, as a caption would hold them.
  const turnedAway = profile.highlights
    .map(({ value }) => value.trim())
    .filter((value) => value && turnsAway(value))
    .map((value) => plain(value).replace(/[.!]+$/, ''));
  return posts.flatMap((post) =>
    post.setup?.reason ? recordsOf(post, post.setup.reason, turnedAway) : [],
  );
}
