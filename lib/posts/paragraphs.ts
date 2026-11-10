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

// Past three: the hook, the paragraph after it and the last one stay, since on
// an offer or a moment post the last answers a guest's doubt. When code put the
// offer line before the model's own hook (`displaced`), that hook goes first:
// the line took its place. Under the limit, the caption comes back as it was.
export function keepParagraphs(
  caption: string,
  id: string,
  displaced = false,
): { caption: string; dropped: Dropped[] } {
  const all = groups(caption);
  const max = POSTS_LIMITS.paragraphs;
  if (all.length <= max) return { caption, dropped: [] };
  const rest = displaced ? [all[0], ...all.slice(2)] : all;
  const gone = displaced ? [all[1]] : [];
  const kept = rest.length <= max ? rest : [rest[0], rest[1], rest[rest.length - 1]];
  if (rest.length > max) gone.push(...rest.slice(2, -1));
  return {
    caption: kept.map((lines) => lines.join('\n')).join('\n\n'),
    dropped: gone.map((lines) => ({
      field: 'caption',
      reason: `${id}: paragraph dropped "${lines.join(' ')}"`,
    })),
  };
}
