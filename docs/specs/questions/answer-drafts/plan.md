# Answers to guests' questions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A fourth home tab, "Questions": the owner pastes a guest's message and gets one answer in the guest's language, with its translation, built by code from one Flash-Lite call so that a final answer always ends with its call to book and an answer to a question about sex always says the spa offers only professional therapeutic massage.

**Architecture:** A new `lib/questions/` mirrors `lib/reviews/`: the body and answer schemas, the phone's removal of numbers, emails and links, code's word list, the prompt, code's checks (which build the answer from its parts), the run and its log line, the request client and the phone's store. A route `POST /api/questions/answer` takes one count from a new `answers` limit. `components/questions/questions-section.tsx` is the tab, mounted by `components/brand/brand-home.tsx`. The guide gets a section. Made-up questions under `tests/fixtures/questions/` are recorded with the real model.

**Tech Stack:** Next.js App Router, TypeScript, zod, the AI SDK (`generateText` with `Output.object`) on Gemini Flash-Lite, IndexedDB through `idb`, next-intl, Vitest, Playwright.

**Spec:** `docs/specs/questions/answer-drafts/spec.md`

## Global Constraints

- One request per "Write an answer" or "Write another answer", on `TEXT_MODELS.light`, `thinkingLevel: 'low'`, no retry, cut at 20 seconds (`ANSWER_TIMEOUT_MS = 20_000`).
- Limits: question 2,000 characters, answer 4,000, a guest's detail 200 (`QUESTION_LIMITS`).
- The phone replaces phone numbers (7 digits or more, with their spaces, dots, dashes and a leading +), emails and links with `[number]`, `[email]` and `[link]` before the request; the question kept and shown is the one pasted.
- The log line never holds the question, the answer or a detail's value.
- The answer is built by code, each part a paragraph: the greeting (with the line on professional massage after it, when needed), the answer, then the call to action on a final answer only; the translation the same way.
- The line is needed when the business is a spa (`isSpa`) and the model's `sexual` flag or code's word list says so.
- Flowers: `flowerFor(country)` from `lib/reviews/checks.ts`; other flowers replaced; every emoji removed when the question mentions sex.
- Daily count `answers: 20` from the Flash-Lite pool; given back on `GIVE_BACK_CODES`.
- Prompt version `answer-1`.
- Every visible string in `messages/en.json`, `id.json` and `vi.json`, as the spec's table writes them.
- The recordings spend 8 Flash-Lite requests: the maintainer said yes (2026-11-10).
- Commits: Conventional Commits with the new `questions` scope (or `posts`, `docs`, `web` where they fit), header at most 100 characters, files staged by path.

## Review Focus

- A question pasted with a phone number inside a longer number-like text ("room 405, 2 people") keeps the short numbers. Task 1 tests it.
- A model answer whose `answer` part is empty on a question that doesn't mention sex fails as `model_failed`, never shows a greeting alone. Task 2 tests it.
- The guest's details from a conversation never reach another conversation: "New conversation" and the reset clear them in the store, not only on screen. Task 6 tests it.
- A language switch after an answer keeps the answer and its translation, and the next request uses the new language. Task 7 tests it.
- A business that isn't a spa never gets the line, even with `sexual: true`. Task 2 tests it.

---

### Task 1: The request, the answer, the phone's removals and code's word list

**Files:**
- Create: `lib/questions/question.ts`, `lib/questions/scrub.ts`, `lib/questions/words.ts`
- Test: `tests/unit/questions-question.test.ts`, `tests/unit/questions-scrub.test.ts`, `tests/unit/questions-words.test.ts`

**Interfaces:**
- Produces: `QUESTION_LIMITS`; `guestSchema` (`{ place, day, time }`, each `string | null`, at most 200); `questionBodySchema` (question, final, locale, business, country, known, avoid); `modelAnswerSchema` (questionLanguage, sexual, unanswered, questionTranslation, greeting, answer, professionalOnly, callToAction nullable, guest); `answerResponseSchema` (questionLanguage, sexual, unanswered, questionTranslation, answer `{ text, translation }`, guest, flags, model, promptVersion); `QUESTION_ERROR_CODES` and `QUESTION_ERROR_STATUS` as 2.7's; `scrubQuestion(text: string): string`; `SEX_WORDS`; `mentionsSex(text: string): boolean`.

