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

---

## The spec amended 2026-11-12

**Goal:** Every caption opens on a question of the kind code deals (`sore` or `ask`) and answers it with a person doing the acting; an offer post opens on its offer line again; story texts hold ten words at most; code records clichés, missing questions, sore spots with no part of the body and long story texts.

**Architecture:** `lib/posts/setup.ts` deals `question` last, in place of 2.15's hook styles. `lib/posts/offer-line.ts` gets `putOfferLineFirst` back, paragraph by paragraph as `putOfferLineSecond` works, and `lib/posts/paragraphs.ts` a `joinQuestion` that `shortCaption` runs on an offer post before the limit. `lib/posts/variety.ts` reads an offer post's question after its line and gains three records. The prompt becomes `posts-18`. Then Sen's and Svarga's plans are recorded again, with the maintainer's go-ahead.

**Spec:** `docs/specs/posts/short-captions/spec.md`, the parts marked "Amended 2026-11-12".

### Global Constraints (amended 2026-11-12)

- Kinds: `QUESTIONS = ['sore', 'ask'] as const`, one each per attempt, `shuffled(QUESTIONS, random)` with or without an offer, drawn last, where `HOOKS` were. `HOOKS` stays in the schema only, so a set-up saved with a style still loads; none is dealt.
- Prompt version `posts-18`. Plan user text: `### Questions` right after `### Image set-ups`, one line per post, `1. sore`. Rewrite user text: `question` next to `light`, only when the set-up has one.
- Offer post: paragraph 1 is its offer line, word for word; paragraph 2 opens on its question; paragraph 3 is its fact. Fix records `<id>: offer line put first`, `<id>: offer line added`.
- On an offer post of more than three paragraphs (counted after `hookOnItsLine`), a second paragraph that is one sentence ending in "?" (emoji after it allowed) joins the third with a space. Three or fewer: unchanged.
- Story text asked: at most 10 words (`POSTS_LIMITS.storyWords: 10`) and 60 characters (`storyAsked: 60`), flower included. Code's limit stays `storyChars: 120`.
- Records, exact reasons: `{ field: 'mix', reason: '<id>: no question after the offer line' }`; `{ field: 'mix', reason: '<id>: question names no part of the body' }`; `{ field: 'words', reason: '<id>: "melt away", "—"' }` and `'<id>'s story text: "unwind"'`; `{ field: 'story', reason: '<id>: story text of <n> words' }`.
- Body words: back, shoulder, shoulders, neck, leg, legs, calf, calves, thigh, thighs, knee, knees, foot, feet, ankle, ankles, arm, arms, hand, hands, wrist, wrists, hip, hips, head. Never "muscles" or "body".
- Clichés: unwind, unwinding, indulge, indulgent, indulgence, pamper, pampering, oasis, escape, melt away, melts away, soothe, soothes, soothing, and the em dash "—"; whole words, case ignored, listed in the order they appear (the inflections are the developer's call, in the journal).
- No example sentence, question or story text in the prompt (2.14b).
- The recordings spend 4 Flash-Lite requests: only after the maintainer says yes, never on a pilot day.
- Commits as above.

### Review Focus (amended 2026-11-12)

- A set-up saved with a 2.15 style (`hook: 'scene'`) and no `question` still loads, and its rewrite sends no `question`. Task 7 and Task 10 test it.
- An offer caption written with single line breaks (`line\nquestion?\nanswer.\nfact.`) counts four paragraphs and keeps its answer. Task 8 tests it.
- A caption that carries no offer and whose second paragraph is a question is never joined. Task 8 tests it.
- The body record reads "Legs" and "shoulders," as body words, and never fires on an `ask` post or a post without a kind. Task 9 tests it.
- "landscape" and "escaped" hold no cliché: whole words only. Task 9 tests it.

### Task 7: The two kinds of question in the set-ups

**Files:**
- Modify: `lib/posts/setup.ts` (`QUESTIONS`, `Question`, `setupSchema`, `dealSetups`), `scripts/eval-posts.ts:79` (print `question: <kind>` when the set-up has one)
- Test: `tests/unit/posts-setup.test.ts` (the `hook styles` block becomes `question kinds`)

**Interfaces:**
- Produces: `export const QUESTIONS = ['sore', 'ask'] as const`; `export type Question = (typeof QUESTIONS)[number]`; `setupSchema` gains `question: z.enum(QUESTIONS).optional()` and keeps `hook: z.enum(HOOKS).optional()`; `dealSetups` sets `question` on both set-ups and no `hook`.

- [ ] **Step 1: Write the failing tests.** Before changing code, pin what `deal(withOfferings(EIGHT), offerOn(['Aroma Massage']))` and `deal(senProfile())` give today, without `hook`. Tests: `one of each kind, without an offer` (`deal(senProfile()).map((s) => s.question).sort()` is `['ask', 'sore']`); `one of each kind, with an offer`; `the same seed, the same kinds`; `no hook style any more` (every `hook` undefined); `the kinds come last: the set-ups are as before` (both pinned deals equal, `question` aside); `the schema takes a kind, a 2.15 style, none, and refuses another` (`question: 'sore'` and `hook: 'scene'` pass, `question: 'scene'` fails); `the image never sees the kind` (`setupLine` the same with and without `question`).
- [ ] **Step 2: Run them and see them fail.** `pnpm exec vitest run tests/unit/posts-setup.test.ts`: the kind tests fail.
- [ ] **Step 3: Implement.** `const questions = shuffled(QUESTIONS, random)` in place of `hooks`, `question: questions[i]` in each set-up.
- [ ] **Step 4: Run them, and see them pass.**
- [ ] **Step 5: Commit** `feat(posts): deal a sore or ask question into each set-up (roadmap 2.18)`.

### Task 8: The offer line first, and the question keeps its answer

**Files:**
- Modify: `lib/posts/offer-line.ts` (`putOfferLineFirst` replaces `putOfferLineSecond`), `lib/posts/paragraphs.ts` (`joinQuestion`), `lib/posts/checks.ts` (`lineFirst` replaces `lineSecond`; `LINE_FIXES` `'put first': 'offer line put first'`; `shortCaption(caption, id, spa, carries)` runs `joinQuestion` after `hookOnItsLine` when `carries`)
- Test: `tests/unit/posts-offer-line.test.ts`, `tests/unit/posts-paragraphs.test.ts`, `tests/unit/posts-checks.test.ts`

**Interfaces:**
- Produces: `putOfferLineFirst(caption: string, line: string, offer: Offer): { caption: string; fix: 'put first' | 'added' | null }`; `joinQuestion(caption: string): string`.

- [ ] **Step 1: Write the failing tests.** `putOfferLineFirst`: keeps a caption whose first paragraph starts with the line (its stop may be gone before a flower); moves a line written second, or in the model's own words, to the first paragraph, `'put first'`; adds a missing one first, `'added'`; gives the line alone when the caption only stated the offer; adds no flower. `joinQuestion`: `"L\n\nQ?\n\nA.\n\nF."` gives `"L\n\nQ? A.\n\nF."`; `"L\nQ? 🌸\nA.\nF."` gives `"L\n\nQ? 🌸 A.\n\nF."`; three paragraphs come back byte for byte; a second paragraph holding a question and an answer is not joined. `checkPost`: the spec's scenarios "The offer line goes first" and "The offer line added first" (a business that isn't a spa); an offer caption of five paragraphs keeping its line, its question with its answer, and its last; a spa's offer caption ending with exactly 2 flowers; a caption without the offer whose second paragraph is a question, not joined.
- [ ] **Step 2: Run them and see them fail.** `pnpm exec vitest run tests/unit/posts-offer-line.test.ts tests/unit/posts-paragraphs.test.ts tests/unit/posts-checks.test.ts`.
- [ ] **Step 3: Implement.** `putOfferLineFirst`: the early return reads `paragraphsOf(text)[0]?.startsWith(bare)`; the sentences that state the offer go as in `putOfferLineSecond`; the result is `[line, ...kept].join('\n\n')`. `joinQuestion` uses `groups` and `sentences` (`lib/posts/story.ts`).
- [ ] **Step 4: Run them, then the posts tests, and see them pass.** 2.18's tests of the line second change to the line first; the journal names each.
- [ ] **Step 5: Commit** `feat(posts): the offer line first again, its question kept with its answer (roadmap 2.18)`.

### Task 9: The records of the amendment

**Files:**
- Modify: `lib/posts/variety.ts` (`hookRecords` reads an offer post's first sentence after its line; new `bodyRecords`, `clicheRecords`, `storyLengthRecords`, all in `copyRecords`)
- Test: `tests/unit/posts-variety.test.ts`

**Interfaces:**
- Consumes: `Setup['question']` (Task 7); `paragraphsOf` (`lib/posts/paragraphs.ts`).
- Produces: the four record reasons in the Global Constraints.

- [ ] **Step 1: Write the failing tests.** The spec's scenarios "No question after the offer line", "A sore question with no part of the body", "A cliché" and "A long story text"; an offer post opening on its line, then a question: no record; "Legs still shaking from the Mount Batur sunrise hike?" on a `sore` post: no record; "Tired after a long day in Canggu?" on an `ask` post or a post without a kind: no record; "melt away" and "—" in one caption: one record, `'post-1: "melt away", "—"'`; "unwind" in a story text: `"post-1's story text: \"unwind\""`; "landscape" and "escaped": none; a 10-word story text: none; an offer post's story text of 12 words: none; a clean batch: no new record.
- [ ] **Step 2: Run them and see them fail.** `pnpm exec vitest run tests/unit/posts-variety.test.ts`.
- [ ] **Step 3: Implement.** Words counted with `WORD` (`lib/posts/variety.ts`); an emoji is no word.
- [ ] **Step 4: Run them, and see them pass.**
- [ ] **Step 5: Commit** `feat(posts): record clichés, missing questions, sore spots and long story texts (roadmap 2.18)`.

### Task 10: The prompt, posts-18

**Files:**
- Modify: `lib/posts/prompt.ts` (`POSTS_PROMPT_VERSION = 'posts-18'`, `captionRules`, `offerRules`, `rewriteOfferRules`, `planUserText`, `rewriteUserText`), `lib/posts/batch.ts` (`storyAsked: 60`, `storyWords: 10`)
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-run.test.ts`

**Interfaces:**
- Consumes: `QUESTIONS`, `Setup['question']` (Task 7).

- [ ] **Step 1: Write the failing tests.** `posts-18`; the plan and rewrite prompts describe `sore` (a part of the body, its set-up's, or for "whole body" or "head" one its treatment's description names; one of the essence's moments that fits it, never the same in both posts; a real place when the moment holds none) and `ask` (what a tourist asks or types before booking, that this business answers); never a question about how the guest feels or one that names only a mood; the line after the question answers it, and no other question, never one that labels the writer's own claim; a person does the acting, never the pressure, the strokes, the massage, the oil or the towels; the result physical and soon; a business that comes to its guests says where; each sentence holds something a guest could check; a spa's first flower "right after the first line"; the clichés and AI tells by name; the story text's 10 words and 60 characters; with an offer, the offer line alone on the first line and the question opening the second paragraph; none of "its offer line comes right after it", "as its second paragraph" or "a reason to message now" left; `### Questions` right after `### Image set-ups`, `1. sore`; a rewrite's user text with `"question": "ask"` for a post dealt it, and none for a post without one or with only a 2.15 `hook`; no example question or story text quoted.
- [ ] **Step 2: Run them and see them fail.** `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`.
- [ ] **Step 3: Implement.** The kinds are described in the prompt's own words, with no example sentence.
- [ ] **Step 4: Run them, then `pnpm check`, and see them pass.**
- [ ] **Step 5: Commit** `feat(posts): questions of two kinds, answered plainly, the offer line first (posts-18, roadmap 2.18)`.

### Task 11: New recordings, the replay test and the evaluation

**Files:**
- Modify: `tests/fixtures/sites/sen/posts.json`, `posts-offer.json`, `tests/fixtures/sites/svarga/posts.json`, `posts-offer.json` (recorded), `tests/unit/posts-fixtures-replay.test.ts`, `docs/specs/posts/short-captions/journal.md`, `docs/roadmap.md`
- Test: `tests/unit/posts-fixtures-replay.test.ts`

- [ ] **Step 1: Ask the maintainer** for 4 Flash-Lite requests, not on a pilot day. `.env.local` comes from the worktree the `posts-16` recordings used, and stays out of git.
- [ ] **Step 2: Record.** `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`. A `model_busy` or `model_failed` run is tried again, each call counted in the journal.
- [ ] **Step 3: Update the replay test** to `posts-18`: an offer post's first paragraph is its offer line and its second opens on a question; a post without the offer opens on a question; no caption over three paragraphs; a spa's caption has 2 flowers and its story text 1; no price. Run `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts` and see it pass.
- [ ] **Step 4: Score** the 8 captions and 4 story texts on the spec's amended checks, next to `posts-16`'s, in the journal. Show them to the maintainer; on a check that fails, they decide whether the prompt changes and the plans are recorded again.
- [ ] **Step 5: Run `pnpm check` and `pnpm test:e2e`, set roadmap 2.18 to `done`, and commit** `feat(posts): record posts-18 for Sen and Svarga (roadmap 2.18)`.
