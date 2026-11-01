# Day and night copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Captions and story texts follow their post's day or night light, the prompt quotes no example hook or ending, and code records repeated sentences and light misses.

**Architecture:** The prompt change lives in `lib/posts/prompt.ts` (`posts-11`). The records live in a new `lib/posts/variety.ts`, called from `checkPlan` and `checkRewrite` in `lib/posts/checks.ts`; `lib/posts/run.ts` counts them into two new log fields. New fixtures are recorded with `pnpm eval:posts`.

**Tech Stack:** TypeScript, Vitest, pnpm.

**Spec:** `docs/specs/posts/day-and-night-copy/spec.md`

## Global Constraints

- Prompt version: `posts-11`, with or without an offer.
- A post's light: `post.setup?.light ?? 'day'`.
- Records are never shown to the owner and never change a post.
- Repeat record: `{ field: 'mix', reason: 'last sentence "<sentence>" in post-1, post-4' }`; also `first sentence "…"` and `story text "…"` (story texts compare their last sentence). Sentence shown as in the first post that has it, emoji removed, trimmed.
- Light record: `{ field: 'light', reason: 'post-2 (day): "sleep"' }`, one per word found, the word in lower case as listed.
- Day words: `sleep`, `asleep`, `bedtime`, `wake`, `waking`, `tomorrow morning`. Night words: `this afternoon`, `this morning`, `midday`, `noon`. Whole words, case ignored.
- Log fields: `repeats=` and `light_misses=`, after `offer_fixes=`.
- The 4 Flash-Lite requests for recordings need the maintainer's yes first, never on a pilot day.
- Commits: Conventional Commits, scope `posts`; stage files by path.

## Review Focus

1. A caption ending "… tomorrow. 🌺": the flower is its own "sentence" for `sentences()`; the last sentence compared must be "… tomorrow.", not "🌺" (Task 2 test).
2. "Wakeboarding" or "awakening" on a day post: whole words only, no record (Task 2 test).
3. A post with no set-up, or a set-up without `light`, is a day: in the rewrite text and in the light records (Tasks 1 and 2 tests).
4. Two offer posts on a one-treatment offer have the same story text: no story-text repeat for offer posts (Task 2 test).
5. "Wake up light tomorrow." and "wake up light tomorrow. " in two captions: case and spaces ignored, one record (Task 2 test).

---

### Task 1: The prompt (`posts-11`)

**Files:**
- Modify: `lib/posts/prompt.ts` (`captionRules`, `POSTS_PROMPT_VERSION`, `rewritePrompt`, `rewriteUserText`)
- Test: `tests/unit/posts-prompt.test.ts`

**Interfaces:**
- Produces: `captionRules(spa: boolean, withOffer = false, lightFrom = 'the last word of its set-up')`; the rewrite passes `'its "light"'`. `rewriteUserText` adds `light: 'day' | 'night'` to each post object, after `scene`.

- [ ] **Step 1: Write the failing tests** in a new `describe('day and night copy')`:
  - `POSTS_PROMPT_VERSION` is `'posts-11'` (update the existing `has a version` test).
  - For `planPrompt(false, true)`, `planPrompt(true, true)`, `rewritePrompt(false, true)`, `rewritePrompt(true, true)`: `not.toContain('Wake up light')`, `not.toContain('Long flight?')`, `toContain('Never reuse a phrase from these instructions.')`, `toContain('never the same first sentence, never the same last sentence')`.
  - `planPrompt()` contains `"Each caption and story text follows its post's light, the last word of its set-up."`; `rewritePrompt()` contains `'Each caption and story text follows its post\'s light, its "light".'`.
  - `rewriteUserText(input, posts)` with one post whose `setup.light` is `'night'` and one with no set-up: the parsed `### Posts` JSON gives `light: 'night'` and `light: 'day'`.
  - The mix line still holds `(after a surf, a hike, a long flight)`.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-prompt.test.ts` — expected FAIL on the new tests.
- [ ] **Step 3: Implement.** In `captionRules`, the hook's parenthesis becomes `(a question or a promise the guest feels, about their own day)`; the ending becomes `and a last sentence on a positive note: a feeling in the body, what the rest of the day or night holds, or a warm promise.` Add two lines after it, exact copy:
  - `- Each caption and story text follows its post's light, ${lightFrom}. Day: the guest's afternoon, a break in the middle of the day after the beach, a surf, a walk round town or a morning at the laptop, with the evening still ahead (a sunset, dinner, a night out); never sleep, bed or waking up. Night: the guest's evening, the day done, unwinding in the room, a deep sleep, the next day ahead; never the afternoon, the midday sun or the morning just past.`
  - `- The captions open differently and end differently: never the same first sentence, never the same last sentence, and never the same idea said twice in other words. Never reuse a phrase from these instructions.`

  Bump `POSTS_PROMPT_VERSION` to `'posts-11'` and add `docs/specs/posts/day-and-night-copy` to the comment above it. `rewritePrompt` calls `captionRules(spa, withOffer, 'its "light"')`.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts` — expected PASS (fix any test pinned to `posts-10` copy that this change makes stale).
- [ ] **Step 5: Commit** `feat(posts): captions follow the post's light, with no example to copy (roadmap 2.14b)` with `lib/posts/prompt.ts tests/unit/posts-prompt.test.ts`, plus the approved spec, this plan and `docs/roadmap.md`, not yet committed.

