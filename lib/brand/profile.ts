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

// A fact and the page it came from: a URL, or "model" for a colour or style
// the model inferred from images.
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

// What the model fills in.
export const modelProfileSchema = z.object({
  name: sourced(text).nullable(),
  summary: sourced(maxWords(25)).nullable(),
  category: text,
  offerings: z.array(offering).max(20),
  highlights: z.array(sourced(text)).max(8),
  location,
  contact,
  hours: sourced(text).nullable(),
  tone: z.array(text).min(3).max(5),
  colours: z.array(colour).max(5),
  visualStyle: visualStyle.nullable(),
});

export type ModelProfile = z.infer<typeof modelProfileSchema>;

export const profileSchema = modelProfileSchema.extend({
  schemaVersion: z.literal(1),
  siteUrl: z.url(),
  readAt: z.iso.datetime(),
  pagesRead: z.array(z.url()).min(1).max(8),
  thin: z.boolean(),
  name: sourced(text),
  logoUrl: sourced(z.url()).nullable(),
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
