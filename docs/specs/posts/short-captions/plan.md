# Short captions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Captions the model writes have at most three short paragraphs, the hook counted, in plain words, with no description of the setting; code holds them to three and records long sentences and setting words.

**Architecture:** A new pure module, `lib/posts/paragraphs.ts`, holds a caption to three paragraphs. `checkedWords` in `lib/posts/checks.ts` runs it after the hook goes alone on its line, then the cut (now 400 characters), then gives a spa its flower back if one went. `lib/posts/variety.ts` gains two records. The prompt (`lib/posts/prompt.ts`) becomes `posts-15`. Then Sen's and Svarga's plans are recorded again, with the maintainer's go-ahead.

**Tech Stack:** TypeScript, Vitest, pnpm; Gemini Flash-Lite through `lib/ai/text-model.ts` for the recordings only.

**Spec:** `docs/specs/posts/short-captions/spec.md`

## Global Constraints

- At most three paragraphs a caption, its hook counted (`POSTS_LIMITS.paragraphs = 3`). The WhatsApp line and the hashtags aren't part of the caption.
- Past three, code keeps the first, the second and the last paragraph; each one dropped is recorded `{ field: 'caption', reason: '<id>: paragraph dropped "<text>"' }`.
- A paragraph is the text between line breaks; a line with no letter or digit isn't one.
- A sentence holds at most 15 words, asked (`POSTS_LIMITS.sentenceWords = 15`); more is recorded `{ field: 'words', reason: '<id>: <n> words in "<first four words>…"' }`, the offer line aside.
- 80 to 280 characters asked (`captionMin: 80`, `captionAsked: 280`); code cuts past 400 (`captionMax: 400`).
- Shapes in the plan only: post 1, its hook and two paragraphs; post 2, its hook and one.
- Setting record: `{ field: 'words', reason: '<id> describes the setting: "lamps", "glow", "linens"' }`, words in the order they appear; a story text's reads `'<id>'s story text describes the setting: …'`.
- Prompt version `posts-15`.
- The owner's own edits are never held to three paragraphs or cut (2.4).
- The recordings spend 4 Flash-Lite requests: only after the maintainer says yes, never on a pilot day.
- Commits: Conventional Commits, scope `posts` or `docs`, header at most 100 characters, files staged by path, author SiegfriedBz with the protonmail address.

## Review Focus

- A caption of three paragraphs or fewer must come back byte for byte, single line breaks included. Task 1 tests it.
- An offer post whose model caption runs to five paragraphs keeps its offer line first. Task 2 tests it.
- A price or duration flag must not quote a paragraph that code dropped: `findFlags` runs on the caption after the paragraph limit. Task 2 tests it.
- A caption over 400 characters once held to three paragraphs still ends on a full sentence, and a spa's still holds a flower. Task 2 tests it.
- A flower alone on the first line belongs to the hook, not to a paragraph of its own. Task 1 tests it.

---

### Task 1: The paragraph limit

**Files:**
- Create: `lib/posts/paragraphs.ts`
- Modify: `lib/posts/batch.ts` (`POSTS_LIMITS`)
- Test: `tests/unit/posts-paragraphs.test.ts`

**Interfaces:**
- Produces: `paragraphsOf(caption: string): string[]`, the caption's paragraphs, each with any letterless line that follows it, trimmed; `keepParagraphs(caption: string, id: string): { caption: string; dropped: Dropped[] }`. `POSTS_LIMITS` gains `paragraphs: 3`, `sentenceWords: 15`, `captionAsked: 280`, and changes `captionMin` to 80 and `captionMax` to 400.

- [ ] **Step 1: Write the failing tests** in `tests/unit/posts-paragraphs.test.ts`:
  - `keeps three paragraphs as they are`: `keepParagraphs('Hook?\n\nOne.\nTwo.', 'post-1')` returns the same string and `dropped: []`;
  - `keeps the first, the second and the last of five`: `'A.\n\nB.\n\nC.\n\nD.\n\nE.'` gives `'A.\n\nB.\n\nE.'` and two records, `'post-2: paragraph dropped "C."'` and `'post-2: paragraph dropped "D."'`, both `field: 'caption'`;
  - `a flower alone on a line belongs to the paragraph before it`: `'A.\n🌸\n\nB.\n\nC.'` counts 3 and stays as it is; `'🌸\nA.\n\nB.\n\nC.\n\nD.'` keeps `'🌸\nA.\n\nB.\n\nD.'`;
  - `blank and space-only lines are no paragraph`: `paragraphsOf('A.\n \n\nB.')` is `['A.', 'B.']`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/posts-paragraphs.test.ts`
Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement `paragraphsOf` and `keepParagraphs` in `lib/posts/paragraphs.ts`**, and the `POSTS_LIMITS` changes. A line holding `[\p{L}\p{N}]` starts a paragraph; a line without one joins the paragraph before it (or the first). Under the limit, return the caption untouched; over it, join the kept paragraphs with `\n\n`, a paragraph's own lines with `\n`. Quote a dropped paragraph with its lines joined by a space.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm exec vitest run tests/unit/posts-paragraphs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/paragraphs.ts lib/posts/batch.ts tests/unit/posts-paragraphs.test.ts
git commit -m "feat(posts): hold a caption to three paragraphs (roadmap 2.18)"
```

### Task 2: Every caption the model writes is held to three

**Files:**
- Modify: `lib/posts/checks.ts` (`checkedWords`, new `shortCaption`)
- Test: `tests/unit/posts-checks.test.ts`

**Interfaces:**
- Consumes: `keepParagraphs` (Task 1), `hookOnItsLine`, `cutCaption`, `addFlower`.
- Produces: `checkPost`, `checkRewrite` and `checkPlan` unchanged in signature; their captions are held to three paragraphs.

- [ ] **Step 1: Write the failing tests** in `tests/unit/posts-checks.test.ts`, a new `describe('short captions')`:
  - the spec's scenario `A first line of two sentences`: `checkPost(raw({ caption: 'Sore legs after Mount Batur? 🌸 Our therapists come to your villa.\n\nNo deposit needed.\n\nFree travel in Canggu.' }), svargaProfile(), 'post-1')` gives the caption `'Sore legs after Mount Batur? 🌸\n\nOur therapists come to your villa.\n\nFree travel in Canggu.'` and `dropped` holds `{ field: 'caption', reason: 'post-1: paragraph dropped "No deposit needed."' }`;
  - five paragraphs in a caption update: `checkRewrite` on one post answered with five paragraphs gives three;
  - an offer post (`carries: true`) answered in five paragraphs still starts with its offer line;
  - a spa's caption in four paragraphs whose only flower is in the third: three paragraphs, and one of `FLOWERS` in it;
  - a price flag in a dropped paragraph: a caption whose fourth of five paragraphs holds "60 min" not in the profile has no `duration` flag;
  - three paragraphs of 160 characters each: the caption is at most 400 characters, ends with `.`, and a spa's holds a flower;
  - an owner's edit of five paragraphs (`applyEdit`) keeps them;
  - change `cuts a caption over 700 characters at the last full sentence` to 400.

- [ ] **Step 2: Run them, see them fail, and copy the summary line into the journal's RED**

Run: `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/posts-paragraphs.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement `shortCaption(caption: string, id: string, spa: boolean): { caption: string; dropped: Dropped[] }` in `lib/posts/checks.ts`**: `hookOnItsLine`, then `keepParagraphs`, then `cutCaption`, then, for a spa, `addFlower`, recorded as `spaCaption` does (`'<id>: caption added 🌸'`). In `checkedWords`, drop the early `cutCaption` call, run `spaCaption` on the priced text, and set `shown` to `dropStopsBeforeEmoji(shortCaption(caption, id, spa).caption)`; its records join `dropped`. `findFlags` keeps running on `shown`.

