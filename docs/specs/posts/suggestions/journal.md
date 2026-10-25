# Suggestions: journal

## Calls made along the way

- 2026-10-25: Plan written; executed inline with executing-plans, in the
  cloud session's own checkout on its branch, reset onto `develop` after
  #19's squash merge.
- 2026-10-25: "Create new image" and "See the story image" keep their keys
  under `posts.images` (`newImage`, `seeStory`); the spec's table lists them
  as `posts.newImage` and `posts.seeStory`. Only the place of the key differs.
- 2026-10-25: Roadmap: this item is 2.6; reviews, usage counters and the owner
  guide move to 2.7, 2.8 and 2.9 in the specs, in 2.5's spec where it points
  forward, and in decision 0004.
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
- Final review fixes: `Tests  2 failed | 2 passed (4)`
- Task 6: `language-switch.test.tsx` failed to load (`Failed to resolve import "@/components/locale-provider"`); the language-change test: `expected 2 to be 1` (a second search)
- Task 5: none; the browser tests follow the code already proven red then green in Tasks 1 to 4, as the plan orders them (whole suite: `38 passed (32.0s)`)

- 2026-10-25: Final review (one fresh reviewer, whole branch): no critical
  finding. Fixed test-first: the provider followed every server render, so
  a second quick tap could be undone by the first save's answer (each save
  re-renders the page in the background, which Next does after a cookie is
  set in a server action); and a save that failed offline was lost, so the
  next open came back in the old language: it is now tried again, for the
  latest choice, once the phone is back online. Minor findings are listed in
  the PR.

## Still owed (the owners, during the pilot)

- On a real iPhone and a real Android phone: "Save the 2 images" opens one
  share sheet with both images and "Save 2 images" puts them side by side in
  Photos; "Copy the text" then pastes in Instagram.
- In a browser without file sharing (a computer's Chrome): both downloads
  arrive; Chrome may ask once to allow several files.
- Read back the new strings in Indonesian and Vietnamese.
- On the deployment: how the language switch feels now.

## GREEN

- Vitest, whole suite: `Tests  922 passed (922)`
- Playwright, whole suite: `39 passed (29.6s)`
