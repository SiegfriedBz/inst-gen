# The first answer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A "First message from this guest" box makes the Questions tab's answer a first answer (hello line, which massage or its prices at every length, closing, each pair of 😊 and the flower placed by code), and the website read keeps every length of a treatment with its price.

**Architecture:** The profile's treatments trade `price`/`duration` for `lengths` (schema 4, read prompt `brand-10`), with an upgrade for saved profiles and a reader for recordings made before. Everything that read a treatment's price or duration reads its lengths: "Your business", the posts' checks, the answer request, its flags and prompt. The answer request gains `first`, from a box on the tab kept with the conversation; the model's answer gains `closing`; code builds a first answer from the greeting, the answer, the call to book on a final one and the closing, and ends the first and the last on 😊 and the flower.

**Tech Stack:** Next.js, React, TypeScript, zod, next-intl, the AI SDK on Gemini, Vitest, Playwright.

**Spec:** `docs/specs/questions/first-answer/spec.md`

## Global Constraints

- Profile `schemaVersion` 4; a treatment holds `lengths`, at most 6 (`LIMITS.lengths`), each with a duration, a price or both, as the page writes them.
- Read prompt `brand-10`. Answer prompt `answer-8`, bumped in Task 7 right before recording (the replay test pins recordings to the version; the prompt changes of Tasks 3 and 5 ship with it).
- The flower is `flowerFor(country)`: VN 🪷, ID 🌼, anywhere else 🌸. A first answer's pair is one space, then 😊 and the flower with nothing between: "…your hotel 😊🪷".
- A first answer holds exactly two 😊 and two flowers, ending its first paragraph (the hello line) and its last (the closing); none in the middle or the call to book. No "." right before an emoji; "!" and "?" stay.
- A first answer to a question that mentions sex (`sexualBy !== null`) is built as today.
- `first` reads as false wherever it is missing: the request, the stored conversation, a fixture.
- A treatment sent the old way (`duration`, `price`) reads as one length.
- New strings, in `messages/en.json`, `id.json` and `vi.json` in the same commit: `questions.first`, `questions.firstHint`, `brand.edit.item.addLength`, `brand.edit.item.removeLength`, `guide.questions.first`.
- Recording spends 2 website reads and 15 Flash-Lite requests a round, from the app's daily pool: only after the maintainer's yes, never on a pilot day.
- Commits: Conventional Commits, scope `brand`, `questions`, `web` or `docs`, header at most 100 characters, files staged by path, author SiegfriedBz <siegfried.bozza@protonmail.com>.
- Each task's RED and GREEN summary lines go in `docs/specs/questions/first-answer/journal.md`, copied as Vitest prints them, with any call made along the way.

## Review Focus

- A profile saved on a phone before the change (version 3, a price and a duration per treatment, or a price alone) loads with one length and shows it in "Your business". Task 1 tests the upgrade; Task 2 shows an upgraded profile.
- A page loaded before the change sends a treatment's `duration` and `price` and no `first`: the route reads one length and a later answer, never refuses it. Tasks 3 and 4 test it.
- The model puts emoji anywhere in a first answer (😊 inside the hello line, ✨ in the closing, 🌸 for Sen, a 😊 in the middle): the answer still has exactly two pairs, in their places. Task 5 tests it.
- A blank length row, or every length removed, saves a treatment with no blank length and no error. Task 2 tests it.
- The owner unticks the box after the reset, or ticks it after "Paste the next message": the request carries the box as shown, and a reload shows it the same. Task 4 tests it.

---

### Task 1: Every length in the profile

**Files:**
- Modify: `lib/brand/profile.ts`, `lib/brand/checks.ts`, `lib/brand/prompt.ts`, `lib/brand/display.ts`, `lib/brand/eval/score.ts`, `scripts/eval-brand.ts`, `tests/unit/helpers/brand.ts`
- Create: `docs/specs/questions/first-answer/journal.md` (from `docs/templates/journal.md`)
- Test: `tests/unit/brand-profile.test.ts`, `tests/unit/brand-checks.test.ts`, `tests/unit/brand-eval-score.test.ts`, `tests/unit/brand-read.test.ts`

