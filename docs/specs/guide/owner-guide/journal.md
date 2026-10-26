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

## RED

Task 1, `pnpm vitest run tests/unit/guide.test.tsx`:

```
Error: Failed to resolve import "@/components/guide/owner-guide" from "tests/unit/guide.test.tsx". Does the file exist?
 Test Files  1 failed (1)
      Tests  no tests
```

## GREEN

Task 1, `pnpm vitest run tests/unit/guide.test.tsx tests/unit/i18n-messages.test.ts`:

```
 Test Files  2 passed (2)
      Tests  18 passed (18)
```
