import { type Dropped, POSTS_LIMITS } from './batch';
import { addFlower, emojisIn, FLOWERS, stripEmojis } from './emoji';

// The story text's cleanup and cut (docs/specs/posts/story-text, "Code's
// checks"). Its flags are checks.ts's, which imports this module.

const HASHTAG_WORD = /(^|\s)#[\p{L}\p{M}\p{N}_]+/gu;
// A call to action: the owner adds the link sticker (docs/specs/posts/story-text,
// amended 2026-10-27).
const CALL_TO_ACTION =
  /\b(book|booking|reserve|call us|message us|contact us|dm|whatsapp|link in bio|tap the link|click)\b/i;
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

// Sentences end at ".", "!" or "?" before a space or the end; what follows,
// an emoji included, starts the next one.
function sentences(text: string): string[] {
  const ends = [...text.matchAll(/[.!?](?=\s|$)/g)].map((m) => m.index + 1);
  const starts = [0, ...ends];
  return starts.map((start, i) => text.slice(start, ends[i])).filter((s) => s.trim());
}

function hasFlower(text: string): boolean {
  return emojisIn(text).some((e) => (FLOWERS as readonly string[]).includes(e));
}

export function cleanStory(
  raw: string | undefined,
  { id, spa }: { id: string; spa: boolean },
): { storyText?: string; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  // One record per fixed text, however many changes it took.
  const fixes: string[] = [];
  const emoji = () =>
    fixes.length > 0 ? [{ field: 'emoji', reason: `${id}: story text ${fixes.join(', ')}` }] : [];
  let text = (raw ?? '').replace(HASHTAG_WORD, '').trim();
  const kept = sentences(text).filter((sentence) => {
    if (!CALL_TO_ACTION.test(sentence)) return true;
    dropped.push({ field: 'story', reason: `${id}: story text removed "${sentence.trim()}"` });
    return false;
  });
  text = kept.join('').trim();
  if (spa) {
    const stripped = stripEmojis(text, POSTS_LIMITS.storyFlowers);
    text = stripped.text;
    fixes.push(...stripped.fixes);
  }
  // Nothing left to read: no story text rather than a lone flower.
  if (!/[\p{L}\p{N}]/u.test(text)) {
    return {
      dropped: [...dropped, ...emoji(), { field: 'story', reason: `${id}: no story text` }],
    };
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
    fixes.push(...added.fixes);
  }
  return { storyText: text, dropped: [...emoji(), ...dropped] };
}
