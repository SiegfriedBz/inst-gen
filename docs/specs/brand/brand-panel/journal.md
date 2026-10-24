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

## RED

- Task 1: ` Test Files  1 failed (1)` (`lib/brand/store.ts` not found)

- Task 2: ` Test Files  2 failed (2)` (`newBrandRun is not a function`, `lib/runs/store` not found)
- Task 3: ` Test Files  1 failed (1)` (`lib/brand/edit` not found)
- Task 4: ` Test Files  1 failed (1)` (`lib/brand/read-client` not found)
- Task 5: ` Test Files  2 failed (2)` (`lib/brand/display` and
  `components/brand/panel` not found)

## GREEN

- Task 1: ` Tests  8 passed (8)`
- Task 2: ` Tests  8 passed (8)`
- Task 3: ` Tests  24 passed (24)`
- Task 4: ` Tests  11 passed (11)`
- Task 5: ` Tests  19 passed (19)`
