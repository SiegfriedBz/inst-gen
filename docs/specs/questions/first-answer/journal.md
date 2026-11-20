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
- 2026-11-20: `scripts/eval-answers.ts` and the answers' replay test pass a
  fixture's `first` (missing reads as false) already in Task 4, not Task 7:
  `tsc`, run by the commit hook, needs every request to say it.
- 2026-11-20: the answer prompt for a later answer keeps its rules, gathered
  in one place with the empty closing; its emoji rule now comes before the
  rules on words. The first answer's rules replace the greeting, answer, call
  to action, website and emoji rules, and say nothing of a gentle offer.

## RED

- Task 1 (`brand-profile`, `brand-checks`, `brand-eval-score`, `brand-read`):
  `Tests  14 failed | 101 passed (115)`
- Task 2 (`brand-edit`, `brand-section-sheet`, `brand-panel`):
  `Tests  7 failed | 72 passed (79)`
- Task 3 (`posts-checks`, `questions-question`, `questions-client`,
  `questions-flags`, `questions-prompt`): `Tests  11 failed | 128 passed (139)`
- Task 4 (`questions-section`, `questions-store`, `questions-question`,
  `questions-client`): `Tests  10 failed | 31 passed (41)`
- Task 5 (`questions-checks`, `questions-prompt`, `questions-run`):
  `Tests  12 failed | 44 passed (56)`
- Task 6 (`guide`): `Tests  3 failed | 32 passed (35)`

## GREEN

- Task 1 (the same four, with `brand-prompt`, `brand-store` and
  `brand-fixtures-replay`, all 20 recorded sites in the old shape):
  `Tests  185 passed (185)`
- Task 2 (the same three): `Tests  79 passed (79)`
- Task 3 (the same five): `Tests  139 passed (139)`; the whole suite after
  Tasks 1 to 3: `Tests  2132 passed (2132)`
- Task 4 (the same four): `Tests  41 passed (41)`; the whole suite:
  `Tests  2139 passed (2139)`
- Task 5 (the same three): `Tests  56 passed (56)`; the whole suite:
  `Tests  2152 passed (2152)`
- Task 6 (`guide`, with the messages' tests): `Tests  69 passed (69)`
