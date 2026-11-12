import { type Dropped, POSTS_LIMITS } from './batch';
import { sentences } from './story';

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

// A question alone: one sentence ending in "?", an emoji after it allowed.
const TRAILING_EMOJI = /(?:\s|\p{Extended_Pictographic}|\uFE0F)+$/u;
function onlyQuestion(text: string): boolean {
  const bare = text.replace(TRAILING_EMOJI, '');
  return bare.endsWith('?') && sentences(bare).length === 1;
}

// On an offer post of more than three paragraphs, a question alone right
// after the line joins the paragraph after it, so the limit keeps its answer
// (docs/specs/posts/short-captions, amended 2026-11-12). Three or fewer come
// back as they are.
export function joinQuestion(caption: string): string {
  const all = groups(caption);
  if (all.length <= POSTS_LIMITS.paragraphs || !onlyQuestion(all[1].join(' '))) return caption;
  const [line, question, answer, ...rest] = all;
  return [
    line.join('\n'),
    `${question.join(' ')} ${answer.join(' ')}`,
    ...rest.map((lines) => lines.join('\n')),
  ].join('\n\n');
}

// The fact on its own line (docs/specs/posts/short-captions, amended
// 2026-11-12): on two paragraphs whose second holds more than its answer (an
// offer post's, after its line: its question and its answer), the second's
// last sentence and the emoji after it become a third. An emoji that opens
// that sentence stays with the one before. Anything else comes back as it is.
const LEADING_EMOJI = /^(?:\s|\p{Extended_Pictographic}|\uFE0F)*/u;

export function factOnItsLine(caption: string, lined: boolean): string {
  const all = groups(caption);
  if (all.length !== 2) return caption;
  const parts = sentences(all[1].join(' '));
  const counted = parts.filter((part) => WORDS.test(part)).length;
  if (counted < (lined ? 3 : 2)) return caption;
  const at = parts.findLastIndex((part) => WORDS.test(part));
  const last = parts.slice(at).join('');
  const lead = last.match(LEADING_EMOJI)?.[0] ?? '';
  const rest = `${parts.slice(0, at).join('')}${lead}`.trim();
  return [all[0].join('\n'), rest, last.slice(lead.length).trim()].join('\n\n');
}
