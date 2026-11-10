import { type Dropped, POSTS_LIMITS } from './batch';

// A caption of at most three paragraphs, its hook counted
// (docs/specs/posts/short-captions, "At most three short paragraphs"). A
// paragraph is the text between line breaks; a line with no letter or digit
// (a flower alone) belongs to the paragraph before it, or to the first one.

const WORDS = /[\p{L}\p{N}]/u;

// Each paragraph as its lines, the letterless ones it carries included.
function groups(caption: string): string[][] {
  const out: string[][] = [];
  for (const raw of caption.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    if (WORDS.test(line) || out.length === 0) out.push([line]);
    else out[out.length - 1].push(line);
  }
  // A caption that opens on a letterless line: it joins the first paragraph.
  if (out.length > 1 && !WORDS.test(out[0].join(''))) {
    const [lead, first, ...rest] = out;
    return [[...lead, ...first], ...rest];
  }
  return out;
}

export function paragraphsOf(caption: string): string[] {
  return groups(caption).map((lines) => lines.join('\n'));
}

// Past three: the question, the paragraph after it (an offer post's line) and
// the last one, its fact, stay. Every paragraph gets a blank line after it, as
// the maintainer's examples have (amended 2026-11-10).
export function keepParagraphs(
  caption: string,
  id: string,
): { caption: string; dropped: Dropped[] } {
  const all = groups(caption);
  const over = all.length > POSTS_LIMITS.paragraphs;
  const kept = over ? [all[0], all[1], all[all.length - 1]] : all;
  return {
    caption: kept.map((lines) => lines.join('\n')).join('\n\n'),
    dropped: (over ? all.slice(2, -1) : []).map((lines) => ({
      field: 'caption',
      reason: `${id}: paragraph dropped "${lines.join(' ')}"`,
    })),
  };
}
