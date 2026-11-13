# Easier to use: journal

## Calls made along the way

- 2026-11-13, Task 2: the guide no longer names "Read my website": its first step says the read starts by itself, as the spec's table writes it, so `guide.test.tsx` checks that line instead of the button. `guide.trouble.gone` ("Read your website again") is left as it is: the spec doesn't list it, and the read happens by itself anyway.

- 2026-11-13: the builder check's three points settled in the spec before approval: an offer post keeps its story text (its offer line); new texts keep the post's kind of question and see the attempt's other post; caption updates land only their words on the post as stored (an existing bug: the copied mark stayed).
- 2026-11-13: short passwords added after the first hand-over, at the maintainer's request; their example password is not copied anywhere in the repo.

## RED

- Task 1, passwords: `Tests  7 failed | 10 passed (17)`
- Task 1, sign-in words: `Tests  4 failed | 1 passed (5)`
- Task 2, the read by itself: `Tests  6 failed | 50 passed (56)`, and `pilot-sites.test.ts` could not import `@/lib/pilot/sites`
- Task 2, no read left on a new phone (the start switched off to watch it fail): `Tests  1 failed | 15 skipped (16)`
- Task 3, Questions before Reviews: `Tests  4 failed | 81 passed (85)`
- Task 4, no "They go on top" line: `Tests  1 failed | 61 skipped (62)`
- Task 5, the Questions hint: `Tests  1 failed | 20 passed (21)`

## GREEN

- Task 1, passwords: `Tests  32 passed (32)`
- Task 1, sign-in words: `Tests  41 passed (41)`
- Task 2, the read by itself: `Tests  58 passed (58)`
- Task 2, with the limit and the guide: `Tests  110 passed (110)`
- Task 3, Questions before Reviews: `Tests  85 passed (85)`
- Task 4, no "They go on top" line: `Tests  69 passed (69)`
- Task 5, the Questions hint: `Tests  28 passed (28)`
