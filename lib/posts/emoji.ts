// Flower emojis for spas (docs/specs/posts/story-text, "Emojis" and "Code's
// checks"): which businesses are spas, and code's fixes to their captions and
// story texts, so the rule holds whatever the model writes.

export const FLOWERS = ['🌸', '🌺', '🌼', '🌷', '🪷'] as const;

// Whole words of the category, case and accents ignored: "Mát-xa" is "mat-xa".
const SPA = /\b(spa|massage|pijat|mat[ -]xa|reflexology)\b/;

export function isSpa(category: string): boolean {
  const folded = category
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();
  return SPA.test(folded);
}

// An emoji is one grapheme, with the joiners, skin tones and variation
// selectors that belong to it; a flag (two regional indicators) or a keycap
// (1️⃣) is one too.
const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
const PICTOGRAPH = /\p{Extended_Pictographic}|\p{Regional_Indicator}|\u20E3/u;

function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (s) => s.segment);
}

function isEmoji(grapheme: string): boolean {
  return PICTOGRAPH.test(grapheme);
}

function isFlower(grapheme: string): boolean {
  return (FLOWERS as readonly string[]).includes(grapheme.replace(/️/g, ''));
}

export function emojisIn(text: string): string[] {
  return graphemes(text).filter(isEmoji);
}

// What a removed emoji leaves: two spaces, a space before a stop, a space at
// either end of a line, a line left empty.
function tidy(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ +([.,!?])/g, '$1')
    .replace(/[ \t]+$/gm, '')
    .replace(/^[ \t]+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function stripEmojis(text: string, maxFlowers: number): { text: string; fixes: string[] } {
  const fixes: string[] = [];
  let flowers = 0;
  // A removed emoji leaves a space, so the words around it stay apart.
  const kept = graphemes(text).map((g) => {
    if (!isEmoji(g)) return g;
    if (!isFlower(g)) {
      fixes.push(`removed ${g}`);
      return ' ';
    }
    flowers += 1;
    if (flowers <= maxFlowers) return g;
    fixes.push(`removed ${g} over ${maxFlowers} flowers`);
    return ' ';
  });
  return fixes.length > 0 ? { text: tidy(kept.join('')), fixes } : { text, fixes };
}

export function addFlower(text: string): { text: string; fixes: string[] } {
  if (emojisIn(text).some(isFlower)) return { text, fixes: [] };
  return { text: `${text.trimEnd()} 🌸`, fixes: ['added 🌸'] };
}
