# Review reply drafts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline, per AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A third home tab, "Reviews", where the owner pastes a Google Maps review and the guest's name and gets a short and a warmer reply in the guest's language, with translations in the owner's language, from one Flash-Lite call.

**Architecture:** A new `lib/reviews/` holds the request and answer schemas, the prompt, the answer's code checks, the server run with its log line, and, on the phone, the name filling, the IndexedDB record and the request client. `TextModel` gains one structured, non-streamed method, `writeReplies`. A route `POST /api/reviews/reply` mirrors `/api/posts/translate`. `components/reviews/` holds the tab and the reply card; `brand-home.tsx` mounts it as a third tab.

**Tech Stack:** Next.js App Router, TypeScript, zod, AI SDK (`generateText` + `Output.object`), `idb`, next-intl, Vitest + Testing Library, Playwright.

**Spec:** `docs/specs/reviews/reply-drafts/spec.md` (approved). Read it with this plan.

## Global Constraints

- Model: `TEXT_MODELS.light`, thinking `low`, `maxRetries: 0`, cut at `REPLY_TIMEOUT_MS = 20_000`. One request per "Write 2 replies" / "Write 2 other replies".
- The guest's name never leaves the phone: requests carry `hasName: boolean` only; `{name}` is filled on the phone, as typed.
- Limits: name ≤ 60 chars, review ≤ 4,000 chars (trimmed, non-empty), a reply (and an edit) ≤ 4,000 chars.
- Flowers: `VN` → 🪷, `ID` → 🌼, otherwise 🌸. Abusive → no emoji in replies.
- Prompt version `reply-1`. Log line never holds the review or replies.
- Kept on the phone: one record per owner, gone on "Paste a new review", replaced on a new answer, deleted before the 3am day start (`dayStart` in `lib/posts/day.ts`).
- Every visible string in `messages/en.json`, `id.json`, `vi.json` in the same commit, with the spec's exact wording; `home.tabs.posts` English becomes "Create Posts".
- Commits: Conventional Commits, scope `reviews` (added to `commitlint.config.mjs` in Task 1), staged by path. No push until the branch is finished.
- `journal.md` next to the spec records calls made and RED/GREEN summary lines as Vitest prints them.

## Review Focus

1. A name containing `$&`, `$1` or regex characters ("Jo$&ann") is put in literally, not as a replacement pattern → Task 4 test `fillName keeps $ patterns literal`.
2. The model answers `en-US` or `EN` for an `en` screen: treated as the same language, translations dropped → Task 1 test `sameLanguage compares base codes, any case`.
3. A double tap on "Write 2 replies" sends one request → Task 6 test `a double tap sends one request`.
4. No IndexedDB (private window): the tab still writes and shows replies; nothing kept, no error → Task 4 test `without IndexedDB load is null and save is a no-op`.
5. A review that is only spaces or newlines keeps the button disabled; a pasted review is trimmed before sending → Task 6 test `a blank review keeps the button disabled` and Task 4 client test `the review goes trimmed`.

---

### Task 1: The reply contract, prompt and checks

**Files:**
- Create: `lib/reviews/reply.ts`, `lib/reviews/reply-prompt.ts`, `lib/reviews/checks.ts`
- Modify: `commitlint.config.mjs` (add `reviews` to `scope-enum`)
- Test: `tests/unit/reviews-reply.test.ts`, `tests/unit/reviews-prompt.test.ts`, `tests/unit/reviews-checks.test.ts`

**Interfaces:**
- Produces (`lib/reviews/reply.ts`):
  - `REPLY_LIMITS = { name: 60, review: 4000, reply: 4000 } as const`
  - `SCREEN_LOCALES = ['en', 'id', 'vi'] as const`, `type ScreenLocale`
  - `replyBodySchema`: `{ review: string trimmed 1..4000, hasName: boolean, locale: ScreenLocale, business: { name: string 1..200, summary: string ≤ 400 | null }, country: 'VN' | 'ID' | null, avoid: [string, string] | null }` (each `avoid` string 1..4000); `type ReplyBody`
  - `modelRepliesSchema` (what the model returns): `{ reviewLanguage: string 2..20, abusive: boolean, reviewTranslation: string | null, short: { text: string, translation: string | null }, warm: { text, translation } }`; `type ModelReplies`
  - `replyResponseSchema`: `ModelReplies` fields with non-empty trimmed texts, plus `model: string`, `promptVersion: string`; `type ReplyResponse`
  - `REPLY_ERROR_CODES = ['invalid_request', 'model_busy', 'model_timeout', 'model_failed']`, `REPLY_ERROR_STATUS` (400, 503, 504, 502), `type ReplyErrorCode`
