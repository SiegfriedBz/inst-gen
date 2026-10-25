---
title: "Brand profile from a website"
description: "A server step that reads a business's website and streams back a grounded brand profile (facts, colours, logo, visual style, essence), with 20 saved site fixtures, recorded model calls and a first eval set."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T18:20:59Z }
date: "2026-10-24"
---

# Brand profile from a website

## Goal

Everything Shopfront makes, from posts to stories to review replies, is built
on one brand profile read from the owner's website. If the profile is wrong
(the wrong town, invented prices, a missing WhatsApp number, a style that
doesn't match the site), every draft built on it is wrong too. The Global Plan
calls this "the trust moment and the biggest quality lever".

This spec builds the reader: given a website link, it reads a few pages and
the site's best photos, and streams back a profile where every fact names the
page it came from, and anything not found is left empty. It also builds the
way to measure it: 20 saved sites, recorded model calls for offline tests, and
an eval that scores the profile against what each site really says.

When it ships, a request with `https://svargabalimassage.com` returns
Svarga's name, what it offers, where it works, its WhatsApp number, its
colours, its logo and a few words on its visual style, in about 20 seconds,
and `pnpm eval:brand` reports how many of the 20 saved sites come back right.
The phase 1 gate is 16 of 20.

Why now: the brand panel (1.2) shows this profile, and the post plan (2.2) and
review replies (2.7) are written from it. It has to exist, and be measured,
before anything is built on top of it.

## Behaviour

### What this spec ships, and what it doesn't

- A route handler, `POST /api/brand/read`, behind the pilot gate.
- The brand profile schema (zod), shared later by the browser store and the
  brand panel.
- The site reader (safe fetching, page choice, extraction in code), the style
  read and the one model call.
- The text-model module from decision 0003, its first user.
- 20 site fixtures, recorded model calls, and `pnpm eval:brand`.

It ships **no owner-facing screen**. The home page keeps its "coming soon"
website field. The brand panel, saving the profile on the phone, "Re-read my
website" and "Forget this business" are 1.2 (`brand/brand-panel`). Because no
screen shows them yet, this spec adds no visible strings: errors are codes,
which 1.2 turns into words in the three languages.

### The request

`POST /api/brand/read` with a JSON body `{ "url": "<website>" }`, validated
with zod.

- The proxy's pilot gate already answers `401` to a request without a valid
  session; the route itself adds no other check.
- The URL is cleaned before use: whitespace trimmed, `https://` added when no
  scheme is given, the fragment dropped. Only `http` and `https` are allowed,
  on the default ports (80 and 443), without a user name or password in the
  URL. Anything else is the `invalid_url` error, and nothing is fetched.
- The route runs on the Node.js runtime (it needs DNS lookups), in `sin1` like
  the rest of the app, and passes `request.signal` to every fetch and to the
  model call (decision 0005), so a closed page stops the work.

### Safe fetching

Every request to the outside world (pages, `robots.txt`, photos, the logo)
goes through one fetcher, `lib/brand/fetch-safe.ts`. The submitted URL is
untrusted input, so the fetcher guards against server-side request forgery
(SSRF):

- **Address check.** The host name is resolved with DNS first, and the request
  is refused if any resolved address is private, loopback, link-local,
  carrier-grade NAT, multicast, reserved or unspecified, in IPv4 or IPv6
  (including IPv4-mapped IPv6 and the cloud metadata address
  `169.254.169.254`). A bare IP address in the URL is checked the same way.
  The connection then goes to the address that was checked, so a second DNS
  answer can't swap it.
- **Redirects** are followed by hand, at most 3, and each new URL is cleaned
  and checked like the first. A redirect to another site is followed for the
  home page only (for example `example.com` to `www.example.com`, or to a new
  domain the business moved to); that final host becomes "the site".
- **Limits per response:** 10 s, and 2 MB of body. A larger body is cut off
  and the response is dropped. Pages must be `text/html`; photos and logos
  must be `image/jpeg`, `image/png`, `image/webp` or `image/svg+xml` (SVG for
  the logo only).
- **Identity:** a fixed user agent, `ShopfrontBot/1.0`, so a site owner can
  recognise and block it.
- **Fetch budget:** everything the read fetches (`robots.txt`, pages,
  stylesheets, the logo and photos) shares one 10 s budget, counted from the
  request's arrival. What hasn't arrived by then is dropped; the home page
  is the only fetch that must succeed.

### robots.txt

- `robots.txt` is fetched once per read, with the same fetcher. The rules for
  `ShopfrontBot` apply, or else the rules for `*`.
- If the home page is disallowed, the read stops with `robots_disallowed`.
  Other disallowed pages are skipped silently.
- A missing `robots.txt`, or one that fails to load, allows everything.

### Which pages are read

At most 8 pages, home page included, all on the site's host (with or without
`www.`).

