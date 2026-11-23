import type { Profile } from '@/lib/brand/profile';
import { isSpa } from './emoji';

// Reasons to book (docs/specs/posts/reasons-to-book): for a business that
// comes to its guests, every post sells one reason to book today, dealt by
// code.

// A spa whose read found a service area: the only place the read writes that
// a business travels to its guests.
export function comesToGuests(profile: Profile): boolean {
  return isSpa(profile.category) && !!profile.location.serviceArea?.value.trim();
}
