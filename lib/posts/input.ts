import type { Profile } from '@/lib/brand/profile';

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
export function profileHash(profile: Profile): string {
  let hash = 0x811c9dc5;
  for (const char of sortedJson(postsModelInput(profile))) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

export function ctaFor(profile: Profile): string | null {
  const whatsapp = profile.contact.whatsapp?.value;
  return whatsapp ? `Book on WhatsApp: ${whatsapp}` : null;
}