- [ ] **Step 4: Run them and see them pass, then the whole suite**

Run: `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/posts-paragraphs.test.ts`, then `pnpm test`
Expected: PASS. Old recordings that now lose a paragraph (the `posts-1` slugs) get their tests changed to match, each change named in the journal.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/checks.ts tests/unit/posts-checks.test.ts
git commit -m "feat(posts): every caption the model writes keeps three paragraphs at most (roadmap 2.18)"
```

### Task 3: The records of long sentences and of the setting

**Files:**
- Modify: `lib/posts/variety.ts` (`copyRecords`, new `longSentences`, `settingRecords`, exported `sentenceWords`)
- Test: `tests/unit/posts-variety.test.ts`

**Interfaces:**
- Consumes: `plainSentences`, `folded`, `holdsWords` (already in the file).
- Produces: `sentenceWords(text: string): number[]`, the word count of each sentence, emoji aside, for the eval's print; `copyRecords` returns the two new records after 2.15's.

- [ ] **Step 1: Write the failing tests** in `describe('copyRecords')`:
  - a caption sentence of 16 words is recorded as `'post-2: 16 words in "<its first four words>…"'`, one of 15 isn't;
  - on a post with `offer: true`, a first sentence of 16 words isn't recorded, a second one is;
  - the spec's `Evening lamps cast a golden glow across fresh linens.` gives `{ field: 'words', reason: 'post-1 describes the setting: "lamps", "glow", "linens"' }`;
  - a story text `A soft glow waits in your room tonight 🌺` gives `"post-1's story text describes the setting: \"glow\""`;
  - `Your legs feel light again.` gives no setting record;
  - `sentenceWords('Sore legs? 🌸 Our therapists come to you.')` is `[2, 5]`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/posts-variety.test.ts`
