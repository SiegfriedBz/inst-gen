import type { CodeFacts } from './extract/structured';

// Bump with every change to the prompt, so eval scores trace back to it.
export const BRAND_PROMPT_VERSION = 'brand-4';

export function brandPrompt(): string {
  return `You read a small business's website and describe its brand, for an app that writes its Instagram posts and review replies.

You get the text of a few pages, each headed by its URL, the facts code already found on them, and the site's logo and best photos.

Rules:
1. Use only what the pages and photos show. When something isn't there, leave the field empty rather than guess. Every fact names the URL of the page it came from, and that URL must be one of the page URLs given.
2. Prices only when a page writes them, copied exactly as written, with their currency.
3. The visual style describes the photos' palette, light, textures and mood, for an image model to imitate. Never describe people. Leave it empty when no photos are given.
4. Tone words describe how the site talks (for example calm, warm, playful, professional), not what it sells.
5. The name is the one the business calls itself, without taglines or the town, as one of the pages writes it.
6. Write every field in English, whatever the language of the site.
7. The essence says what the business is really about, where it is, why people come and how they should feel, so its posts and replies sound like someone who understands it. Think beyond the website, which may be poor: start from the trade and the place.

Field notes:
- summary: what they sell and to whom, in at most 25 words.
- category: one or two words, like "massage spa" or "coffee shop".
- offerings: the individual services, products, classes, tours or dishes customers book or buy, up to 20. Copy each name word for word as a page writes it; an offering whose name isn't on its page is thrown away. List items, not categories or menu headings (for example "Aroma Massage", not "Body Massage"; "Amazing Vietnam", not "Classic Itineraries"). Start with the core ones (for a spa, its massages; for a café, its coffee and dishes), not only signature or seasonal items.
- highlights: short claims the site makes, at most 8.
- location.town: the town or city, never a district, ward or regency (for example Canggu, not Kuta Utara; Ho Chi Minh City, not District 1).
- location.serviceArea: for businesses that come to the client.
- contact.whatsapp: a number the site links to WhatsApp or says is on WhatsApp.
- contact.instagram: the handle without "@".
- colours: only when you can see them in the logo or photos; use roles primary, accent, background or text.
- essence.feeling: 2 to 4 words for how a customer should feel after (for a massage: relaxing, warm, cared for).
- essence.placeSymbols: up to 5 symbols of the place tied to the trade, which images can show (for a massage in Da Nang: lotus flowers, Hoi An lanterns, My Khe beach at dusk; in Bali: frangipani, temple offerings, rice terraces). Use what the place is known for, even when the site doesn't say it.
- essence.senses: up to 5 scents, textures, lights or sounds of the experience (warm coconut oil, fresh linens, soft lamp light).
- essence.moments: up to 6 moments when people need the business, as the pages say them (after a surf at My Khe, after a long flight), each with its page URL. Leave it empty when no page names one.
- visualStyle.summary: at most 12 words, like "warm tropical, soft light, natural textures".`;
}

export function brandUserText(pages: { url: string; text: string }[], facts: CodeFacts[]): string {
  const pageText = pages.map((page) => `### Page: ${page.url}\n${page.text}`).join('\n\n');
  return `${pageText}\n\n### Facts found in code\n${JSON.stringify(facts, null, 2)}`;
}
