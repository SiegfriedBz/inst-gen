import { LIMITS } from './profile';

// The therapists' look (docs/specs/posts/therapists-look): what the women who
// give the service wear, and their hair. The images always show women, so a
// look that names a man is never kept; the look fits the profile's limits.

const A_MAN = /\b(?:man|men|males?|boys?|gentlem[ae]n|he|his)\b/i;

export function namesAMan(text: string): boolean {
  return A_MAN.test(text);
}

// At most 30 words and 300 characters: cut before the last comma that fits,
// else at the last whole word that fits.
export function cutLook(text: string): string {
  const whole = text.trim().replace(/\s+/g, ' ');
  let kept = whole.split(' ').slice(0, LIMITS.staffLookWords).join(' ');
  if (kept.length > LIMITS.staffLookChars) {
    kept = kept
      .slice(0, LIMITS.staffLookChars + 1)
      .replace(/\s+\S*$/, '')
      .slice(0, LIMITS.staffLookChars);
  }
  if (kept === whole) return kept;
  const comma = kept.lastIndexOf(',');
  return comma > 0 ? kept.slice(0, comma) : kept;
}