Expected: FAIL on the new cases.

- [ ] **Step 3: Implement them in `lib/posts/variety.ts`.** Words are `[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*`. The list starts with the spec's: glow, lamp, lamps, candle, candles, candlelight, lantern, lanterns, sunset, sunlight, sky, garden, linen, linens, breeze, quiet, calm, peaceful, serene, tranquil, afternoon light, evening light, soft light, golden light. Words are matched whole on `folded` text, listed in the order they first appear, one record per text.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm exec vitest run tests/unit/posts-variety.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/variety.ts tests/unit/posts-variety.test.ts
git commit -m "feat(posts): record long sentences and setting words in captions (roadmap 2.18)"
```

### Task 4: The prompt, posts-15

**Files:**
- Modify: `lib/posts/prompt.ts`
- Modify: `scripts/eval-posts.ts` (`print`)
- Test: `tests/unit/posts-prompt.test.ts`

**Interfaces:**
- Consumes: `POSTS_LIMITS` (Task 1), `sentenceWords` and `paragraphsOf` (Tasks 1 and 3) in the eval's print.
- Produces: `POSTS_PROMPT_VERSION = 'posts-15'`.

- [ ] **Step 1: Write the failing tests**, changing the existing ones the spec changes:
  - the version is `posts-15`; the plan prompt holds `'280'` and `'125'` in place of `'700'`;
  - every prompt (plan, rewrite, with and without an offer) holds `'at most three paragraphs in all, the hook counted'`, `'a sentence holds at most 15 words'`, `'80 to 280 characters in all'`, `'Never describe the setting'`, `'Never describe what the photo shows'`, `'Feelings and place symbols are yours to use, in a few words.'`;
  - none holds `'what the guest will feel, rather than what the business does'`, `'through the senses'`, `'how it feels'`, `'puts the guest back'`, `'senses and place symbols are yours to use freely'` or `'250 to 700'`;
  - the plan's shape line is `"post 1's caption has two paragraphs after its hook and post 2's has one"`, with and without an offer; the rewrite has none;
  - the `scene` style reads `'- scene: names a moment the guest is living, in a few plain words, in the present tense, with no question.'`, and the jobs start `'- ritual: the steps of one treatment, in plain words'` and `'- offer: makes the guest want one treatment or package now: the sore spot it answers and what changes after; its duration when the profile gives it.'`;
  - the light lines read `"A caption or story text that says when follows its post's light, the last word of its set-up"` in the plan and `'…, its "light"'` in the rewrite, each with `'It need not say when, and never describes the light.'`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts`
Expected: FAIL on the changed rules.

- [ ] **Step 3: Change `lib/posts/prompt.ts`** to the spec's "Plain words, no setting" and "At most three short paragraphs", the numbers from `POSTS_LIMITS`. In `scripts/eval-posts.ts`, print under each caption `shape: <n> paragraphs · <chars> chars · longest sentence <n> words`.

