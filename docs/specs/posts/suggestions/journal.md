# Suggestions: journal

## Calls made along the way

- 2026-10-25: Plan written; executed inline with executing-plans, in the
  cloud session's own checkout on its branch, reset onto `develop` after
  #19's squash merge.
- 2026-10-25: "Create new image" and "See the story image" keep their keys
  under `posts.images` (`newImage`, `seeStory`); the spec's table lists them
  as `posts.newImage` and `posts.seeStory`. Only the place of the key differs.
- 2026-10-25: Older kept records (before 3am) only feed `recent`; image runs
  are resumed for today's attempts only, so a run left over from yesterday
  is dropped rather than saving an image for a cleared attempt.

## RED

- Task 1: `Tests  1 failed | 9 passed (10)`, and `posts-day.test.ts` failed to load (`Cannot find package '@/lib/posts/day'`)
- Task 2: `Tests  6 failed | 6 passed (12)`
- Task 3: `Tests  18 failed | 10 passed (28)` (`Element type is invalid` for the links not yet exported); after it, the section, feed preview and home tests fail on the old labels until Task 4: `Tests  23 failed | 893 passed (916)`
- Task 4: `Tests  7 failed | 37 passed (44)`
- Task 5: none; the browser tests follow the code already proven red then green in Tasks 1 to 4, as the plan orders them (whole suite: `38 passed (32.0s)`)

## GREEN