**Interfaces:**
- Produces: `lengthSchema` and `type Length = { duration?: string; price?: string }` (at least one) in `lib/brand/profile.ts`; `Profile['offerings'][number]` is `{ name; description?; lengths: Length[]; source }`; `LIMITS.lengths = 6`; `profileSchema.schemaVersion` is `z.literal(4)`; `upgradeProfile(raw: unknown): unknown` takes 1, 2 and 3 to 4. `lengthText(length: { duration?: string; price?: string } | undefined): string` in `lib/brand/display.ts` ("60 min · $19 VND 500k", either part alone, "" for none).
- Consumes: `priceOnPage` in `lib/brand/checks.ts`, as today.

- [ ] **Step 1: Write the failing tests**

`tests/unit/brand-profile.test.ts`:
- `a version-3 profile reads as version 4, its price and duration as one length`: a v3 Svarga profile with `price: 'IDR 450,000', duration: '90 minutes'` → `upgradeProfile` → `schemaVersion: 4`, `offerings[0].lengths` equal `[{ duration: '90 minutes', price: 'IDR 450,000' }]`, no `price` or `duration` key, and `profileSchema.safeParse(...).success` true.
- `a version-3 treatment with a price alone keeps it; one with neither has no length`: `lengths` `[{ price: 'IDR 450,000' }]` and `[]`.
- `versions 1 and 2 read as version 4`.
- `a treatment holds at most 6 lengths, each with a duration or a price`: 7 lengths, or a length `{}`, fail `profileSchema`.

`tests/unit/brand-checks.test.ts` (rewrite `a price not on its page is dropped` for lengths):
- `every length is kept, and a price not on its page is dropped`: one offering with lengths 60 min/`450,000 VND`, 90 min/`VND 600.000`, 120 min/`900,000 VND`, the page holding the first two → lengths `[{60 min, 450,000 VND}, {90 min, VND 600.000}, {duration: '120 min'}]`, and `dropped` contains `{ field: 'offerings[0].lengths[2].price', reason: 'not_on_page' }`.
- `a read recorded before brand-10 gives one length`: a model offering `{ name, price: '450,000 VND', duration: '60 min', source }` (no `lengths`) → `lengths: [{ duration: '60 min', price: '450,000 VND' }]`.
- `empty lengths go, and a treatment keeps at most 6`.

`tests/unit/brand-eval-score.test.ts`: `fails on a price the site does not show` sets `p.offerings[0].lengths[0].price`.

`tests/unit/brand-read.test.ts`: the final profile's `offerings[0].lengths[0].price` is `'450,000 VND'` (its model answer stays in the old shape: it proves the old reader too).

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/brand-profile.test.ts tests/unit/brand-checks.test.ts tests/unit/brand-eval-score.test.ts tests/unit/brand-read.test.ts`
Expected: FAIL (no `lengths`, version 3).

- [ ] **Step 3: Implement**

- `profile.ts`: the schemas and limits above; `modelProfileSchema` offerings trade `price`/`duration` for `lengths: z.array(z.object({ duration: loose.optional(), price: loose.optional() })).optional()`. `upgradeProfile` chains: 1 → 3 as today, 2 → 3 as today, then 3 → 4 maps each offering's `price`/`duration` into `lengths`.
- `checks.ts`: an offering's lengths are `lengths`, or, for a recorded answer with neither, its legacy `price`/`duration` as one length (type the recorded offering as `ModelProfile['offerings'][number] & { price?: string; duration?: string }`, with a comment naming brand-10). Each length's price goes through `priceOnPage`; a length left with nothing goes; `slice(0, LIMITS.lengths)`. `finalise` writes `schemaVersion: 4`.
- `prompt.ts`: `BRAND_PROMPT_VERSION = 'brand-10'`; a field note: each offering's lengths, every length a page gives it, each with its price copied as written, in the page's order, up to 6; a price with no length, or a length with no price, as the page gives it.
- `eval/score.ts`: `prices` fails when any length's price isn't shown.
- `eval-brand.ts`: the `offerings=` line gives each name with its lengths: `Thai Massage (60 min · $19 VND 500k; 90 min · …)`, using `lengthText`.
- `tests/unit/helpers/brand.ts`: both profiles at version 4 with `lengths`.

- [ ] **Step 4: Run the brand tests and the replays**

Run: `pnpm exec vitest run tests/unit/brand-*.test.ts tests/unit/brand-*.test.tsx`
Expected: PASS, including `brand-fixtures-replay` (every recorded site, old shape, still replays). Then `pnpm typecheck` lists what Tasks 2 and 3 change; leave those for them.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/profile.ts lib/brand/checks.ts lib/brand/prompt.ts lib/brand/display.ts lib/brand/eval/score.ts scripts/eval-brand.ts tests/unit/helpers/brand.ts tests/unit/brand-profile.test.ts tests/unit/brand-checks.test.ts tests/unit/brand-eval-score.test.ts tests/unit/brand-read.test.ts docs/specs/questions/first-answer/journal.md
git commit -m "feat(brand): keep every length of a treatment with its price"
```

