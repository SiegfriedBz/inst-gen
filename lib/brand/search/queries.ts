import { z } from 'zod';
import type { SearchOptions } from '@/lib/search/search-tool';

// What the browser sends for the essence search, and the three queries built
// from it (docs/specs/brand/search-essence, "The request" and "The queries").
// The body holds the trade and the place only: never the business's name.

const text = z.string().trim().min(1);

export const searchBodySchema = z
  .object({
    siteUrl: z.url(),
    category: text,
    town: text,
    area: z.string().nullable(),
    serviceArea: z.string().nullable(),
    country: z.enum(['VN', 'ID']).nullable(),
    essence: z.object({
      feeling: z.array(z.string()),
      placeSymbols: z.array(z.string()),
      senses: z.array(z.string()),
      moments: z.array(z.string()),
      searchTerms: z.array(z.string()),
    }),
  })
  .strict();

export type SearchBody = z.infer<typeof searchBodySchema>;

// "Pererenan (Batu Bolong, Echo Beach); Seminyak" → "Pererenan".
function firstArea(serviceArea: string | null): string | null {
  const first = serviceArea?.split(/[(;,]/)[0]?.trim();
  return first || null;
}

// One on the trade in the town, one on why visitors come there (where moments
// come from), one on the trade near the area. None aims at reviews: their
// pages carry reviewers' names (decision 0003).
export function buildQueries(body: SearchBody): [string, string, string] {
  const area = body.area?.trim() || firstArea(body.serviceArea);
  const near = area && area !== body.town ? `${area} ${body.town}` : body.town;
  return [
    `${body.category} ${body.town}`,
    `things to do in ${body.town}`,
    `${body.category} near ${near}`,
  ];
}

const COUNTRIES = { VN: 'vietnam', ID: 'indonesia' } as const;

export function searchOptions(body: SearchBody): SearchOptions {
  const host = new URL(body.siteUrl).hostname.replace(/^www\./, '');
  return {
    country: body.country ? COUNTRIES[body.country] : null,
    excludeDomains: [host],
  };
}
