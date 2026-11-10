// What leaves the phone (docs/specs/questions/answer-drafts): before the
// request, each link, email address and phone number in the guest's question
// becomes `[link]`, `[email]` or `[number]`, since a guest's message isn't
// public the way a review is (decision 0003). The question shown stays as
// pasted.

const LINK = /\b(?:https?:\/\/|www\.)\S+/giu;
const EMAIL = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}-]+(?:\.[\p{L}\p{N}-]+)*\.\p{L}{2,}/gu;
// Digits with their spaces, dots, dashes and brackets, and a leading +.
const DIGITS = /\+?\d[\d\s().-]*\d/g;
const PHONE_DIGITS = 7;

// A run whose every part is a date, a time or a price in groups of three, or
// a range of two, stays as written: the guest's day and time reach the answer
// (amended 2026-11-10). A phone number takes none of these shapes: it starts
// with + or 0, or has spaces between its groups.
const DAY = '(?:0?[1-9]|[12]\\d|3[01])';
const MONTH = '(?:0?[1-9]|1[0-2])';
const YEAR = '(?:19|20)\\d{2}';
const DATE = `(?:${DAY}[.-]${MONTH}[.-]${YEAR}|${YEAR}-${MONTH}-${DAY})`;
const TIME = '(?:[01]?\\d|2[0-3])\\.[0-5]\\d';
const PRICE = '[1-9]\\d{0,2}(?:\\.\\d{3}){1,2}';
const KEPT = new RegExp(
  `^(?:${[DATE, TIME, PRICE].map((shape) => `${shape}(?:-${shape})?`).join('|')})$`,
);

function isPhone(run: string): boolean {
  if (run.replace(/\D/g, '').length < PHONE_DIGITS) return false;
  const parts = run.replace(/\s*-\s*/g, '-').split(/\s+/);
  return !parts.every((part) => KEPT.test(part));
}

export function scrubQuestion(text: string): string {
  return text
    .replace(LINK, '[link]')
    .replace(EMAIL, '[email]')
    .replace(DIGITS, (match) => (isPhone(match) ? '[number]' : match));
}
