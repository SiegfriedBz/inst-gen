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

### The eval

- 2026-10-24: `gemini-3.8-flash` is far too slow on the free tier for a
  30 s step. A two-line prompt took 103 s, and Svarga 114 s with the first
  partial at 105 s, while fetching took 81 ms. Thinking level `minimal` is
  refused by this model ("not supported"); `low` is its floor.
  `gemini-3.5-flash-lite` reads Svarga in 10 s (first partial at 3 s). The
  eval below ran on flash-lite through `pnpm eval:brand --model=…`; the
  app's constant still named `gemini-3.8-flash` until the developer decided.
- 2026-10-24: The developer chose flash-lite for the brand read, and asked
  for offerings to improve until 16/20 holds across runs. Before that, four
  runs of `brand-2` scored 16, 14, 15 and 15/20.
- 2026-10-24: Flash-lite sometimes returned more items or words than the
  profile allows, and the read failed with "response did not match schema".
  The model's schema now has no limits; code trims to them. A profile may
  have fewer than 3 tone words, against the spec's "3 to 5".
- 2026-10-24: CSS variables named for interface states (`--color-error`,
  `--color-instock`, `--color-add-to-wishlist-background`) are no longer
  read as brand colours.
- 2026-10-24: Five expected colours were mine from CSS frequency and wrong
  (Phin's logo is black and white; Orient's is beige). Phin now expects
  `#211b1b`; Orient, Fah Lanna, Neyuh and Better Than Blouses expect none.
- 2026-10-24: Prompt `brand-2`: core offerings first, the town rather than a
  district, a WhatsApp number written as text.
- 2026-10-24: Eval runs, all on `gemini-3.5-flash-lite`:

  | Prompt | Result | Failing |
  |---|---|---|
  | brand-1 | 12/19 scored, 1 `model_failed` | colours, offerings, towns, a schema mismatch |
  | brand-2 | **16/20** | little-vietnam-tours and naki (offerings: product lines listed instead of items), neyuh (WhatsApp written as text), serenity-bali (colour: black) |

  `brand eval: 16/20 passed · prompt brand-2 · model gemini-3.5-flash-lite`
  Reads took 3 to 11 s. The `recording.json` files are from this run.
- 2026-10-24: For `brand-3`: code drops an offering whose name its page
  doesn't show; code reads a WhatsApp number written next to the word
  WhatsApp (Neyuh); the prompt asks for item names copied word for word, not
  categories. Four runs: 18, 19, 18 and 17 (the recorded one).
  `brand eval: 17/20 passed · prompt brand-3 · model gemini-3.5-flash-lite`
  Phin Coffee (offerings) fails every run, Little Vietnam Tours in two of
  three. The `recording.json` files are from the last run.
- 2026-10-24: The developer judged tone and style: the style missed what
  the business is about (Sen should carry Vietnam, lotus flowers and
  relaxation after sport; Svarga, Bali, frangipani and after-surf rest).
  The spec gained an essence (feeling, place symbols, senses, moments),
  approved at 12:20 UTC, and roadmap 1.3 `brand/search-essence` will enrich
  it from what people search for.
- 2026-10-24: `brand-4` added the essence: 18/20. Its examples leaked into
  other trades (a café got "warm coconut oil, fresh linens") and Orient Spa
  in Hanoi got "Hoi An lanterns". `brand-5` keeps the essence to the
  business's own trade and town, and asks for short moments:
  `brand eval: 18/20 passed · prompt brand-5 · model gemini-3.5-flash-lite`
  The recordings are from this run. The eval retries a busy (503) answer
  once after 10 s.
- 2026-10-24: The developer: Sen and Svarga are mobile; therapists come to
  the client's hotel or villa, who just books and relaxes. The essence
  gained a sourced `promise` (spec approved again), and senses now describe
  where the service happens. `brand-6`:
  `brand eval: 17/20 passed · prompt brand-6 · model gemini-3.5-flash-lite`
  Sen's promise: "Our therapists come to your hotel or villa in Da Nang:
  book on WhatsApp and relax." The recordings are from this run.
