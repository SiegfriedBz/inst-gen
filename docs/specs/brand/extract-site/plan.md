# Brand profile from a website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, per `AGENTS.md`) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** `POST /api/brand/read` reads a business's website safely and
streams back a grounded, checked brand profile as NDJSON lines. It comes with
20 saved site fixtures, recorded model calls and `pnpm eval:brand`.

**Architecture:** Everything lives in `lib/brand/` as plain TypeScript that
Vitest drives through two seams. The first is a `Transport` (production: undici
with a DNS lookup that refuses private addresses; tests: a fixture or in-memory
map). The second is a `TextModel` (production: Gemini through the AI SDK, in
`lib/ai/`; tests: a replayer of `recording.json`). `prepareRead` does the
fetching and the extraction in code and throws a `BrandReadError` before any
stream starts. `streamProfile` runs the model call and yields `partial` lines,
then a `final` or `error` line, each one merged and checked. The route handler
only wires these to the request.

**Tech Stack:** Next.js 16.4.3 route handler (Node.js runtime), zod 4.6.7,
Vitest 5.0.5, Playwright 1.64.1. New, pinned, each published at least two
weeks ago:
- `ai` 7.0.137 and `@ai-sdk/google` 4.0.93 (decision 0003);
- `undici` 8.11.2, for the pinned-address agent;
- `ipaddr.js` 2.5.0, for address ranges;
- `cheerio` 1.2.0, the HTML parser;
- `robots-parser` 3.0.1;
- `libphonenumber-js` 1.13.15, for E.164 numbers;
- `tsx` 4.23.15, a dev dependency for the two CLI scripts.

All are MIT or Apache-2.0, so compatible with the AGPL (decision 0008).

**Spec:** [`spec.md`](spec.md).

## Global Constraints

- Route `POST /api/brand/read`, body `{ "url": string }`. It sets
  `export const runtime = 'nodejs'` and `export const maxDuration = 30`.
- User agent `ShopfrontBot/1.0`, and robots rules for `ShopfrontBot`, else `*`.
- Per response: 10 s and 2 MB. Redirects: at most 3, each checked again.
  Pages `text/html`; images `image/jpeg`, `image/png`, `image/webp`, plus
  `image/svg+xml` for the logo only.
- At most 8 pages, 4 fetched at a time, and at most 2 linked stylesheets.
- At most 6 photos. A photo must be at least 400 px on its longest declared
  side.
- Fetch budget: 10 s from the request's arrival. Whole request: 30 s. The
  model gets the rest, up to 20 s.
- Text budget: about 15,000 tokens in all, estimated as characters ÷ 4
  (60,000 characters), shared out evenly between pages, home page first.
- Thin: under 300 characters of visible text and no JSON-LD business object.
- Model `gemini-3.8-flash`, thinking low. `BRAND_PROMPT_VERSION = 'brand-1'`.
- Error codes and statuses:

  | Code | Status |
  |---|---|
  | `invalid_url` | 400 |
  | `blocked_address` | 400 |
  | `unreachable` | 502 |
  | `robots_disallowed` | 403 |
  | `model_busy` | 503 |
  | `model_timeout` | 504 |
  | `model_failed` | 502 |
- `@ai-sdk/google` is imported only in `lib/ai/text-model.ts`. The key is
  `GOOGLE_GENERATIVE_AI_API_KEY`, server-only. A missing key means
  `model_failed`; it is never a configuration error for the whole app.
- No visible strings: nothing is added to `messages/*.json`.
- CI never calls a model or a real website.
- Commits use scope `brand` for `lib/brand/`, `lib/ai/`, the route and the
  fixtures, `deps` for a dependency added on its own, and `docs` for docs.
  Use `pnpm`, and stage files by path.

## Review Focus

- **A host that resolves to both a public and a private address**
  (a DNS-rebinding setup): refused, because every resolved address must be
  public, and the connection goes to the checked one. Test in Task 2.
- **IPv6 forms of private addresses:** `[::1]`, `[::ffff:127.0.0.1]`,
  `[fd00::1]`, and a decimal or hex IPv4 host like `http://2130706433/` or
  `http://0x7f.1/`. All are refused. Tests in Task 2.
- **A server that sends no `Content-Length` and streams 50 MB:** cut at 2 MB
  without buffering it all. Test in Task 3.
- **JSON-LD that is invalid JSON, or a single object, an array, or an
  `@graph`, with `@type` given as an array** (`["LocalBusiness","DaySpa"]`):
  bad blocks are skipped and the others are still read. Tests in Task 5.
- **A model partial whose `source` is a relative path or has a trailing
  slash** (`/about`, `https://site/about/`): sources are normalised the same
  way as `pagesRead` before they are compared, so a good fact isn't dropped.
  Test in Task 7.

---

### Task 1: Profile schema and stream lines

**Files:**
- Create: `lib/brand/profile.ts`, `lib/brand/stream.ts`
- Modify: `commitlint.config.mjs` (add the `brand` scope)
- Test: `tests/unit/brand-profile.test.ts`, `tests/unit/brand-stream.test.ts`