- [ ] **Step 4: Run them, then `pnpm check`, and copy its summary line into the journal's GREEN**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts`, then `pnpm check`
Expected: PASS, and `pnpm check` exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/prompt.ts scripts/eval-posts.ts tests/unit/posts-prompt.test.ts
git commit -m "feat(posts): ask for three short paragraphs, no setting (posts-15, roadmap 2.18)"
```

### Task 5: New recordings, the replay test and the evaluation

**Files:**
- Modify: `tests/fixtures/sites/sen/posts.json`, `posts-offer.json`; `tests/fixtures/sites/svarga/posts.json`, `posts-offer.json`
- Modify: `tests/unit/posts-fixtures-replay.test.ts`
- Create: `docs/specs/posts/short-captions/journal.md`
- Modify: `docs/roadmap.md` (2.18 `done`)

- [ ] **Step 1: Ask the maintainer for the 4 requests.** Nothing runs without their yes.

- [ ] **Step 2: Record**

Run: `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`
Expected: 4 plans printed with their shape lines and records; the four files rewritten with `"promptVersion": "posts-15"`.

- [ ] **Step 3: The replay test.** In `recorded story texts and flowers`, assert that each caption has at most three paragraphs (`paragraphsOf(post.caption).length <= 3`). The price check stays.

Run: `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts`
Expected: PASS.

- [ ] **Step 4: The journal.** Write the calls made, RED and GREEN, and the spec's evaluation table with `posts-14`'s column and the new one, scored on the 8 captions, with the pass or fail of each line and, where one fails, why. Show the maintainer the 8 captions in plain words, and ask whether they would post at least one of each plan's two.

- [ ] **Step 5: Mark 2.18 `done`, run `pnpm check`, commit**

```bash
git add tests/fixtures/sites/sen/posts.json tests/fixtures/sites/sen/posts-offer.json tests/fixtures/sites/svarga/posts.json tests/fixtures/sites/svarga/posts-offer.json tests/unit/posts-fixtures-replay.test.ts docs/specs/posts/short-captions/journal.md docs/roadmap.md
git commit -m "docs(docs): record posts-15 and mark roadmap 2.18 done"
```

- [ ] **Step 6: Push and open the PR to `develop`** on github.com: a fresh reviewer reads the whole branch first, then the title and the full description go to the maintainer, ready to paste.

### Task 6: A question first, the offer line second (the spec amended 2026-11-10)

**Files:**
- Modify: `lib/posts/offer-line.ts` (`putOfferLineSecond` replaces `putOfferLineFirst` and `dropPrices`), `lib/posts/checks.ts` (`lineSecond`, every caption's prices through `withoutPrices`, no `displaced`), `lib/posts/paragraphs.ts` (no `displaced`), `lib/posts/variety.ts` (a hook that is no question recorded, in place of two question hooks), `lib/posts/prompt.ts` (`posts-16`)
- Test: `tests/unit/posts-offer-line.test.ts`, `posts-checks.test.ts`, `posts-paragraphs.test.ts`, `posts-variety.test.ts`, `posts-prompt.test.ts`, `posts-run.test.ts`, `posts-fixtures-replay.test.ts`

**Interfaces:**
- Produces: `putOfferLineSecond(caption: string, line: string, offer: Offer): { caption: string; fix: 'put second' | 'added' | null }`; `keepParagraphs(caption, id)` as in Task 1; the record `{ field: 'mix', reason: '<id>: hook is no question' }`.

- [ ] **Step 1: Write the failing tests**: the spec's three new scenarios; `putOfferLineSecond` keeping a line written second, moving one written first or in the model's own words, adding a missing one, and giving the line alone when the caption only stated the offer; an offer caption of five paragraphs keeping its question, its line and its last; a price after the question removed on an offer post; the hook record on any post, the old record gone; the prompt's question hook, three paragraphs for every post, fact last, line second, no hook styles, no `### Hooks`, no senses, `posts-16`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** Paragraph by paragraph, the sentences that state the offer go; the first paragraph left gives the hook (`hookOnItsLine`), then the line, then the rest.
- [ ] **Step 4: Run them, then `pnpm check`, and see them pass.** Tests of 2.13b's line first change to the line second, each named in the journal.
- [ ] **Step 5: Commit**, then record Sen's and Svarga's plans again (4 requests, the maintainer's yes) and score them as Task 5 did.
