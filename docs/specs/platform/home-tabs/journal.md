# Home tabs: journal

## Calls made along the way

- 2026-10-25: Plan written; executed inline with executing-plans, in the
  cloud session's own checkout on its branch (no extra worktree).
- 2026-10-25: "Edit" no longer waits for images; its "Save" keeps 2.4's
  behaviour (never disabled): 2.4's rewrite merge already skips a post
  edited while the request was out.
- 2026-10-25: The automatic update remembers the details (`profileHash`) it
  last went out for and never goes out twice for the same ones. Beyond the
  spec's failure case, this also covers a post the model's answer drops: it
  stays out of date, and without the guard it would be sent again and again.
  Either way the newest batch then shows "Update captions" until the tab is
  opened again.
- 2026-10-25: The opening tab is one piece of state: it starts on "Create
  your posts", and every read (first, re-read or resumed) sets "Your
  business" as it begins. The spec's "pure rule" is tested through the
  component instead of a separate function.
- 2026-10-25: Both tab panels stay mounted; the closed one has the `hidden`
  attribute, so it's out of sight and out of the accessibility tree.
- 2026-10-25: Playwright in this cloud container: the pinned 1.64.1 doesn't
  find the preinstalled browser, and the server it starts didn't get the
  test passphrases. The suite ran with a local, git-ignored config pointing
  at `/opt/pw-browsers/chromium`, against `pnpm build && pnpm start` started
  by hand with `playwright.config.ts`'s test values. The repo's config is
  unchanged.

- 2026-10-25: Roadmap numbers moved up one after 2.5 in the specs and in
  decision 0004 (it names 2.6 for the usage counters); plans and journals
  keep the numbers they were written with.

## Still owed (the owners, during the pilot)

- Read back the tab labels and "Updating your captions to match your
  business…" in Indonesian and Vietnamese.

## RED

- Task 1: `Tests  4 failed | 34 passed (38)`
- Task 2: `Tests  1 failed | 11 passed (12)`
- Task 3: `Tests  1 failed | 30 passed (31)`
- Task 4: `Tests  7 failed | 12 passed (19)` (`newestBatch is not a function`)
- Task 5: `Tests  10 failed | 27 passed (37)`; the dropped-post guard: `Tests  1 failed | 23 skipped (24)` with the guard taken out
- Task 6: `Tests  4 failed | 26 passed (30)`
- Task 7 (Playwright, `tests/e2e/i18n.spec.ts`): `5 failed` / `5 passed (34.7s)`

## GREEN

- Vitest, whole suite: `Tests  909 passed (909)`
- Playwright, whole suite: `38 passed (28.7s)`
