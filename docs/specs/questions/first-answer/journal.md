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
- 2026-11-20, recording the reads (maintainer's yes): the first
  `pnpm eval:brand sen svarga --record` failed on both, "No object generated:
  could not parse the response". One read of Sen without `--record`, with a
  temporary log (never committed), hit Google's "high demand" once and then
  passed with the new treatment shape; the second recording passed on both.
  Six reads spent in all. Google's busy spell, not the shape, is the likely
  cause: nothing in the first two answers was kept to prove it.
- 2026-11-20: the recorded reads keep every length, as the sites give them:
  Sen's Thai Massage at 60 min · $19 VND 500k, 90 min · $27 VND 700k and
  120 min · $35 VND 900k (Foot Reflexology at 60 and 90); Svarga's
  Traditional Balinese Massage at 60 min · IDR 250k, 90 min · IDR 350k and
  120 min · IDR 450k (the Lulur scrub at 90 and 120, Foot Reflexology at 60
  and 90).
- 2026-11-20: Sen's new read gives the same look as before but cites its home
  page for it (the page only says "a clean uniform"), so a page keeps it with
  no photos. The test that a look from the photos goes without them now reads
  Svarga's, still from its photos. Sen's posts and replies replay as before.

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
- Task 7, before any recording (`questions-fixtures-replay`, five new first
  messages and `answer-8`): `Tests  6 failed | 10 passed (16)`

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
