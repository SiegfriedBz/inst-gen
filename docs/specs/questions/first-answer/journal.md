# The first answer: journal

## Calls made along the way

- 2026-11-20: the pre-commit hook runs `tsc` on the whole project, so Task 1's
  new treatment shape can't be committed before Tasks 2 and 3 move every
  reader to it: the three tasks are each done RED then GREEN, and committed
  together.
- 2026-11-20: two tests pinned what this item changes on purpose:
  `brand-prompt` ("is at brand-9" → brand-10) and `brand-store` (a v1 profile
  loads as version 4, not 3).
- 2026-11-20: the answer prompt's new list rule (each treatment on its own
  line with its lengths and prices) is checked in `gives the rules of the
  spec` rather than a test of its own; five other test files built treatments
  without `lengths` and now give them `lengths: []`.

## RED

- Task 1 (`brand-profile`, `brand-checks`, `brand-eval-score`, `brand-read`):
  `Tests  14 failed | 101 passed (115)`
- Task 2 (`brand-edit`, `brand-section-sheet`, `brand-panel`):
  `Tests  7 failed | 72 passed (79)`
- Task 3 (`posts-checks`, `questions-question`, `questions-client`,
  `questions-flags`, `questions-prompt`): `Tests  11 failed | 128 passed (139)`

## GREEN

- Task 1 (the same four, with `brand-prompt`, `brand-store` and
  `brand-fixtures-replay`, all 20 recorded sites in the old shape):
  `Tests  185 passed (185)`
- Task 2 (the same three): `Tests  79 passed (79)`
- Task 3 (the same five): `Tests  139 passed (139)`; the whole suite after
  Tasks 1 to 3: `Tests  2132 passed (2132)`
