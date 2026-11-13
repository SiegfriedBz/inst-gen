// Each spa's website, next to its owner id (docs/specs/platform/easier-to-use,
// "The password opens the business"): on a phone with no business yet, the
// home screen reads it by itself. Websites are public, so they live here,
// not in PILOT_PASSPHRASES. An owner without one types theirs.
export const SITES: Readonly<Record<string, string>> = {
  sen: 'https://sendanangmassage.com/',
  svarga: 'https://svargabalimassage.com/',
};

export function siteFor(ownerId: string): string | null {
  return Object.hasOwn(SITES, ownerId) ? SITES[ownerId] : null;
}
