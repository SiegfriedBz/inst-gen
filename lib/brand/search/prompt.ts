import { z } from 'zod';
import type { SearchResult } from '@/lib/search/search-tool';
import type { SearchBody } from './queries';

// The model step of the essence search (docs/specs/brand/search-essence,
// "The model step"). Bump the version with every change to the prompt, so a
// verdict in the journal traces back to it.
export const SEARCH_PROMPT_VERSION = 'search-2';

// What the model fills in. It has no limits: code trims the answer
// (lib/brand/search/checks.ts), never refuses it.
export const searchModelAnswerSchema = z.object({
  searchTerms: z.array(z.string()),
  moments: z.array(z.object({ value: z.string(), source: z.string() })),
  placeSymbols: z.array(z.string()),
});

export type SearchModelAnswer = z.infer<typeof searchModelAnswerSchema>;

export function searchPrompt(): string {
  return `You help an app write Instagram posts for a small local business. You get its trade, its town, what the app already knows of its essence, and web search results about that trade and town. Add what people look for there, in three lists.

Rules:
1. Add, never repeat: leave out anything the essence already holds, in any wording.
2. Write in English, whatever the language of the results.
3. Never name a business, a brand or a person, and never describe people. Many results are about one business: leave its name out, even inside a longer phrase.
4. Use only what the results show; leave a list empty rather than guess.

Lists:
- searchTerms: up to 8 phrases a visitor would type into a search engine to find this trade in this town (for a massage in Da Nang: "hotel massage da nang", "massage after surfing my khe"). Lower case, at most 6 words each, no hashtags, and no business names: "karsa spa ubud" is a name, "spa ubud" is not.
- moments: up to 3 short moments when people need this trade here, a few words each, as a result says them (after hiking Ba Na Hills, after a day of surfing at Echo Beach). Keep the capital letters of place names. Each names the URL of the result it came from, which must be one of the result URLs given.
- placeSymbols: up to 2 things this town or area is known for, tied to the trade, that an image can show, and that the essence doesn't already have. Never a symbol of another town, even a famous one nearby: lanterns belong to Hoi An, not Da Nang.`;
}

export function searchUserText(body: SearchBody, results: SearchResult[]): string {
  const place = [body.area, body.town].filter(Boolean).join(', ');
  const essence = [
    `Feeling: ${body.essence.feeling.join(', ')}`,
    `Place symbols: ${body.essence.placeSymbols.join(', ')}`,
    `Senses: ${body.essence.senses.join(', ')}`,
    `Moments: ${body.essence.moments.join('; ')}`,
    `Search terms: ${body.essence.searchTerms.join('; ')}`,
  ].join('\n');
  const found = results.map((r) => `### Result: ${r.url}\n${r.title}\n${r.content}`).join('\n\n');
  return `Trade: ${body.category}\nPlace: ${place}\n\n### Essence so far\n${essence}\n\n${found}`;
}