1. The home page, after redirects.
2. Internal links from the home page whose path or link text looks like one of:
   about, story, team, services, treatments, menu, prices, pricing, packages,
   booking, book, contact, location, faq. The matching ignores case and
   accepts the common plural or `-us` forms (`about-us`, `our-services`).
3. Ranked by how many of those words match, then by order on the page; ties
   are broken by the shorter path. Duplicates (same path after dropping the
   query and a trailing slash) count once.

Language: when the home page lists `hreflang` alternates, the English one is
used as the home page (Sen's site is also in Korean and Chinese), and links
under another language's path prefix (`/ko/`, `/zh/`, …) are skipped.

Pages are fetched in parallel (at most 4 at a time). A page that fails is
skipped. If the home page itself fails, the read stops with `unreachable`.

### What code extracts, before any model call

From every page read, in code, deterministically:

- **JSON-LD** (`<script type="application/ld+json">`), including `@graph`
  arrays: the first object whose `@type` is `LocalBusiness` or one of its
  subtypes (`DaySpa`, `HealthAndBeautyBusiness`, `Restaurant`, `CafeOrCoffeeShop`,
  `LodgingBusiness`, `TouristTrip`, `Store` and the like; the list is a
  constant). It gives the name, address, area served, phone, email, opening
  hours, price range, offers, `sameAs` links and logo.
- **Open Graph and meta tags:** `og:site_name`, `og:title`, `og:description`,
  `og:image`, `<title>`, `<meta name="description">`,
  `<meta name="theme-color">`.
- **Contact links:** WhatsApp (`wa.me/…`, `api.whatsapp.com/send?phone=…`,
  `whatsapp://send?phone=…`), `tel:`, `mailto:`, and Instagram profile links
  (`instagram.com/<handle>`, not posts or reels).
- **Colours:** `theme-color`, and CSS custom properties whose name suggests a
  brand colour (`--primary`, `--brand`, `--accent`, `--color-…`), from inline
  `<style>` blocks and from at most 2 linked stylesheets on the site's host
  (fetched with the same fetcher and limits). Values are turned into
  `#rrggbb`; near-white, near-black and greys are kept only as background or
  text roles, never as primary.
- **Logo:** the JSON-LD `logo`, else an `<img>` in the header whose `src`,
  `alt` or `class` contains "logo", else the largest `apple-touch-icon` or
  icon link. Kept as an absolute URL.
- **Visible text:** the main text of each page, with scripts, styles,
  navigation, cookie banners and footers removed where they can be told
  apart, whitespace collapsed. All pages together are cut to about 15,000
  tokens (estimated as characters ÷ 4), shared out evenly between pages, home
  page first.
- **Photo candidates:** `<img>` (with `srcset`, the largest), `og:image`, and
  CSS `background-image` URLs in inline styles. Dropped in code: SVGs, data
  URLs, anything whose URL or `alt` says logo or icon, images declared smaller
  than 400 px on their longest side, and near-duplicates (the same file name
  after removing size suffixes like `-300x200` or `?w=`). The rest are ranked
  `og:image` first, then by declared size, then by order on the home page.
  The top 6 are fetched; any that fails or exceeds 2 MB is skipped.

A site that gives less than 300 characters of visible text and no JSON-LD
business object is **thin**: the read still goes on, and the profile says so
(`thin: true`), so 1.2 can ask the owner to fill the gaps. JavaScript is never
run: a site that only renders in the browser comes back thin (see Known
limits).

### The model call

One structured call to `gemini-3.5-flash-lite` (decision 0003's model swap,
made after the eval: `gemini-3.8-flash` took about 110 s a read on the free
tier; see the journal), through the AI SDK's
`streamObject` with the profile's zod schema. Its partial objects feed the
route's own stream (see "The response"), never the browser directly.

- **Input:** the cleaned page texts, each headed by its URL; the facts code
  extracted, with their sources; the logo and up to 6 photos as image parts.
- **Instructions,** in a versioned prompt (`lib/brand/prompt.ts`, with a
  `BRAND_PROMPT_VERSION` constant, starting at `brand-1`):
  - Use only what the pages and photos show. Leave a field empty rather than
    guess. Every fact names the URL of the page it came from, which must be
    one of the pages given.
  - Prices only when written on a page, copied as written with their currency.
  - The visual style describes palette, light, textures and mood of the
    photos, for an image model to imitate. It never describes people, and it
    is empty when no photos were given.
  - The essence (below) says what the business is about, where it is, why
    people come and how they should feel, for images, captions and replies.
  - Tone words describe how the site talks (for example "calm", "warm",
    "professional"), not what it sells.
  - The service area, for a business that comes to its clients, lists each
    area the site names with the neighbourhoods it lists for that area in
    brackets, then the travel rule if the site gives one, for example
    "Canggu (Batu Bolong, Echo Beach, Berawa, Nelayan); Pererenan; Seminyak
    (Petitenget, Oberoi, Kayu Aya, Double Six, Drupadi). Free travel within
    these areas; further out, a small fee agreed on WhatsApp." Names are
    copied as the site writes them, without the region or country.
  - Write in English, whatever the site's language.
- **Thinking:** low, to stay inside the time budget. The builder may raise it
  if the eval shows a gain and the time stays under 20 s.
- **Time budget:** the read gives up 60 s after the request arrives, and the
  route's `maxDuration` is 300 s, Vercel Hobby's maximum, so the function is
  never killed before the read can say why it stopped. Fetching takes at most
  the first 10 s; the model call gets what is left, for the complete answer,
  not just its first token. Past 60 s the call is aborted and the read fails
  with `model_timeout`. Reads measured on 2026-10-24 took 7 to 17 s; the
  60 s leaves room for the free tier's slow moments without leaving the owner
  in front of a spinner for minutes. The eval prints each read's time so the
  photo count and thinking level can be tuned.
- **Log line:** each read writes one line to the server log when it ends:
  the site's host, pages and photos read, the time to fetch, to the model's
  first partial and to the end, and the outcome (`final` or the error code),
  with the model's error message when the model failed. No page text, no
  profile, nothing about the owner. It is how a `model_timeout` or
  `model_failed` seen on Vercel gets a cause.
- The model's own answer for address, phone, WhatsApp, email, Instagram and
  hours never replaces a value code found in JSON-LD or a contact link: code
  wins, and its source is kept.
- **The name** is the exception: JSON-LD often holds a longer, search-engine
  name ("Svarga Bali Massage | Mobile Spa"). The model gives the name the
  business calls itself, and code keeps it only if it appears, ignoring case,
  inside the JSON-LD `name`, `og:site_name` or `<title>` of its source page.
  Otherwise code falls back to the JSON-LD `name`, then `og:site_name`, cut at
  the first `|`, `-` or `–` separator.
- **The service area** is the other exception: JSON-LD `areaServed` holds
  bare place names ("Canggu, Bali, Indonesia"), without the neighbourhoods or
  travel rule the page text gives. The model's service area, checked against
  its source page like the town, comes first. Code falls back to JSON-LD
  `areaServed`, keeping each place's name up to its first comma and joining
  them with ", " ("Canggu, Pererenan, Seminyak, Kerobokan").

### Checks after the model call

Before the final profile is sent, code removes what can't be backed up:

- A fact whose `source` isn't one of the pages read is dropped (its field
  becomes empty).
