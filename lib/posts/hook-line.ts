import { graphemes, isEmoji } from './emoji';

// The hook alone on the caption's first line (docs/specs/posts/marketing-copy,
// "The hook alone on the first line"): a blank line after the first sentence
// and the emoji right after it. A sentence ends at ".", "!" or "?" before a
// space or the end, as in story.ts, unless a lower-case word follows ("11 p.m.
// tonight"), or at an emoji whose stop is gone, when a new sentence starts
// after it. Only the first line is split; one that is a single sentence stays
// as it is.

const isSpace = (grapheme: string) => /^\s+$/.test(grapheme);

// A capital letter or a digit after the emoji and the spaces: a new sentence.
function sentenceAfter(parts: string[], from: number): boolean {
  let i = from;
  while (i < parts.length && (isSpace(parts[i]) || isEmoji(parts[i]))) i++;
  return i < parts.length && i > from && /^[\p{Lu}\d]/u.test(parts[i]);
}

// A lower-case word after the stop and the spaces: the sentence goes on.
function goesOn(parts: string[], from: number): boolean {
  let i = from;
  while (i < parts.length && isSpace(parts[i])) i++;
  return i < parts.length && /^\p{Ll}/u.test(parts[i]);
}

function hookEnd(parts: string[]): number | null {
  let letter = false;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const ends = i === parts.length - 1 || (isSpace(parts[i + 1]) && !goesOn(parts, i + 1));
    if (/^[.!?]$/.test(part) && ends) return i + 1;
    if (isEmoji(part) && letter && sentenceAfter(parts, i + 1)) return i;
    if (/\p{L}/u.test(part)) letter = true;
  }
  return null;
}

export function hookOnItsLine(caption: string): string {
  const lineEnd = caption.indexOf('\n');
  const line = lineEnd === -1 ? caption : caption.slice(0, lineEnd);
  const after = lineEnd === -1 ? '' : caption.slice(lineEnd);
  const parts = graphemes(line);
  const end = hookEnd(parts);
  if (end === null) return caption;
  let restStart = end;
  while (restStart < parts.length && (isSpace(parts[restStart]) || isEmoji(parts[restStart]))) {
    restStart++;
  }
  const rest = parts.slice(restStart).join('');
  if (!rest) return caption;
  return `${parts.slice(0, restStart).join('').trimEnd()}\n\n${rest}${after}`;
}
