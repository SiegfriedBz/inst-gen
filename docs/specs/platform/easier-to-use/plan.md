# Easier to use Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sen and Svarga type a short password and their business appears, read from their own website with nothing else typed; "Questions" comes before "Reviews"; the "They go on top" line goes; "Write new texts" gives a suggestion new words for the same images, 10 a day; the Questions hint asks only to take out the guest's name.

**Architecture:** `lib/pilot/config.ts` reads `owner=password` entries beside today's; a new `lib/pilot/sites.ts` holds each spa's website, which `app/page.tsx` hands to `BrandHome`, and `BrandHome` starts the read itself once per load. New texts reuse the caption update's machinery end to end: the model's `streamPostRewrite` with a prompt of its own, `checkedWords` through a new `checkNewTexts`, a route `POST /api/posts/texts` on a new `newTexts` limit, a posts run of step `texts` on decision 0005's record, and `mergeRewrite`, fixed so an answer lands only its words on the post as stored. The rest is order, strings and one removed line.

**Tech Stack:** Next.js App Router, TypeScript, zod, the AI SDK on Gemini Flash-Lite, IndexedDB through `idb`, next-intl, Vitest, Playwright.

**Spec:** `docs/specs/platform/easier-to-use/spec.md`

## Global Constraints

- Websites: `sen` → `https://sendanangmassage.com/`, `svarga` → `https://svargabalimassage.com/`; every other owner has none.
- `PILOT_PASSPHRASES` entries: `<owner id>=<password>` (owner id `/^[a-z]+$/`, password at least 12 characters, no two entries with the same password), and an entry without `=` read as today, `<password>-<owner id>`, typed whole.
- No real password in the repo, a test, a problem message or a log line: only made-up values (`abcd-efg-hijk`, `test-blue-wave`).
- The read starts by itself once per page load, only for an owner with a website, no business saved (or one that can't be opened) and no read to resume.
- New texts: one request on `TEXT_MODELS.posts`; the caption and story text change, everything else stays; an offer post's story text stays its offer line; the post keeps its kind of question; the attempt's other post goes with the request.
- Limit `newTexts: 10` a day per owner, from the Flash-Lite pool, given back on `GIVE_BACK_CODES`; `dev` unlimited.
- Every visible string in `messages/en.json`, `id.json` and `vi.json`, exactly as the spec's "Strings" table writes it.
- Commits: Conventional Commits, scopes from `commitlint.config.mjs`, header at most 100 characters, files staged by path, each ending with the session's `Co-Authored-By` line.
- `journal.md` next to the spec: calls made along the way, and each task's RED and GREEN lines as Vitest or Playwright prints them.

## Review Focus

- React's StrictMode runs the home screen's effects twice in development: the read still starts once. Task 2 tests it.
- The day's 3 reads are gone when a new phone opens: the refusal shows the limit line and a disabled button, and nothing starts again. Task 2 tests it.
- Spaces around `=` or after a comma in Vercel (`sen = abcd-efg-hijk, svarga=…`) are trimmed, never part of a password. Task 1 tests it.
- A new image made for the same suggestion while its new texts are written keeps its image and its saved mark when the texts land. Tasks 6 and 10 test it.
- The sheet closed before new texts come back: the new words land on the tile, and a failure shows under the link when the sheet opens again. Task 11 tests it.

---

### Task 1: Short passwords

**Files:**
- Modify: `lib/pilot/config.ts` (`parsePilotConfig`, its top comment)
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (`enter.label`, `enter.wrong`, `guide.start.passphrase`)
- Modify: `.env.example`, `playwright.config.ts`, `.github/workflows/check.yml`, `tests/e2e/i18n.spec.ts` (`SVARGA`)
- Test: `tests/unit/pilot-config.test.ts`, `tests/unit/sign-in-form.test.tsx`

**Interfaces:**
- Produces: `parsePilotConfig` and `findOwner` keep their signatures; `PilotEntry.passphrase` is what the owner types: the password of a new entry, the whole of an old one.

- [ ] **Step 1: Write the failing tests** in `pilot-config.test.ts`:
  - `reads owner=password entries`: `'sen=abcd-efg-hijk, svarga = lmno-pqr-stuv'` gives `[{ ownerId: 'sen', passphrase: 'abcd-efg-hijk' }, { ownerId: 'svarga', passphrase: 'lmno-pqr-stuv' }]`.
  - `reads both forms side by side`: `'lotus-river-moon-sen,svarga=lmno-pqr-stuv'` gives `sen` with `'lotus-river-moon-sen'` and `svarga` with `'lmno-pqr-stuv'`.
  - `refuses a short password`: `'sen=abcd-efg'` → `ok: false`, the problem contains `entry 1 (sen)` and `12 characters`, and not `abcd`.
  - `refuses two entries with one password`: `'sen=abcd-efg-hijk,svarga=abcd-efg-hijk'` → problem `PILOT_PASSPHRASES: sen and svarga share a password`, without `abcd`.
  - `refuses an owner id twice, across forms`: `'lotus-river-moon-sen,sen=abcd-efg-hijk'` → `duplicate owner id: sen`.
  - `refuses an owner id that isn't lowercase letters, in the new form`: `'Sen=abcd-efg-hijk'`.
  - `findOwner finds a short password's owner`: `findOwner(entries, ' abcd-efg-hijk ')` is `'sen'`, and `'abcd-efg-hijk-sen'` finds no one.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/pilot-config.test.ts`. Expected: the new tests FAIL. Copy the summary line to the journal's RED.
- [ ] **Step 3: Implement** in `parsePilotConfig`: an item with `=` splits on the first `=`, both sides trimmed; owner id checked with `OWNER_ID`; password length `>= 12` with the problem `${position} (${ownerId}): the password must be at least 12 characters`; any item, either form, whose password equals an earlier entry's gives `PILOT_PASSPHRASES: ${earlier} and ${ownerId} share a password`. Items without `=` keep today's branch.
- [ ] **Step 4: Run** the same command. Expected: PASS. Copy to GREEN.
- [ ] **Step 5: The sign-in words.** Set the three keys in the three files from the spec's table; in `sign-in-form.test.tsx` the label is `Password` and the error `That password isn't right. Try again.` Run `pnpm vitest run tests/unit/sign-in-form.test.tsx tests/unit/i18n-messages.test.ts tests/unit/guide.test.tsx`. Expected: PASS.
- [ ] **Step 6: Test values.** `playwright.config.ts` and `check.yml`: `test-lotus-river-sen,svarga=test-blue-wave,test-quiet-stone-dev`; `i18n.spec.ts`: `SVARGA = 'test-blue-wave'`. `.env.example`'s comment: comma-separated `owner=password` entries, like `sen=abcd-efg-hijk` (made up); an entry without `=` is the old `password-owner` form; the format is in `docs/specs/platform/easier-to-use/spec.md`.
- [ ] **Step 7: Commit** `feat(harness): short passwords, set as owner=password (roadmap 2.20)`.

### Task 2: Each spa's website, read by itself on a new phone

**Files:**
- Create: `lib/pilot/sites.ts`, `tests/unit/pilot-sites.test.ts`
- Modify: `app/page.tsx`, `components/brand/brand-home.tsx`, `components/guide/owner-guide.tsx` (`business.reread` values)
- Modify: the three message files (`guide.business.read`, `guide.business.reread`, `guide.start.onePhone`)
- Test: `tests/unit/brand-home.test.tsx`

**Interfaces:**
- Produces: `SITES: Readonly<Record<string, string>>`, `siteFor(ownerId: string): string | null`; `BrandHome` takes `site?: string`. Without it, `BrandHome` behaves as today.

- [ ] **Step 1: Write the failing tests.** `pilot-sites.test.ts`: `siteFor('sen')`, `siteFor('svarga')` as in Global Constraints, `siteFor('dev')` is `null`. In `brand-home.test.tsx`, `renderHome` takes an optional `site` and a `strict` flag (wraps in `<StrictMode>`); a new `describe('a spa with a website')` with `SITE = 'https://svargabalimassage.com/'`:
  - `with no business, the read starts by itself`: one POST to `/api/brand/read`, its JSON body `url: SITE, reread: false`; "Welcome, Sen" and "Reading your website…" show; no "Your website" field.
  - `it starts once under StrictMode`: `strict: true`, one read request.
  - `a saved business: nothing starts`.
  - `a read to resume is resumed, not started again`: a stored running `newBrandRun` for `sen`, one request.
  - `after Stop: the button, the website's name, no field, nothing starts`: "Read my website" and "svargabalimassage.com" show; still one request; tapping the button sends a second with `url: SITE`.
  - `the day's limit: the line, a disabled button, one request`: the read answers 429 `{ error: 'limit_reached', resetsAt }`.
  - `forget goes back to the button, and nothing starts`.
  - `Read it again reads the table's website`: saved `siteUrl: 'https://old.example/'`, the request's `url` is `SITE`.
  - `without a website, the field stays and nothing starts`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/pilot-sites.test.ts tests/unit/brand-home.test.tsx`. Expected: the new tests FAIL; RED to the journal.
- [ ] **Step 3: Implement.** `sites.ts` with the table. `app/page.tsx` passes `site={siteFor(ownerId) ?? undefined}`. In `BrandHome`: `tryResume` returns whether it resumed; after it, in the load effect, while `active`, start `startRead({ ownerId, url: site, reread: false }, onEvent)` through `begin` when `site`, the load's result isn't `saved`, nothing resumed and a `useRef` guard hasn't fired. The empty view with `site`: today's button only, then `siteLabel(site)` and `home.readHint` in small text. The welcome shows on `empty`, and on `reading` while nothing is saved. `reread` reads `site ?? saved.siteUrl`.
- [ ] **Step 4: Run** the same command. Expected: PASS, the old tests too; GREEN to the journal.
- [ ] **Step 5: The guide.** The three keys from the spec's table; `business.reread`'s values lose `forget`. Run `pnpm vitest run tests/unit/guide.test.tsx tests/unit/i18n-messages.test.ts`. Expected: PASS.
- [ ] **Step 6: Commit** `feat(brand): the password alone opens the business, its website read by itself (roadmap 2.20)`.

### Task 3: Questions before Reviews

**Files:**
- Modify: `components/brand/brand-home.tsx` (the bar's `tabs` and the `TabsContent` order), `components/guide/owner-guide.tsx` (`GUIDE_SECTIONS`)
- Test: `tests/unit/brand-home.test.tsx`, `tests/unit/guide.test.tsx`

- [ ] **Step 1: Write the failing tests:** `the bar reads Your business, Create Posts, Questions, Reviews` (the tab names in order); `the guide puts questions before reviews` (the section headings: "Answering guests' questions" before "Replying to reviews"). Rename the tests that say "the third tab, Reviews" and "the fourth tab, Questions".
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/guide.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement:** swap `reviews` and `questions` in both places.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): Questions before Reviews in the bottom bar and the guide (roadmap 2.20)`.

### Task 4: No "They go on top" line

**Files:**
- Modify: `components/posts/posts-section.tsx` (the `moreBelow` paragraph under the button), the three message files (`posts.moreBelow` removed)
- Test: `tests/unit/posts-section.test.tsx` (the test at lines 571-576), `tests/e2e/editor.spec.ts:135`

- [ ] **Step 1: Turn the test around:** `a second attempt shows no "They go on top" line`: `queryByText(/They go on top/)` is null; "Attempt 2" and "Attempt 1" show. In `editor.spec.ts`, the same line has count 0.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-section.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Remove** the paragraph and the key.
- [ ] **Step 4: Run** again, with `tests/unit/i18n-messages.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): no "They go on top" line under the button (roadmap 2.20)`.

### Task 5: The Questions hint

**Files:**
- Modify: the three message files (`questions.hint`)
- Test: `tests/unit/questions-section.test.tsx`

- [ ] **Step 1: Write the failing test:** `the hint asks to take out the guest's name`: the text "Take out the guest's name if it's in the message." shows.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/questions-section.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Set** the key in the three files from the spec's table.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(questions): the hint asks only to take out the guest's name (roadmap 2.20)`.

### Task 6: Caption updates land on the post as stored

**Files:**
- Modify: `lib/posts/edit.ts` (`mergeRewrite`)
- Test: `tests/unit/posts-edit.test.ts`

**Interfaces:**
- Produces: `mergeRewrite(batch, result, sentIds)` keeps its signature. An answered post is the stored post with the answer's `caption`, `cta`, `hashtags`, `altText`, `unchecked`, `storyText`, `storyUnchecked` (an answer without a story text removes the stored one and its flags), no `copiedAt`, `edited: false`, `profileHash: result.profileHash`. Every other field is the stored one.

- [ ] **Step 1: Write the failing tests:** `a rewrite takes the copied mark off` (stored and answer both have `copiedAt`; merged has none); `a rewrite keeps the stored savedAt, not the sent one` (stored has none since a new image, the answer carries the sent one: merged has none; stored has one: kept); `a rewrite replaces only the words` (a field the stored post changed since sending, such as `altToCheck`, stays; an answer without `storyText` removes the stored story text and `storyUnchecked`).
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-edit.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with one list of the word fields, used for the copy.
- [ ] **Step 4: Run** again, with `tests/unit/posts-client.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `fix(posts): a caption update takes the copied mark off and keeps what's stored (roadmap 2.20)`.

### Task 7: Ten new texts a day

**Files:**
- Modify: `lib/usage/limits.ts` (`newTexts: 10`), `lib/usage/meter.ts` (`ACTION_MODEL.newTexts = TEXT_MODELS.posts`), `lib/usage/answer.ts` (`counts` and `BAR_ACTIONS` gain `newTexts`), `components/usage/usage-bar.tsx` (the posts tab: `['attempts', 'newImages', 'newTexts']`, or `['attempts', 'newTexts']` without images), `components/guide/owner-guide.tsx` (`Limits` and `allowance.limits` gain `newTexts`)
- Modify: the three message files (`usage.newTexts`, `usage.limit.newTexts`, `guide.allowance.limits`)
- Test: `tests/unit/usage-limits.test.ts`, `usage-meter.test.ts`, `usage-read.test.ts`, `usage-limits-ui.test.tsx`, `guide.test.tsx`

- [ ] **Step 1: Write the failing tests:** the limit is 10; `newTexts` takes from the owner's day and the `gemini-3.5-flash-lite` pool, and isn't counted for `dev`; the usage answer has `left.newTexts`; the posts bar reads "Left today: 3 attempts, 10 new images, 10 new texts", and "3 attempts, 10 new texts" with images off; `UsageMessage` for `newTexts` reads "You've written today's 10 new texts. More at 15:00." (Da Nang); the guide's allowance line names "10 new texts".
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/usage-limits.test.ts tests/unit/usage-meter.test.ts tests/unit/usage-read.test.ts tests/unit/usage-limits-ui.test.tsx tests/unit/guide.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as listed.
- [ ] **Step 4: Run** again, with `tests/unit/i18n-messages.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): ten new texts a day, on the usage bar (roadmap 2.20)`.

### Task 8: The new-texts prompt and code's checks

**Files:**
- Modify: `lib/posts/prompt.ts`, `lib/posts/checks.ts`
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-checks.test.ts`

**Interfaces:**
- Produces: `newTextsPrompt(withOffer: boolean, spa: boolean): string`; `newTextsUserText(input: PostsModelInput, post: Post, other: Post | undefined, offer?: Offer): string`; `checkNewTexts(raw: ModelRewrite, post: Post, other: Post | undefined, profile: Profile, offer?: Offer): { posts: Post[]; dropped: Dropped[] }`, which throws `Error('no new texts')` when the answer has no usable caption for the post.
- The prompt: new words for one post, for the same image; keep its type, topic, scene, light and image prompt; `a different question of the kind its "question" names`; `other words than its caption now`; another fact from the highlights when there is one; never the fact, opening or ending of the post under "### Other post"; its hashtags and alt text returned as they are; then `TYPE_JOBS`, `questionKinds(…)`, `captionRules(spa, withOffer, 'its "light"')`, and `rewriteOfferRules(spa)` with an offer. The answer's shape is `ModelRewrite`, through `streamPostRewrite`.
- The user text: the profile, "### Post" with `{ id, type, topic, scene, light, question, caption, storyText, imagePrompt }` (and `offer: true` when it carries the offer), "### Other post" with the other's caption and story text, and the offer block with the post's line, as `rewriteUserText` writes it.
- The checks: `checkedWords` on the answer's caption and story text with the post's own hashtags and alt text, the offer context when the post carries it; `repeatRecords` and `lightRecords` on the new post with the other.

- [ ] **Step 1: Write the failing tests.** Prompt: `the new-texts prompt asks for a different question of the same kind and other words`; `the user text holds the post, its kind of question and the other post`; `an offer post's user text holds its offer line`. Checks: `new texts replace the caption and the story text, and keep hashtags and alt text`; `an offer post opens on its offer line, and its story text is that line`; `a price is removed`; `a first sentence shared with the other post is recorded`; `no caption throws`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-checks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the three functions.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): the new-texts prompt and code's checks on its answer (roadmap 2.20)`.

### Task 9: The new-texts route

**Files:**
- Modify: `lib/posts/batch.ts`, `lib/posts/run.ts`, `lib/posts/log.ts` (`kind` gains `'texts'`)
- Create: `app/api/posts/texts/route.ts`
- Test: `tests/unit/posts-run.test.ts`, `tests/unit/posts-route.test.ts`

**Interfaces:**
- Consumes: Task 8's three functions; Task 7's `newTexts` action.
- Produces: `newTextsBodySchema` (`{ profile, post: postSchema, other: postSchema.optional(), offer: offerSchema.optional() }`, refined like the rewrite body) and `NewTextsBody`; `streamNewTexts(body: NewTextsBody, deps: PostsDeps, signal: AbortSignal): AsyncGenerator<PostsLine>`, through `run()` with kind `texts`, no posts streamed before the end; `POST /api/posts/texts`, the rewrite route's twin on `newTextsBodySchema` and `takeUsage({ ownerId, action: 'newTexts' })`.

- [ ] **Step 1: Write the failing tests:** `new texts end on one post with new words`; `an answer with no caption ends in model_failed`; `the log line says kind=texts`; `the texts route takes a new text from the day, and refuses at the limit`; `an invalid body answers invalid_profile`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-run.test.ts tests/unit/posts-route.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** as listed.
- [ ] **Step 4: Run** again, with `tests/unit/posts-log.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): the new-texts route, one Flash-Lite call each (roadmap 2.20)`.

### Task 10: New texts on the phone, with resume

**Files:**
- Modify: `lib/runs/run-record.ts` (a posts step may be `'texts'`), `lib/posts/client.ts`
- Test: `tests/unit/posts-client.test.ts`, `tests/unit/runs-record.test.ts`

**Interfaces:**
- Consumes: Task 9's route, Task 6's `mergeRewrite`.
- Produces: `startNewTexts(input: { ownerId: string; profile: Profile; batch: PostBatch; postId: string }, onEvent: (e: PostsEvent) => void, deps?: ReadDeps): RunningRead`. Its run record: step `texts`, `batchId`, `postIds: [postId]`. Its body: `{ profile, post, other, offer? }`, `other` being the batch's other post, the offer pruned as for a rewrite. Its answer lands through `mergeRewrite(stored, result, [postId])` on the batch as stored. `resumePosts` asks again for a lost `texts` run, and returns `step: 'plan' | 'rewrite' | 'texts'`.

- [ ] **Step 1: Write the failing tests:** `new texts send the post and the other post to /api/posts/texts`; `their answer lands on the stored post: new words, the copied mark off, a new image saved meanwhile kept`; `a lost texts run is asked for again`; the run record takes step `texts`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-client.test.ts tests/unit/runs-record.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** as listed.
- [ ] **Step 4: Run** again. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): new texts run on the phone like a caption update, with resume (roadmap 2.20)`.

