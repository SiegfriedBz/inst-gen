// The letters a guest writes with (docs/specs/reviews/better-replies-and-answers,
// "The guest's letters"): code tells the model to answer in them, and refuses a
// reply or an answer that holds none, since the prompt alone doesn't hold it.

const PATTERNS = {
  Hangul: /\p{Script=Hangul}/u,
  Cyrillic: /\p{Script=Cyrillic}/u,
  // Chinese, or Japanese with its kana.
  CJK: /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u,
  Thai: /\p{Script=Thai}/u,
  Arabic: /\p{Script=Arabic}/u,
  Hebrew: /\p{Script=Hebrew}/u,
  Greek: /\p{Script=Greek}/u,
  Devanagari: /\p{Script=Devanagari}/u,
} as const;
export type Script = keyof typeof PATTERNS;

// How the prompt names each.
export const SCRIPT_NAMES: Record<Script, string> = {
  Hangul: 'Korean',
  Cyrillic: 'Cyrillic',
  CJK: 'Chinese or Japanese',
  Thai: 'Thai',
  Arabic: 'Arabic',
  Hebrew: 'Hebrew',
  Greek: 'Greek',
  Devanagari: 'Devanagari',
};

const LETTER = /\p{L}/gu;

// The script most of a text's letters belong to, when it isn't the Latin
// alphabet; null otherwise.
export function guestScript(text: string): Script | null {
  const letters = text.match(LETTER) ?? [];
  if (letters.length === 0) return null;
  let best: Script | null = null;
  let most = 0;
  for (const script of Object.keys(PATTERNS) as Script[]) {
    const count = letters.filter((letter) => PATTERNS[script].test(letter)).length;
    if (count > most) {
      best = script;
      most = count;
    }
  }
  return most * 2 > letters.length ? best : null;
}

export function holdsScript(text: string, script: Script): boolean {
  return PATTERNS[script].test(text);
}