The commit hook runs `tsc`: if it fails on files Tasks 2 and 3 change, do those in the same commit instead (one commit for Tasks 1 to 3), and say so in the journal.

### Task 2: "Your business" shows and edits every length

**Files:**
- Modify: `lib/brand/edit.ts`, `components/brand/section-sheet.tsx`, `components/brand/panel.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/brand-edit.test.ts`, `tests/unit/brand-section-sheet.test.tsx`, `tests/unit/brand-panel.test.tsx`, `tests/e2e/brand-panel.spec.ts`

**Interfaces:**
- Consumes: `Length`, `lengthText` (Task 1).
- Produces: `type LengthValues = { duration: string; price: string }`; `OfferingValues = { name; description; lengths: LengthValues[]; source? }`.

- [ ] **Step 1: Write the failing tests**

- `brand-edit.test.ts`: `a treatment's lengths are saved as typed, blank rows dropped`: values with lengths `[{60 min, IDR 250k}, {'', ''}, {90 min, IDR 350k}]` → saved `lengths` `[{ duration: '60 min', price: 'IDR 250k' }, { duration: '90 min', price: 'IDR 350k' }]`, `source: 'owner'`; `an unchanged treatment keeps its source`; `every length removed saves a treatment with none`.
- `brand-section-sheet.test.tsx`: `adds, changes and removes a length`: the "Add a duration" button adds a row with "Duration" and "Price" fields; "Remove this duration" removes its row; Save sends the lengths.
- `brand-panel.test.tsx`: `shows each length on its own line`: a treatment with 60 and 90 min shows "60 min · $19 VND 500k" and "90 min · $27 VND 700k"; `shows the one length of a profile saved before`: a version-3 profile through `upgradeProfile` and `profileSchema.parse` shows "90 minutes · IDR 450,000"; the partial-profile test keeps working with `offerings: [{ lengths: [{ price: '300k' }] }]`.
- `tests/e2e/brand-panel.spec.ts`: on "Your business", the helper profile's treatment shows its length line.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/brand-edit.test.ts tests/unit/brand-section-sheet.test.tsx tests/unit/brand-panel.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `edit.ts`: `sectionValues` maps lengths to strings ('' for a missing part); `sameOffering` compares name, description and lengths, trimmed; `offerings()` drops a length with both parts blank and a treatment with its name, description and lengths all blank, and writes each part only when typed.
- `section-sheet.tsx`: under the treatment's name, one row per length: today's "Duration" then "Price" `TextField`s in the two-column grid, and a remove button (`aria-label` from `brand.edit.item.removeLength`); a button from `brand.edit.item.addLength` appends `{ duration: '', price: '' }`; `newItem` gives one empty length.
- `panel.tsx`: the treatment shows when it has a name or a length; each length on its own line, `lengthText(l)`, in `text-ink-secondary`, with `l` possibly partial while reading.
- Strings `brand.edit.item.addLength` / `removeLength`: en "Add a duration" / "Remove this duration"; id "Tambah durasi" / "Hapus durasi ini"; vi "Thêm thời lượng" / "Xóa thời lượng này".

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm exec vitest run tests/unit/brand-edit.test.ts tests/unit/brand-section-sheet.test.tsx tests/unit/brand-panel.test.tsx tests/unit/i18n*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/edit.ts components/brand/section-sheet.tsx components/brand/panel.tsx messages/en.json messages/id.json messages/vi.json tests/unit/brand-edit.test.ts tests/unit/brand-section-sheet.test.tsx tests/unit/brand-panel.test.tsx tests/e2e/brand-panel.spec.ts
git commit -m "feat(brand): show and edit every length in Your business"
```

### Task 3: Posts and answers read every length

**Files:**
- Modify: `lib/posts/checks.ts`, `lib/questions/question.ts`, `lib/questions/client.ts`, `lib/questions/flags.ts`, `lib/questions/answer-prompt.ts`, and the test bodies whose treatments have `duration`/`price` (`tests/unit/questions-*.test.ts`, `tests/unit/posts-checks.test.ts`)
- Test: `tests/unit/posts-checks.test.ts`, `tests/unit/questions-question.test.ts`, `tests/unit/questions-client.test.ts`, `tests/unit/questions-flags.test.ts`, `tests/unit/questions-prompt.test.ts`

**Interfaces:**
- Consumes: `Length`, `LIMITS.lengths` (Task 1).
- Produces: `QuestionBody['business']['offerings'][number]` is `{ name; description?; lengths: { duration?: string; price?: string }[] }` (at most `LIMITS.lengths`, each part at most 100 characters); the schema's input also takes the old `duration`/`price` and turns them into one length.

- [ ] **Step 1: Write the failing tests**

- `posts-checks.test.ts`, `findFlags: durations`: `a 90-minute length isn't flagged, another duration is` (lengths 60 and 90 min; "90 min" gives no flag, "45 min" does).
- `questions-question.test.ts`: `a treatment sent with one duration and price reads as one length`; `a treatment takes at most 6 lengths`.
- `questions-client.test.ts`: `sends every length, each part cut at 100 characters`.
- `questions-flags.test.ts`: `no line for a 90-minute price or duration that a length gives`.
- `questions-prompt.test.ts`: `gives each treatment with every length and its price` (the text holds `Thai Massage (60 min, $19 VND 500k; 90 min, $27 VND 700k)`); `asks a list to give each treatment on its own line with its lengths and prices`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/questions-question.test.ts tests/unit/questions-client.test.ts tests/unit/questions-flags.test.ts tests/unit/questions-prompt.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `posts/checks.ts`: `profilePrices` and `profileDurations` read every length.
- `question.ts`: the offering's `lengths` with a `.transform` for the old shape; `.max(LIMITS.lengths)`.
- `client.ts`: `questionBodyFor` sends `lengths`, the first 6, each part trimmed and cut at 100.
- `flags.ts`: prices and durations from every length.
- `answer-prompt.ts`: a treatment line is `- {name} ({duration}, {price}; …): {description}`, the brackets only with a length; the list rule: one treatment per line when there are more than two, its name, then each length with its price, as the details write them. No version bump here.
- Update the test bodies' treatments to `lengths`.

