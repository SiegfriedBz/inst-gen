import type { CodeFacts } from './extract/structured';

// Bump with every change to the prompt, so eval scores trace back to it.
export const BRAND_PROMPT_VERSION = 'brand-1';

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

Field notes:
- summary: what they sell and to whom, in at most 25 words.
- category: one or two words, like "massage spa" or "coffee shop".
- highlights: short claims the site makes, at most 8.
- location.serviceArea: for businesses that come to the client.
- contact.instagram: the handle without "@".
- colours: only when you can see them in the logo or photos; use roles primary, accent, background or text.
- visualStyle.summary: at most 12 words, like "warm tropical, soft light, natural textures".`;
}

export function brandUserText(pages: { url: string; text: string }[], facts: CodeFacts[]): string {
  const pageText = pages.map((page) => `### Page: ${page.url}\n${page.text}`).join('\n\n');
  return `${pageText}\n\n### Facts found in code\n${JSON.stringify(facts, null, 2)}`;
}