- [ ] **Step 1: Write the failing tests**: the body schema takes the spec's fields and refuses a question over 2,000 characters; `scrubQuestion('Call me on +84 905 123 456, room 405')` is `'Call me on [number], room 405'`, `'anna@mail.com'` → `'[email]'`, `'https://maps.app.goo.gl/x'` → `'[link]'`, `'2 people at 9 pm'` unchanged; `mentionsSex` is true for "Do you do happy ending?", "Есть интим услуги?", "có massage kích dục không", "섹스", "色情", "pijat plus" and "SEXY", false for "Thai massage for 2 at 9 pm" and "Essex".
- [ ] **Step 2: Run them and see them fail**: `pnpm exec vitest run tests/unit/questions-question.test.ts tests/unit/questions-scrub.test.ts tests/unit/questions-words.test.ts` → FAIL, the modules don't exist.
- [ ] **Step 3: Implement.** Word matching folds case and accents; Latin-script words match whole, others as substrings. The list holds the spec's words plus `BANNED_WORDS` from `lib/posts/banned.ts`.
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): the question's request, its answer and code's word list (roadmap 2.19)`, with `commitlint.config.mjs` gaining the `questions` scope.

### Task 2: Code builds the answer

**Files:**
- Create: `lib/questions/checks.ts`, `lib/questions/flags.ts`
- Test: `tests/unit/questions-checks.test.ts`, `tests/unit/questions-flags.test.ts`

**Interfaces:**
- Consumes: Task 1's schemas and `mentionsSex`; `flowerFor` and `sameLanguage` from `lib/reviews/checks.ts`; `BANNED_WORDS`; `isSpa`; `PRICE_PATTERN` from `lib/posts/checks.ts`, read only (the captions branch, 2.18, changes that file: this one doesn't).
- Produces: `buildAnswer(model: ModelAnswer, ctx: { body: QuestionBody; flower: string }): BuiltAnswer | null`, where `BuiltAnswer` is the response without `model` and `promptVersion`, plus `sexualBy: 'model' | 'words' | 'both' | null` for the log; `mergeGuest(known: Guest, given: Guest): Guest`.

- [ ] **Step 1: Write the failing tests**: greeting, answer and call to action joined by blank lines on a final answer; the call to action left out when not final; the line after the greeting when the model flags sex, when only the words do (`sexualBy: 'words'`), and never for a business that isn't a spa; no emoji when sexual; 🌸 replaced by 🪷 for `VN`; a sentence holding "nuru" removed; translations `null` when the question is in the screen's language; `null` returned for an empty greeting, an empty call to action on a final answer, an empty needed line, or an empty answer on a question that doesn't mention sex; `mergeGuest({ place: 'Hyatt', day: null, time: '7 pm' }, { place: null, day: 'tomorrow', time: '8 pm' })` is `{ place: 'Hyatt', day: 'tomorrow', time: '8 pm' }`; flags for "VND 450k" when the details price at VND 500k, for "45 minutes", and for a phone number not the business's.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** `lib/questions/flags.ts` holds `answerFlags(text: string, business: QuestionBody['business']): AnswerFlag[]` (kinds `price`, `duration`, `number`), with its own small reading of amounts and durations.
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): code builds each answer from its parts (roadmap 2.19)`.

### Task 3: The prompt, answer-1

**Files:**
- Create: `lib/questions/answer-prompt.ts`
- Test: `tests/unit/questions-prompt.test.ts`

**Interfaces:**
- Produces: `ANSWER_PROMPT_VERSION = 'answer-1'`; `answerPrompt(body: QuestionBody, flower: string, spa: boolean): { system: string; text: string }`.