- [ ] **Step 4: Run everything**

Run: `pnpm test`
Expected: PASS, the answers' and posts' replays included.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/checks.ts lib/questions/question.ts lib/questions/client.ts lib/questions/flags.ts lib/questions/answer-prompt.ts tests/unit/posts-checks.test.ts tests/unit/questions-question.test.ts tests/unit/questions-client.test.ts tests/unit/questions-flags.test.ts tests/unit/questions-prompt.test.ts
git commit -m "feat(questions): answers and the posts' checks read every length"
```

(Stage any other test file Step 3 touched, by path.)

### Task 4: The "First message from this guest" box

**Files:**
- Modify: `lib/questions/question.ts`, `lib/questions/client.ts`, `lib/questions/store.ts`, `components/questions/questions-section.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`, `tests/e2e/questions.spec.ts`
- Test: `tests/unit/questions-section.test.tsx`, `tests/unit/questions-store.test.ts`, `tests/unit/questions-question.test.ts`, `tests/unit/questions-client.test.ts`

**Interfaces:**
- Produces: `questionBodySchema.first: z.boolean().default(false)`; `AnswerInput.first: boolean`; `conversationRecordSchema.current.first: z.boolean().default(false)`.

- [ ] **Step 1: Write the failing tests**

- `questions-section.test.tsx`:
  - the first test also finds `checkbox` "First message from this guest", checked, with its hint;
  - `the first-message box: ticked on a new conversation, unticked after "Paste the next message", ticked again after "New conversation"`;
  - `sends the box as first, and "Write another answer" sends it as ticked now`;
  - `a reload shows the box as it was` (an answer written unticked, reloaded: unticked);
  - `the daily reset ticks it` (in the existing reset test's setup).
- `questions-store.test.ts`: `a record saved without first reads it as false`.
- `questions-question.test.ts`: `a body without first reads as false`.
- `questions-client.test.ts`: `sends first`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/questions-section.test.tsx tests/unit/questions-store.test.ts tests/unit/questions-question.test.ts tests/unit/questions-client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- The schemas and `questionBodyFor` above.
- `questions-section.tsx`: `const [first, setFirst] = useState(true)`; on load `setFirst(saved ? (saved.current?.first ?? false) : true)`; `newConversation` and the reset effect set it true, `nextMessage` false; `write` sends `first` and saves it in `current`. A `firstBox` like `finalBox` (its own `id`), rendered right after `{finalBox}` in both places.
- Strings: `questions.first` "First message from this guest", `questions.firstHint` "It says hello, thanks the guest and says a therapist comes to them."; id "Pesan pertama dari tamu ini" / "Jawaban menyapa, berterima kasih kepada tamu, dan mengatakan terapis datang ke tempat mereka."; vi "Tin nhắn đầu tiên của khách này" / "Câu trả lời sẽ chào, cảm ơn khách và nói rằng kỹ thuật viên sẽ đến tận nơi."
- `tests/e2e/questions.spec.ts`, in the existing flow: the box is checked at first; after "Paste the next message", unchecked.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm exec vitest run tests/unit/questions-*.test.ts tests/unit/questions-section.test.tsx tests/unit/i18n*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/questions/question.ts lib/questions/client.ts lib/questions/store.ts components/questions/questions-section.tsx messages/en.json messages/id.json messages/vi.json tests/e2e/questions.spec.ts tests/unit/questions-section.test.tsx tests/unit/questions-store.test.ts tests/unit/questions-question.test.ts tests/unit/questions-client.test.ts
git commit -m "feat(questions): a box for the guest's first message"
```

