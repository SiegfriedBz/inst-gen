# Owner Guide Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** A `/guide` page, behind the pilot gate, that walks the owner
through Shopfront in English, Indonesian and Vietnamese, prints as A4, and
can be written out as three PDFs with `pnpm guide:pdf`.

**Architecture:** One client component, `components/guide/owner-guide.tsx`,
renders the eight sections from `messages/*.json` (`guide.*`), so the
language switch changes it at once like the home screen. Button names and
daily numbers are passed into the strings as values, from the buttons' own
message keys and from `OWNER_LIMITS`. A server page `app/guide/page.tsx`
checks the session and reads `GUIDE_CONTACT`. Print is CSS (`print:` variant
and an `@page` rule). The PDF script drives Playwright's Chromium against a
locally built app.

**Tech Stack:** Next.js 16, React 19, next-intl rich text, Tailwind 4,
`@phosphor-icons/react`, Vitest + Testing Library, Playwright. No new
dependency.

**Spec:** `docs/specs/guide/owner-guide/spec.md` (approved 2026-10-26)

## Global Constraints

- Every visible string in `messages/en.json`, `id.json`, `vi.json`, under `guide`, in the same commit; no em dash in any string (the messages test fails on one).
- Never translated: Shopfront, Instagram, WhatsApp, Google Maps, Safari, Chrome. `Anda` in Indonesian, `bạn` in Vietnamese; short sentences.
- Phone menu names ("Add to Home Screen", "Link", "Accessibility") in English in quotes unless the builder can confirm the localized name.
- Button names in the guide come from the buttons' keys, never retyped; daily numbers from `OWNER_LIMITS` (`lib/usage/limits.ts`), never typed into a string.
- No fixed reset hour anywhere in the guide: it says "the time on the bar".
- Icon library is `@phosphor-icons/react` (`Question`), not lucide: the spec's "lucide `CircleHelp`" names a library the app doesn't use; same icon, the app's library (plan's correction, noted in the journal).
- Tap targets at least 44px (`min-h-11`); no horizontal scroll at 320px in any language, light and dark.
- PDFs go to `.superpowers/guide/shopfront-guide-{en,id,vi}.pdf`, never committed.
- Commits: scope `web` for Tasks 1 to 3, `docs` for Task 4; stage by path; no push before Task 4.
- Journal: `docs/specs/guide/owner-guide/journal.md`, created in Task 1; RED and GREEN summary lines as printed.

## Review Focus

1. **The home header at 320px in Vietnamese** with the new "Guide" link beside the switch and the name pill: it must not push the page sideways. Test in Task 2.
2. **Printing from a phone in dark mode**: the PDF must still be black on white. Test in Task 2 (print media with a dark colour scheme).
3. **The `wa.me` example and long Vietnamese words at 320px**: the code sample must wrap, not scroll. Covered by Task 2's 320px check on `/guide` in each language.
4. **Section links after a language switch**: anchors use fixed ids (`start`, `business`, `posts`, `instagram`, `reviews`, `allowance`, `languages`, `trouble`), not translated text. Test in Task 1.
5. **Switching language without JavaScript on `/guide`** comes back to `/guide`, not `/`. Test in Task 2.

---

### Task 1: The guide's text and component

**Files:**
- Create: `components/guide/owner-guide.tsx`
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (new `guide` key)
- Test: `tests/unit/guide.test.tsx`
- Create: `docs/specs/guide/owner-guide/journal.md` (from `docs/templates/journal.md`)

**Interfaces:**
- Produces: `export function OwnerGuide({ contact, limits }: { contact: string | null; limits?: Record<'reads' | 'attempts' | 'newImages' | 'replies', number> }): JSX.Element` (client component; `limits` defaults to `OWNER_LIMITS`). `export const GUIDE_SECTIONS = ['start', 'business', 'posts', 'instagram', 'reviews', 'allowance', 'languages', 'trouble'] as const`.
- Produces message keys used by Task 2: `guide.link` ("Guide"), `guide.back` ("Back to Shopfront"), `guide.print` ("Print or save as PDF").

**The keys.** Under `guide`: `link`, `title` ("How to use Shopfront"), `intro` ("Everything you need, in about five minutes of reading."), `contents` ("On this page"), `back`, `print`, and one object per section id with a `title` and its lines, worded from the spec's "What it says" in that order. Steps that name a button take it as `{button}` inside `<b>…</b>`; code samples use `<code>…</code>`. The values passed in:

