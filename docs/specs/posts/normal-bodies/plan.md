# Normal bodies in every image Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, AGENTS.md) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** every image prompt carries a pose written by code from the set-up, then two sentences asking for normal human bodies in a professional massage; Thai's body part becomes the legs (leg stretch) or the back (palm press).

**Architecture:** `lib/posts/setup.ts` gains `poseLine(setup)` and new set-up words; `lib/posts/image-prompt.ts` puts the pose line and the two sentences right after the cast line (or at the start of the style line for a post with no set-up). Nothing about clothes changes. A new eval script makes the 11 check images.

**Tech Stack:** TypeScript, Vitest, `@ai-sdk/google` (image model, eval only), pnpm.

**Spec:** `docs/specs/posts/normal-bodies/spec.md`

## Global Constraints

- `IMAGE_PROMPT_VERSION` = `images-11`; `POSTS_PROMPT_VERSION` = `posts-19`.
- The pose line names no clothes, colours or linens (no "white", "cream", "beige", "cotton", "blanket", "sheet", "tunic", "trousers"); "a folded towel over the eyes" (Thai legs, head) and "feet on a towel" (foot) are today's words and stay.
- The two sentences, word for word: "Every person has a normal human body in a natural, comfortable position: one head, two arms and two legs, each joined to their own body; each arm and leg can be followed from the body to its hand or foot; knees and elbows bend only the natural way. No body lies across, over or under another: the therapists work with their hands, the only contact." and "It is clearly a professional massage: each therapist works with a trained technique and calm focus."
- The therapists' look is said exactly as today (cast line and last rules).
- No new string, no screen change. Stage files by path; Conventional Commits with scope `posts` (or `docs`); attribution trailer on each commit.
- Real-model calls only with the maintainer's yes, never on a pilot day.

## Review Focus

- A saved set-up whose part doesn't fit its look (stone with the legs, plain with the whole body): `poseLine` still returns that look's pose, with the part in words, and never throws.
- A post with no set-up but with a look: the two sentences open the style line, and the look is still said in the last rules only.
- The owner's hint: still after the post's own prompt and before the style line, so after the pose.
- A Thai set-up saved with "whole body": the leg stretch.
- A couple set-up saved with any scene: the couple's pose (two beds), whatever the camera.

---

### Task 1: Thai's parts, the set-up words and the pose line

