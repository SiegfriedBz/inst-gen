# Two suggestions an attempt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An attempt plans two posts instead of six, both with their images; the buttons, the grid and the owner guide say two.

**Architecture:** The count lives in `POSTS_LIMITS.posts` (`lib/posts/batch.ts`) and `SETUPS` (`lib/posts/setup.ts`, no import from `batch.ts`, which imports it). The prompt (`lib/posts/prompt.ts`, `posts-12`) asks for two with the new mix; `checkPlan` and the plan run (`lib/posts/checks.ts`, `lib/posts/run.ts`) keep two. 2.17's `imagePosts` already returns both posts of a two-post attempt, so the image code doesn't change. The screen changes are strings and the grid's columns.

**Tech Stack:** TypeScript, React (Next.js), next-intl, Vitest, Playwright, pnpm.

**Spec:** `docs/specs/posts/two-suggestions/spec.md`

## Global Constraints

- `POSTS_LIMITS.posts = 2`; `SETUPS = 2`; `POSTS_PROMPT_VERSION = 'posts-12'`.
- With an offer: posts 1 and 2 are offer posts and both carry it. Without: post 1 is an offer post, post 2 another type.
- One day and one night set-up; two different scenes.
- Records: `more than 2 posts`, `no offer post`; `offer posts are not posts 1 and 2` stays; `fewer than 2 offer posts` and the four-types rule go.
- Strings exactly as the spec's table, in `en.json`, `id.json` and `vi.json`, in the same commit.
- No recording without the maintainer's yes (4 Flash-Lite requests).
- Commits: Conventional Commits, scope `posts` or `docs`; stage by path; author SiegfriedBz, protonmail email.

## Review Focus

1. The model writes more than two posts: the stream shows two, the batch keeps two, and "more than 2 posts" is recorded (Task 2 test).
2. A recorded six-post plan (`posts-11`) replays to a checked batch of two (Task 2 test).
3. A couple or pregnancy treatment in a two-set-up deal still gets its guests and scene rules (Task 1 test).
4. An attempt made before this ships (six posts) still shows its six tiles and its two images (Task 3: the existing six-post section tests stay).
5. With an offer on one treatment, both offer posts lead on it (Task 1 test).

---

### Task 1: Two set-ups

**Files:** Modify `lib/posts/setup.ts`; Test `tests/unit/posts-setup.test.ts`

- [ ] **Step 1:** Update the tests: a deal has 2 set-ups; one `day` and one `night`; two different scenes; with an offer, both treatments are the offer's (one treatment offered: both on it); a couple never takes `detail`; men and women follow the half-and-half rule over two. Remove expectations of six.
- [ ] **Step 2:** Run `pnpm vitest run tests/unit/posts-setup.test.ts`. Expected: FAIL (six set-ups).
- [ ] **Step 3:** `SETUPS = 2`; lights `SETUPS / 2` of each, shuffled; scenes drawn from one shuffled copy of `SCENES` (a couple's first, never `detail`); comments say two.
- [ ] **Step 4:** Run it. Expected: PASS.
- [ ] **Step 5:** Commit `feat(posts): deal two set-ups an attempt (roadmap 2.17b)`.

### Task 2: A plan of two posts

**Files:** Modify `lib/posts/batch.ts`, `lib/posts/prompt.ts`, `lib/posts/checks.ts`, `lib/posts/run.ts`, `app/api/posts/plan/route.ts` (comment); Test `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-checks.test.ts`, `tests/unit/posts-run.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

- [ ] **Step 1:** Update the tests: the prompt says "You plan two Instagram posts", its mix (without an offer: post 1 an offer post, post 2 one of the other types; with one: both posts carry it, no "other four"), `posts-12`; `checkPlan` keeps two, records `more than 2 posts` and `no offer post`, not `fewer than 2 offer posts`; the run streams at most two posts from a model that writes three, and records `more than 2 posts`; the replays end with at most two posts.
- [ ] **Step 2:** Run those four files. Expected: FAIL.
- [ ] **Step 3:** Implement: `POSTS_LIMITS.posts = 2`; the prompt's opening, mix and offer rules; `checkPlan`'s records; the run's `emit` stops streaming at the limit and records the extra once.
- [ ] **Step 4:** Run them, then `pnpm test`. Expected: PASS; fix other tests that pinned `posts-11` or six planned posts.
- [ ] **Step 5:** Commit `feat(posts): plan two posts an attempt (roadmap 2.17b)`.

### Task 3: The screen says two

**Files:** Modify `components/posts/posts-section.tsx` (`GRID`, header comment), `messages/*.json` (`posts.make`, `posts.makeMore`, `posts.empty`); unit tests whose button names say 6; `tests/e2e/helpers/posts-stream.ts` (two posts; with an offer both carry it) and the e2e specs that count six tiles or open tiles 3 to 6

- [ ] **Step 1:** Update the unit tests' button names to "Make 2 (new )?suggestions" and add one: after an attempt of two, both images are asked for and the grid has two columns.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL on the names and the grid.
- [ ] **Step 3:** Implement the strings and `GRID = 'grid grid-cols-2 gap-x-2 gap-y-3'`.
- [ ] **Step 4:** Update the e2e helper and specs (two tiles, both with images; with an offer, both badged), then run `pnpm test` and `pnpm test:e2e`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(posts): two suggestions on screen (roadmap 2.17b)`.

### Task 4: The guide and the documents

**Files:** `messages/*.json` (`guide.posts.make`, `guide.posts.edit`, `guide.posts.offerDone`, `guide.instagram.noImages`, `guide.allowance.limits`), `tests/e2e/guide.spec.ts`, the six specs the spec names (dated notes), `docs/specs/posts/two-suggestions/journal.md`, `docs/roadmap.md`

- [ ] **Step 1:** Change the guide strings and the guide's e2e check (Indonesian "Making your posts" line).
- [ ] **Step 2:** Run `pnpm test` and `pnpm test:e2e tests/e2e/guide.spec.ts`. Expected: PASS.
- [ ] **Step 3:** Add the notes, run `pnpm guide:pdf` and read the changed lines, write the journal, mark 2.17b `done`, run `pnpm check`. Expected: green.
- [ ] **Step 4:** Commit the guide (`feat(posts): the owner guide says two suggestions (roadmap 2.17b)`) and the documents (`docs(docs): notes and journal for two suggestions, roadmap 2.17b done`).