**Interfaces:**
- Produces:
  - `sourced<T extends z.ZodType>(value: T)`: the zod object
    `{ value: T, source: z.string() }`.
  - `profileSchema`: every field in the spec's table.
    - `schemaVersion: z.literal(1)`.
    - Optional single facts are `sourced(...).nullable()`.
    - `offerings`: max 20; `highlights`: max 8; `tone`: 3 to 5 strings;
      `colours`: 1 to 5, each with hex `/^#[0-9a-f]{6}$/`.
    - `role`: `z.enum(['primary','accent','background','text'])`.
    - `visualStyle`: nullable.
  - `type Profile = z.infer<typeof profileSchema>`.
  - `modelProfileSchema`: what the model fills, with `name`, `summary`,
    `category`, `offerings`, `highlights`, `location`, `contact`, `hours`,
    `tone`, `colours` and `visualStyle`. Each source is a URL string or
    `"model"`.
  - `type ModelProfile`, and
    `type PartialProfile = DeepPartial<Profile>`, declared locally.
  - `ERROR_CODES` (the 7 codes, as a const tuple), `type BrandErrorCode`,
    and `ERROR_STATUS: Record<BrandErrorCode, number>`.
  - `type StreamLine = { type: 'partial'; profile: PartialProfile } | { type: 'final'; profile: Profile } | { type: 'error'; code: BrandErrorCode }`.
  - `encodeLine(line: StreamLine): string`: JSON plus `\n`.
  - `readLines(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamLine>`:
    splits on `\n` across chunk boundaries and validates each line, `final`
    with `profileSchema`.

- [ ] **Step 1: Write the failing tests**
  - `profileSchema accepts a full Svarga-like profile`: a literal object
    with every field.
  - `rejects an empty-string field`: `name: { value: '', source }` fails.
    Use `z.string().min(1)` for every string value.
  - `rejects a sixth colour, a bad hex, and tone with 2 words`.
  - `visualStyle may be null; summary over 25 words fails`, using a
    word-count refinement. Also `visualStyle.summary` over 12 words fails.
  - `readLines joins a line split over two chunks`: feed
    `'{"type":"partial","profile":{}}\n{"type":"fin'` and then
    `'al",...}\n'`. Expect 2 lines, the second of type `final`.
  - `readLines throws on a final that fails the schema`.
  - `ERROR_STATUS matches the spec`: a table test over all 7 codes.

- [ ] **Step 2: Run the tests and see them fail**
  - Run: `pnpm vitest run tests/unit/brand-profile.test.ts tests/unit/brand-stream.test.ts`
  - Expected: FAIL, because the module isn't found.

- [ ] **Step 3: Implement both modules, and add `'brand'` to `scope-enum`**

- [ ] **Step 4: Run the tests and see them pass**
  - Run: the same command, then `pnpm typecheck`.
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): brand profile schema and stream lines`.

### Task 2: Cleaning URLs and the address check

**Files:**
- Create: `lib/brand/url.ts`, `lib/brand/address.ts`
- Modify: `package.json` (add `ipaddr.js` 2.5.0)
- Test: `tests/unit/brand-url.test.ts`, `tests/unit/brand-address.test.ts`

**Interfaces:**
- Produces:
  - `cleanUrl(input: string): URL | null`
    - Trims, adds `https://` when no scheme is given, and drops the hash.
    - Returns `null` for a non-http(s) scheme, a non-default port, or a
      username or password.
    - Lower-cases the host.
  - `samePath(a: string, b: string): boolean`: true when two URLs match after
    dropping the query and a trailing slash.
  - `isPublicAddress(ip: string): boolean`: true only for
    `ipaddr.parse(ip).range() === 'unicast'`. An IPv4-mapped IPv6 address is
    converted with `toIPv4Address()` first.
  - `hostIsIpLiteral(url: URL): string | null`: the address, when the host is
    one. The WHATWG `URL` parser already turns `2130706433` and `0x7f.1` into
    `127.0.0.1`.
  - `checkedLookup(resolve: (host: string) => Promise<{ address: string; family: 4 | 6 }[]>)`:
    a `net.LookupFunction` for undici's `connect.lookup`.
    - Resolves all addresses with `dns.promises.lookup(host, { all: true })`
      by default.
    - Fails with an error whose `code` is `'BLOCKED_ADDRESS'` if any address
      isn't public.
    - Otherwise answers with the first address, so the socket connects to
      the address that was checked.

- [ ] **Step 1: Write the failing tests**
  - `cleanUrl`, as a table:

    | Input | Result |
    |---|---|
    | `' svargabalimassage.com '` | `https://svargabalimassage.com/` |
    | `'http://x.com/#a'` | `http://x.com/` |
    | `'ftp://x.com'` | null |
    | `'https://x.com:8443'` | null |
    | `'https://u:p@x.com'` | null |
    | `'https://X.COM/Path'` | host `x.com`, path kept |
    | `''` | null |
    | `'javascript:alert(1)'` | null |
  - `isPublicAddress` is false for each of:
    - `10.0.0.5`, `127.0.0.1`, `169.254.169.254`, `100.64.0.1`;
    - `192.168.1.1`, `0.0.0.0`, `224.0.0.1`;
    - `::1`, `::ffff:127.0.0.1`, `fd00::1`, `fe80::1`.

    It is true for `8.8.8.8` and `2606:4700::1111`.
  - `hostIsIpLiteral` gives `127.0.0.1` for `http://2130706433/` and
    `http://0x7f.1/`, and gives null for `http://example.com/`.
  - `checkedLookup refuses a host with one public and one private address`:
    the fake resolver returns `[{8.8.8.8,4},{10.0.0.1,4}]`. Expect
    `BLOCKED_ADDRESS`.
  - `checkedLookup answers the checked address`: the callback gets
    `8.8.8.8`.