- For WhatsApp, phone, email and every price: the value must appear on its
  source page (compared on digits for numbers, ignoring spaces, dots and
  dashes; case-insensitively for email). If it doesn't, it is dropped.
- WhatsApp and phone numbers are stored in E.164 (`+62…`, `+84…`). A number
  without a country code takes the country from the JSON-LD address, or else
  stays as written.
- Colours must be valid `#rrggbb`. If code found fewer than 2 colours, the
  model's colours from the logo and photos are kept, with `source: "model"`.
- Each dropped fact is counted in the profile's `dropped` list (field name and
  reason), for the eval report and the journal, not for the owner.

### The brand profile

`lib/brand/profile.ts` holds the zod schema and its TypeScript type. One
schema serves the model's output, the route's response, and later the
browser store and the panel's forms (Global Plan, "One schema, three uses").

A **sourced value** is `{ value, source }`, where `source` is the URL of the
page it came from, or `"model"` for a colour or style the model inferred from
images. An empty field is `null`, never an empty string or a placeholder.

| Field | Type | Notes |
|---|---|---|
| `schemaVersion` | `1` | Bumped when the shape changes |
| `siteUrl` | URL | The home page after redirects |
| `readAt` | ISO 8601 UTC | When the read finished |
| `pagesRead` | URL[] | 1 to 8 |
| `thin` | boolean | See above |
| `name` | sourced string | The business's own name, not the page title's tagline |
| `summary` | sourced string, ≤ 25 words | What they sell and to whom ("Mobile massage at your villa or hotel in Da Nang") |
| `category` | string | One word or two, for hashtags later ("massage spa") |
| `offerings` | list, ≤ 20 | Each `{ name, description?, price?, duration?, source }`; `price` as written, with currency |
| `highlights` | list of sourced strings, ≤ 8 | Short claims the site makes ("Therapists come to you", "Open until midnight") |
| `location` | `{ town, area?, address?, serviceArea? }`, each sourced | `serviceArea` for mobile businesses |
| `contact` | `{ whatsapp?, phone?, email?, instagram?, bookingUrl? }`, each sourced | `instagram` is the handle without `@` |
| `hours` | sourced string | As written, in English |
| `tone` | 3 to 5 words | From the site's wording |
| `colours` | list, 1 to 5 | Each `{ hex, role, source }`, `role` one of `primary`, `accent`, `background`, `text` |
| `logoUrl` | sourced URL | Absolute |
| `essence` | `{ promise, feeling, placeSymbols, senses, moments }` | See "The essence" below |
| `visualStyle` | `{ summary, palette, light, textures, mood }` or `null` | `summary` ≤ 12 words, like "warm tropical, soft light, natural textures"; `null` when no photos were read |
| `photoUrls` | URL[] | The photos the style was read from |
| `promptVersion` | string | `BRAND_PROMPT_VERSION` |
| `dropped` | list of `{ field, reason }` | From the checks above |