### Task 11: "Write new texts" on an open suggestion

**Files:**
- Modify: `components/posts/post-card.tsx`, `components/posts/posts-section.tsx`, `components/guide/owner-guide.tsx` (`posts.edit` gains `newTexts: t('posts.newTexts')`)
- Modify: the three message files (`posts.newTexts`, `posts.writingTexts`, `guide.posts.edit`)
- Test: `tests/unit/posts-card-edit.test.tsx`, `tests/unit/posts-section.test.tsx`, `tests/unit/guide.test.tsx`

**Interfaces:**
- Consumes: Task 10's `startNewTexts`; Task 7's `useAtLimit('newTexts')`.
- Produces: `PostCard` props `onNewTexts?: () => void`, `writingTexts?: boolean`, `textsError?: ReactNode`. The section's `Running` gains `step: 'texts'` and `postId?: string`; an error of step `texts` shows under the link of that post's sheet, not under "Make 2 new suggestions", with `UsageMessage` action `newTexts` for a refusal.
- The link: next to "Edit the text", styled like it, shown where it shows; disabled while `editBusy` or `busy`, or at the limit, with the limit line under it; while writing, a spinner and "Writing new texts…".

- [ ] **Step 1: Write the failing tests.** Card: `Write new texts sits next to Edit the text and calls back`; `it is disabled at the day's limit, with the limit line`; `while writing it reads Writing new texts…`. Section: `Write new texts replaces the post text and story text in the open sheet, and takes the tick off`; `a failure shows under the link, not under the button`; `closed before the answer, the new words land on the tile`. Guide: the `posts.edit` line names "Write new texts".
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-card-edit.test.tsx tests/unit/posts-section.test.tsx tests/unit/guide.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement** as listed.
- [ ] **Step 4: Run** again, with `tests/unit/i18n-messages.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): "Write new texts" on an open suggestion (roadmap 2.20)`.

