# Suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn "Create your posts" into a stack of today's attempts, each of
six suggestions used one at a time ("Save the 2 images", "Copy the text"),
cleared at 3am on the phone's clock, with the feed preview, labels, numbers
and image description gone, and make the language switch fast.

**Architecture:** Browser work. A small pure module `lib/posts/day.ts` holds
the 3am rule; `lib/posts/store.ts` clears what's older. `PostsSection` shows
only today's attempts, numbered, newest on top; `PostCard` is rebuilt in the
spec's order, with `PostImage` split so its "Create new image" and story view
can sit where the spec puts them, and `TakeAway` becoming the two steps. The
language switch is measured first and fixed where the time goes.

**Tech Stack:** Next.js 16, React 19, next-intl, `idb`, Vitest + Testing
Library + fake-indexeddb, Playwright (`page.clock`, CDP throttling for the
measurement). No new dependency.

**Spec:** `docs/specs/posts/suggestions/spec.md` (approved 2026-10-25)

## Global Constraints

- Words on screen: "suggestion" and "attempt"; "post" only for the Instagram post the owner makes.
- The day starts at **03:00 on the phone's clock** (`Date` local time), never UTC or midnight.
- Kept topics for `recent`: at most `POSTS_LIMITS.recent` (12).
- File names: `{name}-{YYYY-MM-DD}-attempt-{a}-suggestion-{n}-post.jpg` / `-story.jpg`, the date being the attempt's 3am day.
- Strings exactly as the spec's table, in `en.json`, `id.json`, `vi.json`, same commit; removed strings removed from all three.
- "Save the 2 images": one `navigator.share({ files: [post, story] })`, post first; otherwise two downloads.
- Language switch target: within 1 s of the tap with CPU 4× slower and 150 ms added per request; still works without JavaScript; same cookie.
- Commits: scope `posts` for Tasks 1 to 5, `web` for Task 6, `docs` for Task 7; stage by path; never push before Task 7.
- Journal: `docs/specs/posts/suggestions/journal.md`, created in Task 1; RED and GREEN lines as printed; the switch timings before and after.
- Playwright in this container: `.superpowers/pw.config.ts` (executable `/opt/pw-browsers/chromium`) against `pnpm build && pnpm start` started by hand with `playwright.config.ts`'s test values (2.5's journal).

## Review Focus

1. **An image run still going at 3am for an attempt that gets cleared.** Its
   answer must not save an image for a deleted attempt, and nothing errors.
   → Task 4 test `images for a cleared attempt are not saved`.
2. **The owner opens the app at 02:59 and again at 03:01.** First open shows
   yesterday's attempts; second shows none. → Task 1 tests at 02:59 / 03:00.
3. **A phone without file sharing taps "Save the 2 images".** Two downloads,
   both named, post first. → Task 2 test `without file sharing both images
   download`.
4. **A plan streaming in while older attempts are on screen.** The new cards
   appear on top under "Attempt {n+1}", not below. → Task 4 test `a new
   attempt streams in on top`.
5. **The share sheet is cancelled.** Nothing is shown as an error; the owner
   can tap again. → Task 2 test `a cancelled share is not an error`.

---

### Task 1: The 3am day and clearing old attempts

**Files:**
- Create: `lib/posts/day.ts`, `docs/specs/posts/suggestions/journal.md`
- Modify: `lib/posts/store.ts`
- Test: `tests/unit/posts-day.test.ts`, `tests/unit/posts-store.test.ts`

**Interfaces:**
- Produces:
  - `DAY_STARTS_AT_HOUR = 3`
  - `dayStart(now: Date): Date`: the latest local 03:00 at or before `now`.
  - `dayOf(iso: string): string`: `YYYY-MM-DD` (local) of the 3am day holding `iso`.
  - `isToday(iso: string, now: Date): boolean`: `new Date(iso) >= dayStart(now)`.
  - `clearBefore(ownerId: string, start: Date): Promise<void>` in `store.ts`: for batches created before `start`, deletes their images and translations; keeps the newest old batch records holding up to `POSTS_LIMITS.recent` posts and deletes the rest.

