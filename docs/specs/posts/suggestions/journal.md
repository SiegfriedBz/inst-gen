# Suggestions: journal

## Calls made along the way

- 2026-10-25: Plan written; executed inline with executing-plans, in the
  cloud session's own checkout on its branch, reset onto `develop` after
  #19's squash merge.
- 2026-10-25: "Create new image" and "See the story image" keep their keys
  under `posts.images` (`newImage`, `seeStory`); the spec's table lists them
  as `posts.newImage` and `posts.seeStory`. Only the place of the key differs.

## RED

- Task 1: `Tests  1 failed | 9 passed (10)`, and `posts-day.test.ts` failed to load (`Cannot find package '@/lib/posts/day'`)
- Task 2: `Tests  6 failed | 6 passed (12)`
- Task 3: `Tests  18 failed | 10 passed (28)` (`Element type is invalid` for the links not yet exported); after it, the section, feed preview and home tests fail on the old labels until Task 4: `Tests  23 failed | 893 passed (916)`

## GREEN
