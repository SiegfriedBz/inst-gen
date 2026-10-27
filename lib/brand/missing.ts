import type { SectionId } from './edit';
import type { Profile } from './profile';

// What "Your business" asks the owner to add, and one line per section
// (docs/specs/platform/friendlier-home, "'Your business': what's missing
// first"). Pure: the panel and the home screen draw from it.

// Where the essence search stands (docs/specs/brand/search-essence): null
// when it isn't running and has nothing to say.
export type SearchState = 'running' | 'failed' | 'empty' | null;

// The `brand.panel.fields.*` keys of the fields a form can fill. Logo and
// photos aren't here: the forms can remove them, not add them.
export type FieldKey =
  | 'name'
  | 'summary'
  | 'category'
  | 'offerings'
  | 'highlights'
  | 'town'
  | 'area'
  | 'address'
  | 'serviceArea'
  | 'hours'
  | 'whatsapp'
  | 'phone'
  | 'email'
  | 'instagram'
  | 'bookingUrl'
  | 'colours'
  | 'visualStyle'
  | 'promise'
  | 'feeling'
  | 'moments'
  | 'placeSymbols'
  | 'senses'
  | 'tone'
  | 'searchTerms';

export type MissingField = { field: FieldKey; section: SectionId };

type Sourced = { value?: string } | null | undefined;

const blank = (value: unknown): boolean => typeof value !== 'string' || value.trim() === '';
const noValue = (field: Sourced): boolean => blank(field?.value);
const noItems = (list: readonly unknown[] | undefined): boolean => !list || list.length === 0;

// In the panel's order (docs/specs/brand/brand-panel, "The panel"), with how
// each one is found empty.
const FIELDS: { field: FieldKey; section: SectionId; empty: (p: Profile) => boolean }[] = [
  { field: 'name', section: 'business', empty: (p) => noValue(p.name) },
  { field: 'summary', section: 'business', empty: (p) => noValue(p.summary) },
  { field: 'category', section: 'business', empty: (p) => blank(p.category) },
  { field: 'offerings', section: 'business', empty: (p) => noItems(p.offerings) },
  { field: 'highlights', section: 'business', empty: (p) => noItems(p.highlights) },
  { field: 'town', section: 'place', empty: (p) => noValue(p.location.town) },
  { field: 'area', section: 'place', empty: (p) => noValue(p.location.area) },
  { field: 'address', section: 'place', empty: (p) => noValue(p.location.address) },
  { field: 'serviceArea', section: 'place', empty: (p) => noValue(p.location.serviceArea) },
  { field: 'hours', section: 'place', empty: (p) => noValue(p.hours) },
  { field: 'whatsapp', section: 'contact', empty: (p) => noValue(p.contact.whatsapp) },
  { field: 'phone', section: 'contact', empty: (p) => noValue(p.contact.phone) },
  { field: 'email', section: 'contact', empty: (p) => noValue(p.contact.email) },
  { field: 'instagram', section: 'contact', empty: (p) => noValue(p.contact.instagram) },
  { field: 'bookingUrl', section: 'contact', empty: (p) => noValue(p.contact.bookingUrl) },
  { field: 'colours', section: 'look', empty: (p) => noItems(p.colours) },
  { field: 'visualStyle', section: 'look', empty: (p) => p.visualStyle === null },
  { field: 'promise', section: 'feeling', empty: (p) => noValue(p.essence.promise) },
  { field: 'feeling', section: 'feeling', empty: (p) => noItems(p.essence.feeling) },
  { field: 'moments', section: 'feeling', empty: (p) => noItems(p.essence.moments) },
  { field: 'placeSymbols', section: 'feeling', empty: (p) => noItems(p.essence.placeSymbols) },
  { field: 'senses', section: 'feeling', empty: (p) => noItems(p.essence.senses) },
  { field: 'searchTerms', section: 'feeling', empty: (p) => noItems(p.essence.searchTerms) },
  { field: 'tone', section: 'feeling', empty: (p) => noItems(p.tone) },
];

// Asked for by their own warnings, so counted but never a button.
const WARNED: FieldKey[] = ['whatsapp', 'town'];
// Filled by the essence search: not missing until it has ended.
const SEARCHED: FieldKey[] = ['moments', 'placeSymbols', 'searchTerms'];

export function missingFields(
  profile: Profile,
  search: SearchState,
): { listed: MissingField[]; count: number } {
  const empty = FIELDS.filter(
    ({ field, empty }) => empty(profile) && !(search === 'running' && SEARCHED.includes(field)),
  );
  return {
    listed: empty
      .filter(({ field }) => !WARNED.includes(field))
      .map(({ field, section }) => ({ field, section })),
    count: empty.length,
  };
}

// How many a section lacks: its buttons, and its warned fields.
export function missingIn(listed: MissingField[], section: SectionId, profile: Profile): number {
  const warned = FIELDS.filter(
    ({ field, section: s, empty }) => s === section && WARNED.includes(field) && empty(profile),
  );
  return listed.filter((m) => m.section === section).length + warned.length;
}

const join = (parts: (string | undefined)[], separator: string): string | null => {
  const kept = parts.filter((part): part is string => !blank(part));
  return kept.length > 0 ? kept.join(separator) : null;
};

// One line under each collapsed section; null when there's nothing to say.
export function sectionSummary(
  profile: Profile,
  section: Exclude<SectionId, 'business'>,
): string | null {
  switch (section) {
    case 'place':
      return join([profile.location.town?.value, profile.hours?.value], ', ');
    case 'contact': {
      const { whatsapp, phone, email, instagram } = profile.contact;
      return join([[whatsapp, phone, email, instagram].find((f) => !noValue(f))?.value], '');
    }
    case 'look':
      return join([profile.visualStyle?.summary], '');
    case 'feeling':
      return join(
        [join(profile.essence.feeling, ', ') ?? '', join(profile.tone, ', ') ?? ''],
        '. ',
      );
  }
}