### Task 5: The first answer: prompt and build

**Files:**
- Modify: `lib/questions/question.ts`, `lib/questions/answer-prompt.ts`, `lib/questions/checks.ts`, `lib/questions/answer-run.ts`, and the test helpers that build a `ModelAnswer`
- Test: `tests/unit/questions-checks.test.ts`, `tests/unit/questions-prompt.test.ts`, `tests/unit/questions-run.test.ts`

**Interfaces:**
- Consumes: `QuestionBody.first` (Task 4).
- Produces: `modelAnswerSchema.closing: part`; `endOnPair(text: string, flower: string): string` in `lib/questions/checks.ts`; `AnswerLog.first: boolean`, logged as `first=yes|no`.

- [ ] **Step 1: Write the failing tests**

`questions-checks.test.ts`, with `body({ first: true, business: { …, website: 'https://sendanangmassage.com/' } })`:
- `a first answer: the hello line, the middle and the closing, each ending where it should`: greeting `Hello, thank you for your message! A therapist comes to your hotel. 🌸✨`, answer `Which massage would you like? 😊 You can see them all on {website}.`, closing `I am here to answer all your questions and make your booking easy.` → text equals `Hello, thank you for your message! A therapist comes to your hotel 😊🪷\n\nWhich massage would you like? You can see them all on https://sendanangmassage.com.\n\nI am here to answer all your questions and make your booking easy 😊🪷`, and the translation is built the same way.
- `"!" and "?" stay before the pair`.
- `a final first answer puts the call to book before the closing, with no emoji`.
- `a first answer without its closing fails` → `null`.
- `a first answer to a question that mentions sex is built as today` (no emoji, the line on professional massage, no closing).
- `a later answer leaves the closing out`.
- `endOnPair`: drops a final ".", keeps "!", "?" and "...".