- [ ] **Step 1: Journal** from the template, first call: "Plan written; executed inline."
- [ ] **Step 2: Failing tests** (`process.env.TZ = 'Asia/Ho_Chi_Minh'` in the file, restored after):
  - `dayStart`: at `2026-10-26T02:59` local → `2026-10-25T03:00` local; at `03:00` → same day `03:00`; at `15:00` → same day `03:00`.
  - `dayOf('2026-10-25T17:10:00Z')` (00:10 on the 26th in Da Nang) → `'2026-10-25'`; `dayOf` of 08:00 local → that date.
  - `isToday` true at 03:00 exactly, false at 02:59:59.
  - `clearBefore`: three batches (two days ago, yesterday, today) with images and a translation each → today's untouched; yesterday's record kept without images or translations; the oldest record deleted (12 kept topics = two batches of 6, so only when more than 12 old posts; make the fixture three old batches of 6 and assert the oldest one goes).
- [ ] **Step 3: Run** `pnpm vitest run tests/unit/posts-day.test.ts tests/unit/posts-store.test.ts`. Expected: FAIL (no module). Copy RED.
- [ ] **Step 4: Implement** `day.ts` and `clearBefore` (one readwrite transaction over `posts`, `images`, `translations`; images and translations found by their `ownerId` index, filtered by `batchId`).
- [ ] **Step 5: Run it.** Expected: PASS.
- [ ] **Step 6: Commit** `feat(posts): clear suggestions at 3am on the phone's clock`.

### Task 2: File names and saving both images

**Files:**
- Modify: `lib/posts/take-away.ts`
- Test: `tests/unit/posts-take-away.test.ts`

**Interfaces:**
- Consumes: `dayOf` (Task 1).
- Produces:
  - `imageFileName(name: string, createdAt: string, attempt: number, n: number, kind: 'post' | 'story'): string` (date from `dayOf`).
  - `saveImageFiles(files: { blob: Blob; name: string }[], env?): Promise<'shared' | 'downloaded' | 'cancelled'>`: one share of all files when `canShare({ files })`, else one download per file in order. `saveImageFile` is removed.

- [ ] **Step 1: Failing tests**: `imageFileName('Sen', <00:10 on the 26th in Da Nang>, 2, 3, 'post')` → `'sen-2026-10-25-attempt-2-suggestion-3-post.jpg'`; the accent and empty-name cases keep 2.4's folding; `saveImageFiles` shares once with both files, post first; `without file sharing both images download` (two `<a download>` clicks, in order, with the names); `a cancelled share is not an error` (AbortError → `'cancelled'`, no download).
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-take-away.test.ts`. Expected: FAIL. Copy RED.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): name both images by attempt and suggestion, and save them together`.

### Task 3: The suggestion card

**Files:**
- Modify: `components/posts/post-card.tsx`, `components/posts/post-image.tsx`, `components/posts/take-away.tsx`, `components/posts/post-editor.tsx`, `messages/{en,id,vi}.json`
- Test: `tests/unit/posts-card-edit.test.tsx`, `tests/unit/posts-image-card.test.tsx`, `tests/unit/posts-take-away.test.tsx`

**Interfaces:**
- Consumes: `imageFileName`, `saveImageFiles` (Task 2).
- Produces:
  - `PostImage({ state, altText, onRetry })`: the image and its states only (no buttons).
  - `NewImageLink({ onMake, disabled })` and `StoryLink({ image, altText })` exported from `post-image.tsx` (the 2.4 hint form and 2.3 story sheet, restyled as links: accent, underline, `min-h-11`).
  - `PostCard` props: `post`, `cta`, `image?`, `flags`, `onSave`, `onRewrite`, `busy`, `editBusy`, `translation`, `takeAway` (no `number`, no `anchorId`).
  - `TakeAway({ post, cta, image?, imagesOn, name, createdAt, attempt, n })`: the steps, the how-to line; with `imagesOn` false, "Copy the text" alone, unnumbered, and `howToTextOnly`.
  - `PostEdit` keeps `altText`; the editor passes `post.altText` through untouched and shows no field for it.

