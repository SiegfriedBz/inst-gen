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

### The 20 sites (approved by the developer on 2026-10-24, then two swaps)

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
| `the-maker` | themaker243.com | Café and bakery, Penang | Wix | full; its home page is JavaScript-only, the text is on its subpages |
| `yins-sourdough` | yinssourdough.com | Bakery, Penang | Framer | **thin**: serves no text without JavaScript |
| `revolver-bali` | revolverbali.com | Coffee shop and merch, Bali | Shopify | full, WhatsApp |
| `libra-house` | librahousechiangmai.com | Guesthouse, Chiang Mai | Hand-made | full |
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

- 2026-10-24: Two swaps after the developer's approval, both when the sites
  were saved. Joy's House (guesthouse-chiangmai.com) now serves Indonesian
  gambling spam ("ORITOGEL"): the site has been taken over, so Libra
  Guesthouse replaces it. The Lawn turned out not to be thin (its home page
  is empty, its subpages have text), so Revolver Bali replaces it.
- 2026-10-24: Only one real site is truly thin (Yin's Sourdough). A dozen
  other candidates all served text. The spec's "at least 2 thin or
  JavaScript-only sites" is met by Yin's (thin) and The Maker (a
  JavaScript-only home page, text on its subpages). The thin path is also
  covered by unit tests.
- 2026-10-24: Saving the real sites found three reader bugs, each fixed with
  a test first: Wix image URLs made cache file names too long (now a hash);
  WordPress's default preset palette (`--wp--preset--color--vivid-red`)
  passed as brand colours; and a cookie-banner rule removed whole pages when
  `<html>` or `<body>` had a class like `supports-no-cookies` (Shopify).
- 2026-10-24: The town now comes from the model, checked against its page,
  and falls back to JSON-LD. `addressLocality` is often a district on real
  sites ("Kec. Kuta Utara", "Phường Bến Thành, Quận 1", "Cau Giay
  District"). This reverses an earlier call that code wins for the town.
- 2026-10-24: A thin fixture is scored only on the thin flag, WhatsApp, and
  invented offerings or prices: it has no real name, town or summary.
- 2026-10-24: Expected files were written from the saved page text. Expected
  brand colours are set only where one colour clearly dominates the site's
  CSS or `theme-color` (9 of 20); elsewhere the colour check is skipped.
  Neyuh expects WhatsApp +84358358353: its contact page writes the number as
  "Phone · WhatsApp · Zalo" without a wa.me link, so only the model can find
  it. Town is null for Naki (no town given) and Revolver (many venues).

## RED

## GREEN