- [ ] **Step 2: Run the tests and see them fail**
  - Run: `pnpm vitest run tests/unit/brand-url.test.ts tests/unit/brand-address.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: `pnpm add ipaddr.js@2.5.0 --save-exact`, then implement both modules**

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): clean submitted URLs and refuse private addresses`.

### Task 3: The safe fetcher

**Files:**
- Create: `lib/brand/fetch-safe.ts`
- Modify: `package.json` (add `undici` 8.11.2)
- Test: `tests/unit/brand-fetch-safe.test.ts`

**Interfaces:**
- Consumes:
  - From Task 2: `cleanUrl`, `isPublicAddress`, `hostIsIpLiteral` and
    `checkedLookup`.
- Produces:
  - `type Transport = (url: URL, init: { signal: AbortSignal; headers: Record<string, string> }) => Promise<Response>`.
    It is called with `redirect: 'manual'` semantics, so a 3xx comes back
    as is.
  - `undiciTransport(): Transport`:
    - `undici.fetch` with an `Agent({ connect: { lookup: checkedLookup(...) } })`;
    - `redirect: 'manual'`.
  - `class FetchError extends Error`, with
    `kind: 'blocked' | 'unreachable' | 'too_large' | 'wrong_type' | 'timeout'`.
  - `type Fetched = { url: URL; finalUrl: URL; contentType: string; body: Uint8Array }`.
  - `createFetcher(opts: { transport: Transport; budget: AbortSignal; perResponseMs?: number; maxBytes?: number; record?: (f: Fetched) => void })`.
    It returns `{ fetchPage(url, { crossSiteRedirects: boolean }), fetchStylesheet(url), fetchImage(url, { allowSvg: boolean }), fetchRobots(url) }`.
    - Each returns `Promise<Fetched>` and throws a `FetchError`.
    - Defaults: `perResponseMs: 10_000`, `maxBytes: 2_000_000`.
    - `record` lets the fixture saver (Task 11) capture every response.
  - `MAX_REDIRECTS = 3`, `USER_AGENT = 'ShopfrontBot/1.0'`.

- [ ] **Step 1: Write the failing tests**
  The tests use an in-memory `Transport` built from a map of URL to
  `() => Response`.
  - `sends the ShopfrontBot user agent`.
  - `follows a same-site redirect, at most 3`: a 4th redirect gives
    `unreachable`.
  - `refuses a redirect to http://169.254.169.254/ with blocked`, before
    calling the transport for it.
  - `refuses http://127.0.0.1/ without calling the transport`.
  - `refuses a cross-site redirect unless crossSiteRedirects`.
    `www.` ↔ bare host counts as the same site.
  - `cuts a body past 2 MB`: a `ReadableStream` that yields 64 KB chunks
    without end and has no `Content-Length`. Expect `too_large`, and the
    stream cancelled after ≤ 2 MB + 1 chunk read.
  - `wrong_type`:
    - a page served as `application/pdf`;
    - an SVG through `fetchImage` without `allowSvg`.
  - `per-response timeout`: a transport that never resolves, with
    `perResponseMs: 50`. Expect `timeout`.
  - `budget abort stops a fetch in flight`.
  - `status ≥ 400 is unreachable`.

- [ ] **Step 2: Run the tests and see them fail**
  - Run: `pnpm vitest run tests/unit/brand-fetch-safe.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: `pnpm add undici@8.11.2 --save-exact`, then implement**
  - Read the body with a reader, counting bytes.
  - The signal is `AbortSignal.any([budget, AbortSignal.timeout(perResponseMs)])`.
  - An undici error whose cause has `code === 'BLOCKED_ADDRESS'` becomes
    `blocked`.

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): fetch pages safely with size, time and redirect limits`.

### Task 4: robots.txt and choosing pages

**Files:**
- Create: `lib/brand/robots.ts`, `lib/brand/pages.ts`
- Modify: `package.json` (add `cheerio` 1.2.0 and `robots-parser` 3.0.1)
- Test: `tests/unit/brand-robots.test.ts`, `tests/unit/brand-pages.test.ts`

**Interfaces:**
- Produces:
  - `robotsAllows(robotsTxt: string | null, robotsUrl: string): (url: string) => boolean`.
    A null file allows everything. It checks `ShopfrontBot`;
    `robots-parser` falls back to `*` by itself.
  - `englishHome(html: string, homeUrl: URL): URL | null`: the
    `hreflang="en"` (or `en-*`) alternate, when there is one and it differs
    from `homeUrl`.
  - `otherLanguagePrefixes(html: string, homeUrl: URL): string[]`: the path
    prefixes of non-English `hreflang` alternates, such as `['/ko/', '/zh/']`.
  - `choosePages(html: string, homeUrl: URL): URL[]`: at most 7 internal
    links, in rank order.
  - `PAGE_WORDS`: the constant from the spec,
    `about, story, team, services, treatments, menu, prices, pricing, packages, booking, book, contact, location, faq`.