Card order (spec "A suggestion"): image (state) → text block (caption, translation button, call to action, hashtags) → warnings (`price`, `duration`, `banned` only, plain-word strings, no "Check before posting:") → links row ("Edit the text", "Create new image") → "Rewrite this one too" when it applies → TakeAway → `StoryLink` centred, small. "Save the 2 images" is disabled unless the image state is `ready` and not `making`.

- [ ] **Step 1: Failing tests**
  - `a card shows only what the spec keeps`: image, caption, call to action, hashtags, "Edit the text", "Create new image", "1 Save the 2 images", "2 Copy the text", the how-to line, "See the story image"; and **no** type label, "Post 1", "Edited", "Image description", alt text, "Check before posting:", first-line warning.
  - `warnings in plain words`: a `price` flag `990k` → "This price isn't on your website: 990k. Check it before posting."; a `firstLine` flag → nothing.
  - `the editor has no image description`; saving keeps `altText` unchanged.
  - `Save the 2 images` calls `saveImageFiles` with both blobs and the attempt/suggestion names; disabled while the image is `making`.
  - `Copy the text` copies `postText`.
  - `text only without images`: `imagesOn={false}` → one "Copy the text" button with no number, the text-only how-to, no image links.
  - `See the story image` opens the story view.
- [ ] **Step 2: Run** the three files. Expected: FAIL. Copy RED.
- [ ] **Step 3: Implement**, then the strings: add the spec's table; remove `imageDescription`, `check`, `flags.firstLine`, `edit.edited`, `edit.altCount`, `number`, `fewer`, `heading`, `images.checkAlt`, `images.seeStory` (replaced), `takeAway.copy|savePost|saveStory`, and `types.*` if nothing else uses them (grep first).
- [ ] **Step 4: Run** the three files, then `pnpm test`. Expected: PASS except `posts-section*` and `posts-feed-preview` (Task 4); note which in the journal.
- [ ] **Step 5: Commit** `feat(posts): one suggestion card, saved in two steps`.

### Task 4: Today's attempts, stacked

**Files:**
- Modify: `components/posts/posts-section.tsx`, `messages/{en,id,vi}.json`
- Delete: `components/posts/feed-preview.tsx`, `tests/unit/posts-feed-preview.test.tsx`, its strings
- Test: `tests/unit/posts-section.test.tsx`, `tests/unit/posts-section-images.test.tsx`

**Interfaces:**
- Consumes: `isToday`, `dayStart`, `clearBefore` (Task 1); the card (Task 3); `autoRewrite` (2.5).
- Produces: `attemptNumbers(batches: PostBatch[]): Map<string, number>` in `lib/posts/day.ts` (oldest today = 1).

Behaviour: on load, `clearBefore(ownerId, dayStart(new Date()))`, then `loadBatches`; `recent` for a new plan comes from all kept batches; `shown` = today's, newest first; `autoRewrite(shown, profile)`; the button reads `make` with nothing shown, else `makeMore` with `moreBelow` ({n} = newest number); with nothing shown and no run, `empty` (or `emptyTextOnly` without images); each attempt has its heading `attempt` + `attemptCount`; a streaming plan shows on top under "Attempt {next}"; image answers for a batch no longer kept are dropped.

- [ ] **Step 1: Failing tests** (clock via `vi.setSystemTime`, `TZ` set):
  - `yesterday's attempts are not shown and their images are gone`.
  - `attempts are numbered from the oldest of the day, newest on top`.
  - `the button and its line`: nothing shown → "Make 6 suggestions" and the empty note; after one attempt → "Make 6 new suggestions" and "They go on top. Attempt 1 stays below."
  - `a new attempt streams in on top`.
  - `recent topics include yesterday's`: the plan request body's `recent` holds yesterday's topics.
  - `the automatic update leaves yesterday's attempt alone`.
  - `images for a cleared attempt are not saved`.
  - Update 2.4/2.5 tests that used "Post 1", "Copy caption", the feed preview or "Edited".