### Task 12: The phone tests

**Files:**
- Modify: `tests/e2e/*.spec.ts`

- [ ] **Step 1: Sen's sign-ins.** Each test that signs in as Sen and then fills `#website` or "Your website" loses those steps: the read starts by itself on the stub, which stays registered before signing in. The tests about typing a website (`brand-panel.spec.ts`) sign in as `test-quiet-stone-dev`.
- [ ] **Step 2: New and turned-around checks:** `pilot-gate.spec.ts`: `a short password signs Svarga in` (types `test-blue-wave`), and the label reads "Password"; `brand-panel.spec.ts`: `Sen on a new phone: the password alone, then Your business`; `friendlier-home.spec.ts`: the bar reads Your business, Create Posts, Questions, Reviews; `editor.spec.ts`: no "They go on top", and `Write new texts gives new words for the same images` (stubs `**/api/posts/texts`, the tick comes off).
- [ ] **Step 3: Run** `pnpm exec playwright install chromium` once, then `pnpm test:e2e`. Expected: every test passes; the summary line to the journal.
- [ ] **Step 4: Commit** `test(web): the phone tests for an easier app (roadmap 2.20)`.

### Task 13: Two real new-texts calls, with the maintainer's yes

**Files:**
- Modify: `scripts/eval-posts.ts` (`--new-texts`), `AGENTS.md`'s command row for `pnpm eval:posts`
- Create: `tests/fixtures/sites/sen/new-texts.json`, `tests/fixtures/sites/svarga/new-texts.json` (with `--record`)
- Test: `tests/unit/posts-fixtures-replay.test.ts`

