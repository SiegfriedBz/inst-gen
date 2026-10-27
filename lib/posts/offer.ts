import { z } from 'zod';
import { LIMITS, type Profile } from '@/lib/brand/profile';

// Today's special offer (docs/specs/posts/special-offer): a percentage off,
// or a free treatment with a paid one, always on 90-minute sessions or
// longer, until a day on the phone's calendar. The owner's answers are taps,
// never free text, so no money amount can reach a caption.

export const OFFER_LIMITS = { percentMin: 1, percentMax: 90, minutes: 90 } as const;

export type OfferLength = 'today' | '3days' | '1week';
const LENGTH_DAYS: Record<OfferLength, number> = { today: 0, '3days': 2, '1week': 6 };

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// The day as the model reads it: "Tuesday 28 October". Written from fixed
// names, not the device's date formatting, so the phone and the server
// always agree on it.
export function englishDay(until: string): string {
  const [y, m, d] = until.split('-').map(Number);
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]} ${d} ${MONTH_NAMES[m - 1]}`;
}

const name = z.string().trim().min(1);
const shared = {
  treatments: z.array(name).min(1).max(LIMITS.offerings),
  until: z.iso.date(),
  lastDay: z.string(),
};

export const offerSchema = z
  .discriminatedUnion('kind', [
    z.object({
      kind: z.literal('discount'),
      percent: z.number().int().min(OFFER_LIMITS.percentMin).max(OFFER_LIMITS.percentMax),
      ...shared,
    }),
    z.object({ kind: z.literal('freeExtra'), gift: name, ...shared }),
  ])
  .refine((offer) => offer.lastDay === englishDay(offer.until), {
    message: 'lastDay must be the until date in English',
    path: ['lastDay'],
  });
export type Offer = z.infer<typeof offerSchema>;

// What the sheet holds, kept so it reopens on the owner's answers.
export type OfferAnswers = {
  kind: 'discount' | 'freeExtra';
  percent: number;
  gift: string | null;
  treatments: string[];
  length: OfferLength;
};

export const DEFAULT_ANSWERS: OfferAnswers = {
  kind: 'discount',
  percent: 10,
  gift: null,
  treatments: [],
  length: 'today',
};

// The last day from the phone's own calendar: "Today" ends today.
export function offerUntil(today: Date, length: OfferLength): string {
  const end = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + LENGTH_DAYS[length],
  );
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
}

// Past midnight at the end of its last day, on the phone's clock.
export function isOver(offer: Offer, now: Date): boolean {
  return offerUntil(now, 'today') > offer.until;
}

export function toOffer(answers: OfferAnswers, today: Date): Offer | null {
  const until = offerUntil(today, answers.length);
  const base = { treatments: answers.treatments, until, lastDay: englishDay(until) };
  const offer =
    answers.kind === 'discount'
      ? { kind: 'discount' as const, percent: answers.percent, ...base }
      : {
          kind: 'freeExtra' as const,
          gift: answers.gift ?? '',
          ...base,
          // The gift is never one of the paid treatments.
          treatments: answers.treatments.filter((t) => t !== answers.gift),
        };
  const parsed = offerSchema.safeParse(offer);
  return parsed.success ? parsed.data : null;
}

function names(profile: Profile): Set<string> {
  return new Set(profile.offerings.map((o) => o.name));
}

export function offerFits(offer: Offer, profile: Profile): boolean {
  const known = names(profile);
  return (
    offer.treatments.every((t) => known.has(t)) &&
    (offer.kind !== 'freeExtra' || known.has(offer.gift))
  );
}

// A treatment renamed or removed since the offer was set leaves it; with no
// treatment or no gift left, there is no offer.
export function pruneOffer(offer: Offer, profile: Profile): Offer | null {
  const known = names(profile);
  const treatments = offer.treatments.filter((t) => known.has(t));
  if (treatments.length === 0) return null;
  if (offer.kind === 'freeExtra' && !known.has(offer.gift)) return null;
  return { ...offer, treatments };
}

export const PERCENT = /(\d{1,3})\s?%/g;

// The caption names the last day: its number with its month, in either
// order, full or short ("28 Oct", "October 28th", "the 28th of October").
export function mentionsDay(caption: string, until: string): boolean {
  const [, m, d] = until.split('-').map(Number);
  const full = MONTH_NAMES[m - 1].toLowerCase();
  const month = `(?:${full}|${full.slice(0, 3)})\\.?`;
  const day = `(?<!\\d)${d}(?:st|nd|rd|th)?(?!\\d)`;
  return new RegExp(`${day}\\s+(?:of\\s+)?${month}\\b|\\b${month}\\s+${day}`, 'i').test(caption);
}