`questions-prompt.test.ts`:
- `a first answer asks for the hello line, the middle and the closing, with no emoji and no gentle offer`;
- `a first answer's middle sends a guest who names no massage to {website}, only when the website is known`;
- `a later answer leaves the closing empty`;
- the text says `First message from this guest: yes` or `no`.

`questions-run.test.ts`: `the log line says first=`.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm exec vitest run tests/unit/questions-checks.test.ts tests/unit/questions-prompt.test.ts tests/unit/questions-run.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `question.ts`: `closing: part` in `modelAnswerSchema`.
- `answer-prompt.ts`, when `body.first`: the hello line (hi or hello, a thank-you, and straight away that a therapist comes to where they're staying; outside the listed areas, the areas covered instead; with no service area, the hello and the thanks only); the middle (none of the business's treatments named, even in the guest's words: a short question on which massage, and one sentence with `{website}`, never a list, a name or a price; a treatment named, clearly, in any words or language: its name as written, then "- {duration}: {price}" lines for every length; then the rest of the message in a short sentence); the call to book only when final, else empty; the closing (one sentence, first person, here to answer all their questions and make their booking easy, in its own words); no emoji in any part; a sexual message keeps today's shape. When not first: the closing empty and null. The text gains `First message from this guest: yes|no`. The website rule for a later answer stays.
- `checks.ts`: when `body.first && sexualBy === null`, read `model.closing`, strip each part's emoji with `keepEmoji(text, { keep: [], flower: null })` after `clean`, end the greeting and the closing with `endOnPair`, and join greeting, answer, the call to book (final only) and closing with `\n\n`; the translation the same way; an empty greeting, answer or closing returns `null`. A later answer, or a question that mentions sex, is built as today.
- `answer-run.ts`: `first: body.first` in the log, `first=yes|no` after `final=`.

- [ ] **Step 4: Run everything**

Run: `pnpm test`
Expected: PASS (the recorded later answers replay as before).

- [ ] **Step 5: Commit**

```bash
git add lib/questions/question.ts lib/questions/answer-prompt.ts lib/questions/checks.ts lib/questions/answer-run.ts tests/unit/questions-checks.test.ts tests/unit/questions-prompt.test.ts tests/unit/questions-run.test.ts
git commit -m "feat(questions): the first answer"
```

### Task 6: The owner guide's line

**Files:**
- Modify: `components/guide/owner-guide.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/guide.test.tsx`

- [ ] **Step 1: Write the failing test**

`guide.test.tsx`: the Questions section names the box (`m.questions.first`) in each language, among the app's words it already checks.

- [ ] **Step 2: Run it and see it fail**

Run: `pnpm exec vitest run tests/unit/guide.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`questions: ['paste', 'send', 'again', 'final', 'first', 'remember', 'details', 'sex']`, with `'questions.first': { first: t('questions.first') }`. `guide.questions.first`, en: "For a guest's first message, <b>{first}</b> is ticked: the answer says hello, thanks them, says a therapist comes to them, and asks which massage they'd like or gives its prices. Untick it when the guest has already had an answer." id and vi say the same.

- [ ] **Step 4: Run it and see it pass**

Run: `pnpm exec vitest run tests/unit/guide.test.tsx tests/unit/i18n*.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/guide/owner-guide.tsx messages/en.json messages/id.json messages/vi.json tests/unit/guide.test.tsx
git commit -m "feat(web): the owner guide explains the first-message box"
```

### Task 7: Recordings (ask first)

**Files:**
- Modify: `scripts/eval-answers.ts`, `lib/questions/answer-prompt.ts` (version), `tests/unit/questions-fixtures-replay.test.ts`, `tests/fixtures/sites/sen/recording.json`, `tests/fixtures/sites/svarga/recording.json`, `tests/fixtures/questions/*.json`
- Create: `tests/fixtures/questions/sen-first-massage-en.json`, `sen-first-thai-en.json`, `svarga-first-menu-en.json`, `svarga-first-balinese-ru.json`, `sen-first-final-en.json`

- [ ] **Step 1: Ask the maintainer**: 2 website reads and 15 Flash-Lite requests, not on a pilot day. Without `.env.local`, give them one command that copies only the `GOOGLE_GENERATIVE_AI_API_KEY=` line from the main checkout.

- [ ] **Step 2: Record the reads**: `pnpm eval:brand sen svarga --record`. Expected: Sen's Thai Massage and Svarga's Traditional Balinese Massage each with 60, 90 and 120 min and their prices. Then `pnpm test`: if a replay of Sen's or Svarga's posts or replies fails, stop and ask the maintainer. Commit: `test(brand): record Sen's and Svarga's reads with every length`.

- [ ] **Step 3: Write the failing replay checks**

- The fixture type gains `first?: boolean`, passed as `first: fixture.first ?? false`; the count is 15.
- The five fixtures (no recording yet), `first: true`, Sen on `vi`, Svarga on `id`: the spec's five messages; `sen-first-final-en` with `final: true`; the Russian one asks what the Balinese massage costs at their villa in Seminyak.
- For a first answer: the first and the last paragraph end on `😊` and the flower; exactly two of each and no other emoji; no stop before an emoji; in English, the first paragraph thanks and says a therapist comes (`/thank/i`, `/\bcom(?:e|es|ing)\b/i`) and the last is in the first person (`/\bI\b|I'm|I am/`). With no massage named (`sen-first-massage-en`, `svarga-first-menu-en`): the site's address, no treatment's name, no digit. With one named (`NAMED`: Thai Massage, Traditional Balinese Massage, Thai Massage): each of its lengths' minutes and its price's longest digit run, and no other treatment's name. On `sen-first-final-en`, the paragraph before the closing is the recorded call to book. Today's one-of-each and last-paragraph checks run on later answers only.

Run: `pnpm exec vitest run tests/unit/questions-fixtures-replay.test.ts`
Expected: FAIL (five fixtures without recordings).

- [ ] **Step 4: Record**: `ANSWER_PROMPT_VERSION = 'answer-8'`; `scripts/eval-answers.ts` passes `first` and prints it; `pnpm eval:answers --record`.

- [ ] **Step 5: Run the replays**: `pnpm exec vitest run tests/unit/questions-fixtures-replay.test.ts`. Expected: PASS. A check that fails: change the prompt, bump the version, and ask the maintainer before recording again. Copy the five first answers into the journal as the owner sees them. Commit: `test(questions): record the first answers (answer-8)`.

### Task 8: The other specs, the roadmap and the whole check

**Files:**
- Modify: `docs/specs/questions/answer-drafts/spec.md`, `docs/specs/reviews/better-replies-and-answers/spec.md`, `docs/specs/brand/extract-site/spec.md`, `docs/specs/brand/brand-panel/spec.md`, `docs/specs/guide/owner-guide/spec.md`, `docs/roadmap.md`, `docs/specs/questions/first-answer/journal.md`

- [ ] **Step 1**: a "Changed by `questions/first-answer` (2026-11-20)" line in each: answer-drafts ("The Questions tab, empty", "The answer"), better-replies-and-answers ("The website, only when asked", "Emojis"), extract-site (the `offerings` row), brand-panel (the panel's fields), owner-guide ("What it says"). Roadmap 2.22 `done`.
- [ ] **Step 2**: `pnpm check`. Expected: every check passes.
- [ ] **Step 3**: `ss -ltnp | grep :3000`; free: `pnpm test:e2e`; taken: a scratch Playwright config in `.superpowers/` on port 3101. Expected: all pass (rerun once on Next.js's first-build security notice).
- [ ] **Step 4**: the guide's PDFs: `pnpm guide:pdf` when port 3000 is free and `.env.local` holds `GUIDE_CONTACT`; otherwise the maintainer runs it after the merge (the PR says so).
- [ ] **Step 5**: commit `docs(questions): the first answer, done (roadmap 2.22)`, push over SSH, and give the maintainer the PR title and body for `develop`: nothing is live until it is merged, and Sen and Svarga tap "Read it again" once after it ships.