- [ ] **Step 1: Ask the maintainer** for the 2 Flash-Lite requests. Without a yes, or without a Gemini key in `.env.local`, skip to Task 14 and say so in the journal.
- [ ] **Step 2: Implement** `--new-texts`: for each slug, the recorded plan's first post with the second as `other`, through `streamNewTexts` with the real model; print each post's old and new caption and story text, and with `--record` save the call as `new-texts.json`.
- [ ] **Step 3: Run** `pnpm eval:posts sen svarga --new-texts --record`; read both back in the journal.
- [ ] **Step 4: A replay test:** each recording, through `checkNewTexts`, gives a caption different from the old one, with the offer rules met.
- [ ] **Step 5: Commit** `feat(posts): record a new-texts call each for Sen and Svarga (roadmap 2.20)`.

### Task 14: Documents and the last checks

**Files:**
- Modify: `docs/specs/harness/app-scaffold/spec.md`, `docs/specs/brand/brand-panel/spec.md`, `docs/specs/platform/friendlier-home/spec.md`, `docs/specs/posts/suggestions/spec.md`, `docs/specs/posts/editor-download/spec.md`, `docs/specs/platform/usage-counters/spec.md`, `docs/specs/questions/answer-drafts/spec.md`, `docs/specs/guide/owner-guide/spec.md` (a dated note each: "> Changed by `platform/easier-to-use` (2026-11-13): …"), `AGENTS.md` (`lib/pilot/` gains "each spa's website"), `docs/roadmap.md` (2.20 `done`), `docs/specs/platform/easier-to-use/journal.md`

- [ ] **Step 1: Write** the notes, the Map line, the roadmap status, and finish the journal.
- [ ] **Step 2: Run** `pnpm check`. Expected: docs, repo, Biome, types and every Vitest test pass.
- [ ] **Step 3: Run** `pnpm test:e2e` once more if anything changed since Task 12. Expected: PASS.
- [ ] **Step 4: Run** `pnpm guide:pdf` when port 3000 is free; read back the section order and the changed lines in the three PDFs under `.superpowers/guide/`.
- [ ] **Step 5: Commit** `docs(docs): roadmap 2.20 done, an easier app for Sen and Svarga`.