- Produces (`lib/reviews/reply-prompt.ts`): `REPLY_PROMPT_VERSION = 'reply-1'`; `replyPrompt(body: ReplyBody, flower: string): { system: string; text: string }`
- Produces (`lib/reviews/checks.ts`): `flowerFor(country: ReplyBody['country']): '🪷' | '🌼' | '🌸'`; `sameLanguage(code: string, locale: ScreenLocale): boolean`; `checkReplies(answer: ModelReplies, ctx: { locale: ScreenLocale; flower: string }): ModelReplies | null` (null when a reply text is empty after trim)

- [ ] **Step 1: Write the failing tests**
  - `reviews-reply.test.ts`: `replyBodySchema` accepts the spec's Sen body; rejects an empty/blank review, a 4,001-char review, locale `fr`, an `avoid` of one string; `REPLY_ERROR_STATUS` maps as above.
  - `reviews-prompt.test.ts`: `replyPrompt` system text says: replies in the review's language; 2 to 4 sentences; one short, plainer reply and one warmer; owns a complaint in one sentence without excuses; no promises, discounts, arguments, phone numbers, links or emails; at most 2 emoji, the given flower (`🪷`) usually at the end, 🙏 by the thanks, no 😊 on a complaint, none when abusive; flags abusive or fake; translations into "Vietnamese" for `vi` / "Indonesian" / "English", and null when the review is already in it; with `hasName: true` it requires the literal `{name}` (honorific allowed around it), with `false` it forbids `{name}` and any name. The user text holds the business name and summary and the review; with `avoid` it holds both old replies and asks to say it differently. Neither text contains a name field. Snapshot nothing; assert with `toContain`.
  - `reviews-checks.test.ts`: `flowerFor('VN') === '🪷'`, `'ID' → '🌼'`, `null → '🌸'`; `checkReplies` turns `🌸`/`🌺`/`🌷`/`🌹`/`💮`/`🪷` into the context flower; strips every emoji (`\p{Extended_Pictographic}` and variation selectors, collapsing doubled spaces) from both replies (not translations' words) when `abusive`; drops `reviewTranslation` and both `translation`s when `sameLanguage`; returns null for a whitespace reply. Test `sameLanguage compares base codes, any case`: `('en-US','en')`, `('EN','en')` true, `('ru','en')` false.

- [ ] **Step 2: Run them, expect FAIL** — `pnpm vitest run tests/unit/reviews-` → modules not found.

- [ ] **Step 3: Implement the three modules** with the interfaces above; `flowerFor` keys off the `country` field; flowers replaced in both texts and translations.

- [ ] **Step 4: Run them, expect PASS**, then `pnpm typecheck`.

- [ ] **Step 5: Commit** — `git add lib/reviews/reply.ts lib/reviews/reply-prompt.ts lib/reviews/checks.ts commitlint.config.mjs tests/unit/reviews-reply.test.ts tests/unit/reviews-prompt.test.ts tests/unit/reviews-checks.test.ts` → `feat(reviews): reply contract, prompt and checks`

### Task 2: `writeReplies` on the text model

**Files:**
- Modify: `lib/ai/text-model.ts`, `lib/ai/replay.ts`
- Test: `tests/unit/ai-text-model.test.ts`

**Interfaces:**
- Consumes: `modelRepliesSchema`, `ModelReplies` (Task 1); `PostsModelCall`.
- Produces: `TextModel.writeReplies(input: PostsModelCall, signal: AbortSignal): Promise<ModelReplies>`; `replayTextModel(rec, { replies?: Recording })` (its `final` is the answer; without one it throws `ModelError('failed')`, honours `error` and `hang`); `recordingTextModel(..., onReplies?: (r: Recording) => void)` as a seventh parameter.

- [ ] **Step 1: Failing tests** in `ai-text-model.test.ts`: replay returns `replies.final`; fails `failed` without a recording; `error: 'busy'` throws busy; `hang` rejects on abort; the recorder passes the answer through and calls `onReplies` with `{ modelId, promptVersion, partials: [], final }`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** `writeReplies` in `geminiTextModel` like `searchEssence`: `generateText` with `TEXT_MODELS.light`, `Output.object({ schema: modelRepliesSchema })`, thinking `'low'`, `maxRetries: 0`, abort-aware `toModelError`. Add the replay and recording branches (add `writeReplies` to every existing `TextModel` literal in tests that spread `replayTextModel`, if typecheck asks).
- [ ] **Step 4: Run** `pnpm vitest run tests/unit/ai-text-model.test.ts` and `pnpm typecheck`, expect PASS.
- [ ] **Step 5: Commit** `feat(reviews): writeReplies on the text model`.

### Task 3: The run, its log and the route

**Files:**
- Create: `lib/reviews/reply-run.ts`, `app/api/reviews/reply/route.ts`
- Modify: `lib/brand/deps.ts` (add `defaultReplyDeps()`)
- Test: `tests/unit/reviews-run.test.ts`, `tests/unit/reviews-route.test.ts`

**Interfaces:**
- Consumes: Task 1 and 2.
- Produces: `REPLY_TIMEOUT_MS = 20_000`; `type ReplyLog = { owner, model, promptVersion, charsIn: number, charsOut: number | null, language: string | null, abusive: boolean | null, totalMs, outcome: 'ok' | 'aborted' | ReplyErrorCode, error? }`; `formatReplyLog(log): string` starting `reply `; `type ReplyDeps = { model: TextModel; timeoutMs?: number; log?: (e: ReplyLog) => void }`; `runReply(body: ReplyBody, ownerId: string, deps: ReplyDeps, signal: AbortSignal): Promise<{ ok: true; response: ReplyResponse } | { ok: false; code: ReplyErrorCode | 'aborted' }>`; `defaultReplyDeps(): ReplyDeps`; route `POST` with `runtime = 'nodejs'`, `maxDuration = 60`, `cache-control: no-store`, 401 without owner, 499 on abort.

- [ ] **Step 1: Failing tests.** Run: replayed answer comes back checked (flower swapped for `country: 'ID'`), with `model` and `promptVersion: 'reply-1'`; the model gets `replyPrompt(body, flowerFor(country))`; `checkReplies` null → `model_failed`; busy → `model_busy`; a hanging model with `timeoutMs: 20` → `model_timeout`; caller abort → `aborted`; the log line holds `owner=sen`, `lang=en`, `abusive=false`, `outcome=ok` and contains neither the review text nor any reply text. Route (pattern of `posts-translate-route.test.ts`): 200 no-store body; 400 on bad body / not JSON; 503 on busy; 401 without session; `runtime === 'nodejs'`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**, following `lib/posts/translate-run.ts` (race against the step signal, one log line in `finally`).
- [ ] **Step 4: Run, expect PASS**, `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(reviews): reply route`.

### Task 4: On the phone: name, record and client

**Files:**
- Create: `lib/reviews/name.ts`, `lib/reviews/store.ts`, `lib/reviews/client.ts`
- Modify: `lib/brand/store.ts` (`DB_VERSION = 5`, store `reviews` keyed by `ownerId`), `lib/brand/search-client.ts` (export `countryOf`)
- Test: `tests/unit/reviews-name.test.ts`, `tests/unit/reviews-store.test.ts`, `tests/unit/reviews-client.test.ts`

**Interfaces:**
- Produces (`name.ts`): `fillName(text: string, name: string): string` — trimmed `name` replaces every `{name}` via a function replacer; with an empty name, `{name}` goes with one preceding `", "`, `","` or space (`"Thank you, {name}!"` → `"Thank you!"`, `"{name}님, 감사합니다"` → `"님, 감사합니다"` is acceptable: only the placeholder and its preceding separator go).
- Produces (`store.ts`): `type ReviewRecord = { ownerId, name: string, review: string, locale: ScreenLocale, answer: ReplyResponse, edits: { short: string | null; warm: string | null }, createdAt: string }`; `loadReview(ownerId, now: Date): Promise<ReviewRecord | null>` (deletes and returns null when `createdAt < dayStart(now)` or the record fails its schema); `saveReview(record)`; `clearReview(ownerId)`.
- Produces (`client.ts`): `requestReplies(input: { review: string; name: string; locale: ScreenLocale; profile: Profile; avoid: [string, string] | null }, deps?: { fetch }): Promise<{ ok: true; answer: ReplyResponse } | { ok: false; code: ReplyErrorCode | 'offline' | 'signedOut' }>` — body built from `profile.name.value`, `profile.summary?.value ?? null`, `countryOf(profile)`, `hasName: name.trim() !== ''`, review trimmed.

- [ ] **Step 1: Failing tests.** `fillName`: "Anna K." in reply and translation; `fillName keeps $ patterns literal` ("Jo$&ann"); empty name cases above. Store (fake-indexeddb as in `posts-store.test.ts`): save → load; another owner sees none; `clearReview`; with `TZ=Asia/Ho_Chi_Minh` a record from 22:00 loads at 02:59 and is gone at 03:00 (and deleted); `without IndexedDB load is null and save is a no-op`. Client: the request body for Sen holds no "Anna" when name "Anna K." (`JSON.stringify(body)` not containing it); `the review goes trimmed`; `avoid` passes through; 401 → `signedOut`; fetch throws → `offline`; 503 `{error:'model_busy'}` → `model_busy`; malformed 200 → `model_failed`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement**; the DB upgrade adds `if (oldVersion < 5) db.createObjectStore('reviews', { keyPath: 'ownerId' })` and a `reviews` entry in `ShopfrontDb`.
- [ ] **Step 4: Run** the three plus `tests/unit/brand-store.test.ts`, `posts-store.test.ts`, expect PASS; `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(reviews): keep the current review on the phone`.

### Task 5: Strings, the tab label and a shared copy button

**Files:**
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (spec's Strings table; `reviews.errors.model_busy` in id/vi copies `posts.errors.model_busy`; `reviews.errors.invalid_request` = `model_failed` text in each language)
- Create: `components/copy-text.tsx` — `CopyText({ text, label, className? })`: the "Copy the text" button with "Copied" for 2 s and the "Copy it from here." sheet, moved out of `components/posts/take-away.tsx`
- Modify: `components/posts/take-away.tsx` (use `CopyText`), tests and e2e specs naming the tab "Create your posts" (`grep -rln "Create your posts" tests`)
- Test: existing `tests/unit/posts-take-away.test.tsx`, `tests/unit/i18n-messages.test.ts`

- [ ] **Step 1:** Change the tests' tab name to "Create Posts"; run `pnpm vitest run tests/unit/brand-home.test.tsx` → FAIL on the label.
- [ ] **Step 2:** Add the strings and the label, extract `CopyText`; run `pnpm vitest run tests/unit/posts-take-away.test.tsx tests/unit/i18n-messages.test.ts tests/unit/brand-home.test.tsx` → PASS.
- [ ] **Step 3: Commit** `feat(reviews): review strings, shorter posts tab, shared copy button`.

### Task 6: The Reviews tab

**Files:**
- Create: `components/reviews/reviews-section.tsx`, `components/reviews/reply-card.tsx`
- Modify: `components/brand/brand-home.tsx` (`HomeTab` gains `'reviews'`; third `TabsTrigger`/`TabsContent`)
- Test: `tests/unit/reviews-section.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 4, 5.
- Produces: `ReviewsSection({ ownerId: string; profile: Profile })`; `ReplyCard({ title: string; text: string; translation: string | null; edited: boolean; onSave: (text: string) => void })` — shows the translation only when not edited; the editor is a `Textarea` (≤ 4,000 chars, Save disabled when blank) with Save/Cancel (`posts.edit.save`/`cancel`).

Screen as in the spec ("The Reviews tab, empty", "…while…", "…with replies"); the heading's `{language}` is `new Intl.DisplayNames([locale], { type: 'language' }).of(code)` falling back to the code; `{name}` is filled with `fillName` at render, from the record's name; translations from the record (not re-made on a locale switch).

- [ ] **Step 1: Failing tests** (fetch and store mocked, `NextIntlClientProvider` as in `posts-section.test.tsx`): empty state shows the intro, both labelled fields and a disabled "Write 2 replies"; `a blank review keeps the button disabled`; typing enables it; tapping shows "Writing your replies…" and "Keep this page open for a few seconds." with fields disabled; `a double tap sends one request`; the answer shows "Anna K.'s review · in English", the review's Vietnamese, "Short reply" and "Warmer reply" each with "Anna K." filled and their Vietnamese, the how-to line and both links; an answer with `reviewTranslation: null` and null translations shows no translation line; `abusive: true` shows the note; "Write 2 other replies" reads "Writing your replies…" while it runs, sends `avoid` equal to the two model texts (with `{name}`) and replaces the cards; with no name the heading reads "The review · in English"; "Edit the text" → change → Save shows the edit, hides that card's translation, and "Copy the text" copies the edit; "Paste a new review" empties the tab and calls `clearReview`; each error code shows its line under the button with the fields kept; a saved record loads on mount without a request.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement** the two components and the third tab.
- [ ] **Step 4: Run** `pnpm vitest run tests/unit/reviews-section.test.tsx tests/unit/brand-home.test.tsx`, expect PASS; `pnpm check`.
- [ ] **Step 5: Commit** `feat(reviews): the Reviews tab`.

### Task 7: Fixtures, eval, e2e, docs

**Files:**
- Create: `tests/fixtures/reviews/<slug>.json` for `sen-praise-en`, `sen-complaint-en`, `svarga-ru`, `sen-ko`, `sen-vi`, `svarga-id`, `sen-abusive` — each `{ business: 'sen' | 'svarga', locale, name, review, recording?: Recording }`, the reviews made up for this item; `scripts/eval-replies.ts` (pattern of `scripts/eval-translate.ts`: builds the body from the site fixture's profile, prints the checked answer, `--record` saves `recording`); `tests/unit/reviews-fixtures-replay.test.ts`; `tests/e2e/reviews.spec.ts`
- Modify: `package.json` (`"eval:replies": "tsx scripts/eval-replies.ts"`), `AGENTS.md` (commands table line, as the spec's eval paragraph; Map row for `lib/reviews/` and `components/reviews/`), `docs/roadmap.md` (2.7 `done`; Later phases row "Google Maps connection"), `tests/e2e/home-tabs.spec.ts` (three tabs, no horizontal scroll at 320px in VI and EN)

- [ ] **Step 1:** Fixtures and the replay test: every fixture with a `recording` passes `checkReplies` for its locale and country; the `sen-vi` one has no translations; `sen-abusive` is flagged and emoji-free; the `svarga-*` ones carry no 🪷. Recordings come from `pnpm eval:replies --record` only if `GOOGLE_GENERATIVE_AI_API_KEY` is set here (7 Flash-Lite requests; ask first); otherwise the replay test runs on hand-written recordings marked `"modelId": "hand-written"`, and the journal says so.
- [ ] **Step 2:** e2e (route `/api/reviews/reply` mocked): sign in, read, open "Reviews", paste "Lovely hot stone massage…" with "Anna K.", write, see both replies and translations, copy one, reload and see them, `page.clock` to 03:05 next day and reload → empty tab; the request body contains no "Anna". Run per AGENTS.md's container notes (local Playwright config in `.superpowers/`, server built and started by hand).
- [ ] **Step 3:** `pnpm check` green; record RED/GREEN lines in `journal.md`.
- [ ] **Step 4: Commit** `test(reviews): fixtures, eval and phone tests` and `docs(docs): roadmap 2.7 done, Google Maps connection later`.