**Files:**
- Modify: `lib/posts/setup.ts` (`FIXED_PARTS`, `LOOK_WORDS_FOR`/`setupLine`, new `poseLine`)
- Modify: `lib/posts/prompt.ts:21` (`POSTS_PROMPT_VERSION`)
- Create: `tests/fixtures/setups/sen-deals.json` (pinned before any change)
- Test: `tests/unit/posts-setup.test.ts`, `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-run.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Produces: `poseLine(setup: Setup): string` (exported from `lib/posts/setup.ts`); `FIXED_PARTS.thai` = `['legs', 'back']`.

- [ ] **Step 1: Pin today's deals.** Before touching `setup.ts`, a one-off script (scratch, not committed) writes `tests/fixtures/setups/sen-deals.json`: for Sen's fixture profile (`senProfile()` as the tests build it), with and without its offer, seeds `s0`…`s39`, each deal's `[treatment, look, guests, scene, light, question]` per set-up, plus `version: "posts-18"`.
- [ ] **Step 2: Write the failing tests** in `posts-setup.test.ts`:
  - `thai takes the legs or the back, about half each`: 400 seeds on `['Thai Massage', 'Aroma Massage']`; every Thai part is `legs` or `back`; each between 35% and 65%; none `whole body`.
  - `a seed keeps its deal apart from the parts`: every pinned seed in `sen-deals.json` deals the same `[treatment, look, guests, scene, light, question]`.
  - `poseLine` for each look and part of the spec's table: plain/back holds "face down" and "stands at the side of the bed" and "the back"; thai/legs holds "on their back", "bent at the knee", "one hand holds the knee"; thai/back holds "face down on a low mattress" and "both palms flat on the back"; fourHands holds "one on each side and apart"; couple holds "at the outer side of her guest's bed"; foot holds "reclining chair"; head holds "face up"; pregnancy holds "on her side".
  - `poseLine names no clothes or colours`: for every look × its parts, no match of `/\b(white|cream|beige|ivory|indigo|sage|green|blue|brown|black|navy|grey|gray|cotton|linen|blanket|sheets?|tunic|trousers|clothes)\b/i`.
  - `a Thai set-up saved with the whole body gets the leg stretch` and `a part that doesn't fit its look still gets its look's pose` (stone/legs, plain/whole body: contains "face down", no throw).
  - Update `feet for reflexology, whole body for thai, …` → thai is `legs` or `back`; update `setupLine for four hands` to the new words ("face down on a massage bed; two therapists working in step, one standing on each side of the bed"); add `setupLine for thai with the legs` / `with the back` / `couple` holding the spec's phrases and today's "in loose cotton clothes".
  - `posts-prompt.test.ts`: `POSTS_PROMPT_VERSION` is `posts-19`; `posts-run.test.ts:102` expects `posts-19`.
- [ ] **Step 3: Run them and see them fail.** `pnpm exec vitest run tests/unit/posts-setup.test.ts tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts` → FAIL (no `poseLine`, Thai's part is `whole body`, old version). Copy the summary line into the journal's RED.
- [ ] **Step 4: Implement.** `FIXED_PARTS.thai = ['legs', 'back']`; the set-up words of the spec's "What the post plan reads" (Thai by part: `setupLine` picks Thai's words from `bodyPart`, "whole body" counting as the legs); `poseLine` from the spec's table, word for word, `{part}` replaced by the part's words; `POSTS_PROMPT_VERSION = 'posts-19'`.
- [ ] **Step 5: Run them and see them pass,** then `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts`: if a replayed sore question no longer names the re-dealt Thai part, the check (not the recording) follows the spec: a Thai part of the legs or the back is named as today's parts are.
- [ ] **Step 6: Commit** `feat(posts): code writes each image's pose, Thai a leg stretch or a palm press (roadmap 2.23)` with the two test files, the fixture and both lib files.

### Task 2: The pose and the two sentences in the image prompt

**Files:**
- Modify: `lib/posts/image-prompt.ts` (`IMAGE_PROMPT_VERSION`, `imagePrompt`, two exported sentences)
- Create: `tests/fixtures/image-prompt/images-10.json` (pinned before any change); delete `tests/fixtures/image-prompt/images-9.json`
- Test: `tests/unit/posts-image.test.ts`, `tests/unit/posts-image-run.test.ts`