- [ ] **Step 1: Write the failing tests**: the system text names the guest's language rule, facts only from the details, prices with each listed treatment, 1 to 4 short sentences, one treatment per line past two, the guest's details in the owner's language, a call to action only when final and asking only for what's missing (the place only for a business that goes to its guests), `callToAction: null` otherwise, the line on professional massage on every call for a spa and none for another business, the banned words, the flower, no promise, and the translations; the user text holds the business's details, "What the guest has told" with the kept details, "Final: yes" or "Final: no", the question, and the answer to avoid when there is one.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, with no example sentence to copy (2.14b).
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): the answer prompt, answer-1 (roadmap 2.19)`.

### Task 4: The model call, its replay and the run

**Files:**
- Modify: `lib/ai/text-model.ts` (`TextModel.writeAnswer`), `lib/ai/replay.ts` (`answers?: Recording`), `lib/brand/deps.ts` (`defaultAnswerDeps`)
- Create: `lib/questions/answer-run.ts`
- Test: `tests/unit/questions-run.test.ts`, `tests/unit/ai-text-model.test.ts`

**Interfaces:**
- Produces: `runAnswer(body: QuestionBody, ownerId: string, deps: AnswerDeps, signal: AbortSignal): Promise<AnswerOutcome>`; `formatAnswerLog(log: AnswerLog): string`, a line `answer owner=… model=… prompt=… chars_in=… chars_out=… lang=… sexual=model|words|both|no final=yes|no unanswered=… known=place,day total_ms=… outcome=…`.

- [ ] **Step 1: Write the failing tests** with `replayTextModel`: a replayed answer built and returned with the model and prompt version; `model_busy`, `model_timeout` (a hanging model, 20 ms cut), `model_failed` (an empty call to action on a final answer); the log line holding none of the question's or answer's words.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, as `runReply` does.
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): one Flash-Lite call per answer, and its log line (roadmap 2.19)`.

### Task 5: The daily count and the route

**Files:**
- Modify: `lib/usage/limits.ts` (`answers: 20`), `lib/usage/meter.ts` (`answers: TEXT_MODELS.light`), `lib/usage/answer.ts` (`answers` in the counts and `BAR_ACTIONS`), `lib/usage/read.ts` if it lists the actions, `components/usage/usage-bar.tsx` (tab `questions` → `['answers']`), `messages/*.json` (`usage.answers`, `usage.limit.answers`)
- Create: `app/api/questions/answer/route.ts`
- Test: `tests/unit/questions-route.test.ts`, `tests/unit/usage-*.test.ts` that list the actions

**Interfaces:**
- Consumes: `runAnswer`, `takeUsage`, `giveBackUsage`, `usageRefusal`.
- Produces: the route; `UsageBar` taking `tab: 'business' | 'posts' | 'reviews' | 'questions'`.

- [ ] **Step 1: Write the failing tests**: 401 without a session, 400 on a bad body, each error code with its status, the count taken and given back on `model_failed`, a 429-style refusal at 0, and the usage bar on the Questions tab reading "Left today: 20 answers".
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, as `app/api/reviews/reply/route.ts` does.
- [ ] **Step 4: Run them, and `pnpm test`, and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): the answer route and a daily count of 20 answers (roadmap 2.19)`.

### Task 6: The request client and the phone's store

**Files:**
- Create: `lib/questions/client.ts`, `lib/questions/store.ts`
- Modify: `lib/brand/store.ts` (`DB_VERSION` 7, a `questions` store keyed by `ownerId`)
- Test: `tests/unit/questions-client.test.ts`, `tests/unit/questions-store.test.ts`

**Interfaces:**
- Produces: `questionBodyFor(input: AnswerInput): QuestionBody` (the scrubbed question, the business's details from the profile, the country, the kept details, the answer to avoid); `requestAnswer(input: AnswerInput, deps?): Promise<AnswerResult>`; `ConversationRecord` (`ownerId`, `known: Guest`, `current: { question, final, locale, answer: AnswerResponse, edit: string | null, createdAt } | null`, `updatedAt`); `saveConversation`, `loadConversation(ownerId, now)`, `clearConversation(ownerId)`.

- [ ] **Step 1: Write the failing tests**: the body holds `[number]` and never the pasted number; the profile's details mapped; a conversation kept across a reload; "next message" (`current: null`) keeping `known`; `clearConversation` removing both; a record from before today's reset deleted on load.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, the store as `lib/reviews/store.ts` is.
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): the request client and the conversation kept on the phone (roadmap 2.19)`.