- [ ] **Step 2: Run** both files. Expected: FAIL. Copy RED.
- [ ] **Step 3: Implement**; delete the feed preview.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): show today's attempts, newest on top`.

### Task 5: Browser tests for the new flow

**Files:**
- Modify: `tests/e2e/posts.spec.ts`, `tests/e2e/editor.spec.ts`, `tests/e2e/images.spec.ts`
- Create: `tests/e2e/suggestions.spec.ts`

- [ ] **Step 1: Update** the old tests to the new labels ("Make 6 suggestions", "Edit the text", "Create new image", "Copy the text", "Save the 2 images"); drop the feed-preview test.
- [ ] **Step 2: New tests**: make six → "Attempt 1"; make six more → "Attempt 2" above "Attempt 1"; reload → both; `page.clock` to 03:05 next day, reload → the empty note; "Save the 2 images" in a browser without file sharing → two downloads named `sen-…-attempt-1-suggestion-1-post.jpg` then `…-story.jpg`.
- [ ] **Step 3: Build, start, run** the whole suite with the local config. Expected: all pass. Copy the summary line.
- [ ] **Step 4: Commit** `test(posts): the suggestions flow at the phone viewport` (scope `posts`).

### Task 6: A faster language switch

**Files:**
- Measure with a git-ignored script in `.superpowers/`; modify what the measurement points at (likely `components/language-switch.tsx`, `app/language/actions.ts`, `app/layout.tsx`)
- Test: `tests/e2e/i18n.spec.ts`

- [ ] **Step 1: Measure** on the production build: Playwright Chromium, phone viewport, CDP `Emulation.setCPUThrottlingRate` 4, every request delayed 150 ms by `page.route`, home screen on "Create your posts" with six suggestions and images; time from the tap on "VI" to the Vietnamese tab label being visible, five runs, median. Record it in the journal with where the time goes (Performance trace: server action round trip, RSC payload size, client re-render, IndexedDB reload, image decoding).
- [ ] **Step 2: Rule on the fix** from what the trace shows, record the ruling in the journal, and keep: no-JavaScript form, same cookie, same screen, open tab kept.
- [ ] **Step 3: Failing e2e** `switching language keeps the open tab`: on "Create your posts" with an attempt, tap "VI" → "Tạo bài đăng" selected and "Lần thử 1" visible.
- [ ] **Step 4: Implement the fix.** Re-measure the same way. Expected: median under 1 s. Record before and after.
- [ ] **Step 5: Run** `pnpm check` and the i18n e2e. Expected: PASS.
- [ ] **Step 6: Commit** `perf(web): switch language faster` (scope `web`; `perf` is a Conventional Commits type).

### Task 7: Roadmap, docs, review, PR

**Files:**
- Modify: `docs/roadmap.md`; roadmap number references in `docs/specs/**/spec.md` and `docs/decisions/*.md`; the journal

- [ ] **Step 1: Roadmap**: add `| 2.6 | \`posts/suggestions\`: today's attempts of six suggestions, saved in two steps, cleared at 3am; a faster language switch | spec | done |`; reviews 2.7, usage counters 2.8, owner guide 2.9.
- [ ] **Step 2: References**: highest first (2.8 → 2.9, 2.7 → 2.8, 2.6 → 2.7) on lines naming roadmap items only, checked by hand (never versions); plans and journals untouched.
- [ ] **Step 3: Verify** `pnpm check` and the whole e2e suite; GREEN lines to the journal.
- [ ] **Step 4: Whole-branch review** (requesting-code-review, fresh reviewer); Important findings fixed test-first; minors listed in the PR.
- [ ] **Step 5: Commit** `docs(docs): mark roadmap 2.6 done and renumber the items after it`.
- [ ] **Step 6: Push** with `--force-with-lease` (the branch was reset onto `develop` after #19's squash merge) and open a PR to `develop`, `feat(posts): suggestions (roadmap 2.6)`.