### Task 2: The records

**Files:**
- Create: `lib/posts/variety.ts`
- Modify: `lib/posts/checks.ts` (`checkPlan`, `checkRewrite`)
- Test: `tests/unit/posts-variety.test.ts`, `tests/unit/posts-checks.test.ts`

**Interfaces:**
- Consumes: `sentences(text: string): string[]` from `lib/posts/story.ts`; `emojisIn` from `lib/posts/emoji.ts`.
- Produces: `repeatRecords(posts: Post[]): Dropped[]` and `lightRecords(post: Post): Dropped[]`.

- [ ] **Step 1: Write the failing tests** in `posts-variety.test.ts`, with a small `post(id, caption, { light?, storyText?, offer? })` helper:
  - posts 1 and 4 end "Wake up light tomorrow. 🌺" and "wake up light tomorrow." → exactly `[{ field: 'mix', reason: 'last sentence "Wake up light tomorrow." in post-1, post-4' }]`.
  - two captions opening "Long flight? 🌸 …" → `first sentence "Long flight?" in post-2, post-3`.
  - two non-offer story texts ending "Sleep well. 🌸" → `story text "Sleep well." in …`; the same on two posts with `offer: true` → no record.
  - six different captions → `[]`.
  - `lightRecords`: day post with "Sleep deeply tonight." → `[{ field: 'light', reason: 'post-2 (day): "sleep"' }]`; night post with "Perfect this afternoon." → `post-3 (night): "this afternoon"`; day post with "wakeboarding" or "awakening" → `[]`; a post without a set-up is a day; the story text is checked too.

  In `posts-checks.test.ts`: `checkPlan` and `checkRewrite` on posts sharing a last sentence return the record in `dropped` and the posts unchanged.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-variety.test.ts tests/unit/posts-checks.test.ts` — expected FAIL (module not found).
- [ ] **Step 3: Implement** `lib/posts/variety.ts`: a key is a sentence with emoji removed, spaces collapsed, trimmed, lower-cased; first and last sentences are the first and last non-empty after emoji removal. Group posts by key in post order; a group of two or more gives one record. Light words are matched with `\b…\b`, `i` flag. `checkPlan` appends `repeatRecords(kept)` and `kept.flatMap(lightRecords)`; `checkRewrite` the same on its `posts`.
- [ ] **Step 4: Run** the two test files, then `pnpm test` — expected PASS.
- [ ] **Step 5: Commit** `feat(posts): record repeated sentences and light misses (roadmap 2.14b)` with the four files.

### Task 3: The log line

**Files:**
- Modify: `lib/posts/log.ts`, `lib/posts/run.ts`
- Test: `tests/unit/posts-log.test.ts`, `tests/unit/posts-run.test.ts`

**Interfaces:**
- Produces: `PostsLog.repeats: number`, `PostsLog.lightMisses: number`.

- [ ] **Step 1: Write the failing tests:** `formatPostsLog` prints `offer_fixes=0 repeats=2 light_misses=1` in that order; a `streamPlan` run whose model answer has two captions with the same last sentence logs `repeats=1`.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-log.test.ts tests/unit/posts-run.test.ts` — expected FAIL.
- [ ] **Step 3: Implement.** `repeats` counts `dropped` entries with `field === 'mix'` and a reason matching `/^(first sentence|last sentence|story text) "/`; `lightMisses` counts `field === 'light'`. Both start at 0 in the entry.
- [ ] **Step 4: Run** the two files — expected PASS.
- [ ] **Step 5: Commit** `feat(posts): count repeats and light misses in the log (roadmap 2.14b)`.

### Task 4: Recordings, replay and journal

**Files:**
- Modify: `tests/fixtures/sites/{sen,svarga}/posts.json`, `posts-offer.json`; `tests/unit/posts-fixtures-replay.test.ts`
- Create: `docs/specs/posts/day-and-night-copy/journal.md` (from `docs/templates/journal.md` if present, else like `docs/specs/posts/offer-line-first/journal.md`)

- [ ] **Step 1: Ask the maintainer** for the 4 Flash-Lite requests; wait for a yes.
- [ ] **Step 2: Record** `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`. Copy into the journal, per plan: the six last sentences with each post's light, the `mix` and `light` records, and the three day and three night captions side by side.
- [ ] **Step 3: Replay check.** In `recorded story texts and flowers`, assert the last sentences (via `repeatRecords`) give no `last sentence` record; update the comment to say all four plans are on `posts-11`. Run `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts` — expected PASS. If a recording repeats an ending, record it in the journal and ask the maintainer before spending another request.
- [ ] **Step 4: Commit** `test(posts): record day and night copy on posts-11 (roadmap 2.14b)` with the fixtures, the test and the journal.

### Task 5: Finish

- [ ] **Step 1:** Set 2.14b's status to `done` in `docs/roadmap.md`.
- [ ] **Step 2:** `pnpm check` — expected exit 0. (`brand-fixtures-replay` karsa-spa timing out under the full run is known; if it does, rerun that file alone and note it in the journal.)
- [ ] **Step 3:** Commit `docs(posts): day and night copy done (roadmap 2.14b)`, push, and give the maintainer the PR title and full body for a PR to `develop`.
