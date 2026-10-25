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

- 2026-10-25: The language switch, measured on the production build in
  Playwright's Chromium at the phone viewport, CPU 4× slower (CDP), every
  request held 150 ms, six suggestions with full-size images (1,006 KB story,
  709 KB post) on the phone; tap to the tab label in the new language, six
  runs:
  - Before: median **464 ms** (419 to 496). Each tap posted the form to the
    server and waited for the page to render again; and every switch ran the
    home screen's load again, because its callbacks depended on the
    translation function: a second brand load and, while the essence search
    hadn't succeeded, a new search request each time.
  - Ruling: under 1 s already here, so the slowness on the deployment is the
    round trip to Vercel's Singapore function (a cold one most of all), which
    code can't shorten, only stop waiting for. With JavaScript the switch now
    changes the language on the phone at once (all three message files, about
    11 KB each, are in the page) and saves the cookie with a small server
    action in the background; without JavaScript the plain form still posts
    and redirects. The welcome heading and the footer lines, translated on
    the server before, moved into the switching part. The load callbacks read
    the translation function from a ref, so a language change loads nothing.
  - After: median **209 ms** (162 to 235), with no request before the screen
    has switched, and no search request.

## RED

- Task 1: `Tests  1 failed | 9 passed (10)`, and `posts-day.test.ts` failed to load (`Cannot find package '@/lib/posts/day'`)
- Task 2: `Tests  6 failed | 6 passed (12)`
- Task 3: `Tests  18 failed | 10 passed (28)` (`Element type is invalid` for the links not yet exported); after it, the section, feed preview and home tests fail on the old labels until Task 4: `Tests  23 failed | 893 passed (916)`
- Task 4: `Tests  7 failed | 37 passed (44)`
- Task 6: `language-switch.test.tsx` failed to load (`Failed to resolve import "@/components/locale-provider"`); the language-change test: `expected 2 to be 1` (a second search)
- Task 5: none; the browser tests follow the code already proven red then green in Tasks 1 to 4, as the plan orders them (whole suite: `38 passed (32.0s)`)

## GREEN