- [ ] **Step 1: Write the failing tests**
  - `robots disallow / for * blocks the home page`, and `allow when null`.
  - `ShopfrontBot group beats *`.
  - `choosePages`:
    - ranks `/about-us` and `/our-services` (1 word each) by page order;
    - puts `/services-and-prices` (2 words) first;
    - matches link text "Our Treatments" on `/t`;
    - drops another host, a `mailto:` link and `#top`;
    - treats `/about` and `/about/?ref=nav` as one;
    - returns at most 7;
    - skips `/ko/about`.
  - `englishHome picks hreflang en-US on a page whose x-default is /ko/`.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Add the two packages exactly, then implement with cheerio**
  - Match words on path segments split on `-`, `_` and `/`, and on link
    text, ignoring case. A plural `s` and a `-us` suffix are allowed. Ties
    go to the shorter path.

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): respect robots.txt and pick the pages to read`.

### Task 5: Extracting structured facts

**Files:**
- Create: `lib/brand/extract/structured.ts`
- Test: `tests/unit/brand-extract-structured.test.ts`

**Interfaces:**
- Produces:
  - `BUSINESS_TYPES: readonly string[]`: `LocalBusiness` plus its common
    subtypes from the spec, extended as needed.
  - `type CodeFacts`:

    ```ts
    {
      business: {
        name?, address?: { street?, town?, region?, country? }, areaServed?,
        telephone?, email?, hours?, priceRange?, offers: { name, price? }[],
        sameAs: string[], logo?
      } | null;
      meta: { siteName?, title?, description?, ogImage?, themeColor? };
      contact: { whatsapp: string[]; phone: string[]; email: string[]; instagram: string[] };
      source: string;
    }
    ```

    Every value is a string, and `source` is the page URL.
  - `extractStructured(html: string, pageUrl: URL): CodeFacts`.

- [ ] **Step 1: Write the failing tests**
  - `reads a DaySpa from an @graph`.
  - `reads @type given as an array`.
  - `skips a JSON-LD block that is invalid JSON and reads the next`.
  - `ignores a WebSite or BreadcrumbList object`.
  - `openingHoursSpecification becomes "Mo-Su 09:00-22:00"`, and a string
    `openingHours` is kept as written.
  - `contact links`:
    - `wa.me/6281234567890`, `api.whatsapp.com/send?phone=84905123456` and
      `whatsapp://send?phone=...` give digits;
    - `tel:` and `mailto:` are read too;
    - `instagram.com/svarga.bali/` gives `svarga.bali`;
    - `instagram.com/p/abc` is ignored.
  - `meta`: `og:site_name`, `<title>`, `theme-color`.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Implement with cheerio**

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): extract JSON-LD, meta tags and contact links`.

### Task 6: Colours, logo, text and photos

**Files:**
- Create: `lib/brand/extract/colours.ts`, `lib/brand/extract/visual.ts`,
  `lib/brand/extract/text.ts`
- Test: `tests/unit/brand-extract-visual.test.ts`,
  `tests/unit/brand-extract-text.test.ts`

**Interfaces:**
- Produces:
  - `toHex(cssColour: string): string | null`: handles `#rgb`, `#rrggbb`,
    `rgb()`, `hsl()` and named basics. Returns lower-case `#rrggbb`.
  - `brandColours(themeColor: string | undefined, css: string[]): { hex: string; role: 'primary'|'accent'|'background'|'text'; source: string }[]`.
    - Sources:
      - `theme-color`, for the meta tag;
      - `css:<property>`, for a custom property whose name matches
        `/--(primary|brand|accent|color-[\w-]+)/`.
    - Near-white (lightness > 0.95), near-black (< 0.08) and greys
      (saturation < 0.1) go to `background` or `text`, never `primary`.
    - At most 5, de-duplicated.
  - `linkedStylesheets(html: string, pageUrl: URL): URL[]`: same host,
    at most 2.
  - `inlineCss(html: string): string[]`.
  - `findLogo(html: string, pageUrl: URL, jsonLdLogo?: string): URL | null`,
    in the spec's order.
  - `photoCandidates(htmls: { html: string; url: URL }[], ogImage?: string): URL[]`:
    filtered and ranked as in the spec, at most 6.
  - `visibleText(html: string): string`: removes `script`, `style`, `nav`,
    `header`, `footer`, `noscript`, `[role=navigation]`, and elements whose
    id or class contains `cookie`. Collapses whitespace.
  - `shareTextBudget(pages: { url: string; text: string }[], totalChars = 60_000): { url: string; text: string }[]`:
    shares the budget evenly. A page under its share gives the rest to the
    pages after it. Keeps the home page first.

