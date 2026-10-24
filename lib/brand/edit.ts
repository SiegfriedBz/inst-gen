import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { z } from 'zod';
import { toE164 } from './phone';
import { COLOUR_ROLES, OWNER_SOURCE, type Profile, profileSchema } from './profile';

// The owner's edits to one section of the brand panel
// (docs/specs/brand/brand-panel, "Editing" and "What an edit changes").
// Forms hold plain strings, '' meaning empty. A value the owner changed gets
// source "owner"; one saved unchanged keeps its source.

export type SectionId = 'business' | 'place' | 'contact' | 'look' | 'feeling';

type Item = { value: string; source?: string };
type OfferingValues = {
  name: string;
  description: string;
  price: string;
  duration: string;
  source?: string;
};
type ColourValues = { hex: string; role: string; source?: string };

export type BusinessValues = {
  name: string;
  summary: string;
  category: string;
  offerings: OfferingValues[];
  highlights: Item[];
};
export type PlaceValues = {
  town: string;
  area: string;
  address: string;
  serviceArea: string;
  hours: string;
};
export type ContactValues = {
  whatsapp: string;
  phone: string;
  email: string;
  instagram: string;
  bookingUrl: string;
};
export type StyleValues = {
  summary: string;
  palette: string;
  light: string;
  textures: string;
  mood: string;
};
export type LookValues = {
  keepLogo: boolean;
  colours: ColourValues[];
  photoUrls: string[];
  style: StyleValues;
};
export type FeelingValues = {
  promise: string;
  feeling: string[];
  moments: Item[];
  placeSymbols: string[];
  senses: string[];
  tone: string[];
};

export type SectionValues = {
  business: BusinessValues;
  place: PlaceValues;
  contact: ContactValues;
  look: LookValues;
  feeling: FeelingValues;
};

export type FieldError =
  | 'required'
  | 'tooManyWords'
  | 'tooMany'
  | 'invalidEmail'
  | 'invalidUrl'
  | 'invalidPhone'
  | 'needCountryCode'
  | 'styleIncomplete'
  | 'needColour'
  | 'invalid';

export type ApplyResult =
  | { ok: true; profile: Profile }
  | { ok: false; errors: Record<string, FieldError> };

type Sourced = { value: string; source: string } | null;

const textOf = (field: Sourced) => field?.value ?? '';
const STYLE_PARTS = ['summary', 'palette', 'light', 'textures', 'mood'] as const;

export function sectionValues<S extends SectionId>(profile: Profile, section: S): SectionValues[S] {
  const all: { [K in SectionId]: () => SectionValues[K] } = {
    business: () => ({
      name: profile.name.value,
      summary: textOf(profile.summary),
      category: profile.category,
      offerings: profile.offerings.map((o) => ({
        name: o.name,
        description: o.description ?? '',
        price: o.price ?? '',
        duration: o.duration ?? '',
        source: o.source,
      })),
      highlights: profile.highlights.map((h) => ({ ...h })),
    }),
    place: () => ({
      town: textOf(profile.location.town),
      area: textOf(profile.location.area),
      address: textOf(profile.location.address),
      serviceArea: textOf(profile.location.serviceArea),
      hours: textOf(profile.hours),
    }),
    contact: () => ({
      whatsapp: textOf(profile.contact.whatsapp),
      phone: textOf(profile.contact.phone),
      email: textOf(profile.contact.email),
      instagram: textOf(profile.contact.instagram),
      bookingUrl: textOf(profile.contact.bookingUrl),
    }),
    look: () => ({
      keepLogo: profile.logoUrl !== null,
      colours: profile.colours.map((c) => ({ ...c })),
      photoUrls: [...profile.photoUrls],
      style: Object.fromEntries(
        STYLE_PARTS.map((part) => [part, profile.visualStyle?.[part] ?? '']),
      ) as StyleValues,
    }),
    feeling: () => ({
      promise: textOf(profile.essence.promise),
      feeling: [...profile.essence.feeling],
      moments: profile.essence.moments.map((m) => ({ ...m })),
      placeSymbols: [...profile.essence.placeSymbols],
      senses: [...profile.essence.senses],
      tone: [...profile.tone],
    }),
  };
  return all[section]();
}

// A sourced field after the edit: unchanged keeps its source, empty is null.
function field(old: Sourced, typed: string): Sourced {
  const value = typed.trim();
  if (!value) return null;
  if (old && old.value === value) return old;
  return { value, source: OWNER_SOURCE };
}

const words = (list: string[]) => list.map((w) => w.trim()).filter(Boolean);

function items(old: { value: string; source: string }[], typed: Item[]) {
  return typed
    .map((item) => item.value.trim())
    .filter(Boolean)
    .map((value) => old.find((o) => o.value === value) ?? { value, source: OWNER_SOURCE });
}

