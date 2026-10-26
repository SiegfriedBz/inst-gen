# Owner guide: journal

## Calls made along the way

- 2026-10-26: The home link's icon is Phosphor's `Question`: the spec names
  lucide's `CircleHelp`, but the app's icon library is
  `@phosphor-icons/react` (plan, Global Constraints).
- 2026-10-26: "Your business" doesn't give a reading time: the app's own hint
  says about 20 seconds, the spec said about a minute; the guide says keep
  the page open while it reads.
- 2026-10-26: The guide's "Getting started" names the passphrase screen's
  button from `enter.submit`, and "Making your posts" and "Replying to
  reviews" name their tabs from `home.tabs`, like the other buttons.
- 2026-10-26: The contents list has no heading of its own: the `nav`'s label
  names it, and the page's `h2`s are the eight sections only.
- 2026-10-26: Quoted app messages in "If something goes wrong" are copied by
  hand from `usage.*` (their first sentence), not passed in: they carry a
  `{time}` the guide can't fill.
- 2026-10-26: `guideContact` lives in `lib/guide/contact.ts`: a Next.js page
  file may only export the page and its route settings.
- 2026-10-26: The two links are client components
  (`components/guide/guide-links.tsx`) so they switch language at once, like
  the rest of the header.
- 2026-10-26: Print also touches `app/layout.tsx`: its 420px column widens to
  the page and drops its padding, so A4 uses its width.
- 2026-10-26: The home header keeps the "Guide" label visible: it fits at
  320px in all three languages (the e2e scroll check), so no icon-only
  fallback.
- 2026-10-26: `[WebServer] Error: ENVIRONMENT_FALLBACK` in the e2e log is
  next-intl's warning about a missing time zone; it shows before this work
  too (Task 2's RED run).
- 2026-10-26: The first `pnpm guide:pdf` gave blank pages: `main`'s fade-in
  (`page-in`, from opacity 0) is frozen at its first frame in print, so a
  phone's print would be blank too. Print now turns the animation off, and
  the e2e print check asserts it.
- 2026-10-26: Vietnamese read "Sửa chữ sửa chữ…" (the button's name, then the
  same verb). The edit line now says "Tap {button} to change…" in all three
  languages.
- 2026-10-26: The three PDFs, looked at page by page: 4 A4 pages each, black
  on white, no buttons, links or switch, each section whole on its page,
  Vietnamese diacritics right. The contact line is absent: `.env.local` has
  no `GUIDE_CONTACT` yet.
- 2026-10-26: The print rules sit at the end of `globals.css`, in one block:
  `tokens-contrast.test.ts` reads the dark tokens from everything between
  the dark `@media` and `@theme`, and a print `:root` there failed it; last
  in the file, the print rule also beats the fade-in without `!important`.
- 2026-10-26: `posts-fixtures-replay.test.ts`'s replays get a 20 s timeout:
  karsa-spa takes about 3 s alone, on `develop` too, and passed 5 s under the
  full suite once this branch added a test file. Not a change in speed: the
  same 2.9 to 3.0 s on both branches.

## RED

Task 1, `pnpm vitest run tests/unit/guide.test.tsx`:

```
Error: Failed to resolve import "@/components/guide/owner-guide" from "tests/unit/guide.test.tsx". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, `CI=1 pnpm test:e2e tests/e2e/guide.spec.ts`:

```
  6 failed
  1 passed (2.3m)
```

Task 3, `CI=1 pnpm test:e2e tests/e2e/guide.spec.ts -g "prints plain"`:

```
    -   "animation": "none",
    +   "animation": "page-in",
  1 failed
```

("the guide is private" passes before the page exists: the gate already
sends every path without a session to `/enter`.)

## GREEN

Task 1, `pnpm vitest run tests/unit/guide.test.tsx tests/unit/i18n-messages.test.ts`:

```
 Test Files  2 passed (2)
      Tests  18 passed (18)
```

Task 2, `CI=1 pnpm test:e2e tests/e2e/guide.spec.ts tests/e2e/home-tabs.spec.ts tests/e2e/i18n.spec.ts`:

```
  20 passed (18.8s)
```

Task 3, `CI=1 pnpm test:e2e tests/e2e/guide.spec.ts`, and `pnpm guide:pdf`:

```
  7 passed (16.7s)
.superpowers/guide/shopfront-guide-en.pdf: 4 pages
.superpowers/guide/shopfront-guide-id.pdf: 4 pages
.superpowers/guide/shopfront-guide-vi.pdf: 4 pages
```

Task 4, `pnpm check` and `CI=1 pnpm test:e2e`:

```
 Test Files  97 passed (97)
      Tests  1113 passed (1113)
  51 passed (23.5s)
```