- [ ] **Step 1: Write the failing tests**
  - `toHex`: `#abc`→`#aabbcc`, `rgb(18, 52, 86)`→`#123456`,
    `hsl(0 100% 50%)`→`#ff0000`, `var(--x)`→null.
  - `brandColours`:
    - `--primary: #1f6f5c` gives `primary`;
    - `--color-bg: #ffffff` gives `background`;
    - `--color-grey: #888` never gives `primary`;
    - 7 inputs give 5.
  - `findLogo`: the JSON-LD logo first; then `<img class="site-logo">` in a
    `header`; then the largest `apple-touch-icon`.
  - `photoCandidates`:
    - drops `.svg`, `data:` and `logo-white.png`;
    - drops `width="120"`;
    - keeps one of `hero-300x200.jpg` and `hero.jpg`;
    - takes the largest `srcset` entry;
    - ranks `og:image` first;
    - returns at most 6.
  - `visibleText` drops nav, footer and a `#cookie-banner`, and keeps the
    `main` text.
  - `shareTextBudget`:
    - 3 pages of 50,000 characters each come to 60,000 in total, 20,000 each;
    - a short page passes its unused share on.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): extract colours, logo, page text and photo candidates`.

### Task 7: Phone numbers, merging and the checks

**Files:**
- Create: `lib/brand/phone.ts`, `lib/brand/checks.ts`
- Modify: `package.json` (add `libphonenumber-js` 1.13.15)
- Test: `tests/unit/brand-phone.test.ts`, `tests/unit/brand-checks.test.ts`

**Interfaces:**
- Consumes:
  - From Task 1: `ModelProfile`, `PartialProfile` and `Profile`.
  - From Task 5: `CodeFacts`.
- Produces:
  - `toE164(raw: string, countryHint?: string): string | null`.
    - `countryHint` is an ISO code taken from the JSON-LD address.
    - A number that can't be parsed is returned as written. Null only for
      under 6 digits.
  - `normaliseSource(source: string, pagesRead: string[]): string | null`:
    - resolves a relative path against the site;
    - ignores a trailing slash and the query;
    - returns the matching entry of `pagesRead`, or null;
    - passes `"model"` through.
  - `type PageTexts = Map<string, string>`: URL to the full visible text of
    that page, before the budget cut.
  - `codeProfile(facts: CodeFacts[], extra: { siteUrl, pagesRead, colours, logoUrl, photoUrls }): PartialProfile`:
    the first `partial` line.
  - `mergeAndCheck(code: PartialProfile, model: DeepPartial<ModelProfile>, ctx: { facts: CodeFacts[]; pages: PageTexts; pagesRead: string[] }): { profile: PartialProfile; dropped: { field: string; reason: string }[] }`.
    It applies, in order:
    1. Source normalisation, then dropping facts whose source isn't one of
       `pagesRead`.
    2. Code wins for the address, phone, WhatsApp, email, Instagram and
       hours.
    3. The name rule:
       - the model's name is kept if it appears, ignoring case, inside a
         JSON-LD `name`, `og:site_name` or `<title>` from its source page;
       - otherwise the JSON-LD `name`;
       - otherwise `og:site_name`, cut at the first `|`, ` - ` or ` – `.
    4. The on-page check:
       - phone, WhatsApp and every price are compared on digits;
       - email is compared ignoring case.
    5. E.164 for phone and WhatsApp.
    6. Colours: the model's colours are kept with source `"model"` only when
       code found fewer than 2.

    It is pure, so it runs on every partial and on the final.
  - `finalise(profile: PartialProfile, meta: { readAt: string; promptVersion: string; thin: boolean }): Profile`.
    It fills `schemaVersion`, the meta fields and `dropped`, then parses
    with `profileSchema`.

- [ ] **Step 1: Write the failing tests**
  - `toE164`:
    - `'+84 905 123 456'`→`'+84905123456'`;
    - `'0812-3456-7890'` with `'ID'`→`'+6281234567890'`;
    - `'6281234567890'` (from wa.me)→`'+6281234567890'`.
  - `normaliseSource`: `'/about'` and `'https://site/about/'` both match
    `https://site/about`. This is a Review Focus test.
  - `code beats the model on phone`: the spec's scenario, with the JSON-LD
    page as the source.
  - `a price not on its page is dropped`, and `dropped` holds
    `{ field: 'offerings[2].price', reason: 'not_on_page' }`.
  - `a fact with an unknown source is dropped`, with reason
    `unknown_source`.
  - `name`:
    - `"Svarga"` is kept when the JSON-LD has `"Svarga Bali Massage"`;
    - `"Svarga Luxury"` is replaced by the JSON-LD name;
    - with no JSON-LD and `og:site_name` `"Sen Spa | Da Nang"`, the name is
      `"Sen Spa"`.
  - `model colours are kept only when code found under 2`.
  - `mergeAndCheck on a half-streamed model object` (missing fields,
    `offerings` cut mid-item) doesn't throw, and keeps what is checked.
  - `finalise rejects a profile with no name`. The route turns this into
    `model_failed`.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Add `libphonenumber-js` exactly, then implement**

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): merge code and model facts, and drop what the site doesn't show`.

### Task 8: The text-model module, the prompt and the replayer

**Files:**
- Create: `lib/ai/text-model.ts`, `lib/ai/replay.ts`, `lib/brand/prompt.ts`
- Modify: `package.json` (add `ai` 7.0.137 and `@ai-sdk/google` 4.0.93),
  `.env.example` (add `GOOGLE_GENERATIVE_AI_API_KEY=` with a comment)
