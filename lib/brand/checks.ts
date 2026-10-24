import type { CodeColour } from './extract/colours';
import { type CodeFacts, instagramHandle } from './extract/structured';
import { normaliseText } from './normalise';
import { phoneDigitVariants, toE164 } from './phone';
import {
  type DeepPartial,
  LIMITS,
  type ModelProfile,
  type PartialProfile,
  type Profile,
  profileSchema,
} from './profile';

// Merges what code found with what the model streams, and keeps only what
// the pages read can back up (spec, "Checks after the model call"). Pure, so
// it runs on every partial and on the final.

export type PageTexts = Map<string, string>;
export type Dropped = { field: string; reason: string };
type Sourced = { value: string; source: string };

const MODEL = 'model';

function pageKey(url: URL): string {
  return `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/+$/, '')}`;
}

// The entry of pagesRead a source points at, or null. Relative paths, a
// trailing slash, www. and the query don't matter.
export function normaliseSource(source: string, pagesRead: string[]): string | null {
  if (source === MODEL) return MODEL;
  if (pagesRead.length === 0) return null;
  let url: URL;
  try {
    url = new URL(source, pagesRead[0]);
  } catch {
    return null;
  }
  const key = pageKey(url);
  return pagesRead.find((page) => pageKey(new URL(page)) === key) ?? null;
}

// Removes separators inside numbers, so "450.000", "450,000" and
// "0905 123 456" read as runs of digits.
function joinNumbers(text: string): string {
  return text.replace(/(\d)[\s.,\-()/]+(?=\d)/g, '$1');
}

function digitsOnPage(digits: string[], page: string | undefined): boolean {
  if (!page) return false;
  const joined = joinNumbers(page);
  return digits.some((d) => d.length > 0 && joined.includes(d));
}

// A price counts as shown when its longest run of digits is on the page.
function priceOnPage(price: string, page: string | undefined): boolean {
  const [longest] = (joinNumbers(price).match(/\d+/g) ?? []).sort((a, b) => b.length - a.length);
  return longest !== undefined && digitsOnPage([longest], page);
}

function cutName(value: string | undefined): string | undefined {
  const cut = value?.split(/\s+[|–-]\s+|\s*\|\s*/)[0]?.trim();
  return cut || undefined;
}

function countryHint(facts: CodeFacts[]): string | undefined {
  return facts.find((f) => f.business?.address?.country)?.business?.address?.country;
}

function codeName(facts: CodeFacts[]): Sourced | null {
  const ld = facts.find((f) => f.business?.name);
  if (ld?.business?.name) return { value: ld.business.name, source: ld.source };
  const site = facts.find((f) => f.meta.siteName);
  const fromSite = cutName(site?.meta.siteName);
  if (site && fromSite) return { value: fromSite, source: site.source };
  const titled = facts.find((f) => f.meta.title);
  const fromTitle = cutName(titled?.meta.title);
  if (titled && fromTitle) return { value: fromTitle, source: titled.source };
  return null;
}

function first<T>(
  facts: CodeFacts[],
  pick: (f: CodeFacts) => T | undefined,
): { value: T; source: string } | null {
  for (const f of facts) {
    const value = pick(f);
    if (value !== undefined) return { value, source: f.source };
  }
  return null;
}

function e164(fact: { value: string; source: string } | null, hint?: string): Sourced | null {
  if (!fact) return null;
  const value = toE164(fact.value, hint);
  return value ? { value, source: fact.source } : null;
}

function instagramFromSameAs(sameAs: string[]): string | undefined {
  for (const link of sameAs) {
    try {
      const url = new URL(link);
      if (url.hostname.replace(/^www\./, '') !== 'instagram.com') continue;
      const handle = instagramHandle(url);
      if (handle) return handle;
    } catch {}
  }
  return undefined;
}

export function codeProfile(
  facts: CodeFacts[],
  extra: {
    siteUrl: string;
    pagesRead: string[];
    colours: CodeColour[];
    logoUrl: Sourced | null;
    photoUrls: string[];
  },
): PartialProfile {
  const hint = countryHint(facts);
  const address = first(facts, (f) => f.business?.address);
  const sourcedFrom = <T>(found: { value: T | undefined; source: string } | null) =>
    found && found.value !== undefined ? { value: found.value, source: found.source } : null;
  return {
    siteUrl: extra.siteUrl,
    pagesRead: extra.pagesRead,
    name: codeName(facts) ?? undefined,
    location: {
      town: sourcedFrom(address && { value: address.value.town, source: address.source }),
      area: sourcedFrom(address && { value: address.value.region, source: address.source }),
      address: sourcedFrom(address && { value: address.value.street, source: address.source }),
      serviceArea: first(facts, (f) => f.business?.areaServed),
    },
    contact: {
      whatsapp: e164(
        first(facts, (f) => (f.contact.whatsapp[0] ? `+${f.contact.whatsapp[0]}` : undefined)),
        hint,
      ),
      phone: e164(
        first(facts, (f) => f.business?.telephone ?? f.contact.phone[0]),
        hint,
      ),
      email: first(facts, (f) => f.business?.email ?? f.contact.email[0]),
      instagram: first(
        facts,
        (f) => f.contact.instagram[0] ?? instagramFromSameAs(f.business?.sameAs ?? []),
      ),
      bookingUrl: null,
    },
    hours: first(facts, (f) => f.business?.hours),
    colours: extra.colours,
    logoUrl: extra.logoUrl,
    photoUrls: extra.photoUrls,
  };
}