const VIETNAM = [
  'vietnam',
  'viet nam',
  'da nang',
  'hoi an',
  'hanoi',
  'ho chi minh',
  'saigon',
  'nha trang',
];
const INDONESIA = ['indonesia', 'bali', 'canggu', 'seminyak', 'ubud', 'jakarta', 'lombok'];

// The country a number typed without "+" belongs to: that of the profile's
// other number, else one named in its location, else none.
function countryHint(profile: Profile, other: Sourced): string | undefined {
  const country = other && parsePhoneNumberFromString(other.value)?.country;
  if (country) return country;
  const place = Object.values(profile.location)
    .map((f) => f?.value ?? '')
    .join(' ')
    .toLowerCase();
  if (VIETNAM.some((name) => place.includes(name))) return 'VN';
  if (INDONESIA.some((name) => place.includes(name))) return 'ID';
  return undefined;
}

function phoneField(
  profile: Profile,
  old: Sourced,
  other: Sourced,
  typed: string,
): Sourced | FieldError {
  const written = typed.trim();
  if (!written) return null;
  if (old && old.value === written) return old;
  const hint = countryHint(profile, other);
  if (!written.startsWith('+') && !written.startsWith('00') && !hint) return 'needCountryCode';
  const number = toE164(written, hint);
  if (!number || !/^\+\d{6,15}$/.test(number)) return 'invalidPhone';
  return field(old, number);
}

