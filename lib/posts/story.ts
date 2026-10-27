import { type Dropped, POSTS_LIMITS } from './batch';
import { addFlower, emojisIn, FLOWERS, stripEmojis } from './emoji';

// The story text's cleanup and cut (docs/specs/posts/story-text, "Code's
// checks"). Its flags are checks.ts's, which imports this module.

const HASHTAG_WORD = /(^|\s)#[\p{L}\p{M}\p{N}_]+/gu;
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });

// The longest start of `text` within `max` that ends at one of `ends`.
function longestUpTo(text: string, ends: number[], max: number): string | null {
  const fits = ends.filter((end) => text.slice(0, end).trimEnd().length <= max);
  const end = fits.at(-1);
  return end === undefined ? null : text.slice(0, end).trimEnd();
}

// Whole sentences, else whole words, else whole graphemes: never inside an
// emoji. Counted with `.length`, so an emoji counts 2 or more.
export function cutStory(text: string, max: number): string {
  if (text.length <= max) return text;
  const stops = [...text.matchAll(/[.!?](?=\s|$)/g)].map((m) => m.index + 1);
  const bySentence = longestUpTo(text, stops, max);
  if (bySentence) return bySentence;
  const spaces = [...text.matchAll(/\s+/g)].map((m) => m.index);
  const byWord = longestUpTo(text, spaces, max);
  if (byWord) return byWord;
  let out = '';
  for (const { segment } of segmenter.segment(text)) {
    if (out.length + segment.length > max) break;
    out += segment;
  }
  return out;
}

function hasFlower(text: string): boolean {
  return emojisIn(text).some((e) => (FLOWERS as readonly string[]).includes(e));
}

export function cleanStory(
  raw: string | undefined,
  { id, spa }: { id: string; spa: boolean },
): { storyText?: string; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const emoji = (fixes: string[]) =>
    dropped.push(...fixes.map((fix) => ({ field: 'emoji', reason: `${id}: story text ${fix}` })));
  let text = (raw ?? '').replace(HASHTAG_WORD, '').trim();
  if (spa) {
    const stripped = stripEmojis(text, POSTS_LIMITS.storyFlowers);
    text = stripped.text;
    emoji(stripped.fixes);
  }
  // Nothing left to read: no story text rather than a lone flower.
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return { dropped: [...dropped, { field: 'story', reason: `${id}: no story text` }] };
  }
  const before = text.length;
  text = cutStory(text, POSTS_LIMITS.storyChars);
  // Room for the flower code adds.
  const needsFlower = spa && !hasFlower(text);
  if (needsFlower) text = cutStory(text, POSTS_LIMITS.storyChars - ' 🌸'.length);
  if (text.length < before) {
    dropped.push({
      field: 'story',
      reason: `${id}: story text cut from ${before} to ${text.length}`,
    });
  }
  if (needsFlower) {
    const added = addFlower(text);
    text = added.text;
    emoji(added.fixes);
  }
  return { storyText: text, dropped };
}
