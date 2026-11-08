# Two images an attempt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An attempt asks for two images, not six; the other four suggestions are text, with "Create new image" counted as a new image; the screens and the owner guide say so in three languages.

**Architecture:** A pure pick, `imagePosts(batch)` in a new `lib/posts/image-pick.ts`, says which two posts of an attempt get their first image. The posts section asks only for those (after an attempt, and from "Make the images"); the image client sends `first: true` only for them. A new `ImageState` kind, `skipped`, draws the other four as text tiles and gives their sheet a line and "Create new image". No server change: the route and the usage meter already count `first: false` as a new image.

**Tech Stack:** TypeScript, React (Next.js App Router), next-intl, Vitest with Testing Library, Playwright, pnpm.

**Spec:** `docs/specs/posts/two-images/spec.md`

## Global Constraints

- `IMAGES_PER_ATTEMPT = 2`, exported from `lib/posts/image-pick.ts`; the same everywhere the app runs. `scripts/eval-images.ts` is not touched.
- A post's light: `post.setup?.light ?? 'day'`.
- The pick order: posts with `offer: true` first; then the first day and the first night not yet picked (skipping a light already picked); then the first posts not yet picked; returned in the attempt's order, at most 2, never a repeat.
- `first: true` only for a picked post with no image on the phone; every other image request is `first: false`.
- Limits unchanged: `OWNER_LIMITS.attempts` 3, `OWNER_LIMITS.newImages` 10, the $8 image month; decision 0004 and `.env.example` untouched.
- Every changed or new visible string goes in `messages/en.json`, `id.json` and `vi.json` in the same commit, with the spec's exact text ("Strings").
- Commits: Conventional Commits, scope `posts` (code) or `docs` (documents); stage files by path; author SiegfriedBz, protonmail email.

## Review Focus

1. A batch saved before set-ups or lights existed (no `setup`): every post is a day, so the pick is the first two (Task 1 test).
2. An offer attempt where the model gave only one offer post: that one plus the first post of the other light (Task 1 test).
3. "Try again" or "Create new image" on a picked post whose first image failed: still `first: true`; the same on a skipped post: `first: false` (Task 2 test).
4. A skipped suggestion with the image month full: its sheet shows "No new images until {date}." and no "Create new image" link; its tile stays a text tile (Task 3 test).
5. A skipped suggestion whose created image is being made or failed: the tile shows "Making the image…" or the failure, not the text tile (Task 3 test).

---

### Task 1: The pick

**Files:**
- Create: `lib/posts/image-pick.ts`
- Test: `tests/unit/posts-image-pick.test.ts`