function instagramHandle(typed: string): string {
  const value = typed.trim();
  const link = value.match(/instagram\.com\/([^/?#\s]+)/i);
  return (link?.[1] ?? value).replace(/^@/, '');
}

function bookingLink(typed: string): string | FieldError {
  const value = typed.trim();
  if (!value) return '';
  if (/^[a-z][a-z\d+.-]*:/i.test(value) && !/^https?:\/\//i.test(value)) return 'invalidUrl';
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return z.url({ protocol: /^https?$/ }).safeParse(withScheme).success && !/\s/.test(value)
    ? withScheme
    : 'invalidUrl';
}

const sameOffering = (a: OfferingValues, b: Profile['offerings'][number]) =>
  a.name.trim() === b.name &&
  a.description.trim() === (b.description ?? '') &&
  a.price.trim() === (b.price ?? '') &&
  a.duration.trim() === (b.duration ?? '');

function offerings(old: Profile['offerings'], typed: OfferingValues[]): Profile['offerings'] {
  return typed
    .filter((o) => [o.name, o.description, o.price, o.duration].some((v) => v.trim()))
    .map((o) => {
      const same = old.find((b) => sameOffering(o, b));
      if (same) return same;
      const optional = (v: string) => (v.trim() ? v.trim() : undefined);
      return {
        name: o.name.trim(),
        ...(optional(o.description) && { description: optional(o.description) }),
        ...(optional(o.price) && { price: optional(o.price) }),
        ...(optional(o.duration) && { duration: optional(o.duration) }),
        source: OWNER_SOURCE,
      };
    });
}

function colours(old: Profile['colours'], typed: ColourValues[]): Profile['colours'] {
  return typed.map((c) => {
    const hex = c.hex.trim().toLowerCase();
    const role = (COLOUR_ROLES as readonly string[]).includes(c.role)
      ? (c.role as Profile['colours'][number]['role'])
      : 'accent';
    return old.find((o) => o.hex === hex && o.role === role) ?? { hex, role, source: OWNER_SOURCE };
  });
}

// The values key a schema issue belongs to: "summary", "offerings.2.name".
function valuesKey(path: PropertyKey[]): string {
  return path
    .filter((part) => !['value', 'location', 'contact', 'essence'].includes(String(part)))
    .map((part) => (part === 'visualStyle' ? 'style' : String(part)))
    .join('.');
}

function issueError(issue: z.core.$ZodIssue): FieldError {
  if (issue.code === 'too_big') return 'tooMany';
  if (issue.code === 'too_small') return 'required';
  if (issue.code === 'custom') return 'tooManyWords';
  if (issue.code === 'invalid_format' && issue.format === 'url') return 'invalidUrl';
  return 'invalid';
}

function build(profile: Profile, section: SectionId, values: SectionValues[SectionId]) {
  const errors: Record<string, FieldError> = {};
  let next: Profile = profile;

  if (section === 'business') {
    const v = values as BusinessValues;
    next = {
      ...profile,
      name: field(profile.name, v.name) ?? { value: '', source: OWNER_SOURCE },
      summary: field(profile.summary, v.summary),
      category: v.category.trim(),
      offerings: offerings(profile.offerings, v.offerings),
      highlights: items(profile.highlights, v.highlights),
    };
  } else if (section === 'place') {
    const v = values as PlaceValues;
    const { location } = profile;
    next = {
      ...profile,
      location: {
        town: field(location.town, v.town),
        area: field(location.area, v.area),
        address: field(location.address, v.address),
        serviceArea: field(location.serviceArea, v.serviceArea),
      },
      hours: field(profile.hours, v.hours),
    };
  } else if (section === 'contact') {
    const v = values as ContactValues;
    const { contact } = profile;
    const whatsapp = phoneField(profile, contact.whatsapp, contact.phone, v.whatsapp);
    const phone = phoneField(profile, contact.phone, contact.whatsapp, v.phone);
    if (typeof whatsapp === 'string') errors.whatsapp = whatsapp;
    if (typeof phone === 'string') errors.phone = phone;
    // A value saved as it was read is kept, even one the checks below would
    // refuse: 1.1 takes the booking link as the site writes it.
    const untouched = (old: Sourced, typed: string) => !!old && old.value === typed.trim();
    const email = v.email.trim();
    const emailKept = untouched(contact.email, email);
    if (email && !emailKept && !z.email().safeParse(email).success) errors.email = 'invalidEmail';
    const bookingKept = untouched(contact.bookingUrl, v.bookingUrl);
    const booking = bookingKept ? (contact.bookingUrl?.value ?? '') : bookingLink(v.bookingUrl);
    if (booking === 'invalidUrl') errors.bookingUrl = booking;
    next = {
      ...profile,
      contact: {
        whatsapp: typeof whatsapp === 'string' ? contact.whatsapp : whatsapp,
        phone: typeof phone === 'string' ? contact.phone : phone,
        email: field(contact.email, email),
        instagram: field(contact.instagram, instagramHandle(v.instagram)),
        bookingUrl:
          booking === 'invalidUrl' ? contact.bookingUrl : field(contact.bookingUrl, booking),
      },
    };
  } else if (section === 'look') {
    const v = values as LookValues;
    if (v.colours.length === 0) errors.colours = 'needColour';
    const parts = STYLE_PARTS.map((part) => v.style[part].trim());
    const filled = parts.filter(Boolean).length;
    if (filled > 0 && filled < parts.length) errors.style = 'styleIncomplete';
    next = {
      ...profile,
      logoUrl: v.keepLogo ? profile.logoUrl : null,
      colours: colours(profile.colours, v.colours),
      photoUrls: profile.photoUrls.filter((url) => v.photoUrls.includes(url)),
      visualStyle:
        filled === 0
          ? null
          : (Object.fromEntries(STYLE_PARTS.map((part, i) => [part, parts[i]])) as StyleValues),
    };
  } else {
    const v = values as FeelingValues;
    next = {
      ...profile,
      tone: words(v.tone),
      essence: {
        promise: field(profile.essence.promise, v.promise),
        feeling: words(v.feeling),
        placeSymbols: words(v.placeSymbols),
        senses: words(v.senses),
        moments: items(profile.essence.moments, v.moments),
      },
    };
  }
  return { next, errors };
}

export function applySection<S extends SectionId>(
  profile: Profile,
  section: S,
  values: SectionValues[S],
): ApplyResult {
  const { next, errors } = build(profile, section, values);
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  const parsed = profileSchema.safeParse(next);
  if (parsed.success) return { ok: true, profile: next };
  const schemaErrors: Record<string, FieldError> = {};
  for (const issue of parsed.error.issues) {
    const key = valuesKey(issue.path);
    schemaErrors[key] ??= issueError(issue);
  }
  return { ok: false, errors: schemaErrors };
}

// Fields with no source of their own: an owner's edit to one is recorded
// beside the profile (BrandRecord.ownerEdited), not in it.
export const UNSOURCED_FIELDS = [
  'category',
  'tone',
  'visualStyle',
  'essence.feeling',
  'essence.placeSymbols',
  'essence.senses',
] as const;

export type UnsourcedField = (typeof UNSOURCED_FIELDS)[number];

function unsourced(profile: Profile, field: UnsourcedField): unknown {
  if (field === 'category') return profile.category;
  if (field === 'tone') return profile.tone;
  if (field === 'visualStyle') return profile.visualStyle;
  return profile.essence[field.slice('essence.'.length) as 'feeling' | 'placeSymbols' | 'senses'];
}

export function changedUnsourced(before: Profile, after: Profile): UnsourcedField[] {
  return UNSOURCED_FIELDS.filter(
    (field) => JSON.stringify(unsourced(before, field)) !== JSON.stringify(unsourced(after, field)),
  );
}

// How many values in the profile the owner typed, counting her edits to
// fields with no source: re-read asks before replacing them.
export function countOwnerEdits(profile: Profile, ownerEdited: readonly string[] = []): number {
  const sourced: (Sourced | { source: string })[] = [
    profile.name,
    profile.summary,
    profile.hours,
    profile.logoUrl,
    profile.essence.promise,
    ...Object.values(profile.location),
    ...Object.values(profile.contact),
    ...profile.offerings,
    ...profile.highlights,
    ...profile.colours,
    ...profile.essence.moments,
  ];
  return sourced.filter((f) => f?.source === OWNER_SOURCE).length + ownerEdited.length;
}