| Guide line | `{button}` from |
|---|---|
| `business.read` | `brand.home.read` |
| `business.check` | `brand.panel.edit` |
| `business.reread` | `brand.home.reread`, and `{forget}` from `brand.home.forget` |
| `posts.make` | `posts.make` |
| `posts.more` | `posts.makeMore` |
| `posts.edit` | `posts.editText`, and `{image}` from `posts.images.newImage` |
| `instagram.save` | `posts.saveImages` (written "1 {button}") |
| `instagram.copy` | `posts.copyText` (written "2 {button}") |
| `reviews.paste` | `reviews.write` |
| `reviews.other` | `reviews.again` |

`allowance.limits` takes `{reads}`, `{attempts}`, `{newImages}`, `{replies}`, each filled with the existing plural strings `usage.reads`, `usage.attempts`, `usage.newImages`, `usage.replies` at `{ count: limits[x] }`. `trouble.contact` takes `{contact}`, rendered as a link to `https://wa.me/<digits of contact>` showing the number as configured.

**Layout.** `<h1>` title, intro, a `<nav aria-label={contents}>` listing the eight titles as `<a href="#<id>">`; then each section a `<section id={id} aria-labelledby>` with an `<h2>`, paragraphs and `<ol>` for steps; then the print button (`type="button"`, `onClick={() => window.print()}`, `print:hidden`). `<code>` gets `break-all`. Headings `break-after-avoid`, sections `break-inside-avoid-page` in print.

- [ ] **Step 1: Write the failing tests** in `tests/unit/guide.test.tsx` (jsdom, rendered in `NextIntlClientProvider` with `messagesFor(locale)`):
  - `shows the eight sections in order, in each language`: for `en`, `id`, `vi`, the `h2` texts equal `GUIDE_SECTIONS.map(s => messages[locale].guide[s].title)`.
  - `the contents link to fixed ids`: each nav link's `href` is `#start` … `#trouble`, and in `vi` too.
  - `names buttons as the app does`: for each locale, the page text contains `messagesFor(locale).posts.saveImages`, `.posts.copyText`, `.posts.make`, `.brand.home.read`, `.reviews.write`.
  - `the numbers come from the limits`: with `limits={{ reads: 3, attempts: 4, newImages: 10, replies: 20 }}` the English text contains "4 attempts"; with the default, "3 attempts" and "20 replies".
  - `no contact, no contact line`: `contact={null}` has no `a[href^="https://wa.me/"]` in `#trouble`; `contact="+84 90 123 4567"` has one with `href="https://wa.me/84901234567"`.
  - `print button prints`: `window.print = vi.fn()`; clicking "Print or save as PDF" calls it once.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/guide.test.tsx`. Expected: FAIL, module `@/components/guide/owner-guide` not found. Copy the summary line to the journal (RED).
- [ ] **Step 3: Add the `guide` strings** to `en.json`, then `id.json` and `vi.json` with the same keys and placeholders.
- [ ] **Step 4: Implement `OwnerGuide`** as above.
- [ ] **Step 5: Run** `pnpm vitest run tests/unit/guide.test.tsx tests/unit/i18n-messages.test.ts`. Expected: PASS. Journal (GREEN).
- [ ] **Step 6: Commit**

```bash
git add components/guide/owner-guide.tsx messages/en.json messages/id.json messages/vi.json tests/unit/guide.test.tsx docs/specs/guide/owner-guide/journal.md
git commit -m "feat(web): owner guide text in three languages (roadmap 2.9)"
```

### Task 2: The `/guide` page, the way in, and print

**Files:**
- Create: `app/guide/page.tsx`
- Modify: `app/page.tsx` (header link), `app/globals.css` (print), `.env.example` (`GUIDE_CONTACT`)
- Test: `tests/e2e/guide.spec.ts`

**Interfaces:**
- Consumes: `OwnerGuide`, `guide.link`, `guide.back` from Task 1; `getCurrentOwner()` from `@/lib/pilot/current-owner`; `LanguageSwitch`, `ShopfrontMark`.
- Produces: route `/guide`; `export function guideContact(env = process.env): string | null` in `app/guide/page.tsx` or `lib/guide/contact.ts` (builder's call), returning the trimmed `GUIDE_CONTACT` or `null` when empty.

`app/guide/page.tsx`: as `app/page.tsx`, redirect to `/enter` without an owner. Header: `ShopfrontMark`, `LanguageSwitch returnTo="/guide"`, and a client "Back to Shopfront" link to `/` (`min-h-11`), all `print:hidden`. Then `<OwnerGuide contact={guideContact()} />`. No `UsageProvider`.

Home header (`app/page.tsx`): a client link to `/guide` with phosphor `Question` (aria-hidden) and `guide.link`, `min-h-11`, before `LanguageSwitch`. If it doesn't fit at 320px in Vietnamese, the label becomes `sr-only` below 360px and only the icon shows (builder's call, journal it).

Print (`app/globals.css`): `@page { size: A4; margin: 16mm; }`; under `@media print`, the layout column's `max-w-[420px]` lifts to full width, body black on white with backgrounds off whatever the colour scheme, links shown as plain text.

`.env.example`: `GUIDE_CONTACT=` with a comment: the developer's WhatsApp, with country code, shown at the end of the owner guide; empty hides the line.

- [ ] **Step 1: Write the failing Playwright tests** in `tests/e2e/guide.spec.ts` (sign in as `i18n.spec.ts` does):
  - `opens from the home screen`: tap the "Guide" link, URL is `/guide`, `h1` is "How to use Shopfront", 8 `h2`.
  - `switches language and stays`: on `/guide`, tap `VI`; the `h1` equals `vi.guide.title` and the URL is still `/guide`.
  - `switches without JavaScript`: in a context with `javaScriptEnabled: false`, submit `ID`; lands on `/guide` with `id.guide.title`.
  - `back to Shopfront`: tap `guide.back`, URL is `/`.
  - `private`: in a fresh context, `/guide` goes to `/enter`.
  - `no sideways scroll at 320px`: viewport 320×700; for `en`, `id`, `vi` (cookie `shopfront_locale`), on `/guide` and on `/`, `document.documentElement.scrollWidth <= 320`.
  - `prints plain`: `page.emulateMedia({ media: 'print', colorScheme: 'dark' })`; the language switch nav, the back link and the print button are hidden; `getComputedStyle(document.body).backgroundColor` is white and `h1` colour is black.
- [ ] **Step 2: Run** `pnpm test:e2e tests/e2e/guide.spec.ts`. Expected: FAIL (no "Guide" link, `/guide` 404). Journal (RED).
- [ ] **Step 3: Implement the page, the header link, the print CSS and `.env.example`.**
- [ ] **Step 4: Run** `pnpm test:e2e tests/e2e/guide.spec.ts tests/e2e/home-tabs.spec.ts tests/e2e/i18n.spec.ts`. Expected: PASS (the last two show the header change broke nothing). Journal (GREEN).
- [ ] **Step 5: Commit**

```bash
git add app/guide/page.tsx app/page.tsx app/globals.css .env.example tests/e2e/guide.spec.ts docs/specs/guide/owner-guide/journal.md
git commit -m "feat(web): the guide page, its link and print layout (roadmap 2.9)"
```

### Task 3: `pnpm guide:pdf`

**Files:**
- Create: `scripts/guide-pdf.ts`
- Modify: `package.json` (`"guide:pdf": "tsx scripts/guide-pdf.ts"`), `playwright.config.ts` (`export const testEnv`)

**Interfaces:**
- Consumes: `testEnv` from `playwright.config.ts`; `LOCALES` from `@/lib/i18n/locale`.

The script: runs `pnpm build`, then `pnpm start` with `testEnv` (child process), waits for `http://localhost:3000/robots.txt`; launches `chromium` from `@playwright/test`; signs in with the `dev` test passphrase (`test-quiet-stone-dev`); for each locale sets the `shopfront_locale` cookie, opens `/guide`, and writes `page.pdf({ format: 'A4', path })` to `.superpowers/guide/shopfront-guide-<locale>.pdf`; stops the server in a `finally`; prints each path and its page count. Exits non-zero if any step fails. A port already in use is an error that says so (no reuse: the build must be this checkout's).

