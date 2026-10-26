// The developer's WhatsApp at the end of the owner guide
// (docs/specs/guide/owner-guide); empty hides the line.
export function guideContact(env: Record<string, string | undefined> = process.env): string | null {
  return env.GUIDE_CONTACT?.trim() || null;
}
