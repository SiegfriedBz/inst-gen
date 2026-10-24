import { z } from 'zod';

// The brand profile read from a business's website
// (docs/specs/brand/extract-site/spec.md). One schema serves the model's
// output, the route's response, and later the browser store and the panel.

const text = z.string().min(1);

function maxWords(max: number) {
  return text.refine((value) => value.trim().split(/\s+/).length <= max, {
    message: `at most ${max} words`,
  });
}

// A fact and where it came from: a page URL, "model" for a colour or style
// the model inferred from images, or "owner" for a value the owner typed in
// the brand panel (docs/specs/brand/brand-panel). Code may also write a
// short tag for a colour it read, like "theme-color".
export const OWNER_SOURCE = 'owner';

export function sourced<T extends z.ZodType>(value: T) {
  return z.object({ value, source: text });
}

const hex = z.string().regex(/^#[0-9a-f]{6}$/);
export const COLOUR_ROLES = ['primary', 'accent', 'background', 'text'] as const;

const colour = z.object({ hex, role: z.enum(COLOUR_ROLES), source: text });

const offering = z.object({
  name: text,
  description: text.optional(),
  price: text.optional(),
  duration: text.optional(),
  source: text,
});

const location = z.object({
  town: sourced(text).nullable(),
  area: sourced(text).nullable(),
  address: sourced(text).nullable(),
  serviceArea: sourced(text).nullable(),
});

const contact = z.object({
  whatsapp: sourced(text).nullable(),
  phone: sourced(text).nullable(),
  email: sourced(text).nullable(),
  instagram: sourced(text).nullable(),
  bookingUrl: sourced(text).nullable(),
});

const visualStyle = z.object({
  summary: maxWords(12),
  palette: text,
  light: text,
  textures: text,
  mood: text,
});

// Limits of the final profile; code trims the model's answer to them.
export const LIMITS = {
  summaryWords: 25,
  styleSummaryWords: 12,
  offerings: 20,
  highlights: 8,
  tone: 5,
  colours: 5,
  feeling: 4,
  placeSymbols: 5,
  senses: 5,
  moments: 6,
  promiseWords: 20,
} as const;

// What the model fills in. It has no limits: a model answer a word or an item
// over a limit is trimmed by code (lib/brand/checks.ts), not refused.
const loose = z.string();
const looseSourced = z.object({ value: loose, source: loose }).nullable();

export const modelProfileSchema = z.object({
  name: looseSourced,
  summary: looseSourced,
  category: loose,
  offerings: z.array(
    z.object({
      name: loose,
      description: loose.optional(),
      price: loose.optional(),
      duration: loose.optional(),
      source: loose,
    }),
  ),
  highlights: z.array(z.object({ value: loose, source: loose })),
  location: z.object({
    town: looseSourced,
    area: looseSourced,
    address: looseSourced,
    serviceArea: looseSourced,
  }),
  contact: z.object({
    whatsapp: looseSourced,
    phone: looseSourced,
    email: looseSourced,
    instagram: looseSourced,
    bookingUrl: looseSourced,
  }),
  hours: looseSourced,
  tone: z.array(loose),
  colours: z.array(z.object({ hex: loose, role: z.enum(COLOUR_ROLES), source: loose })),
  essence: z
    .object({
      promise: looseSourced,
      feeling: z.array(loose),
      placeSymbols: z.array(loose),
      senses: z.array(loose),
      moments: z.array(z.object({ value: loose, source: loose })),
    })
    .nullable(),
  visualStyle: z
    .object({ summary: loose, palette: loose, light: loose, textures: loose, mood: loose })
    .nullable(),
});

export type ModelProfile = z.infer<typeof modelProfileSchema>;

export const profileSchema = z.object({
  schemaVersion: z.literal(1),
  siteUrl: z.url(),
  readAt: z.iso.datetime(),
  pagesRead: z.array(z.url()).min(1).max(8),
  thin: z.boolean(),
  name: sourced(text),
  summary: sourced(maxWords(LIMITS.summaryWords)).nullable(),
  category: text,
  offerings: z.array(offering).max(LIMITS.offerings),
  highlights: z.array(sourced(text)).max(LIMITS.highlights),
  location,
  contact,
  hours: sourced(text).nullable(),
  tone: z.array(text).max(LIMITS.tone),
  colours: z.array(colour).max(LIMITS.colours),
  logoUrl: sourced(z.url()).nullable(),
  // What the business is about, where, why people come and how they should
  // feel. Only moments are facts; the rest is interpretation (spec, "The essence").
  essence: z.object({
    promise: sourced(maxWords(LIMITS.promiseWords)).nullable(),
    feeling: z.array(text).max(LIMITS.feeling),
    placeSymbols: z.array(text).max(LIMITS.placeSymbols),
    senses: z.array(text).max(LIMITS.senses),
    moments: z.array(sourced(text)).max(LIMITS.moments),
  }),
  visualStyle: visualStyle.nullable(),
  photoUrls: z.array(z.url()),
  promptVersion: text,
  dropped: z.array(z.object({ field: text, reason: text })),
});

export type Profile = z.infer<typeof profileSchema>;

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;

export type PartialProfile = DeepPartial<Profile>;

export const ERROR_CODES = [
  'invalid_url',
  'blocked_address',
  'unreachable',
  'robots_disallowed',
  'model_busy',
  'model_timeout',
  'model_failed',
] as const;

export type BrandErrorCode = (typeof ERROR_CODES)[number];

export const ERROR_STATUS: Record<BrandErrorCode, number> = {
  invalid_url: 400,
  blocked_address: 400,
  unreachable: 502,
  robots_disallowed: 403,
  model_busy: 503,
  model_timeout: 504,
  model_failed: 502,
};