### Task 7: The Questions tab

**Files:**
- Create: `components/questions/questions-section.tsx`
- Modify: `components/brand/home-tab-bar.tsx` (`HomeTab` gains `questions`), `components/brand/brand-home.tsx` (the fourth tab, `ChatsCircle`), `messages/*.json` (`home.tabs.questions`, `questions.*`)
- Test: `tests/unit/questions-section.test.tsx`, `tests/unit/brand-home.test.tsx`

**Interfaces:**
- Consumes: Tasks 5 and 6; `ReplyCard`; `UsageMessage`, `useAtLimit('answers')`.

- [ ] **Step 1: Write the failing tests**: the spec's empty tab (intro, box, hint, checkbox off, button off while empty); the waiting state; an answer with its translation, none in the screen's language; the sex note and the unanswered note; a check line; the details box with "New conversation"; "Write another answer" sending the shown answer and the checkbox as ticked now; "Paste the next message" keeping the details; "New conversation" clearing them; an edit hiding the translation; "Copy the answer" copying the edited text; each error line; the limit line; four tabs in the bar.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement**, as `components/reviews/reviews-section.tsx` does.
- [ ] **Step 4: Run them, and `pnpm check`, and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): the Questions tab (roadmap 2.19)`.

### Task 8: The owner guide

**Files:**
- Modify: `components/guide/owner-guide.tsx` (`questions` after `reviews`; its lines `paste`, `send`, `final`, `remember`, `details`, `sex`; `answers` in the limits), `messages/*.json` (`guide.questions.*`, and the three changed lines)
- Test: `tests/unit/guide.test.tsx`, `tests/e2e/guide.spec.ts` if it counts the sections

- [ ] **Step 1: Write the failing tests**: nine sections; the new one's lines in English, Indonesian and Vietnamese, naming the tab, the button and the checkbox with their own strings; the allowance line with 20 answers.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): the owner guide explains the Questions tab (roadmap 2.19)`.

### Task 9: The made-up questions, the eval and the docs

**Files:**
- Create: `tests/fixtures/questions/*.json` (the spec's 8), `scripts/eval-answers.ts`, `tests/unit/questions-fixtures-replay.test.ts`
- Modify: `package.json` (`eval:answers`), `AGENTS.md` (map, commands, opening line)

- [ ] **Step 1: Write the fixtures** (each: business slug, locale, final, known details, question) and the replay test, skipped per fixture until it has a recording.
- [ ] **Step 2: Record**: `pnpm eval:answers --record` (8 requests, the maintainer's yes). Read each answer back.
- [ ] **Step 3: The replay test**: each recorded answer in its fixture's language, a call to action only on the finals, the line on the three that mention sex and on none of the others, the card question unanswered, no price or number the details don't hold.
- [ ] **Step 4: Run `pnpm check` and see it pass.**
- [ ] **Step 5: Commit** `feat(questions): record the made-up questions, and pnpm eval:answers (roadmap 2.19)`.

### Task 10: The phone test, the journal and the roadmap

**Files:**
- Create: `tests/e2e/questions.spec.ts`, `docs/specs/questions/answer-drafts/journal.md`
- Modify: `docs/roadmap.md` (the 2.19 row, `done`, added once `develop` holds 2.18's row: merge `develop` in first, so the two rows never conflict)

- [ ] **Step 1: The Playwright test** at the phone viewport, the route mocked: paste, write, see the answer and its translation, copy it, reload and see it, four tabs with no horizontal scroll at 320px in English, Indonesian and Vietnamese. Run `pnpm test:e2e tests/e2e/questions.spec.ts`.
- [ ] **Step 2: The journal**: calls, RED and GREEN, and the spec's scores on the 8 recorded answers; show the maintainer the 8 answers and ask how many they'd send as written.
- [ ] **Step 3: Commit, push and give the maintainer the PR title and description.**
