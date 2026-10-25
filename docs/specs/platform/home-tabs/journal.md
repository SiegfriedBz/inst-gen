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

## RED

- Task 1: `Tests  4 failed | 34 passed (38)`
- Task 2: `Tests  1 failed | 11 passed (12)`
- Task 3: `Tests  1 failed | 30 passed (31)`
- Task 4: `Tests  7 failed | 12 passed (19)` (`newestBatch is not a function`)
- Task 5: `Tests  10 failed | 27 passed (37)`; the dropped-post guard: `Tests  1 failed | 23 skipped (24)` with the guard taken out

## GREEN