- [ ] **Step 1: Run** `pnpm guide:pdf`. Expected: three paths printed, each 4 to 6 pages.
- [ ] **Step 2: Open the three PDFs** and check: no buttons, links or switch; headings not orphaned at a page foot; Vietnamese diacritics render. Journal what was seen and any fix made to the print CSS.
- [ ] **Step 3: Commit**

```bash
git add scripts/guide-pdf.ts package.json playwright.config.ts docs/specs/guide/owner-guide/journal.md
git commit -m "feat(web): write the owner guide as three PDFs (roadmap 2.9)"
```

### Task 4: Docs, full check, PR

**Files:**
- Modify: `AGENTS.md` (Commands: `pnpm guide:pdf` with "⚠️ builds the app; writes three PDFs under `.superpowers/guide`"; Map: `app/` row mentions the `/guide` page, new row `components/guide/`), `docs/roadmap.md` (2.9 → `done`), journal.

- [ ] **Step 1: Update the docs** as listed.
- [ ] **Step 2: Run** `pnpm check`. Expected: exits 0.
- [ ] **Step 3: Run** `pnpm test:e2e`. Expected: all pass. Journal the summary line.
- [ ] **Step 4: Commit**

```bash
git add AGENTS.md docs/roadmap.md docs/specs/guide/owner-guide/journal.md
git commit -m "docs(docs): owner guide shipped (roadmap 2.9)"
```

- [ ] **Step 5: Push** the branch over SSH and give the person a paste-ready PR title and body for a PR to `develop`, opened on github.com.
