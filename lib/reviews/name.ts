// The guest's name, put in on the phone (docs/specs/reviews/reply-drafts, "The
// replies"): the model only ever sees `{name}`. As typed, never a first word:
// Vietnamese and Korean names start with the family name.

const PLACEHOLDER = /\{name\}/g;
const WITH_SEPARATOR = /(?:,\s*|\s+)?\{name\}/g;

export function fillName(text: string, name: string): string {
  const typed = name.trim();
  // A function replacer, so "$&" in a name stays as typed.
  return typed ? text.replace(PLACEHOLDER, () => typed) : text.replace(WITH_SEPARATOR, '');
}