type Ctx = { facts: CodeFacts[]; pages: PageTexts; pagesRead: string[]; photos: number };

type Check = 'phone' | 'email' | 'none';

const firstWords = (value: string, max: number) =>
  value.trim().split(/\s+/).slice(0, max).join(' ');

// No photos, no style; a style summary is cut to its word limit.
function visualStyleOf(
  style: DeepPartial<ModelProfile['visualStyle']> | undefined,
  photos: number,
): PartialProfile['visualStyle'] {
  if (style === undefined) return undefined;
  if (style === null || photos === 0) return null;
  return {
    ...style,
    summary: style.summary && firstWords(style.summary, LIMITS.styleSummaryWords),
  };
}

export function mergeAndCheck(
  code: PartialProfile,
  model: DeepPartial<ModelProfile>,
  ctx: Ctx,
): { profile: PartialProfile; dropped: Dropped[] } {
  const dropped: Dropped[] = [];
  const hint = countryHint(ctx.facts);

  // A model fact with a known source, passing its on-page check, or null.
  // Facts still streaming (no source yet) are left out without a note.
  function checked(
    field: string,
    fact: DeepPartial<Sourced> | null | undefined,
    check: Check = 'none',
  ): Sourced | null {
    if (!fact?.value || !fact.source) return null;
    const source = normaliseSource(fact.source, ctx.pagesRead);
    if (!source || source === MODEL) {
      dropped.push({ field, reason: 'unknown_source' });
      return null;
    }
    const page = ctx.pages.get(source);
    if (check === 'phone' && !digitsOnPage(phoneDigitVariants(fact.value), page)) {
      dropped.push({ field, reason: 'not_on_page' });
      return null;
    }
    if (check === 'email' && !page?.toLowerCase().includes(fact.value.toLowerCase())) {
      dropped.push({ field, reason: 'not_on_page' });
      return null;
    }
    return { value: fact.value, source };
  }

  const trimmedSummary = (fact: Sourced | null) =>
    fact ? { value: firstWords(fact.value, LIMITS.summaryWords), source: fact.source } : undefined;

  const codeWins = (
    codeFact: DeepPartial<Sourced> | null | undefined,
    modelFact: Sourced | null,
  ) => (codeFact?.value && codeFact.source ? (codeFact as Sourced) : modelFact);

  const phone = (fact: Sourced | null) => {
    if (!fact) return null;
    const value = toE164(fact.value, hint);
    return value ? { value, source: fact.source } : null;
  };

  // The name: the model's, if a page name holds it; otherwise code's.
  let name = code.name;
  const modelName = model.name;
  if (modelName?.value && modelName.source) {
    const source = normaliseSource(modelName.source, ctx.pagesRead);
    const pageFacts = ctx.facts.find((f) => f.source === source);
    const names = [
      pageFacts?.business?.name,
      pageFacts?.meta.siteName,
      pageFacts?.meta.title,
      pageFacts?.meta.ogTitle,
    ];
    const wanted = modelName.value.toLowerCase();
    if (source && names.some((n) => n?.toLowerCase().includes(wanted))) {
      name = { value: modelName.value, source };
    } else {
      dropped.push({ field: 'name', reason: 'not_in_page_names' });
    }
  }

  const offerings = (model.offerings ?? []).flatMap((offering, i) => {
    if (!offering?.name || !offering.source) return [];
    const source = normaliseSource(offering.source, ctx.pagesRead);
    if (!source || source === MODEL) {
      dropped.push({ field: `offerings[${i}]`, reason: 'unknown_source' });
      return [];
    }
    const page = normaliseText(ctx.pages.get(source) ?? '');
    if (!page.includes(normaliseText(offering.name))) {
      dropped.push({ field: `offerings[${i}]`, reason: 'not_on_page' });
      return [];
    }
    const kept = { ...offering, source };
    if (offering.price && !priceOnPage(offering.price, ctx.pages.get(source))) {
      dropped.push({ field: `offerings[${i}].price`, reason: 'not_on_page' });
      delete kept.price;
    }
    return [kept];
  });

  const highlights = (model.highlights ?? []).flatMap((h, i) => {
    const kept = checked(`highlights[${i}]`, h);
    return kept ? [kept] : [];
  });

  const words = (list: (string | undefined)[] | undefined, max: number) =>
    (list ?? []).filter((w): w is string => Boolean(w)).slice(0, max);
  const promise = checked('essence.promise', model.essence?.promise);
  const essence = model.essence
    ? {
        promise: promise
          ? { value: firstWords(promise.value, LIMITS.promiseWords), source: promise.source }
          : null,
        feeling: words(model.essence.feeling, LIMITS.feeling),
        placeSymbols: words(model.essence.placeSymbols, LIMITS.placeSymbols),
        senses: words(model.essence.senses, LIMITS.senses),
        moments: (model.essence.moments ?? [])
          .flatMap((moment, i) => {
            const kept = checked(`essence.moments[${i}]`, moment);
            return kept ? [kept] : [];
          })
          .slice(0, LIMITS.moments),
      }
    : undefined;

  const codeColours = code.colours ?? [];
  const colours =
    codeColours.length >= 2
      ? codeColours
      : [
          ...codeColours,
          ...(model.colours ?? [])
            .filter((c) => c?.hex && c.role && /^#[0-9a-f]{6}$/.test(c.hex))
            .filter((c) => !codeColours.some((k) => k?.hex === c?.hex))
            .map((c) => ({ hex: c?.hex, role: c?.role, source: MODEL })),
        ].slice(0, 5);

  const mLoc = model.location ?? {};
  const cLoc = code.location ?? {};
  const mContact = model.contact ?? {};
  const cContact = code.contact ?? {};

  const profile: PartialProfile = {
    ...code,
    name,
    summary: trimmedSummary(checked('summary', model.summary)),
    category: model.category || undefined,
    offerings: offerings.slice(0, LIMITS.offerings),
    highlights: highlights.slice(0, LIMITS.highlights),
    location: {
      // JSON-LD's addressLocality is often a district; the model's town, checked
      // against its page, comes first.
      town:
        checked('location.town', mLoc.town) ?? (cLoc.town?.value ? (cLoc.town as Sourced) : null),
      area: cLoc.area?.value ? cLoc.area : checked('location.area', mLoc.area),
      address: codeWins(cLoc.address, checked('location.address', mLoc.address)),
      // JSON-LD's areaServed holds bare place names; the page text gives the
      // neighbourhoods and the travel rule, so the model's comes first.
      serviceArea:
        checked('location.serviceArea', mLoc.serviceArea) ??
        (cLoc.serviceArea?.value ? (cLoc.serviceArea as Sourced) : null),
    },
    contact: {
      whatsapp: codeWins(
        cContact.whatsapp,
        phone(checked('contact.whatsapp', mContact.whatsapp, 'phone')),
      ),
      phone: codeWins(cContact.phone, phone(checked('contact.phone', mContact.phone, 'phone'))),
      email: codeWins(cContact.email, checked('contact.email', mContact.email, 'email')),
      instagram: codeWins(cContact.instagram, checked('contact.instagram', mContact.instagram)),
      bookingUrl: checked('contact.bookingUrl', mContact.bookingUrl),
    },
    hours: codeWins(code.hours, checked('hours', model.hours)),
    tone: model.tone?.filter((t): t is string => Boolean(t)).slice(0, LIMITS.tone),
    colours,
    essence,
    visualStyle: visualStyleOf(model.visualStyle, ctx.photos),
  };
  return { profile, dropped };
}

// The complete profile, valid against the schema, or a thrown error.
export function finalise(
  profile: PartialProfile,
  meta: { readAt: string; promptVersion: string; thin: boolean; dropped: Dropped[] },
): Profile {
  const loc = profile.location ?? {};
  const contact = profile.contact ?? {};
  return profileSchema.parse({
    ...profile,
    schemaVersion: 1,
    readAt: meta.readAt,
    promptVersion: meta.promptVersion,
    thin: meta.thin,
    dropped: meta.dropped,
    summary: profile.summary ?? null,
    offerings: profile.offerings ?? [],
    highlights: profile.highlights ?? [],
    location: {
      town: loc.town ?? null,
      area: loc.area ?? null,
      address: loc.address ?? null,
      serviceArea: loc.serviceArea ?? null,
    },
    contact: {
      whatsapp: contact.whatsapp ?? null,
      phone: contact.phone ?? null,
      email: contact.email ?? null,
      instagram: contact.instagram ?? null,
      bookingUrl: contact.bookingUrl ?? null,
    },
    hours: profile.hours ?? null,
    logoUrl: profile.logoUrl ?? null,
    photoUrls: profile.photoUrls ?? [],
    essence: {
      promise: profile.essence?.promise ?? null,
      feeling: profile.essence?.feeling ?? [],
      placeSymbols: profile.essence?.placeSymbols ?? [],
      senses: profile.essence?.senses ?? [],
      moments: profile.essence?.moments ?? [],
    },
    visualStyle: profile.visualStyle ?? null,
  });
}
