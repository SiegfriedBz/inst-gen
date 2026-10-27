import type { Profile } from './profile';

// The business's country, from its numbers or its site's domain: Vietnam or
// Indonesia, the pilot's two, or nothing.
export function countryOf(profile: Profile): 'VN' | 'ID' | null {
  for (const number of [profile.contact.whatsapp?.value, profile.contact.phone?.value]) {
    if (number?.startsWith('+84')) return 'VN';
    if (number?.startsWith('+62')) return 'ID';
  }
  const host = new URL(profile.siteUrl).hostname;
  if (host.endsWith('.vn')) return 'VN';
  if (host.endsWith('.id')) return 'ID';
  return null;
}
