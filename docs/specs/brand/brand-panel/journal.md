# Brand panel: journal

## Calls made along the way

- 2026-10-24: `idb` 8.0.3 rather than 8.0.4, which was published less than
  two weeks ago; `fake-indexeddb` 6.2.5 for the same reason.
- 2026-10-24: the run record's types live in `lib/runs/run-record.ts` from
  Task 1, because the store's IndexedDB schema needs them.

- 2026-10-24: `FieldError` gains `invalid`, a fallback for a schema issue
  no other code names (a bad hex from the text field), so a form never
  shows nothing.
- 2026-10-24: "Last read" just after a read says "this minute": that is
  what `Intl.RelativeTimeFormat` gives with `numeric: 'auto'`; the test
  expected "now" and was corrected.
- 2026-10-24: stopping a read whose connection already dropped now forgets
  its run too (found while building the home's Stop; test first in
  `brand-read-client.test.ts`).
- 2026-10-24: `resumeRead` also returns the run's `url`, so a resumed read
  shows the address it is reading.
- 2026-10-24: the re-read question uses an ICU plural ("Your 1 change",
  "Your 2 changes"); the spec's wording otherwise.
- 2026-10-24: the error messages were added with the other strings before
  `brand-errors.test.ts` was written, so that test passed on its first run.
- 2026-10-24: `pnpm-lock.yaml` is kept in Biome's format, as on `develop`;
  `pnpm add` had rewritten it in pnpm's.
- 2026-10-24: the phone tests ran on port 3457 through a scratch copy of
  `playwright.config.ts`, because another checkout's server held port 3000.
  The repo's config is unchanged.
- 2026-10-24, final review: an email or booking link saved as it was read
  is kept, even one the checks would refuse; a typed link with a scheme
  other than http or https is refused rather than prefixed.
- 2026-10-24, final review: fields with no source (category, tone, visual
  style, feeling, place symbols, senses) record an owner's edit in
  `BrandRecord.ownerEdited`, beside the profile. The panel then says "added
  by you", and re-read counts them. The profile schema is unchanged.
- 2026-10-24, final review: only a network `TypeError` makes a read
  "offline"; a line that doesn't parse or a profile the phone can't keep ends
  it as `model_failed`. A lost read is resumed at most twice, and the wake
  lock is released while offline.

## RED

- Task 1: ` Test Files  1 failed (1)` (`lib/brand/store.ts` not found)

- Task 2: ` Test Files  2 failed (2)` (`newBrandRun is not a function`, `lib/runs/store` not found)
- Task 3: ` Test Files  1 failed (1)` (`lib/brand/edit` not found)
- Task 4: ` Test Files  1 failed (1)` (`lib/brand/read-client` not found)
- Task 5: ` Test Files  2 failed (2)` (`lib/brand/display` and
  `components/brand/panel` not found)
- Task 6: ` Test Files  1 failed (1)` (`components/brand/section-sheet` not
  found)
- Task 7: ` Test Files  1 failed | 1 passed (2)` (`components/brand/brand-home`
  not found); `stop after a dropped stream…` ` Tests  1 failed | 11 passed (12)`
- Task 8: `  1 failed` (`getByText('Da Nang')` matched the summary too; the
  test now reads the Town field)
- Final review fixes: ` Tests  2 failed | 24 passed (26)`, ` Failed Tests 8`,
  ` Tests  4 failed | 27 passed (31)`

## GREEN

- Task 1: ` Tests  8 passed (8)`
- Task 2: ` Tests  8 passed (8)`
- Task 3: ` Tests  24 passed (24)`
- Task 4: ` Tests  11 passed (11)`
- Task 5: ` Tests  19 passed (19)`
- Task 6: ` Tests  9 passed (9)`
- Task 7: ` Tests  474 passed (474)` (whole suite)
- Task 8: `  24 passed (10.7s)` (whole Playwright suite)
- Final review fixes: ` Tests  487 passed (487)`; Playwright `  24 passed (11.6s)`
