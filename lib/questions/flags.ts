import { PRICE_PATTERN } from '@/lib/posts/checks';
import type { AnswerFlag, QuestionBody } from './question';

// The check lines the owner sees under an answer
// (docs/specs/questions/answer-drafts, "Checks the owner sees"): a price, a
// duration or a phone number the business's details don't hold. Nothing is
// removed: the owner checks it.

const PRICE = new RegExp(PRICE_PATTERN.source, 'giu');
const NUMBER = /\d[\d.,]*\s?[kK]?\b/g;
const DURATION = /(\d+(?:[.,]\d+)?)\s?(minutes?|mins?|hours?|hrs?|h)\b/gi;
const PHONE = /\+?\d[\d\s().-]*\d/g;
const PHONE_DIGITS = 8;

// 250k → 250000, 350.000đ → 350000, as the posts' price check reads them.
function amount(text: string): number {
  const digits = text.match(/\d[\d.,]*/)?.[0].replace(/[.,]$/, '') ?? '';
  const last = Math.max(digits.lastIndexOf('.'), digits.lastIndexOf(','));
  const value =
    last === -1 || digits.length - last - 1 === 3
      ? Number(digits.replace(/[.,]/g, ''))
      : Number(digits.replace(/[.,]/g, (_sep, i) => (i === last ? '.' : '')));
  const end = text.trim();
  if (/(?:jt|juta)$/i.test(end)) return value * 1_000_000;
  return /(?:k|rb|ribu)$/i.test(end) ? value * 1000 : value;
}

function minutes(value: string, unit: string): number {
  const n = Number(value.replace(',', '.'));
  return unit.toLowerCase().startsWith('h') ? n * 60 : n;
}

export function answerFlags(text: string, business: QuestionBody['business']): AnswerFlag[] {
  const prices = new Set(
    business.offerings.flatMap((o) => o.price?.match(NUMBER) ?? []).map((p) => amount(p)),
  );
  const durations = new Set(
    [...business.offerings.map((o) => o.duration ?? ''), ...business.highlights].flatMap((t) =>
      [...t.matchAll(DURATION)].map((m) => minutes(m[1], m[2])),
    ),
  );
  const own = [business.contact.whatsapp, business.contact.phone].flatMap((p) =>
    p ? [p.replace(/\D/g, '')] : [],
  );
  const flags: AnswerFlag[] = [];
  for (const match of text.match(PRICE) ?? []) {
    const price = match.trim().replace(/[.,]$/, '');
    if (!prices.has(amount(price))) flags.push({ kind: 'price', text: price });
  }
  for (const match of text.matchAll(DURATION)) {
    if (!durations.has(minutes(match[1], match[2]))) {
      flags.push({ kind: 'duration', text: match[0].trim() });
    }
  }
  for (const match of text.match(PHONE) ?? []) {
    const digits = match.replace(/\D/g, '');
    if (digits.length < PHONE_DIGITS) continue;
    if (!own.some((n) => n.endsWith(digits) || digits.endsWith(n))) {
      flags.push({ kind: 'number', text: match.trim() });
    }
  }
  return flags;
}
