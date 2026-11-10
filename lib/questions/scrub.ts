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

export function scrubQuestion(text: string): string {
  return text
    .replace(LINK, '[link]')
    .replace(EMAIL, '[email]')
    .replace(DIGITS, (match) =>
      match.replace(/\D/g, '').length >= PHONE_DIGITS ? '[number]' : match,
    );
}