### The essence

A website is often poor, but the business still has a soul: what it does,
where, for whom, and how people should feel after. The essence captures it,
so images, captions and review replies read as if someone understood the
business, not as if they copied its website.

| Field | Type | What it holds |
|---|---|---|
| `promise` | sourced sentence, ≤ 20 words, or `null` | How the service reaches the customer and what they have to do, as the site says it ("We come to your hotel or villa: book on WhatsApp and relax") |
| `feeling` | 2 to 4 words | How a customer should feel ("relaxed, warm, cared for") |
| `placeSymbols` | up to 5 phrases | Symbols of the place tied to the trade ("lotus flowers", "Hoi An lanterns"; "frangipani", "temple offerings") |
| `senses` | up to 5 phrases | Scents, textures, light and sounds of the experience, where it happens: for a mobile service, the client's own hotel room or villa ("soft hotel lighting", "villa deck at sunset", "warm coconut oil") |
| `moments` | up to 6 sourced phrases | Why people come, as the site says it ("after a surf at My Khe", "after a long flight") |

- `promise` and `moments` are facts about the business: each names its
  page, and the checks drop one whose source isn't a page read.
- `feeling`, `placeSymbols` and `senses` are interpretation, from the trade,
  the place and the site's own words, with `source: "model"`. They guide
  images, tone and wording only, never a factual claim (no "we use lotus
  oil" unless a page says so). The owner can edit them in the panel (1.2).
- Example, Sen (massage at your hotel in Da Nang): promise "Our therapists
  come to your hotel, apartment or villa: book on WhatsApp and relax";
  feeling "relaxing, warm, cared for"; place "lotus flowers, My Khe beach
  at dusk"; senses "warm natural oils, fresh linens, soft hotel lighting";
  moments "after
  a surf at My Khe, after a long flight, after climbing the Marble
  Mountains". Svarga (massage at your villa in Bali): promise "Therapists
  bring the massage to your villa or hotel: message us and relax"; place
  "frangipani, temple offerings, rice terraces"; senses "warm coconut oil,
  soft villa lighting, villa deck at sunset"; moments "after a surf in Canggu, after a
  Mount Batur hike".
- A thin site still gets an essence from its trade and place, with empty
  `moments`.
- The eval doesn't score the essence; the developer judges it with tone and
  style, and the verdict goes in the journal.

Fields the post plan or panel may need later (content pillars, hashtags, the
owner's edits) are not in this schema; their specs add them with a new
`schemaVersion`.

### The response

- **Success:** `200`, `Content-Type: application/x-ndjson`: one JSON object
  per line, each with a `type`:
  - `{ "type": "partial", "profile": … }`: the profile so far. The first one
    is sent as soon as code has extracted its facts, before the model call
    starts, so contact details, name candidates, colours and the logo appear
    within seconds. After that, each model partial is merged with code's facts
    and run through the checks below before it is sent (a source not among
    the pages read, a number or price not on its page: left out). So nothing
    unchecked is ever shown, and a value code found never flickers.
  - `{ "type": "final", "profile": … }`: the complete, checked profile, valid
    against the schema. It is always the last line of a successful read, and
    it is what the browser keeps (decision 0005).
  - `{ "type": "error", "code": "<code>" }`: the read failed after the stream
    started. Always the last line.
  This line format is the contract 1.2's client reads; a small parser for it
  lives next to the schema (`lib/brand/stream.ts`), shared by the client and
  the tests.
- **Errors** found before the stream starts are JSON `{ "error": "<code>" }`
  with a status:

| Code | Status | When |
|---|---|---|
| `invalid_url` | 400 | Bad body, bad scheme, port, credentials |
| `blocked_address` | 400 | The host resolves to a private or reserved address |
| `unreachable` | 502 | The home page can't be fetched (DNS, timeout, status ≥ 400, not HTML) |
| `robots_disallowed` | 403 | `robots.txt` disallows the home page |
| `model_busy` | 503 | Gemini answered 429 (free quota used up) or 503 |
| `model_timeout` | 504 | The read ran past 60 s |
| `model_failed` | 502 | Any other model error, or output that fails the schema |

The fetch errors (`invalid_url`, `blocked_address`, `unreachable`,
`robots_disallowed`) always come before the stream; the model errors come as
an `error` line.

### The text-model module

`lib/ai/text-model.ts`, as decision 0003 requires:

- It is the only module that imports `@ai-sdk/google`. The model IDs
  (`gemini-3.5-flash-lite` for both the brand read and the light calls) are
  its constants.
- It reads `GOOGLE_GENERATIVE_AI_API_KEY` on the server only. The key is
  added to `.env.example` with an empty value, and the scaffold's missing-
  configuration rule does not cover it: without a key, the brand read fails
  with `model_failed`, the rest of the app works.
- It exposes the calls the app needs behind an interface (for now, one:
  stream a brand profile), so tests swap in a **replayer** that plays back a
  recorded response, and never call the network.

### Fixtures

`tests/fixtures/sites/<slug>/`, 20 sites:

- `sen` (sendanangmassage.com) and `svarga` (svargabalimassage.com), plus 18
  small-business sites in South-East Asia, in English: spas, cafés,
  guesthouses, tour operators and shops, from several site builders
  (WordPress, Wix, Squarespace, Shopify, hand-made), and at least 2 thin or
  JavaScript-only sites, which should come back `thin`. The agent proposes the
  list in the journal; the developer checks it before the fixtures are saved.
- Each fixture holds every text response the reader fetched: its pages
  (`pages/<n>.html`, with `<script>` tags other than JSON-LD removed), its
  stylesheets (`css/<n>.css`) and its `robots.txt`, all committed, so offline
  runs extract exactly the colours and pages the live read did. It also holds
  a `manifest.json` (site URL, the date saved, and for each saved file its
  original URL and final URL after redirects; plus the photo and logo URLs),
  the recorded model response (`recording.json`), and `expected.json`
  (below).
- Photos and logos are **not** committed: they are other businesses' images.
  Unit tests don't need them (the model call is replayed). The eval fetches
  them from their URLs, or from a local cache in `.fixtures-cache/`, which is
  git-ignored.
- `pnpm fixtures:save <url> <slug>` saves a fixture with the real reader, so a
  fixture is exactly what the reader saw.
- A fixture's HTML is served to the reader in tests through the same fetcher
  interface (a fake transport), so the page choice, extraction and checks run
  on it unchanged.

### The eval

`pnpm eval:brand [slug…]` runs the reader on the saved pages, calls the real
model, and scores each profile against the fixture's `expected.json`, written
by the agent from the site and checked by the developer.

- **Scored automatically,** per fixture:
  - `name` matches one of the fixture's accepted names (case, accents and
    punctuation ignored); `expected.json` lists them, for example
    `["Svarga", "Svarga Bali Massage"]`.
  - `contact.whatsapp` matches when expected, and is empty when the site has
    none.
  - `location.town` matches.
  - `summary` contains at least one of the expected key words.
  - `offerings` finds at least 70 % of the expected ones (by name, loosely
    matched), and invents none: every offering's name appears on its source
    page.
  - No price appears that the site doesn't show.
  - At least one colour is within a distance of 60 (RGB, Euclidean) of an
    expected brand colour.
  - `thin` is right.
- A fixture **passes** when all of its scored checks pass. The gate is 16 of
  20 passing.
- **Read by a person, not scored:** tone words and the visual style. The
  report prints them next to the site's photos' URLs, and the developer's
  verdict (fits, or not) goes in the journal.
- The report prints, per fixture, pass or fail with the failed checks, the
  `dropped` list and the time taken, then the total, the prompt version and
  the model ID. The summary line is copied into the journal.
- `--record` saves each response as the fixture's `recording.json`, which the
  unit tests replay.
- Quota: one brand read is one Flash request, and the free tier gives about
  20 a day (decision 0003). A full pass takes the whole day's quota, so the
  eval takes a list of slugs, stops cleanly on a 429 with what it scored so
  far, and is never run on a pilot day.

### Repo changes

- New dependencies: `ai` and `@ai-sdk/google` (decision 0003), an HTML parser,
  and a `robots.txt` parser. The builder picks the last two and pins every
  version; no headless browser.
- `commitlint.config.mjs` gains the `brand` scope (the Global Plan asks for it
  when the area appears).
- `AGENTS.md`'s Map gains `lib/brand/`, `lib/ai/` and `tests/fixtures/`, and
  its Commands table gains `pnpm eval:brand` and `pnpm fixtures:save`, with a
  note that the eval spends real Gemini quota.
- `.gitignore` gains `.fixtures-cache/`.

## Acceptance criteria

```gherkin
Scenario: A pilot site gives a full profile
  Given the saved fixture "svarga" and its recorded model response
  When the brand read runs on https://svargabalimassage.com
  Then the profile's name is one of the fixture's accepted names, all of which contain "Svarga"
  And its town is in Bali
  And its WhatsApp number is in E.164 form and appears on its source page
  And every fact's source is one of the pages read
  And thin is false

Scenario: The profile streams as it fills
  Given a recorded response for "sen"
  When the browser posts the URL to /api/brand/read
  Then it receives "partial" lines before one "final" line, which is the last
  And the first partial carries the facts code extracted, before any model output
  And no partial holds a number or price that isn't on its source page
  And the final profile passes the profile schema

Scenario: A read that runs too long stops at 60 seconds
  Given a model replayer that stops answering
  When the brand read runs
  Then the stream ends with an "error" line with code "model_timeout" within 60 s
  And the route's maxDuration is 300

Scenario: A read writes one log line with its timings
  Given a recorded response for "svarga"
  When the brand read ends
  Then one log line gives the host, pages and photos read, the fetch, first-partial and total times, and "final"
  And it holds no page text and no profile

Scenario: A failed model call logs its reason
  Given a model replayer that fails with "high demand"
  When the brand read ends
  Then the log line gives "model_busy" and the model's message

Scenario: The service area keeps the neighbourhoods from the page text
  Given Svarga's saved home page, whose JSON-LD areaServed is "Canggu, Bali, Indonesia" and three other places
  And a model response whose service area names Canggu with Batu Bolong, Echo Beach, Berawa and Nelayan, sourced to the home page
  When the checks run
  Then the profile's service area is the model's

Scenario: Without the model's service area, JSON-LD's is trimmed
  Given the same page and a model response with no service area
  When the checks run
  Then the profile's service area is "Canggu, Pererenan, Seminyak, Kerobokan", sourced to the home page

Scenario: A fact the site doesn't show is dropped
  Given a recorded model response that gives a price not written on its source page
  When the checks run
  Then that price is removed
  And the dropped list names the field and the reason

Scenario: Code beats the model on contact details
  Given a page whose JSON-LD has telephone "+84 905 123 456"
  And a model response that gives a different phone number
  When the profile is built
  Then the phone is "+84905123456" with the JSON-LD page as its source

Scenario: An address on a private network is never fetched
  Given a URL whose host resolves to 10.0.0.5
  When the brand read is requested
  Then the answer is 400 with error "blocked_address"
  And no request is made to that address

Scenario: A redirect to a private address is refused
  Given a public site whose home page redirects to http://169.254.169.254/
  When the brand read follows the redirect
  Then it stops with "blocked_address"

Scenario: robots.txt is respected
  Given a site whose robots.txt disallows "/" for all agents
  When the brand read is requested
  Then the answer is 403 with error "robots_disallowed"
  And no page other than robots.txt is fetched

Scenario: The English version of a multilingual site is read
  Given a home page with hreflang alternates for "en", "ko" and "zh"
  When the reader picks its pages
  Then it reads the "en" home page and skips links under "/ko/" and "/zh/"

Scenario: A JavaScript-only site comes back thin
  Given a fixture whose HTML has no JSON-LD and under 300 characters of text
  When the brand read runs
  Then the profile has thin true and empty fields instead of guesses

Scenario: No photos means no visual style
  Given a site with no usable photos
  When the brand read runs
  Then visualStyle is null and photoUrls is empty

Scenario: The free quota is used up
  Given the model answers 429
  When the brand read is requested
  Then the answer carries error "model_busy"

Scenario: Without a session the route is closed
  Given no pilot session cookie
  When /api/brand/read is posted to
  Then the answer is 401 and nothing is fetched

Scenario: The eval reports the gate
  Given the 20 fixtures and their expected profiles
  When pnpm eval:brand runs on all of them
  Then it prints each fixture's result and the number passing out of 20
  And the prompt version and model ID
```

Unit tests (Vitest, offline, recorded model calls) cover: cleaning URLs, the
address check (IPv4, IPv6, mapped addresses, bare IPs), redirects, the size
and time limits, `robots.txt`, page choice and `hreflang`, each extractor
(JSON-LD with `@graph`, Open Graph, contact links, colours, logo, photo
filtering), the text budget, the checks after the model call, E.164
formatting, the schema, the route's error codes, and the eval's scoring
functions. CI never calls a model or a real website.

`pnpm eval:brand` on all 20 fixtures, with 16 or more passing, is the phase 1
gate. Its summary line, the prompt version and the developer's verdict on
tone and style go in the journal.

## Known limits

- **JavaScript-only sites come back thin.** No headless browser runs; the
  Global Plan adds a free one only if the pilot shows it's needed. Both pilot
  sites are Next.js sites that render their HTML on the server, so they are
  read in full.
- **About 20 reads a day.** One Flash request per read, on a free tier of
  about 20 a day shared with the post plan and the eval. The usage counters
  (2.8) and the "back tomorrow" message aren't built yet; until then, a 429
  is just `model_busy`.
- **No cache on the server.** Each request reads the site again. The profile
  is kept on the owner's phone from 1.2.
- **Images in the model call** count against the token budget. Six photos
  should fit; if the eval shows timeouts, the builder lowers the count and
  records it in the journal.
- **The expected profiles are the agent's,** checked by the developer, not by
  the businesses. A wrong expectation can make a good profile fail.
- **Saved pages are other people's content.** Fixtures keep their HTML text
  (scripts removed) for tests; photos stay out of the repo. If a site owner
  asks, their fixture is removed and replaced.

## Out of scope

- The brand panel, editing, saving on the phone, "Re-read my website",
  "Forget this business", and every visible string about the read: 1.2
  `brand/brand-panel`.
- The run record in IndexedDB and resuming a run: decision 0005, built with
  the first screen that starts a run (1.2).
- Content pillars, hashtags and the post plan: 2.2 `posts/generate-copy`.
- Usage counters and the daily pool: 2.8 `platform/usage-counters`.
- The Instagram handle field and Instagram data: phase 3.
- Bot check, ownership tick box, region block, domain blocklist: phase 4
  `platform/quotas-abuse`.
- Businesses without a website.
- Enriching the essence from what people search for (search terms built
  from the essence, read through a search tool): 1.3
  `brand/search-essence`, after a check that it is free and allowed.
