# Better replies and answers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Review replies and answers to guests' questions follow the posts' rules on words and emoji, never invite a guest to a business that goes to them, name treatments only as the menu does, end answers on a gentle offer, and give the website only when a guest asks for photos or more details.

**Architecture:** Three shared pieces in `lib/reviews/`: `emoji.ts` (code's emoji rule for a reply or an answer), `copy-rules.ts` (the prompt text both prompts share, and whether a business goes to its guests) and `notes.ts` (the English records the evals print and the replay tests check); `withoutBanned` moves to `lib/reviews/checks.ts` and learns that an emoji ends a sentence. The reply request gains the treatment names and `goesToGuests`, the model's answer gains `complaint`; the answer request gains `website`. Both prompts are rewritten (`reply-3`, `answer-2`), and both checks apply the emoji rule to each finished text and translation. The made-up reviews are rewritten for in-room massages, three fixtures are added, and all are recorded again with the real model.

**Tech Stack:** TypeScript, zod, the AI SDK on Gemini Flash-Lite, Vitest.

**Spec:** `docs/specs/reviews/better-replies-and-answers/spec.md`

## Global Constraints

- Prompt versions `reply-3` and `answer-2`.
- A business goes to its guests when its service area, trimmed, isn't empty.
- Replies keep 🙏, 😊 and the flower; no 😊 when the model says the review complains; no emoji when it is abusive. Answers keep 😊 and the flower; no emoji when the question mentions sex (`sexualBy !== null`). One of each. The flower ends the text, once. No "." right before an emoji; "?", "!" and "..." stay.
- The flower is `flowerFor(country)`: VN 🪷, ID 🌼, anywhere else 🌸.
- The reply request's `business.offerings`: names only, the first 20, each at most 200 characters, default `[]`; `business.goesToGuests` default `false`. The answer request's `business.website`: the profile's `siteUrl`, default `null`, shown to the guest without its trailing "/".
- No new screen string, no change on screen.
- Translations get the same code checks as the text they translate.
- Recording spends 19 Flash-Lite requests (9 reviews, 10 questions) from the app's daily pool: only after the maintainer's yes, never on a pilot day.
- Commits: Conventional Commits, scope `reviews`, `questions`, `posts` or `docs`, header at most 100 characters, files staged by path.
- Each task's RED and GREEN summary lines go in the journal, copied as Vitest prints them, with any call made along the way.

## Review Focus

- 🙏 with a skin tone (🙏🏽) or 😊 with a variation selector counts as that emoji and is kept once, never removed as "another emoji". Task 1 tests it.
- An emoji removed before a lower-case word or a comma puts no stop there ("Thank you 💆 for coming", "Hello {name} 🙏, we…"). Task 1 tests it.
- A request from a page loaded before the change, without `offerings`, `goesToGuests` or `website`, is read with the defaults, never refused. Tasks 2 and 4 test it.
- A translation follows its text's emoji rule: no 😊 after a complaint, the flower moved to its end. Tasks 3 and 5 test it.
- `{website}` written as `{Website}` or `{ website }` is filled too, never shown to a guest. Task 5 tests it.

---

### Task 1: The shared emoji rule, sentences and notes

**Files:**
- Create: `lib/reviews/emoji.ts`, `lib/reviews/notes.ts`
- Modify: `lib/posts/emoji.ts` (export `tidy`, unchanged), `lib/posts/variety.ts` (export `clichesIn`, unchanged), `lib/reviews/checks.ts` (gains `withoutSentences` and `withoutBanned`), `lib/questions/checks.ts` (imports `withoutBanned` instead of its own)
- Test: `tests/unit/reviews-emoji.test.ts`, `tests/unit/reviews-notes.test.ts`, `tests/unit/reviews-checks.test.ts`

**Interfaces:**
- Produces:
  - `type EmojiRule = { keep: readonly string[]; flower: string | null }`: `keep` the emoji other than flowers the text may hold, one of each; `flower` the business's flower that ends the text once, or `null` for none.
  - `keepEmoji(text: string, rule: EmojiRule): string`.
  - `withoutSentences(text: string, drop: (sentence: string) => boolean): string`, `withoutBanned(text: string): string`.
  - `INVITE_PHRASES: readonly string[]`, `invitesIn(text: string): string[]`, `copyNotes(text: string, goesToGuests: boolean): string[]`.

- [ ] **Step 1: Write the failing tests.** `keepEmoji`, with `R = { keep: ['🙏', '😊'], flower: '🌼' }`:
  - `'Thank you so much! 🙏 Glad you enjoyed it. 😊 We would love to come to you again. 🌼'` → `'Thank you so much! 🙏 Glad you enjoyed it 😊 We would love to come to you again 🌼'`;
  - any flower becomes the business's and moves to the very end: `'Thank you 🌸 Hope to see you'` → `'Thank you. Hope to see you 🌼'`;
  - another emoji goes, a stop back where it ended a sentence: with `{ keep: ['🙏'], flower: '🪷' }`, `'Sorry the therapist came late 😊 We hope to come to you again ✨'` → `'Sorry the therapist came late. We hope to come to you again 🪷'`;
  - no stop before a lower-case word or punctuation: `'Thank you 💆 for coming'` → `'Thank you for coming 🌼'`;
  - a stop before a caseless or Cyrillic capital: `'감사합니다 💆 다음에 또'` → `'감사합니다. 다음에 또 🌼'`, `'Спасибо 💆 Мы рады'` → `'Спасибо. Мы рады 🌼'`;
  - one of each: `'Hello! 😊 Yes, we come to your villa 😊 🌼 🌼'` → `'Hello! 😊 Yes, we come to your villa 🌼'`;
  - a skin tone or a variation selector counts as the kept emoji: `'Thank you! 🙏🏽 Glad you liked it ☺️'` with `keep: ['🙏', '😊']` keeps `🙏🏽` and removes `☺️` (it isn't 😊);
  - paragraphs and lines stay: `'Hello! 😊\n\n- Thai Massage, 60 min: VND 500k\n- Foot Reflexology, 60 min: VND 450k\n\nA therapist can come to your hotel. 🌼'` → the same, ending `'hotel 🌼'`;
  - `{ keep: [], flower: null }`: `'Hello {name} 🙏, we have no record of your visit. 🌸'` → `'Hello {name}, we have no record of your visit.'`.

  `withoutBanned('Thank you! 🙏 Glad you enjoyed it 😊 It was very sensual. We would love to come to you again 🌸')` → `'Thank you! 🙏 Glad you enjoyed it 😊 We would love to come to you again 🌸'` (an emoji followed by a space ends a sentence). `invitesIn('We hope to see you again at Sen and to welcome you back soon')` → `['"see you again at"', '"welcome you back"']`; `invitesIn('We would be glad to come to you again')` → `[]`. `copyNotes('We would love to pamper you — come back soon!', true)` → `['"pamper"', '"—"', '"come back"']`, and with `false` → `['"pamper"', '"—"']`.
- [ ] **Step 2: Run them and see them fail**: `pnpm exec vitest run tests/unit/reviews-emoji.test.ts tests/unit/reviews-notes.test.ts tests/unit/reviews-checks.test.ts` → FAIL, the modules and exports don't exist.
- [ ] **Step 3: Implement.** `keepEmoji` walks `graphemes` (`lib/posts/emoji.ts`), comparing each emoji without its skin tone (U+1F3FB–1F3FF) and U+FE0F. A removed emoji leaves "." when the output so far ends, spaces aside, on a letter or digit and the next character that is neither a space nor an emoji is an upper-case or caseless letter (`\p{Lu}`, `\p{Lt}`, `\p{Lo}`); else a space. Flowers are `FLOWER_EMOJI`. Then `tidy`, the flower appended when `rule.flower` is set, then `dropStopsBeforeEmoji`. `withoutSentences` splits after ".", "!", "?" or an emoji when a space follows. `INVITE_PHRASES`: `come back`, `coming back`, `welcome you back`, `welcome you again`, `have you back`, `see you again at`, `visit us`, `return to us`, `back with us`; matched as `clichesIn` matches, folded, whole words, quoted, in the order they appear.
- [ ] **Step 4: Run them and see them pass**, with the questions tests: `pnpm exec vitest run tests/unit/reviews-emoji.test.ts tests/unit/reviews-notes.test.ts tests/unit/reviews-checks.test.ts tests/unit/questions-checks.test.ts tests/unit/posts-variety.test.ts tests/unit/posts-emoji.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat(reviews): one emoji rule and the notes for replies and answers (roadmap 2.21)`.

### Task 2: The reply request and the complaint flag

**Files:**
- Create: `lib/reviews/copy-rules.ts` (`goesToGuests` only, for now)
- Modify: `lib/reviews/reply.ts`, `lib/reviews/client.ts`, `lib/reviews/reply-run.ts`
- Test: `tests/unit/reviews-reply.test.ts`, `tests/unit/reviews-client.test.ts`, `tests/unit/reviews-run.test.ts`

**Interfaces:**
- Produces: `goesToGuests(serviceArea: string | null | undefined): boolean`; `replyBodySchema.business` gains `offerings: string[]` (`.default([])`) and `goesToGuests: boolean` (`.default(false)`); `modelRepliesSchema` gains `complaint: z.boolean()` (not `replyResponseSchema`: phones keep replies stored without it); `ReplyLog.complaint: boolean | null`, printed as `complaint=` after `abusive=`.

- [ ] **Step 1: Write the failing tests**: `replyBodySchema.parse` of a body without the two fields gives `offerings: []` and `goesToGuests: false`, and refuses 21 treatments or a name of 201 characters; `replyBodyFor` sends the profile's treatment names in order and `goesToGuests: true` with Sen's fixture profile, `false` when its service area is `null` or `'  '`, and still no guest name; `goesToGuests('My Khe')` is true, `goesToGuests('  ')` and `goesToGuests(null)` false; the run's log line holds `complaint=true` for an answer with `complaint: true`.
- [ ] **Step 2: Run them and see them fail**: `pnpm exec vitest run tests/unit/reviews-reply.test.ts tests/unit/reviews-client.test.ts tests/unit/reviews-run.test.ts`.
- [ ] **Step 3: Implement.** `replyBodyFor` reads `profile.offerings.slice(0, 20).map((o) => o.name.trim().slice(0, 200))` and `goesToGuests(profile.location.serviceArea?.value)`.
- [ ] **Step 4: Run them and see them pass**, and `pnpm typecheck`.
- [ ] **Step 5: Commit** `feat(reviews): the reply request carries the treatments and whether the spa comes to the guest`.

### Task 3: The reply prompt `reply-3` and code's checks on replies

**Files:**
- Modify: `lib/reviews/copy-rules.ts` (gains `TONE_RULE`, `WORD_RULES`), `lib/reviews/reply-prompt.ts`, `lib/reviews/checks.ts`
- Test: `tests/unit/reviews-prompt.test.ts`, `tests/unit/reviews-checks.test.ts`

**Interfaces:**
- Consumes: Task 1's `keepEmoji` and `withoutBanned`; Task 2's body fields and `complaint`.
- Produces: `TONE_RULE` (`'Warm, calm and kind, as a good host writes: never pushy, never salesy.'`); `WORD_RULES`, one string holding the spec's rules on words ("The posts' rules on words") and `BANNED_WORDS`; `replyPrompt(body: ReplyBody, flower: string)` and `checkReplies(answer: ModelReplies, ctx: { locale: ScreenLocale; flower: string })` with their signatures unchanged.

- [ ] **Step 1: Write the failing tests.** The prompt's test body gains `offerings: ['Thai Massage', 'Foot Reflexology']` and `goesToGuests: true`. The system text:
  - holds `'reply-3'` as the version, `'thanks the guest for their massage'`, `'3 or 4 short sentences'`, `'A review of a few words gets three short sentences in each reply'`, `"Never take the guest's words for a treatment's name"`, `'Set "complaint" to true'`, `TONE_RULE`, `WORD_RULES`, `'only 🙏, 😊 and 🌼, one of each'`, `'only when the review holds no complaint'`, `'never a full stop right before an emoji'`, and still `'chị {name}'`;
  - with `goesToGuests: true`: `'The business goes to its guests'`, `'Never invite them to come, come back, return or visit'` and `'glad to come to them again'`, and no `'come back to Sen Spa'`; with `false`: `'come back to Sen Spa'` and no `'goes to its guests'`;
  - no sentence to copy: neither `'"Sorry about'`, `'"Thank you, {name}! 🙏"'` nor `'at most 2 emoji'`.
  The user text holds `'Treatments: Thai Massage; Foot Reflexology'`, or `'Treatments: none listed'` with `[]`.

  The checks, flower 🪷:
  - `'Thank you, {name}! 🙏 So glad you enjoyed your massage. 😊 We would love to come to you again. 🌸'` → `'Thank you, {name}! 🙏 So glad you enjoyed your massage 😊 We would love to come to you again 🪷'`, and the same on its translation;
  - `complaint: true`: `'Thank you! 🙏 Sorry the therapist came late 😊 We hope to come to you again 🌸'` → `'Thank you! 🙏 Sorry the therapist came late. We hope to come to you again 🪷'`, and its translation loses its 😊 too;
  - `'Thank you! 🙏🙏 Glad you enjoyed it ✨ 😊 We would love to come again'` → `'Thank you! 🙏 Glad you enjoyed it 😊 We would love to come again 🪷'`;
  - a sentence with a banned word goes;
  - today's tests on the flower, the abusive review, the translations and an empty reply still pass, with their expectations updated for the flower at the end and no stop before it.
- [ ] **Step 2: Run them and see them fail**: `pnpm exec vitest run tests/unit/reviews-prompt.test.ts tests/unit/reviews-checks.test.ts`.
- [ ] **Step 3: Implement.** The prompt follows the spec's "The replies", "The treatments, by their names", "A business that goes to its guests", "The posts' rules on words" and "Emojis", describing each rule and copying no reply sentence. `checkReplies` cleans each text and translation with `withoutBanned`, then `keepEmoji` with `{ keep: [], flower: null }` when abusive, `{ keep: ['🙏'], flower }` on a complaint, `{ keep: ['🙏', '😊'], flower }` otherwise.
- [ ] **Step 4: Run them and see them pass**: the same command, then `pnpm test`. Expected: only `reviews-fixtures-replay` fails, on the prompt version, until Task 7 records again.
- [ ] **Step 5: Commit** `feat(reviews): replies that come to the guest, name the menu and follow the posts' rules (reply-3)`.

### Task 4: The answer request and the prompt `answer-2`

**Files:**
- Modify: `lib/questions/question.ts`, `lib/questions/client.ts`, `lib/questions/answer-prompt.ts`
- Test: `tests/unit/questions-question.test.ts`, `tests/unit/questions-client.test.ts`, `tests/unit/questions-prompt.test.ts`

**Interfaces:**
- Consumes: `goesToGuests`, `TONE_RULE`, `WORD_RULES` from `lib/reviews/copy-rules.ts`.
- Produces: `questionBodySchema.business.website: string | null` (`z.string().trim().max(500).nullable().default(null)`); `answerPrompt(body, flower, spa)` unchanged.

- [ ] **Step 1: Write the failing tests**: a body without `website` parses with `null`; `questionBodyFor` sends the profile's `siteUrl`. The prompt:
  - version `'answer-2'`; the user text holds `'Goes to its guests: yes'` with the service area `'My Khe'`, `'Goes to its guests: no'` with `null` or `'  '`;
  - the system text holds `TONE_RULE`, `WORD_RULES`, `'never invite the guest to come, come back or visit'`, `"never take the guest's words for a treatment's name"`, `'only 😊 and 🪷, one of each'`, `'never a full stop right before an emoji'`, `'No emoji when "sexual" is true'`;
  - not final: `'"callToAction": the gentle offer'`, `'names no day or time'`, `'never a question with no next step'`, `'When "sexual" is true, leave its text empty and its translation null'`, and no `'asks the guest to book now'`;
  - final: `'asks the guest to book now, asking only for what the guest has not told yet'` and `'where they are staying, for a business that goes to its guests'`, as today;
  - with `website` set: `'write {website}, exactly so'`; with `null`: no `'{website}'`;
  - today's rules on facts, prices, lists, translation and the line on professional massage still hold.
- [ ] **Step 2: Run them and see them fail**: `pnpm exec vitest run tests/unit/questions-question.test.ts tests/unit/questions-client.test.ts tests/unit/questions-prompt.test.ts`.
- [ ] **Step 3: Implement** the spec's "The gentle offer", "The website, only when asked" and "The answer", with both tabs' rules; the address itself never goes in the prompt. A comment above the gentle offer's rule cites IG `references/voice-rules.md` at `550d3cf` and CH `marketing-psychology/SKILL.md` at `96798cf` (decision 0009).
- [ ] **Step 4: Run them and see them pass.**
- [ ] **Step 5: Commit** `feat(questions): answers that end on a gentle offer and give the website when asked (answer-2)`.

### Task 5: Code builds the answer

**Files:**
- Modify: `lib/questions/checks.ts`, `lib/reviews/checks.ts` (remove `noEmoji`, its last caller gone)
- Test: `tests/unit/questions-checks.test.ts`

**Interfaces:**
- Consumes: `keepEmoji`, `withoutSentences`, `withoutBanned`; Task 4's `website`.
- Produces: `fillWebsite(text: string, website: string | null): string`; `buildAnswer` with its signature unchanged.

- [ ] **Step 1: Write the failing tests** (flower 🪷):
  - not final: the model's `callToAction` `'A therapist can come to your hotel whenever suits you.'` ends the answer, which reads `'Hello!\n\nOur Thai Massage is 60 min: VND 500k.\n\nA therapist can come to your hotel whenever suits you 🪷'` (the answer part's 🌸 moved to the end), and an empty one fails nothing;
  - a question that mentions sex, not final: no gentle offer and no emoji; final: its call to book, no emoji;
  - one 😊 kept, another emoji removed, the stop before an emoji dropped, in the answer and its translation;
  - `fillWebsite('See photos at {website}.', 'https://svargabalimassage.com/')` → `'See photos at https://svargabalimassage.com.'`; `{Website}` and `{ website }` too; with `null`, the sentence goes: `'Yes. See photos at {website}. We come to you.'` → `'Yes. We come to you.'`;
  - the built answer and its translation hold the address, never the placeholder, and its flags stay `[]`;
  - today's tests, with their expectations updated for the flower at the end.
- [ ] **Step 2: Run them and see them fail**: `pnpm exec vitest run tests/unit/questions-checks.test.ts`.
- [ ] **Step 3: Implement.** Each part is cleaned with `withoutBanned`, then `fillWebsite`; the call-to-action part is kept when final, or when no check says the question mentions sex; the emoji rule, `{ keep: [], flower: null }` when `sexualBy !== null` and `{ keep: ['😊'], flower }` otherwise, applies to the joined answer and the joined translation. The flags read the finished text.
- [ ] **Step 4: Run them and see them pass**, then `pnpm test`: only the two replay tests fail, on the prompt versions.
- [ ] **Step 5: Commit** `feat(questions): code ends each answer on the flower and fills the website`.

### Task 6: The made-up reviews and questions, the evals and the replay tests

**Files:**
- Modify: the seven files in `tests/fixtures/reviews/`, `scripts/eval-replies.ts`, `scripts/eval-answers.ts`, `tests/unit/reviews-fixtures-replay.test.ts`, `tests/unit/questions-fixtures-replay.test.ts`
- Create: `tests/fixtures/reviews/svarga-short-en.json`, `tests/fixtures/reviews/sen-menu-en.json`, `tests/fixtures/questions/sen-relaxing-en.json`, `tests/fixtures/questions/svarga-photos-en.json`

**Interfaces:**
- Consumes: `invitesIn`, `copyNotes`, `goesToGuests`, `keepEmoji`'s rules as the assertions' reference.

- [ ] **Step 1: Rewrite the seven reviews** for a massage at the guest's hotel, villa or apartment, keeping each file's business, locale and name, and its kind (praise, complaint, abusive, language). Each complaint becomes one a mobile massage gets: the therapist late, an oil too strong, the price, street noise at the villa. `sen-abusive` says the guest never booked them. The recordings stay until Task 7.
- [ ] **Step 2: Add the fixtures**, made up: `svarga-short-en` (`locale: 'en'`, no name, "Amazing massage, thanks a lot!"); `sen-menu-en` (`locale: 'vi'`, a name, praise of Sen's four-hands massage with an adjective of the guest's own); `sen-relaxing-en` (`locale: 'vi'`, `language: 'en'`, not final, nothing told: "How much for a relaxing massage at my hotel tonight?"); `svarga-photos-en` (`locale: 'id'`, `language: 'en'`, not final, nothing told: "Do you have photos of the four hands massage? I'd like to see it before booking.").
- [ ] **Step 3: The evals print the notes**: under each reply and answer, `⚠` and each of `copyNotes(text, goesToGuests)`.
- [ ] **Step 4: The replay tests** expect 9 reviews and 10 questions, all on the current prompt, and check on every recording:
  - replies: no "." right before an emoji; only 🙏, 😊 and the business's flower, one of each, the flower last; no 😊 when `complaint`; no emoji when abusive; `invitesIn` empty for both replies;
  - answers: no "." right before an emoji; only 😊 and the flower, the flower last, unless the question mentions sex (then none); `invitesIn` empty; an answer that isn't final and doesn't mention sex ends on its recorded gentle offer, a final one on its call to book (compared as today, emoji and the stop before them aside); `svarga-photos-en` holds `https://svargabalimassage.com` and no other answer holds `http`.
- [ ] **Step 5: Run them**: `pnpm exec vitest run tests/unit/reviews-fixtures-replay.test.ts tests/unit/questions-fixtures-replay.test.ts` → FAIL: the four new fixtures have no recording and the others record old prompts. Expected until Task 7.
- [ ] **Step 6: Commit** `test(reviews): made-up reviews of in-room massages, new questions, notes in the evals`.

### Task 7: Record with the real model

**Files:**
- Modify: every file in `tests/fixtures/reviews/` and `tests/fixtures/questions/` (their `recording`), `docs/specs/reviews/better-replies-and-answers/journal.md`

- [ ] **Step 1: Ask the maintainer** for the 19 Flash-Lite requests, on a day they say isn't a pilot day, and for a Gemini key in `.env.local` (copied from `.env.example`; this worktree has none). Wait for both.
- [ ] **Step 2: Record**: `pnpm eval:replies --record`, then `pnpm eval:answers --record`. Expected: `replies: 9/9 · prompt reply-3` and `answers: 10/10 · prompt answer-2`, and no `⚠` line about an invitation.
- [ ] **Step 3: Read every reply and answer back** against the spec's rules (in-room, treatment names, emoji, gentle offer, no day or time, website only for `svarga-photos-en`) and the libraries' checklists (decision 0009).
- [ ] **Step 4: Run the replay tests**: same command as Task 6 Step 5 → PASS. A recording that fails a check isn't kept: change the prompt, bump its version, ask again, and record that tab again.
- [ ] **Step 5: Journal**: the before (the reply under "Goal", the `reply-2` recording of `sen-complaint-en`, two `answer-1` answers) and the after, as the owner sees them, the requests spent, and the RED and GREEN lines.
- [ ] **Step 6: Commit** `test(reviews): replies and answers recorded on reply-3 and answer-2`.

### Task 8: The other specs, the roadmap and the whole check

**Files:**
- Modify: `docs/specs/reviews/reply-drafts/spec.md`, `docs/specs/questions/answer-drafts/spec.md`, `docs/roadmap.md`, `AGENTS.md` (the map's `lib/reviews/` row adds "the emoji rule and the prompt rules the answers share")

- [ ] **Step 1: The "Changed by" lines**, in the form of the others: under `reviews/reply-drafts`' "The replies" and `questions/answer-drafts`' "The answer", `> Changed by \`reviews/better-replies-and-answers\` (2026-11-20): …`, a sentence each on what changed there.
- [ ] **Step 2: The roadmap**: 2.21 `done`.
- [ ] **Step 3: Check everything**: `pnpm check` → green. Playwright: `pnpm test:e2e`, on port 3101 with a scratch config if another project holds 3000 → every test passes, none new.
- [ ] **Step 4: Commit** `docs(reviews): 2.21 done, the replies and answers specs point to it`.