**Interfaces:**
- Consumes: `Post`, `PostBatch` from `lib/posts/batch.ts`; `Light` from `lib/posts/setup.ts`.
- Produces: `export const IMAGES_PER_ATTEMPT = 2;` and `export function imagePosts(batch: Pick<PostBatch, 'posts'>): string[]` (post ids, in the attempt's order).

- [ ] **Step 1: Write the failing tests** in `tests/unit/posts-image-pick.test.ts`, with posts from `tests/unit/helpers/posts.ts` (`post({ id, setup, offer })`; a set-up built with `light` and the other fields of `setupSchema`):
  - `two offer posts get the images`: posts 1 to 6, `offer: true` on post-3 and post-5 → `['post-3', 'post-5']`.
  - `one offer post, then the other light`: post-2 carries the offer and is a night; post-1 is a day → `['post-1', 'post-2']`.
  - `without an offer, the first day and the first night`: lights day, day, night, day, night, night → `['post-1', 'post-3']`.
  - `all days, or no set-ups, give the first two`: → `['post-1', 'post-2']` for both.
  - `fewer than two posts`: one post → `['post-1']`; none → `[]`.
  - `IMAGES_PER_ATTEMPT is 2`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-image-pick.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement `imagePosts`** in `lib/posts/image-pick.ts`, with a header comment pointing at the spec, following the Global Constraints' pick order.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): pick the two posts of an attempt that get images (roadmap 2.17)`.

### Task 2: Only the picked two are first images

**Files:**
- Modify: `lib/posts/image-client.ts` (in `one()`, where `first` is computed)
- Test: `tests/unit/posts-image-client.test.ts`

**Interfaces:**
- Consumes: `imagePosts` (Task 1).
- Produces: no new export; `startImages` and `resumeImages` keep their signatures.

- [ ] **Step 1: Update and add tests** in `tests/unit/posts-image-client.test.ts`:
  - `six requests start at once`: the body of post-1's request has `first: true`; post-3's has `first: false` (it isn't picked; the fixture posts have no set-ups, so the pick is post-1 and post-2).
  - New `a skipped post asks as a new image`: `make(['post-4'])` → its body has `first: false`.
  - New `a picked post whose first image failed asks again as first`: post-1 answered `502 { error: 'image_blocked' }`, then `make(['post-1'])` again → the second body has `first: true`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-image-client.test.ts`. Expected: FAIL on post-3 and post-4 (`first: true`).
- [ ] **Step 3: Implement:** `first` is `imagePosts(batch).includes(postId)` and no saved image for `imageKey(batch.id, postId)`. Update the comment above it.
- [ ] **Step 4: Run** the same file, then `pnpm vitest run tests/unit/usage-limits-ui.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): only the two picked posts ask for first images (roadmap 2.17)`.

### Task 3: Two images on screen, four text suggestions

**Files:**
- Modify: `components/posts/post-image.tsx` (`ImageState` gains `{ kind: 'skipped' }`; `PostImage` draws it)
- Modify: `components/posts/post-card.tsx` (`canRemake` includes `skipped`; no `saveImages` while `skipped`)
- Modify: `components/posts/posts-section.tsx` (`onEvent` final and "Make the images" use `imagePosts`; `imageOf` returns `skipped`; `noImage` and the tile's `textOnly`)
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (`posts.empty` changed, `posts.images.none` new, the spec's text)
- Test: `tests/unit/posts-section-images.test.tsx`, and any other unit test that counts six image requests (`pnpm test` shows them)

**Interfaces:**
- Consumes: `imagePosts` (Task 1); the client's `first` rule (Task 2).
- Produces: `ImageState` kind `'skipped'`, used by `SuggestionTile` (text tile) and `PostCard`.

`imageOf(post, batch, batchButton)` decides, in this order: images off → `off`; a saved image → `ready` (as today); being made → `making`; a failure → `failed`; not picked → `month` when the month is full, else `skipped`; picked → `month` when the month is full, else `none`. A tile is a text tile when the state is `off`, `skipped`, a paused or off failure (as today), or `month` on a post that isn't picked. `takenLabel` treats `skipped` as no image (`noImage` returns true for it), so copying alone ticks it.

In the sheet, `PostImage` draws `skipped` as one muted line, `posts.images.none`, with no placeholder box; `PostCard` then shows `NewImageLink` (disabled at the day's limit, with the limit line, as for a ready image) and hides `saveImages`.

- [ ] **Step 1: Update and add tests** in `tests/unit/posts-section-images.test.tsx` (fixture posts have no set-ups: the pick is post-1 and post-2):
  - `a saved plan starts its six images` becomes `a saved plan starts its two images`: `started[0].input.postIds` equals `['post-1', 'post-2']`; "Making the image…" shows twice; tiles 3 to 6 show their captions as text tiles (no `img`, no placeholder).
  - `an old batch shows Make the images`: the request's `postIds` equals `['post-1', 'post-2']`.
  - New `a skipped suggestion's sheet`: open suggestion 4 → "Only 2 suggestions of each attempt come with images. Create one for this suggestion, or use a photo of your own." and "Create new image"; no "Save the 2 images" button; "Create new image", then "Make it" → `started.at(-1).input.postIds` equals `['post-4']`; the image event then shows the image on tile 4 and the save button in the sheet.
  - New `a skipped suggestion at the day's limit`: with the usage answer at 0 new images, its "Create new image" is disabled with "You've made today's 10 new images. More at …".
  - New `a skipped suggestion with the month full`: its sheet shows "No new images until …" and no "Create new image"; its tile is a text tile.
  - New `a skipped suggestion is ticked by its text`: a saved batch whose post-4 has `copiedAt` → tile 4 says "Copied".
  - Adjust the existing tests that assume six requests or six placeholders (`images arrive on their cards…`, `a dropped image is asked for again…`) to the two picked posts.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-section-images.test.tsx`. Expected: FAIL (six requested; no `skipped` line).
- [ ] **Step 3: Implement** as described above, and the three message files.
- [ ] **Step 4: Run** `pnpm test`. Expected: PASS, including the strings check in the three languages; fix any other unit test that counted six image requests.
- [ ] **Step 5: Commit** `feat(posts): two images an attempt, the other four as text (roadmap 2.17)`.

### Task 4: Phone tests

**Files:**
- Modify: `tests/e2e/images.spec.ts`, `tests/e2e/friendlier-home.spec.ts`, `tests/e2e/story-text.spec.ts`, `tests/e2e/suggestions.spec.ts`, `tests/e2e/editor.spec.ts`, `tests/e2e/special-offer.spec.ts` (each `tileImages(page)).toHaveCount(6)` and its follow-ups, to the two picked posts)

**Interfaces:**
- Consumes: Task 3's screens. The e2e posts (`tests/e2e/helpers/posts-stream.ts`) have no set-ups, and with an offer posts 1 and 2 carry it: the pick is post-1 and post-2.

- [ ] **Step 1: Update `images.spec.ts`:** after "Make 6 suggestions", "Making the image…" twice; the failure moves from post-3 to post-2, so one tile image, then two after its "Try again"; then open suggestion 4, see the `posts.images.none` line, "Create new image", "Make it", and tile 4 shows an image (three tile images); `images.count()` is 4 (2 + retry + created).
- [ ] **Step 2: Update the other specs' counts** (six → two tile images; in `editor.spec.ts`, the second attempt's counts and the per-tile checks follow the same pick). In `special-offer.spec.ts`, the two tiles with "10% off" are the two with images.
- [ ] **Step 3: Run** `pnpm test:e2e`. Expected: all pass.
- [ ] **Step 4: Commit** `test(posts): phone tests for two images an attempt (roadmap 2.17)`.

### Task 5: The owner guide and the documents

**Files:**
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (`guide.posts.make`, `guide.posts.edit`, `guide.posts.offerDone`, `guide.instagram.noImages` in `id.json`; the spec's exact text, keeping the `<b>` tags)
- Modify: `tests/e2e/guide.spec.ts` (the new "Making your posts" line, in one language other than English)
- Modify: `docs/specs/posts/generate-images/spec.md`, `docs/specs/posts/day-and-night-images/spec.md`, `docs/specs/platform/usage-counters/spec.md`, `docs/specs/guide/owner-guide/spec.md` (one dated note each)
- Create: `docs/specs/posts/two-images/journal.md`
- Modify: `docs/roadmap.md` (2.17 `done`)

- [ ] **Step 1: Change the guide strings** in the three files and the guide's e2e check (Vietnamese: "Hai gợi ý trong số đó có thêm hình bài đăng và hình story.").
- [ ] **Step 2: Run** `pnpm test` and `pnpm test:e2e tests/e2e/guide.spec.ts`. Expected: PASS.
- [ ] **Step 3: Add the notes:** `> Changed by \`posts/two-images\` (2026-11-08): …` at "When images are made" (generate-images: two images an attempt, the offer posts or a day and a night), at the three day and three night images (day-and-night-images: set-ups still dealt 3 and 3; only one day and one night pictured without an offer), at the attempt's first image (usage-counters: an attempt covers two first images; an image for another suggestion is a new image), and at what a suggestion comes with (owner-guide). Status and approval untouched.
- [ ] **Step 4: Run** `pnpm guide:pdf`. Expected: three PDFs under `.superpowers/guide/`; read the changed lines in each.
- [ ] **Step 5: Write the journal** from `docs/templates/journal.md` (calls made, RED and GREEN lines as printed), set 2.17 `done`, run `pnpm check`. Expected: green.
- [ ] **Step 6: Commit** `docs(docs): owner guide and notes for two images an attempt, roadmap 2.17 done`.