- Test: `tests/unit/ai-text-model.test.ts`, `tests/unit/brand-prompt.test.ts`

**Interfaces:**
- Consumes:
  - From Task 1: `modelProfileSchema` and `ModelProfile`.
- Produces:
  - `TEXT_MODELS = { brand: 'gemini-3.8-flash', light: 'gemini-3.5-flash-lite' } as const`.
  - `type BrandModelInput = { system: string; text: string; images: { url: string; data: Uint8Array; mediaType: string }[] }`.
  - `interface TextModel { streamBrandProfile(input: BrandModelInput, signal: AbortSignal): AsyncIterable<DeepPartial<ModelProfile>> & { final: Promise<ModelProfile> } }`.
  - `class ModelError extends Error`, with `kind: 'busy' | 'failed'`.
    - `busy` for a 429 or 503 from the provider.
    - `failed` for anything else, including a missing key and output that
      fails the schema.
    - An abort is re-thrown as is.
  - `geminiTextModel(): TextModel`.
    - Uses the AI SDK's structured streaming with `modelProfileSchema`.
      That's `streamObject`, or `streamText` with `Output.object` if v7
      dropped `streamObject`; record which one in the journal.
    - Thinking level low through the Google provider options.
    - Passes `abortSignal: signal`.
  - `type Recording = { modelId: string; promptVersion: string; partials: unknown[]; final: unknown }`.
  - `replayTextModel(rec: Recording, opts?: { delayMs?: number; hang?: boolean; error?: 'busy' | 'failed' }): TextModel`.
  - `recordingTextModel(inner: TextModel, onDone: (rec: Recording) => void): TextModel`,
    used by the eval's `--record`.
  - `BRAND_PROMPT_VERSION = 'brand-1'`.
  - `brandPrompt(): string`: the system prompt. It holds the six rules from
    the spec's "Instructions" list, in that order.
  - `brandUserText(pages: { url: string; text: string }[], facts: CodeFacts[]): string`.
    Each page is headed `### Page: <url>`, then a `### Facts found in code`
    section in JSON.

- [ ] **Step 1: Write the failing tests**
  - `the replayer yields the partials in order, then final`.
  - `hang never resolves until aborted, then rejects with AbortError`.
  - `error busy rejects final with ModelError busy`.
  - `geminiTextModel without a key throws ModelError failed`, with
    `GOOGLE_GENERATIVE_AI_API_KEY` unset in the test.
  - `brandUserText heads each page with its URL and keeps page order`.
  - `brandPrompt mentions leave empty, source URL, prices as written, no people, English`.
    These are string-contains checks, to guard the rules.
  - `only lib/ai/text-model.ts imports @ai-sdk/google`: grep the repo's `.ts`
    and `.tsx` files, outside `node_modules`, in the test.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Add the two packages exactly, then implement**

