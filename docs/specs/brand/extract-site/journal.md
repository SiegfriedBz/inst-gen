# Brand profile from a website: journal

## Calls made along the way

- 2026-10-24: Dependencies pinned to versions at least two weeks old: `ai`
  7.0.137, `@ai-sdk/google` 4.0.93, `undici` 8.11.2, `ipaddr.js` 2.5.0,
  `cheerio` 1.2.0, `robots-parser` 3.0.1, `libphonenumber-js` 1.13.15, `tsx`
  4.23.15 (dev). All MIT or Apache-2.0 (decision 0008).
- 2026-10-24: AI SDK v7 deprecates `streamObject`; the brand call uses
  `streamText` with `output: Output.object(...)`, thinking level `low`, and
  `maxRetries: 0` (a retry spends free quota and the 30 s budget).
- 2026-10-24: Profile colours may be empty, although the spec's table says 1
  to 5: a thin site with no theme colour, CSS colour or photo would otherwise
  always fail. 1.2 must handle an empty palette.
- 2026-10-24: The name falls back to the JSON-LD name, then `og:site_name`,
  then `<title>`, each cut at the first `|` or ` - `.
- 2026-10-24: Both pilot sites put everything on the home page (`/#treatments`,
  `/#faq`), so the reader reads one page each. That is right: the anchors are
  the same page.
- 2026-10-24: Found on the pilot sites: their Instagram links are
  `instagram.com/https://www.instagram.com/<handle>` (a doubled URL, broken
  for visitors too). The reader now takes the last segment. The links on the
  sites themselves still need fixing.
- 2026-10-24: Tailwind v4 declares its whole default palette as `--color-*`
  variables, which the reader took for brand colours. Those names are now
  skipped; the pilots' colours come out as their jade greens.
- 2026-10-24: Biome ignores `tests/fixtures/sites/`: saved pages are other
  sites' HTML and fail its accessibility lint.
- 2026-10-24: `pnpm add` rewrites `pnpm-lock.yaml` with single quotes; the
  repo keeps it Biome-formatted, so run `biome check --write pnpm-lock.yaml`
  after adding a package.

### The 20 sites (proposed, waiting for the developer's check)

| Slug | Site | Kind, place | Builder | Expected |
|---|---|---|---|---|
| `sen` | sendanangmassage.com | Mobile spa, Da Nang | Next.js | full (saved) |
| `svarga` | svargabalimassage.com | Mobile spa, Bali | Next.js | full (saved) |
| `karsa-spa` | karsaspa.com | Spa, Ubud | WordPress (Elementor) | full |
| `fah-lanna` | fahlanna.com | Spa, Chiang Mai | Hand-made | full |
| `orient-spa` | orientspahanoi.com | Spa, Hanoi | Hand-made | full, WhatsApp |
| `phin-coffee` | phincoffeehoian.com | Café, Hoi An | WordPress | full, WhatsApp |
| `lulu-bistrot` | lulubistrot.com | Restaurant, Canggu | Squarespace | full, WhatsApp |
| `two-face` | twofacebali.com | Café, Canggu and Ubud | Squarespace | full, WhatsApp |
| `the-maker` | themaker243.com | Café and bakery, Penang | Wix | full |
| `yins-sourdough` | yinssourdough.com | Bakery, Penang | Framer | **thin** (no text served) |
| `the-lawn` | thelawncanggu.com | Beach club, Canggu | Wix | **thin** (no text served) |
| `joys-house` | guesthouse-chiangmai.com | Guesthouse, Chiang Mai | Hand-made | full |
| `serenity-bali` | serenitybali.com | Eco guesthouse and yoga, Canggu | Wix | full |
| `phonepraseuth` | phonepraseuthguesthouse.com | Guesthouse, Luang Prabang | WordPress (Elementor) | full |
| `siem-reap-private-tour` | siemreapprivatetour.com | Tour guide, Siem Reap | WordPress | full, WhatsApp |
| `affinity-angkor` | affinityangkor.com | Tour operator, Siem Reap | Squarespace | full |
| `little-vietnam-tours` | littlevietnamtours.com | Tour operator, Vietnam | Weebly | full |
| `naki` | nakithelabel.com | Leather bags, Bali | Shopify | full |
| `neyuh` | neyuhleather.com | Leather goods, Saigon | Shopify | full |
| `better-than-blouses` | betterthanblouses.com | Batik clothes, Penang | WordPress (Elementor) | full |

Checked on 2026-10-24 with the reader's user agent: every site answers 200.
Left out: ghee-hiang.com (its page now serves unrelated gambling text) and
brixandbaume.com (redirects to google.com).

## RED

## GREEN