- 2026-10-24: Two runs of the same prompt differ (Libra and Two Face failed
  once, then passed): flash-lite isn't deterministic, so the gate is a
  snapshot, not a guarantee.

### Final review

- 2026-10-24: A fresh reviewer read the whole branch: no Critical, five
  Important, seven Minor. The five were fixed, each with a test that failed
  first: URLs found in pages now keep to default ports and no credentials;
  a bad escape in a link (`tel:%`) no longer crashes the read; the WhatsApp
  scan is linear (it took 6.1 s on 80 KB); the read gives up at 28 s, 2 s
  before the route's 30 s cap, so `model_timeout` arrives; and the shared
  NDJSON parser reads with `getReader()`, since Safari's streams aren't
  async-iterable.
- Deferred (Minor): closing the page stops the model only through
  `request.signal`; a slow robots.txt can use the whole 10 s fetch budget; a
  half-streamed price or source can flicker in a partial; the model's
  `bookingUrl` is checked for its source only; `::/96` addresses count as
  public; an uppercase model hex is rejected; `checkedLookup` ignores
  `options.family`.
- Open: the spec's profile table still says colours "1 to 5"; the code
  allows 0 (see the ruling above). To amend with the next spec change.

## RED

The final review's five findings, as tests written before the fixes:

`Tests  7 failed | 373 passed (380)`

## GREEN

`Tests  380 passed (380)`

## Amendment 2026-10-24: the brand read fixes

- The first Svarga read on the Vercel preview failed with `model_failed`:
  the preview had no `GOOGLE_GENERATIVE_AI_API_KEY`. The developer set it;
  the read then worked. The route didn't log why the model failed, which is
  why the log line was added.
- "Where you go" showed JSON-LD `areaServed` as written ("Canggu, Bali,
  Indonesia, Pererenan, Bali, Indonesia, …"), because code's value always
  beat the model's. Both pilot home pages list neighbourhoods under each
  area and a free-travel rule. The developer asked for them; the model's
  service area now comes first.
- A Sen read on the preview ended in `model_timeout` at 28 s, then worked on
  the next try. Measured locally on 2026-10-24 with the real model: Sen
  7.0 to 11.9 s over 7 reads, Svarga 11.7 to 17.4 s over 2, fetching 0.5 to
  1.6 s; one more Sen read got Gemini's "high demand" (`model_busy`). Both
  sites are on Vercel and answer in under 0.3 s. The developer asked why not
  300 s: the route's `maxDuration` is now 300 and the read gives up at 60 s
  (spec and decision 0005 amended, approved 2026-10-24T18:20:59Z).
- Ruling: an `areaServed` given as one plain string is kept whole; only a
  Place object's name is cut at its first comma, since a string may list
  several areas.
- Ruling: the read's start time is taken when `prepareRead` starts, which is
  when the route has parsed the body: the same moment the deadline starts.
- Real reads after the change (`brand-7`, `gemini-3.5-flash-lite`, two
  requests):
  - Sen: `My Khe (My Khe Beach, An Thuong, Phuoc My, Vo Nguyen Giap); Son Tra
    (…); Hai Chau (…); Non Nuoc (…). Free travel within these areas; further
    out (including Hoi An) we confirm any small fee on WhatsApp first.`
    `brand read host=www.sendanangmassage.com pages=1 photos=2 fetch_ms=648 first_partial_ms=8002 total_ms=12426 outcome=final`
  - Svarga: `Canggu (Batu Bolong, Echo Beach, Berawa, & Nelayan); Pererenan
    (…); Seminyak (…); Kerobokan (…). Free travel within these areas.`
    `brand read host=www.svargabalimassage.com pages=1 photos=2 fetch_ms=898 first_partial_ms=7937 total_ms=12307 outcome=final`
- The eval wasn't re-run: the prompt change touches one field the eval
  doesn't score, and a full pass takes the day's quota.

### RED

`Tests  2 failed | 5 passed (7)` (the cut-off)

`Tests  5 failed | 73 passed (78)` (the service area)

`Tests  5 failed | 16 passed (21)` (the log line; `brand-read-log.test.ts`
failed to load)

### GREEN

`Tests  500 passed (500)`