- [ ] **Step 4: Run the tests and see them pass**
  - Run: the tests, then `pnpm typecheck`.
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): text-model module with the brand prompt and a replayer`.

### Task 9: The read, end to end in code

**Files:**
- Create: `lib/brand/read.ts`
- Test: `tests/unit/brand-read.test.ts`, with small hand-written sites built
  inline as an in-memory `Transport`

**Interfaces:**
- Consumes:
  - All of Tasks 1 to 8.
- Produces:
  - `class BrandReadError extends Error`, with `code: BrandErrorCode`.
  - `type ReadDeps = { transport: Transport; model: TextModel; now?: () => Date; limits?: { fetchMs: number; totalMs: number } }`.
    The defaults are `10_000` and `30_000`.
  - `type PreparedRead = { siteUrl: URL; pagesRead: string[]; facts: CodeFacts[]; pages: PageTexts; modelInput: BrandModelInput; first: PartialProfile; thin: boolean; deadline: AbortSignal }`.
  - `prepareRead(rawUrl: string, deps: ReadDeps, signal: AbortSignal): Promise<PreparedRead>`.
    1. `cleanUrl`, or `invalid_url`.
    2. The IP literal check, or `blocked_address`.
    3. `robots.txt`, then the home page with cross-site redirects allowed.
       Then `englishHome`, the chosen pages (4 at a time), stylesheets, the
       logo and the photos, all under the fetch budget.
    4. Extraction, thinness and the first partial.

    Fetch errors on the home page map to `blocked_address`, `unreachable`
    or `robots_disallowed`. Any other fetch that fails is skipped.
  - `streamProfile(prepared: PreparedRead, deps: ReadDeps, signal: AbortSignal): AsyncGenerator<StreamLine>`.
    1. Yields the `first` partial.
    2. For each model partial, yields `mergeAndCheck(...)` when the result
       changed (compared by JSON).
    3. Then one `final` (`finalise`).
    4. On `ModelError` busy, yields `error` with `model_busy`. On a timeout
       (the deadline, `totalMs` from the start), `model_timeout`. On any
       other failure or a schema failure, `model_failed`.
    5. A client abort (`signal`) ends it silently.

- [ ] **Step 1: Write the failing tests**
  - `full read on a small site`:
    - home, `/about` and `/services`, with JSON-LD and 2 photos;
    - lines are `partial` (code facts, before the replayer yields), then
      partials, then `final`;
    - `pagesRead` has 3 entries.
  - `robots_disallowed, with only robots.txt requested`, which the
    transport's call log confirms.
  - `unreachable when the home page is 404`.
  - `blocked_address for http://10.0.0.5/`, with no transport call.
  - `thin site: one page with 120 characters and no JSON-LD` gives
    `thin: true` in `final`.
  - `no photos: visualStyle null, photoUrls []`. The replayed model's style
    is overridden to null when no photos were sent.
  - `hreflang site reads /en/ and skips /ko/about`.
  - `a stylesheet that is slow past the fetch budget is skipped, and the read still finishes`,
    with `limits.fetchMs: 100`.
  - `the model hangs: error line model_timeout`, with `limits.totalMs: 300`.
    The test asserts that the elapsed time is under 1 s.
  - `the model is busy: error line model_busy`.
  - `no partial ever holds a number that isn't on its page`: the replayer
    streams a made-up WhatsApp number. It never appears in any line.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run the tests and see them pass**
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): read a site and stream a checked profile`.

### Task 10: The route

**Files:**
- Create: `app/api/brand/read/route.ts`, `lib/brand/deps.ts`
- Test: `tests/unit/brand-route.test.ts`; append a scenario to
  `tests/e2e/pilot-gate.spec.ts`

**Interfaces:**
- Consumes:
  - From Task 9: `prepareRead`, `streamProfile` and `BrandReadError`.
  - From Task 1: `ERROR_STATUS` and `encodeLine`.
- Produces:
  - `POST(request: Request): Promise<Response>`.
  - `runtime = 'nodejs'` and `maxDuration = 30`.
  - `defaultDeps(): ReadDeps`, which uses `undiciTransport()` and
    `geminiTextModel()`. The test swaps it with
    `vi.mock('@/lib/brand/deps')`.

- [ ] **Step 1: Write the failing tests**
  - `bad JSON or a missing url gives 400 invalid_url`.
  - `a BrandReadError before the stream gives JSON with its status`.
  - `success gives 200 application/x-ndjson`, and `readLines` over the body
    ends with `final`.
  - The Playwright scenario: `POST /api/brand/read without a session is 401`.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Implement**
  - The body is a `ReadableStream` pulling from `streamProfile`, so a
    cancel aborts the generator.

- [ ] **Step 4: Run the tests and see them pass**
  - Run: `pnpm check`, then
    `pnpm test:e2e --grep "brand"`.
  - Expected: PASS.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): POST /api/brand/read`.

### Task 11: Fixtures, the eval and the scripts

**Files:**
- Create:
  - `lib/brand/fixtures.ts`: the fixture transport, and loading and saving
    a fixture;
  - `lib/brand/eval/score.ts`;
  - `scripts/save-fixture.ts` and `scripts/eval-brand.ts`.
- Modify:
  - `package.json`: scripts `"fixtures:save": "tsx scripts/save-fixture.ts"`
    and `"eval:brand": "tsx scripts/eval-brand.ts"`, plus `tsx` 4.23.15 as a
    dev dependency;
  - `.gitignore`: `.fixtures-cache/`;
  - `AGENTS.md`: in the Map, `lib/brand/`, `lib/ai/` and
    `tests/fixtures/sites/`; in Commands, the two scripts, noting that
    `eval:brand` spends real Gemini quota (about 20 reads a day) and isn't
    run on a pilot day.
- Test: `tests/unit/brand-eval-score.test.ts`,
  `tests/unit/brand-fixtures.test.ts`, with one tiny hand-made fixture in
  `tests/fixtures/sites/_sample/`

**Interfaces:**
- Produces:
  - `type Manifest = { siteUrl: string; savedAt: string; files: { path: string; url: string; finalUrl: string; contentType: string }[]; photoUrls: string[]; logoUrl: string | null }`.
  - `type Expected = { acceptedNames: string[]; whatsapp: string | null; town: string; summaryKeywords: string[]; offerings: string[]; brandColours: string[]; thin: boolean }`,
    with its zod schema.
  - `fixtureTransport(dir: string, opts?: { imageCache?: string; live?: Transport }): Transport`.
    - Serves the saved files by URL, and by final URL for redirects.
    - Images come from `.fixtures-cache/`, else `live` when given (the eval
      only), else 404.
    - Strips nothing at read time.
  - `saveFixture(url: string, slug: string): Promise<void>`.
    - Runs `prepareRead` with `undiciTransport` and a `record` hook.
    - Writes `pages/<n>.html` (scripts other than JSON-LD removed),
      `css/<n>.css`, `robots.txt` and `manifest.json`.
    - Caches images to `.fixtures-cache/<slug>/`.
    - Does no model call.
  - `scoreFixture(profile: Profile, expected: Expected, pages: PageTexts): { pass: boolean; failures: string[] }`.
    It implements the 8 checks from the spec:
    - names are compared case-, accent- and punctuation-free, with NFD and
      the marks stripped;
    - an offering matches on a normalised name, either one containing the
      other;
    - colour distance is RGB Euclidean, 60 at most.
  - `scripts/eval-brand.ts [slug…] [--record]`:
    - for each fixture, `prepareRead` with `fixtureTransport(live:
      undiciTransport())` then `streamProfile` with `geminiTextModel()`
      (wrapped by `recordingTextModel` when `--record`);
    - prints `<slug>  PASS|FAIL  <ms> ms  <failures>  dropped=<n>`, then
      `brand eval: <passed>/<total> passed · prompt brand-1 · model gemini-3.8-flash`;
    - on `model_busy`, stops, prints the total so far, and exits 2.

