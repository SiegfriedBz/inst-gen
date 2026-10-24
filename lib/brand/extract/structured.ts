import * as cheerio from 'cheerio';

// Facts read in code, deterministically, before any model call: JSON-LD,
// meta tags and contact links. Every value is a string as the page wrote it.

export const BUSINESS_TYPES = [
  'LocalBusiness',
  'DaySpa',
  'HealthAndBeautyBusiness',
  'BeautySalon',
  'HairSalon',
  'NailSalon',
  'TattooParlor',
  'SportsActivityLocation',
  'HealthClub',
  'MedicalBusiness',
  'Restaurant',
  'CafeOrCoffeeShop',
  'Bakery',
  'BarOrPub',
  'FoodEstablishment',
  'LodgingBusiness',
  'Hotel',
  'Hostel',
  'BedAndBreakfast',
  'Resort',
  'Campground',
  'TravelAgency',
  'TouristTrip',
  'TouristAttraction',
  'Store',
  'ClothingStore',
  'GiftShop',
  'JewelryStore',
  'Organization',
] as const;

export type Address = { street?: string; town?: string; region?: string; country?: string };

export type Business = {
  name?: string;
  address?: Address;
  areaServed?: string;
  telephone?: string;
  email?: string;
  hours?: string;
  priceRange?: string;
  offers: { name: string; price?: string }[];
  sameAs: string[];
  logo?: string;
};

export type CodeFacts = {
  business: Business | null;
  meta: {
    siteName?: string;
    title?: string;
    ogTitle?: string;
    description?: string;
    ogImage?: string;
    themeColor?: string;
  };
  contact: { whatsapp: string[]; phone: string[]; email: string[]; instagram: string[] };
  source: string;
};

type Json = Record<string, unknown>;

const isObject = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asArray = (value: unknown): unknown[] =>
  value === undefined || value === null ? [] : Array.isArray(value) ? value : [value];

function str(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || undefined;
}

// Flattens arrays and @graph into a list of objects.
function nodes(value: unknown): Json[] {
  return asArray(value).flatMap((item) => {
    if (!isObject(item)) return [];
    return [item, ...nodes(item['@graph'])];
  });
}

