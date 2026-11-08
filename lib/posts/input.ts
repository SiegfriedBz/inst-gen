import type { Profile } from '@/lib/brand/profile';
import type { Post } from './batch';
import type { Offer } from './offer';

// What the post plan's model sees of the profile: public business facts only.
// Contact details and the street address never go to Gemini's free tier
// (decision 0003); code adds the call to action (docs/specs/posts/generate-copy,
// "The request").

export type PostsModelInput = Pick<
  Profile,
  | 'name'
  | 'summary'
  | 'category'
  | 'offerings'
  | 'highlights'
  | 'hours'
  | 'tone'
  | 'colours'
  | 'essence'
  | 'visualStyle'
> & { location: Omit<Profile['location'], 'address'> };

export function postsModelInput(profile: Profile): PostsModelInput {
  const { town, area, serviceArea } = profile.location;
  return {
    name: profile.name,
    summary: profile.summary,
    category: profile.category,
    offerings: profile.offerings,
    highlights: profile.highlights,
    location: { town, area, serviceArea },
    hours: profile.hours,
    tone: profile.tone,
    colours: profile.colours,
    essence: profile.essence,
    visualStyle: profile.visualStyle,
  };
}

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${sortedJson(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

// FNV-1a over what the model sees: a batch is out of date when this changes.
// Synchronous, so the browser and the server compute it the same way.
// FNV-1a over the text's code points, as 8 hex digits: enough to tell two
// versions apart, never to keep anything secret.
export function hashText(text: string): string {
  let hash = 0x811c9dc5;
  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function profileHash(profile: Profile): string {
  return hashText(sortedJson(postsModelInput(profile)));
}

// The line after a caption: the WhatsApp number, with the offer's end before
// it when an offer is given (docs/specs/posts/marketing-copy, "The offer's end,
// by the WhatsApp line").
export function ctaFor(profile: Profile, offer?: Offer): string | null {
  const whatsapp = profile.contact.whatsapp?.value;
  if (!whatsapp) return null;
  const book = `Book on WhatsApp: ${whatsapp}`;
  return offer ? `Offer ends ${offer.lastDay}. ${book}` : book;
}

// A post's own line: the offer's end only on a post that carries the offer.
export function postCta(
  profile: Profile,
  post: Pick<Post, 'offer'>,
  batchOffer?: Offer,
): string | null {
  return ctaFor(profile, post.offer ? batchOffer : undefined);
}