- [ ] **Step 1: Write the failing tests**
  - `scoreFixture`:
    - passes a matching profile;
    - fails each check separately (8 cases, each failure named);
    - `"Svarga Bali Massage!"` matches `"svarga bali massage"`;
    - `#1f6f5c` against `#22705e` passes, and against `#ff0000` fails.
  - `fixtureTransport serves _sample's home page and follows its redirect entry`.
  - `fixtureTransport returns 404 for an uncached image without live`.
  - `prepareRead + replay over _sample gives the expected final profile`.

- [ ] **Step 2: Run the tests and see them fail**
  - Expected: FAIL.

- [ ] **Step 3: Implement, and add `tsx` exactly**

- [ ] **Step 4: Run the tests and see them pass**
  - Run: `pnpm check`.
  - Expected: PASS. `node scripts/check-repo.mjs` finds every path that
    `AGENTS.md` cites.

- [ ] **Step 5: Commit**
  - Message: `feat(brand): site fixtures, scoring and pnpm eval:brand`.

### Task 12: The 20 real fixtures

This task needs the network and a check by the developer. It makes no model
call.

**Files:**
- Create: `tests/fixtures/sites/<slug>/`, 20 folders, and
  `docs/specs/brand/extract-site/journal.md` from `docs/templates/journal.md`.

- [ ] **Step 1: Propose the list**
  - Write the 20 sites in the journal: `sen` and `svarga`, then 18 English
    small-business sites in South-East Asia.
  - The 18 must include spas, cafés, guesthouses, tour operators and shops,
    on WordPress, Wix, Squarespace, Shopify and hand-made sites.
  - At least 2 must be expected to come back thin (JavaScript-only).
  - Give each one's URL, type and builder.

- [ ] **Step 2: Stop and ask the developer to check the list**
  - Continue only with the list they confirm, and record it in the journal.

- [ ] **Step 3: Save each fixture**
  - Run: `pnpm fixtures:save <url> <slug>`, once per site.
  - Expected: each folder holds `manifest.json`, `robots.txt`, at least one
    page, and `css/` when the site links stylesheets.

- [ ] **Step 4: Write each `expected.json`**
  - Write it from the saved pages, using only what the pages show.

- [ ] **Step 5: Stop and ask the developer to check the 20 expected files**
  - Record any corrections in the journal.

- [ ] **Step 6: Commit**
  - Run `pnpm check` first.
  - Message: `test(brand): 20 saved site fixtures with expected profiles`.

### Task 13: Record, run the eval, reach the gate

Each full pass spends about a day of free Flash quota. Run it in batches,
never on a pilot day.

- [ ] **Step 1: Record the fixtures**
  - Run: `pnpm eval:brand <batch of up to 10 slugs> --record`, over as many
    days as the quota needs.
  - Expected: each scored fixture gets a `recording.json`.

- [ ] **Step 2: Add the replay acceptance tests**
  - Create `tests/unit/brand-fixtures-replay.test.ts`.
  - For `svarga` and `sen`, replay the recording and check that:
    - the name is one of the accepted names;
    - the town matches;
    - WhatsApp is in E.164 form and appears on its source page;
    - every source is in `pagesRead`;
    - `thin` is false.
  - For every fixture: the final profile passes `profileSchema`.

- [ ] **Step 3: Reach 16 of 20**
  - Read the failures.
  - Fix the extraction in code, or bump `BRAND_PROMPT_VERSION` to
    `brand-2`, and so on.
  - Re-run only the failing slugs, recording again. Each change, its reason
    and each eval summary line go in the journal.
  - Lower the photo count, or raise the thinking level, only if the eval's
    times or scores call for it; record it.

- [ ] **Step 4: The developer judges tone and style**
  - Print each fixture's tone words and visual style next to its photo URLs.
  - Record the developer's verdict per fixture in the journal.

- [ ] **Step 5: Commit**
  - Run `pnpm check` first.
  - Message: `test(brand): recorded brand reads, eval at <n>/20`.

### Task 14: Finish the branch

- [ ] **Step 1: Run everything**
  - Run: `pnpm check` and `pnpm test:e2e`.
  - Expected: all green.

- [ ] **Step 2: Mark the roadmap**
  - In `docs/roadmap.md`, set 1.1 to `done`.
  - Copy the final eval line into the journal.

- [ ] **Step 3: Commit, push, and give the PR body**
  - Message: `docs(docs): record the brand read and mark roadmap 1.1 done`.
  - Push the branch.
  - Give the developer a full, paste-ready PR body for a PR to `develop`. It
    names both the license (decision 0008) and roadmap 1.1, since this branch
    carries both.
