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

function withoutEmoji(text: string): string {
  let out = text;
  for (const emoji of new Set(emojisIn(text))) out = out.replaceAll(emoji, ' ');
  return out.replace(/\s+/g, ' ').trim();
}

// The sentences of a text, emoji removed, empty ones left out: a flower
// after the last stop is not a sentence of its own.
function plainSentences(text: string): string[] {
  return sentences(text)
    .map(withoutEmoji)
    .filter((s) => s !== '');
}

// Posts that share a sentence, in post order: one record per sentence.
function shared(posts: Post[], pick: (post: Post) => string | undefined, what: string): Dropped[] {
  const groups = new Map<string, { shown: string; ids: string[] }>();
  for (const post of posts) {
    const sentence = pick(post);
    if (!sentence) continue;
    const key = sentence.toLowerCase();
    const group = groups.get(key) ?? { shown: sentence, ids: [] };
    group.ids.push(post.id);
    groups.set(key, group);
  }
  return [...groups.values()]
    .filter((g) => g.ids.length > 1)
    .map((g) => ({ field: 'mix', reason: `${what} "${g.shown}" in ${g.ids.join(', ')}` }));
}

export function repeatRecords(posts: Post[]): Dropped[] {
  return [
    ...shared(posts, (p) => plainSentences(p.caption)[0], 'first sentence'),
    ...shared(posts, (p) => plainSentences(p.caption).at(-1), 'last sentence'),
    // An offer post's story text is its offer line, by design.
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
