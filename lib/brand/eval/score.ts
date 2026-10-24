import { z } from 'zod';
import type { PageTexts } from '../checks';
import { hexToRgb } from '../extract/colours';
import type { Profile } from '../profile';

// Scores a brand profile against what a saved site really says
// (spec, "The eval"). A fixture passes when every check passes.

export const expectedSchema = z.object({
  acceptedNames: z.array(z.string().min(1)).min(1),
  whatsapp: z.string().nullable(),
  town: z.string().min(1).nullable(),
  summaryKeywords: z.array(z.string().min(1)),
  offerings: z.array(z.string().min(1)),
  brandColours: z.array(z.string().regex(/^#[0-9a-f]{6}$/)),
  thin: z.boolean(),
});

export type Expected = z.infer<typeof expectedSchema>;

export const OFFERINGS_RECALL = 0.7;
export const COLOUR_DISTANCE = 60;

export function normaliseText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

const looseMatch = (a: string, b: string) => {
  const [x, y] = [normaliseText(a), normaliseText(b)];
  return x.length > 0 && y.length > 0 && (x.includes(y) || y.includes(x));
};

const digits = (value: string) => value.replace(/\D/g, '');
const joinNumbers = (text: string) => text.replace(/(\d)[\s.,\-()/]+(?=\d)/g, '$1');

function colourDistance(a: string, b: string): number {
  const [x, y] = [hexToRgb(a), hexToRgb(b)];
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
}

export function scoreFixture(
  profile: Profile,
  expected: Expected,
  pages: PageTexts,
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];
  const page = (source: string) => pages.get(source) ?? '';

  // A thin site has no real name, town or summary to score: only the thin flag
  // and that nothing was invented count.
  const full = !expected.thin;

  const name = normaliseText(profile.name.value);
  if (full && !expected.acceptedNames.some((n) => normaliseText(n) === name)) failures.push('name');

  const whatsapp = profile.contact.whatsapp?.value ?? null;
  const whatsappRight =
    expected.whatsapp === null
      ? whatsapp === null
      : whatsapp !== null && digits(whatsapp) === digits(expected.whatsapp);
  if (!whatsappRight) failures.push('whatsapp');

  const town = profile.location.town?.value;
  if (full && expected.town !== null && (!town || !looseMatch(town, expected.town))) {
    failures.push('town');
  }

  const summary = normaliseText(profile.summary?.value ?? '');
  if (
    full &&
    expected.summaryKeywords.length > 0 &&
    !expected.summaryKeywords.some((k) => summary.includes(normaliseText(k)))
  ) {
    failures.push('summary');
  }

  if (full && expected.offerings.length > 0) {
    const found = expected.offerings.filter((e) =>
      profile.offerings.some((o) => looseMatch(o.name, e)),
    );
    if (found.length / expected.offerings.length < OFFERINGS_RECALL) {
      failures.push('offerings_recall');
    }
  }
  if (
    profile.offerings.some((o) => !normaliseText(page(o.source)).includes(normaliseText(o.name)))
  ) {
    failures.push('offerings_invented');
  }

  const priceShown = (price: string, source: string) => {
    const [longest] = (joinNumbers(price).match(/\d+/g) ?? []).sort((a, b) => b.length - a.length);
    return longest !== undefined && joinNumbers(page(source)).includes(longest);
  };
  if (profile.offerings.some((o) => o.price && !priceShown(o.price, o.source))) {
    failures.push('prices');
  }

  if (
    full &&
    expected.brandColours.length > 0 &&
    !profile.colours.some((c) =>
      expected.brandColours.some((e) => colourDistance(c.hex, e) <= COLOUR_DISTANCE),
    )
  ) {
    failures.push('colour');
  }

  if (profile.thin !== expected.thin) failures.push('thin');

  return { pass: failures.length === 0, failures };
}