**Interfaces:**
- Consumes: `poseLine(setup: Setup): string` (Task 1).
- Produces: `NORMAL_BODIES: string`, `PROFESSIONAL: string` (exported from `lib/posts/image-prompt.ts`, the Global Constraints' two sentences).

- [ ] **Step 1: Pin today's prompts.** Before touching `image-prompt.ts`, write `images-10.json` from today's `imagePrompt`: the three `images-9` cases, plus Sen's look on a plain set-up, Svarga's look on a four hands set-up with a hint, and a post with no set-up but Sen's look.
- [ ] **Step 2: Write the failing tests** in `posts-image.test.ts`:
  - `images-10 with the new lines taken out, word for word: $name` (each pinned case): the new prompt with `${poseLine(setup)} ${NORMAL_BODIES} ${PROFESSIONAL} ` removed (set-up cases) or `${NORMAL_BODIES} ${PROFESSIONAL} ` removed (no set-up) equals the pinned prompt with `images-10` → same text (the prompt holds no version).
  - `cast line, pose line, the two sentences, then the prompt, the hint, the style`: exact concatenation for the four hands set-up of the existing test.
  - `without a set-up, the two sentences open the style line`, and with Sen's look the look is in the last rules only.
  - `the hint comes after the pose`: index of "The owner asks:" > index of the pose.
  - `IMAGE_PROMPT_VERSION` is `images-11` (replaces the `images-10` assertion); `posts-image-run.test.ts` expects `images-11` twice.
  - Remove the `images-9 word for word` test and `images-9.json` (the new pins replace them).
- [ ] **Step 3: Run them and see them fail.** `pnpm exec vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts` → FAIL. Copy the summary line into the journal's RED.
- [ ] **Step 4: Implement** in `imagePrompt(postPrompt, hint?, setup?, staffLook?)`: with a set-up, `${cast} ${poseLine(setup)} ${NORMAL_BODIES} ${PROFESSIONAL} ${post}${asks} ${style}`; without one, `${post}${asks} ${NORMAL_BODIES} ${PROFESSIONAL} ${style}`. `IMAGE_PROMPT_VERSION = 'images-11'`. The header comment names this spec.
- [ ] **Step 5: Run them and see them pass,** then `pnpm test` (all Vitest) → PASS. Copy the summary line into the journal's GREEN.
- [ ] **Step 6: Commit** `feat(posts): normal bodies and a professional massage in every image prompt (roadmap 2.23)`.

### Task 3: The check script

**Files:**
- Create: `scripts/eval-poses.ts`
- Modify: `package.json` (`"eval:poses": "tsx scripts/eval-poses.ts"`), `AGENTS.md` (Commands table)

**Interfaces:**
- Consumes: `imagePrompt`, `poseLine`, `castLine`, `seededRandom`, `fixtureProfile` with the image cache (as `scripts/eval-images.ts`), `geminiImageModel`, `makePostImage` or `storyAndPost`.

- [ ] **Step 1: Write `scripts/eval-poses.ts`** like `eval-images.ts`: slugs required (`sen`, `svarga`), `--dry` prints the prompts and spends nothing. For each slug, one set-up per look the profile's offerings give (Sen: plain, Thai legs, Thai back, four hands, couple, foot; Svarga: plain, four hands, couple, scrub, foot), the profile's `locals` and look, and an image prompt written as the plan would from the new set-up line (with "clean white linens", no colour); saves each story JPEG under `.superpowers/eval-poses/<slug>/<look>-<part>.jpg`; prints the spend (`IMAGE_USD` each).
- [ ] **Step 2: Dry run** `pnpm eval:poses sen svarga --dry` → 11 prompts, each with the pose line after the cast line, no request.
- [ ] **Step 3:** add the row to AGENTS.md's Commands table: `pnpm eval:poses <slug…> [--dry]` — "Make one image per treatment look of Sen's and Svarga's offerings with the real image model, saved under the scratch folder `eval-poses`. ⚠️ About $0.05 an image (11 for both spas): ask first".
- [ ] **Step 4: `pnpm check`** → passes. **Commit** `feat(posts): pnpm eval:poses, one image per treatment look (roadmap 2.23)`.

### Task 4: Checked with the real model

- [ ] **Step 1:** ask the maintainer (not on a pilot day): "Make the 11 check images, about $0.55?". Only on a yes: `pnpm eval:poses sen svarga`.
- [ ] **Step 2:** look at every image zoomed in (bodies, hands, feet, knees); send the maintainer the sheets; the pass rule of the spec (any failed point: that image made twice more; a second failure stops and asks). Verdicts in the journal.

### Task 5: Documents and the PR

- [ ] **Step 1:** the dated note "> Changed by `posts/normal-bodies` (2026-11-23): …" in `docs/specs/posts/varied-images/spec.md` (the looks table, Thai's body part, what the image model gets); roadmap 2.23 `done`; the Global Plan's line (Claude Docs, via its skill).
- [ ] **Step 2:** `pnpm check` → passes; commit `docs(posts): normal bodies in every image, done (roadmap 2.23)`; push over SSH; give the maintainer the PR title and body for `develop`. Nothing is live until it is merged.