function typesOf(node: Json): string[] {
  return asArray(node['@type'])
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.replace(/^https?:\/\/schema\.org\//, ''));
}

const isBusiness = (node: Json) =>
  typesOf(node).some((t) => (BUSINESS_TYPES as readonly string[]).includes(t));

function nameOf(value: unknown): string | undefined {
  return str(value) ?? (isObject(value) ? str(value.name) : undefined);
}

function urlOf(value: unknown, base: URL): string | undefined {
  const raw =
    str(value) ?? (isObject(value) ? (str(value.url) ?? str(value.contentUrl)) : undefined);
  if (!raw) return undefined;
  try {
    return new URL(raw, base).href;
  } catch {
    return undefined;
  }
}

function address(value: unknown): Address | undefined {
  const first = asArray(value)[0];
  if (typeof first === 'string') return str(first) ? { street: str(first) } : undefined;
  if (!isObject(first)) return undefined;
  const result: Address = {
    street: str(first.streetAddress),
    town: str(first.addressLocality),
    region: str(first.addressRegion),
    country: nameOf(first.addressCountry),
  };
  const kept = Object.fromEntries(Object.entries(result).filter(([, v]) => v !== undefined));
  return Object.keys(kept).length > 0 ? kept : undefined;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHORT = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

function dayRange(days: unknown): string {
  const indexes = asArray(days)
    .map((d) => DAYS.indexOf(String(d).replace(/^https?:\/\/schema\.org\//, '')))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);
  if (indexes.length === 0) return '';
  const consecutive = indexes.every((d, i) => i === 0 || d === indexes[i - 1] + 1);
  if (consecutive && indexes.length > 2) {
    return `${SHORT[indexes[0]]}-${SHORT[indexes[indexes.length - 1]]}`;
  }
  return indexes.map((i) => SHORT[i]).join(',');
}

function hours(node: Json): string | undefined {
  const written = asArray(node.openingHours).map(str).filter(Boolean);
  if (written.length > 0) return written.join('; ');
  const specs = asArray(node.openingHoursSpecification)
    .filter(isObject)
    .map((spec) => {
      const days = dayRange(spec.dayOfWeek);
      const time = [str(spec.opens), str(spec.closes)].filter(Boolean).join('-');
      return [days, time].filter(Boolean).join(' ');
    })
    .filter(Boolean);
  return specs.length > 0 ? specs.join('; ') : undefined;
}

function offerOf(value: unknown): { name: string; price?: string } | undefined {
  if (!isObject(value)) return undefined;
  const name = nameOf(value.itemOffered) ?? str(value.name);
  if (!name) return undefined;
  const amount = str(value.price);
  const currency = str(value.priceCurrency);
  const price = amount ? [currency, amount].filter(Boolean).join(' ') : undefined;
  return price ? { name, price } : { name };
}

function offers(node: Json): { name: string; price?: string }[] {
  const catalog = asArray(node.hasOfferCatalog).flatMap((c) =>
    isObject(c) ? asArray(c.itemListElement) : [],
  );
  return [...asArray(node.makesOffer), ...asArray(node.offers), ...catalog]
    .map(offerOf)
    .filter((o): o is { name: string; price?: string } => o !== undefined);
}

function business(node: Json, base: URL): Business {
  return {
    name: str(node.name),
    address: address(node.address),
    areaServed: asArray(node.areaServed).map(nameOf).filter(Boolean).join(', ') || undefined,
    telephone: str(node.telephone),
    email: str(node.email)
      ?.replace(/^mailto:/i, '')
      .toLowerCase(),
    hours: hours(node),
    priceRange: str(node.priceRange),
    offers: offers(node),
    sameAs: asArray(node.sameAs)
      .map((s) => urlOf(s, base))
      .filter((s): s is string => s !== undefined),
    logo: urlOf(node.logo, base) ?? urlOf(node.image, base),
  };
}

function jsonLdBusiness($: cheerio.CheerioAPI, base: URL): Business | null {
  for (const el of $('script[type="application/ld+json"]').toArray()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).text());
    } catch {
      continue;
    }
    const found = nodes(parsed).find(isBusiness);
    if (found) return business(found, base);
  }
  return null;
}

const INSTAGRAM_RESERVED = new Set(['p', 'reel', 'reels', 'tv', 'stories', 'explore', 'accounts']);
const INSTAGRAM_HANDLE = /^[a-z0-9._]{1,30}$/;

// The profile handle in an instagram.com link. A doubled link
// (instagram.com/https://www.instagram.com/<handle>) gives its last segment.
export function instagramHandle(url: URL): string | undefined {
  const segments = url.pathname.split('/').filter(Boolean);
  const doubled = segments[0]?.startsWith('http');
  const handle = (doubled ? segments.at(-1) : segments[0])?.toLowerCase();
  if (!handle || INSTAGRAM_RESERVED.has(handle) || !INSTAGRAM_HANDLE.test(handle)) return undefined;
  return handle;
}

// A phone number next to the word WhatsApp (within 25 characters, with no
// other digits between), as in "WhatsApp: +62 811-3888-472" or
// "+84 358 358 353 Phone · WhatsApp · Zalo".
const NUMBER = String.raw`\+?\d[\d\s().-]{6,}\d`;
const WHATSAPP_IN_TEXT = new RegExp(
  String.raw`(${NUMBER})[^\d+]{0,25}?whats\s?app|whats\s?app[^\d+]{0,25}?(${NUMBER})`,
  'gi',
);

function whatsappInText(text: string): string[] {
  return [...text.matchAll(WHATSAPP_IN_TEXT)]
    .map((match) => (match[1] ?? match[2]).replace(/\D/g, ''))
    .filter((digits) => digits.length >= 8);
}

function contactLinks($: cheerio.CheerioAPI): CodeFacts['contact'] {
  const contact = {
    whatsapp: [] as string[],
    phone: [] as string[],
    email: [] as string[],
    instagram: [] as string[],
  };
  const add = (list: string[], value: string | undefined) => {
    if (value && !list.includes(value)) list.push(value);
  };
  for (const el of $('a[href]').toArray()) {
    const href = ($(el).attr('href') ?? '').trim();
    let url: URL;
    try {
      url = new URL(href, 'https://placeholder.invalid/');
    } catch {
      continue;
    }
    const digits = (value: string | null) => {
      const d = decodeURIComponent(value ?? '').replace(/\D/g, '');
      return d.length >= 6 ? d : undefined;
    };
    if (url.protocol === 'tel:') {
      add(contact.phone, decodeURIComponent(href.replace(/^tel:/i, '')).trim() || undefined);
    } else if (url.protocol === 'mailto:') {
      add(contact.email, decodeURIComponent(url.pathname).toLowerCase() || undefined);
    } else if (url.protocol === 'whatsapp:') {
      add(contact.whatsapp, digits(url.searchParams.get('phone')));
    } else if (url.hostname === 'wa.me') {
      add(contact.whatsapp, digits(url.pathname.split('/')[1] ?? ''));
    } else if (url.hostname.endsWith('whatsapp.com')) {
      add(contact.whatsapp, digits(url.searchParams.get('phone')));
    } else if (url.hostname.replace(/^www\./, '') === 'instagram.com') {
      add(contact.instagram, instagramHandle(url));
    }
  }
  const text = $('body').text().replace(/\s+/g, ' ');
  for (const digits of whatsappInText(text)) add(contact.whatsapp, digits);
  return contact;
}

function metaTags($: cheerio.CheerioAPI, base: URL): CodeFacts['meta'] {
  const meta = (selector: string) => str($(selector).first().attr('content'));
  const ogImage = meta('meta[property="og:image"]');
  const result: CodeFacts['meta'] = {
    siteName: meta('meta[property="og:site_name"]'),
    title: str($('title').first().text()),
    ogTitle: meta('meta[property="og:title"]'),
    description: meta('meta[property="og:description"]') ?? meta('meta[name="description"]'),
    ogImage: ogImage ? urlOf(ogImage, base) : undefined,
    themeColor: meta('meta[name="theme-color"]'),
  };
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== undefined),
  ) as CodeFacts['meta'];
}

export function extractStructured(html: string, pageUrl: URL): CodeFacts {
  const $ = cheerio.load(html);
  return {
    business: jsonLdBusiness($, pageUrl),
    meta: metaTags($, pageUrl),
    contact: contactLinks($),
    source: pageUrl.href,
  };
}
