# Marketing copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Captions and story texts follow the rules taken from two marketing skill libraries: a hook style dealt by code, the hook alone on its first line, a job per type, no prices, story texts that give a reason to message, the offer's end by the WhatsApp line, and records of what still repeats.

**Amended 2026-11-08:** 2.17b (`posts/two-suggestions`) is merged in: two posts an attempt, and its own removal of every price. The prompt is `posts-13`; Task 5 is superseded by 2.17b's removal; Task 10 records a stock word in two captions. Run Task 10, then Tasks 3 and 9.

**Architecture:** Hook styles are dealt last in `dealSetups` (`lib/posts/setup.ts`) and kept on the set-up, like the light. The prompt (`lib/posts/prompt.ts`, `posts-12`) gets the new rules and a `### Hooks` section. Code's fixes run in `checkedWords` (`lib/posts/checks.ts`), from two new modules (`hook-line.ts`, `foreign-tags.ts`) and a general price removal; the offer-aware WhatsApp line comes from `ctaFor` (`lib/posts/input.ts`) and reaches the store and the posts screen. The new records join `lib/posts/variety.ts`. Sen's and Svarga's plans are recorded right after the prompt, so every later task is tested on `posts-12` output.

**Tech Stack:** TypeScript, Next.js, Vitest, pnpm.

**Spec:** `docs/specs/posts/marketing-copy/spec.md` (and decision `docs/decisions/0009-marketing-skill-libraries.md`)

## Global Constraints

- Prompt version: `posts-13`, with or without an offer (amended 2026-11-08; `posts-12` is 2.17b's).
- Hook styles, in this order: `question`, `scene`, `place`, `number`, `fact`, `promise`. Without an offer, the two set-ups get two different ones; with an offer, set-ups 1 and 2 have none.
- The hook's break: two line breaks (`\n\n`) after the first sentence and the emoji right after it.
- Calls to action: `Book on WhatsApp: <number>`; on a post carrying the offer, `Offer ends <lastDay>. Book on WhatsApp: <number>`.
- Prices: 2.17b's `withoutPrices` and `PRICE_PATTERN` (`lib/posts/checks.ts`); durations stay.
- Records never change a post and are never shown to the owner. Their reasons, exactly:
  - `question hooks in post-2, post-5` (field `mix`)
  - `"feel" in post-1, post-2, post-4` (field `words`)
  - `endings start with "Drift" in post-3, post-5` (field `mix`)
  - `post-2 names no place` (field `words`)
  - `post-3: story text starts with "Deep Tissue Tension Release"` and `post-3: story text holds the caption's first sentence` (field `story`)
  - `post-4: "Message us on WhatsApp today."` (field `cta`)
  - `post-3: price removed "…"` and `post-3: story text price removed "…"` (field `price`)
  - `post-6: "massagedanang" names Da Nang` (field `hashtags`)
- Stock words: feel, completely, deeply, truly, ultimate, pure, melt, unwind, indulge, bliss, golden oil; whole words, case ignored; recorded at 2 captions or more (amended 2026-11-08).
- The 4 Flash-Lite requests for recordings need the maintainer's yes first, never on a pilot day.
- No new screen string: "Offer ends" is English caption text, as "Book on WhatsApp" is.
- Commits: Conventional Commits, scope `posts`; stage files by path.

## Review Focus

1. A caption whose first sentence holds a price: the price removal runs before the hook's break, so the next sentence becomes the hook (Task 5 test).
2. Svarga's highlight in an ending, "We reply on WhatsApp within about 5 minutes.": no `cta` record (Task 8 test); in a story text, "Replies in about 5 minutes" survives 2.13's cleanup (Task 2 test).
3. A Vietnamese spa that offers "Balinese Massage" and tags `balinesemassage`: the tag stays (Task 6 test).
4. An offer post copied with its "Offer ends …" line: opening the posts screen must not take its copied tick away as if its number had changed (Task 7 test).
5. "Open until 23.00 tonight, we come to you." as a hook: a stop inside a time doesn't end the sentence (Task 4 test).

---

### Task 1: Hook styles in the set-ups

**Files:**
- Modify: `lib/posts/setup.ts` (`HOOKS`, `Hook`, `setupSchema`, `dealSetups`)
- Test: `tests/unit/posts-setup.test.ts`

**Interfaces:**
- Produces: `HOOKS = ['question', 'scene', 'place', 'number', 'fact', 'promise'] as const`; `type Hook = (typeof HOOKS)[number]`; `Setup.hook?: Hook`.

- [ ] **Step 1: Write the failing tests** in a new `describe('hook styles')`:
  - `deal(senProfile())`: six hooks, all defined, `new Set(hooks).size === 6`.
  - `deal(withOfferings(EIGHT), offerOn(['Aroma Massage']))`: hooks 1 and 2 `undefined`; hooks 3 to 6 four different values of `HOOKS`.
  - the same seed deals the same hooks (seed `'x'`, twice).
  - the hooks come last: `deal(senProfile()).map((s) => s.light)` equals `['day', 'night', 'night', 'day', 'night', 'day']` (Sen's lights for seed `'t'` before hooks).
  - `setupSchema` takes `hook: 'scene'`, none, and refuses `hook: 'teaser'`.
  - `setupLine({ ...setup, hook: 'scene' })` equals `setupLine(setup)`: the image never sees it.
  - Update `the lights come last` to strip both: `({ light: _, hook: __, ...rest }) => rest`.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-setup.test.ts`. Expected: FAIL on the new tests.
- [ ] **Step 3: Implement.** `setupSchema` gains `hook: z.enum(HOOKS).optional()`. In `dealSetups`, after the lights: `offer ? [undefined, undefined, ...shuffled(HOOKS, random).slice(0, 4)] : shuffled(HOOKS, random)`, spread as `...(hooks[i] ? { hook: hooks[i] } : {})`. Comment the deal with the spec's path, as the lights' is.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-setup.test.ts tests/unit/posts-prompt.test.ts tests/unit/posts-fixtures-replay.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): code deals each post a hook style (roadmap 2.15)` with `lib/posts/setup.ts tests/unit/posts-setup.test.ts`, plus the approved spec, decision 0009, this plan and `docs/roadmap.md`, not yet committed.

### Task 2: The prompt, `posts-12`

**Files:**
- Modify: `lib/posts/prompt.ts`
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-story.test.ts`

**Interfaces:**
- Consumes: `HOOKS`, `Hook`, `Setup.hook` (Task 1).
- Produces: `POSTS_PROMPT_VERSION = 'posts-12'`; `captionRules(spa, withOffer = false, lightFrom = 'the last word of its set-up', hookFrom = 'as given under "### Hooks"')`; `planUserText` adds `### Hooks` after `### Image set-ups`; `rewriteUserText` adds `hook` after `light` when the set-up has one.

- [ ] **Step 1: Write the failing tests** in a new `describe('marketing copy')`, over `planPrompt(false, true)`, `planPrompt(true, true)`, `rewritePrompt(false, true)`, `rewritePrompt(true, true)`:
  - each holds the six style lines (`- question: asks about the guest's own day.` … `- promise: opens on what the guest's body will feel after.`), the six type jobs, `Only offer posts sell a treatment`, `alone on its line`, `Never a price, anywhere.`, `never asks the guest to book or message`, `the sticker asks`;
  - none holds `after the beach`, `a walk round town`, `a sunset, dinner`, `canggu, danang`, `massagedanang`, `its price or duration`, `Each caption sells`, `a short version of its own caption`;
  - `planPrompt()` and `rewritePrompt()` still hold no `special offer`; `planPrompt(true)` holds `A post that carries the special offer has none: its offer line is its hook.`;
  - `planUserText(input, [], undefined, setups)` holds `### Hooks\n1. <hook 1>` … `6. <hook 6>`, after `### Image set-ups`; with an offer, lines 1 and 2 read `offer line` and `### Special offer` stays last;
  - `rewriteUserText` gives `hook: 'place'` to a post whose set-up has it, and no `hook` key to a post with no set-up.
  - Update the tests this makes stale: `has a version` (`posts-12`); `says the order once, by the hook` (drop the price phrases and `and a question or a promise may follow it`); `asks for a story text with every post` (`Story text: its own line`, `the sticker asks`); `orders a caption…` becomes `gives each type its job`; `day and night copy` (`Never reuse a phrase from these instructions or from the image set-ups`).
  - In `posts-story.test.ts`: `cleanStory('Replies in about 5 minutes 🌸', …)` keeps it whole (Review Focus 2).
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-story.test.ts`. Expected: FAIL on the new tests.
- [ ] **Step 3: Implement.** Exact copy, in the file's style; `TYPE_JOBS` and the hook lines are shared by both prompts.
  - Opening: `You plan six Instagram posts for a small business, and write them as its owner would, to guests nearby. You get the business's brand profile, read from its website and checked by the owner, and the topics of its recent posts.`
  - The mix: `The mix, each type with its own job:` then `TYPE_JOBS`, then 2.2's counts line (`At least 2 offer posts, …`) and the offer rules, unchanged.
  ```text
  - offer: makes the guest want one treatment or package now: the sore spot it answers, how it feels, what changes after; its duration when the profile gives it.
  - moment: a reason people come (after a surf, a hike, a long flight), from the essence's moments: puts the guest back in that moment, then the relief.
  - local: the town or area and something it's known for, useful to a visitor, tied back to the business in the last lines.
  - ritual: how a treatment unfolds, through the senses (the oils, the warm towels, the quiet), never the staff.
  - tip: one piece of care advice a guest can use today, worth saving (stretch after a dive, drink water after a massage).
  - proof: what the profile says about the business (years open, its promise, a highlight, a rating it quotes), stated plainly. Only when the highlights or the promise give something to say; never an invented review, rating or customer.
  Only offer posts sell a treatment; the other types earn the guest's attention, name a treatment once at most, and never in their first line.
  ```
  - The hooks, after the topic line. The plan's intro: `The hooks: code gives each post a hook style, in order, under "### Hooks": post 1 takes hook 1, and so on.`, plus ` A post that carries the special offer has none: its offer line is its hook.` with an offer. The rewrite's: `The hooks: each post's "hook" names its hook style; a post without one keeps the kind of hook it has.` Then one line per style: `- question: asks about the guest's own day.` · `- scene: drops the guest into a moment they are living, in the present tense, with no question.` · `- place: opens on one of the business's places or place symbols.` · `- number: opens on a number that isn't a price: a duration, a time of day, a count.` · `- fact: opens on a plain fact from the profile: a highlight, or its promise.` · `- promise: opens on what the guest's body will feel after.` The rewrite gets the type jobs too, as `Each post keeps its type's job:` before its caption rules (developer's call: a rewritten tip stays a tip).
  - `captionRules`, its lines in this order (`[…]` only with an offer):
  ```text
  Captions:
  - English, in the business's tone words, written as its owner would, to tourists and expats nearby.
  - The first line is the hook, alone on its line, at most 125 characters: it works on its own and stops a tourist scrolling, since it is all Instagram shows before "more". It follows its post's hook style, ${hookFrom}[; on a post that carries the special offer, the hook is its offer line, word for word, with nothing before it].
  - Then short paragraphs, with a blank line between them: what the guest will feel, rather than what the business does.
  - Each caption uses one thing only this business has: one of its places or place symbols, a sense or a moment from its essence, or a highlight. Never a price, anywhere.
  - How a caption ends follows its type. An offer or a moment post ends by answering one doubt a guest may have, with a highlight from the profile, each highlight once at most in the six; with no highlight, it ends on what changes for the guest. A tip ends on its tip, a ritual on its last sensation, a proof post on its fact, a local post on what ties the place to the business. Every ending stays warm, states its highlight and never asks the guest to book or message. No two endings start with the same word.
  - Each caption and story text follows its post's light, ${lightFrom}. Day: the guest's afternoon, with the evening still ahead; never sleep, bed or waking up. Night: the guest's evening, the day done; never the afternoon, the midday sun or the morning just past.
  - The captions open differently and end differently: never the same first sentence, never the same last sentence, and never the same idea said twice in other words. Never reuse a phrase from these instructions or from the image set-ups: the set-ups describe the photos, and the captions draw on the profile's senses.
  - Plain, concrete words: never a word that only adds intensity, such as completely, deeply, truly, ultimate or pure.
  - 250 to 700 characters in all. No hashtags in the text.
  - ${emojiRule(spa)}
  - Facts only from the profile: a duration, a number of years, a place name, a quality (signature, expert, best) or a claim appears only if the profile holds it, written as the profile writes it. Feelings, senses and place symbols are yours to use freely.
  - No call to action and no contact details: the app adds "Book on WhatsApp" with the number after every caption[, with the offer's end before it on a post that carries the special offer].
  - Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.

  Hashtags: 3 to 5, without "#", lower case, letters and digits only. One on the business's town or area, as its profile names it; the others on the post's treatment, moment or place, drawing on the essence's search terms. Never a town or area the profile doesn't name.

  Alt text: (unchanged)

  Story text: its own line for the post's Instagram story, which the owner pastes on the story image above a link sticker to WhatsApp: a reason to message now, a promise or a highlight from the profile. Never the treatment's name alone, never the caption's first sentence, never a price. English, at most ${POSTS_LIMITS.storyAsked} characters, emoji included; one or two short lines. No hashtags, no phone number, no link and no call to action, and never the words book, reserve, WhatsApp, message, DM or click: the sticker asks.
  ```
  - The rewrite passes `lightFrom` `'its "light"'` and `hookFrom` `'as its "hook" gives it, when it has one'`. Bump the version and add `docs/specs/posts/marketing-copy` to the comment above it.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): hooks, a job per type, no prices and story lines in the prompt (roadmap 2.15)`.

### Task 3: Record Sen's and Svarga's `posts-13` plans

**Files:**
- Modify: `tests/fixtures/sites/{sen,svarga}/posts.json`, `tests/fixtures/sites/{sen,svarga}/posts-offer.json`
- Create: `docs/specs/posts/marketing-copy/journal.md` (from `docs/templates/journal.md`)

- [ ] **Step 1: Ask the maintainer** in chat: "Record Sen's and Svarga's plans now? 4 Flash-Lite requests from today's pool." Wait for a yes; never on a pilot day.
- [ ] **Step 2: Run** `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`. Expected: `posts eval: 2/2 made · prompt posts-13` twice, four fixture files rewritten, two posts each. Then add the replay check that no plan has a `question hooks` record (Task 8's ruling).
- [ ] **Step 3: Run** `pnpm test`. Expected: PASS. A replay that fails here is a finding, not a test to loosen: journal it, and ask the maintainer before a prompt change and a new recording.
- [ ] **Step 4: Journal** the calls made so far (the type jobs in the rewrite; `Replies in about 5 minutes` in story texts; the recording order) and each plan's two hooks with their dealt styles.
- [ ] **Step 5: Commit** `test(posts): record posts-13 plans for Sen and Svarga (roadmap 2.15)` with the four fixtures and the journal.

### Task 4: The hook alone on its first line

**Files:**
- Create: `lib/posts/hook-line.ts`
- Modify: `lib/posts/checks.ts` (`checkedWords`)
- Test: `tests/unit/posts-hook-line.test.ts`, `tests/unit/posts-checks.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Produces: `hookOnItsLine(caption: string): string`.

- [ ] **Step 1: Write the failing tests:**
  - `'Sore shoulders from the paddle out? 🌸 Our therapists come to your villa.'` becomes `'Sore shoulders from the paddle out? 🌸\n\nOur therapists come to your villa.'`;
  - `'Sore feet 🌺 Warm oil helps.'` becomes `'Sore feet 🌺\n\nWarm oil helps.'`: an emoji ends the hook when its stop is gone;
  - `'Hook! 🌸🌺 Body.'` becomes `'Hook! 🌸🌺\n\nBody.'`;
  - `'Hook? Body.\nMore.'` becomes `'Hook?\n\nBody.\nMore.'`: only the first line is split;
  - unchanged: `'Sore feet?\n\nWarm oil.'`, `'One sentence only. 🌸'`, a caption with no sentence end;
  - `'Open until 23.00 tonight, we come to you. Warm oil.'` splits after `you.` (Review Focus 5);
  - in `posts-checks.test.ts`: an offer post's caption starts with its line, the stop gone, then ` 🌸\n\n`; a 300-character one-block caption whose first sentence is under 125 characters gets no `firstLine` flag; `applyEdit` leaves an owner's one-block caption as typed;
  - in the replay test, for every post: the caption's first line is at most 125 characters and holds one stop at most.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-hook-line.test.ts tests/unit/posts-checks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement `hookOnItsLine`.** The hook ends at the first `[.!?]` followed by a space or the end, or at the first emoji after a letter; it takes the spaces and emoji that follow; when the rest of the first line is empty, the caption is returned as is. In `checkedWords`, call it after `spaCaption` and before `dropStopsBeforeEmoji`.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): the hook alone on the caption's first line (roadmap 2.15)`.

### Task 5: No prices in captions and story texts

Superseded 2026-11-08: 2.17b's `withoutPrices` removes each sentence or line with a price from every caption and story text, and records it. Not built.

**Files:**
- Modify: `lib/posts/checks.ts` (`checkedWords`, `checkPost`, `checkRewrite`)
- Test: `tests/unit/posts-checks.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Produces: `dropPricedSentences(text: string, price: RegExp): { text: string; removed: string[] }`, exported from `checks.ts`, with `sentences()` from `story.ts`.

- [ ] **Step 1: Write the failing tests:**
  - post 3's caption loses `Just VND 500k for 60 minutes.`; dropped holds `{ field: 'price', reason: 'post-3: price removed "Just VND 500k for 60 minutes."' }`;
  - a caption opening on `Only IDR 250k for an hour?` loses it, and its next sentence stands alone on the first line (Review Focus 1);
  - the story text `Deep Tissue in your room 🌼 IDR 280k for 60 min of relief.` is absent, with `post-1: story text price removed "…"` and 2.13's `post-1: no story text`;
  - a caption whose every sentence holds a price: no post, `{ field: 'posts', reason: 'post-2: empty caption after code\'s checks' }`; in a rewrite, the post keeps its old words, with `no rewrite for post-2`;
  - an offer post records 2.13b's `offer` line and no `price` one; `Sixty minutes of slow hands.` and `90-minute` stay;
  - `applyEdit` keeps an owner's price, and its `price` flag;
  - in the replay test, no caption and no story text matches `PRICE`, on every post.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-checks.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** In `checkedWords`, the caption's removal runs after `lineFirst` and before `cutCaption`; the story text's runs on the raw text before `cleanStory`. `checkPost` and `checkRewrite` test the caption code leaves for a letter.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): no price in any caption or story text (roadmap 2.15)`.

### Task 6: No hashtag from another country

**Files:**
- Create: `lib/posts/foreign-tags.ts`
- Modify: `lib/posts/checks.ts` (`checkedWords`)
- Test: `tests/unit/posts-foreign-tags.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Consumes: `countryOf` (`lib/brand/country.ts`), `BALI_PLACES` (`lib/posts/setup.ts`).
- Produces: `dropForeignTags(tags: string[], profile: Profile): { tags: string[]; dropped: { tag: string; place: string }[] }`.

- [ ] **Step 1: Write the failing tests:**
  - Svarga, `['canggu', 'massagedanang', 'balimassage']`: keeps `canggu` and `balimassage`, drops `{ tag: 'massagedanang', place: 'Da Nang' }`; through `checkPost`, the record `post-6: "massagedanang" names Da Nang`;
  - Sen, `['danang', 'balispa']`: drops `balispa` as `Bali`;
  - Sen with an offering named `Balinese Massage`, `['balinesemassage']`: kept (Review Focus 3);
  - `đànẵng` on Svarga: dropped as `Da Nang`;
  - a profile `countryOf` can't read: nothing dropped;
  - in the replay test, `dropForeignTags(post.hashtags, profile).dropped` is empty on every post.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-foreign-tags.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Two lists in the module: Vietnam's towns and areas (Da Nang, Hoi An, Nha Trang, Ho Chi Minh, Saigon, Hanoi, Ha Long, Phu Quoc, Da Lat, Mui Ne, Sapa, Quy Nhon, Vung Tau, Ninh Binh, My Khe, Son Tra) and Indonesia's (`BALI_PLACES`, with Jakarta, Lombok, Gili, Nusa Penida, Nusa Dua, Yogyakarta, Labuan Bajo). Names under 4 letters are left out (Hue). Tags and names compare lower case, accents stripped (`đ` as `d`), spaces removed; the business's offering names are cut out of a tag before the search. A VN business is checked against Indonesia's list, an ID one against Vietnam's.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): drop a hashtag naming a town of another country (roadmap 2.15)`.

### Task 7: The offer's end by the WhatsApp line

**Files:**
- Modify: `lib/posts/input.ts` (`ctaFor`, new `postCta`), `lib/posts/checks.ts` (`checkedWords`), `lib/posts/store.ts` (`applyCta`), `lib/posts/client.ts` (`keep`), `components/brand/brand-home.tsx` (`saveEdit`), `components/posts/posts-section.tsx`
- Test: `tests/unit/posts-input.test.ts`, `tests/unit/posts-checks.test.ts`, `tests/unit/posts-store.test.ts`, `tests/unit/posts-section.test.tsx`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Produces: `ctaFor(profile: Profile, offer?: Offer): string | null`; `postCta(profile: Profile, post: Pick<Post, 'offer'>, batchOffer?: Offer): string | null`; `applyCta(ownerId: string, profile: Profile): Promise<PostBatch[]>`.

- [ ] **Step 1: Write the failing tests:**
  - `ctaFor(profile, offer)` is `Offer ends Tuesday 27 October. Book on WhatsApp: +84 905 123 456`; `ctaFor(profile)` unchanged; `postCta` gives the offer's line only to a post with `offer: true`;
  - `checkPost` on a post carrying the offer has that `cta`; the others `Book on WhatsApp: …`;
  - `applyCta('svarga', profile)` sets each post's own line; a post whose line is unchanged keeps `copiedAt`; the existing `applyCta` tests pass a profile instead of a string;
  - the posts screen: an offer post saved with its "Offer ends …" line and `copiedAt` keeps it on render, and its sheet shows that line (Review Focus 4);
  - in the offer replay, each post carrying the offer has a `cta` starting `Offer ends ${offer.lastDay}. Book on WhatsApp: `.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-input.test.ts tests/unit/posts-store.test.ts tests/unit/posts-section.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** `checkedWords` takes the line from `ctaFor(profile, context?.carries ? context.offer : undefined)`. `applyCta` computes `postCta(profile, post, batch.offer)` per post. `keep` and `saveEdit` pass the profile. In `posts-section.tsx`, the stale effect compares each post with its own `postCta`, and `PostCard` and `CopyPost` get `postCta(profile, openPost, openBatch.offer) ?? openPost.cta`.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts tests/unit/posts-*.test.tsx`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): the offer's end by the WhatsApp line (roadmap 2.15)`.

### Task 8: Code's records

**Files:**
- Modify: `lib/posts/variety.ts`, `lib/posts/checks.ts` (`checkPlan`, `checkRewrite`)
- Test: `tests/unit/posts-variety.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Produces: `copyRecords(posts: Post[], profile: Profile): Dropped[]`, the six records in the spec's order; `checkPlan` and `checkRewrite` add it after 2.14b's records.

- [ ] **Step 1: Write the failing tests**, each reason exactly as in Global Constraints:
  - questions: posts 2 and 5 open on a question; one question alone, or on an offer post, is no record;
  - stock words: `completely` in 3 captions is recorded, in 2 it isn't; `feeling` is no `feel`; `Golden oil` counts;
  - endings: last sentences starting `Drift` in posts 3 and 5, the word shown as written;
  - places: a Svarga caption naming nothing is recorded; `Canggu`, `frangipani` and `coconut oil` count; for Sen, `My Khe` counts for `My Khe beach`;
  - story texts: a story text starting with its set-up's treatment, any case; one holding its caption's first sentence; neither on an offer post;
  - calls to action: `Message us on WhatsApp today.` is recorded; `We reply on WhatsApp within about 5 minutes.` isn't (Review Focus 2);
  - a clean batch: no record;
  - in the replay test, no plan has a `question hooks` record.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-variety.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Sentences as 2.14b's `plainSentences` reads them. A place matches whole, lower case and accents stripped, or, for a name of two words or more that starts with a capital in the profile, without its last word. The call-to-action pattern asks for an action: `book now|today|your|a`, `message us`, `contact us`, `call us`, `dm us`, `write to us`, `link in bio`, `tap the link`, `click`. Bare `WhatsApp` or `book` isn't one.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): code records hooks, stock words, endings, places, stories and asks (roadmap 2.15)`.

### Task 9: Evaluation, docs and the pull request

**Files:**
- Modify: `scripts/eval-posts.ts`, `AGENTS.md` (the `eval:posts` row), `docs/roadmap.md` (2.15 `done`), `docs/specs/posts/marketing-copy/journal.md`

- [ ] **Step 1: Add `--replay` to `pnpm eval:posts`:** it prints the recorded plans through today's checks with `replayTextModel`, no request; `--record` with it is an error. `print` adds `hook: <style>` under the set-up. The `AGENTS.md` row names the flag.
- [ ] **Step 2: Run** `pnpm eval:posts sen svarga --replay` and `--replay --offer`. Expected: four plans printed, `posts eval: 2/2 made · prompt posts-13`, no request.
- [ ] **Step 3: Journal the evaluation:** per plan, the two hooks with their styles, the two endings, the story texts, the hashtags and code's records; the spec's checklist table with a `posts-13` column of shares next to `posts-11`'s, and the pass verdict. A check that doesn't pass: say why, and ask the maintainer before any prompt change and new recording.
- [ ] **Step 4: Run** `pnpm check`. Expected: every step passes. Copy the RED and GREEN summary lines into the journal.
- [ ] **Step 5: Commit** `docs(posts): marketing copy journal and replay evaluation (roadmap 2.15)`; set 2.15 to `done` in the roadmap in the same commit.
- [ ] **Step 6: Push** the branch with plain `git` over SSH, and give the maintainer the PR to `develop`: its title and full body, ready to paste on github.com.

### Task 10: Stock words in two captions

Added 2026-11-08 (spec amended for two posts an attempt).

**Files:**
- Modify: `lib/posts/variety.ts` (`STOCK_AT`)
- Test: `tests/unit/posts-variety.test.ts`

- [ ] **Step 1: Change the failing tests:** `completely` in 2 captions is recorded as `"completely" in post-1, post-2` (field `words`); in 1 caption it isn't.
- [ ] **Step 2: Run** `pnpm exec vitest run tests/unit/posts-variety.test.ts`. Expected: FAIL on the 2-caption case.
- [ ] **Step 3: Implement:** `STOCK_AT = 2`.
- [ ] **Step 4: Run** `pnpm exec vitest run tests/unit/posts-*.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): a stock word in both captions is recorded (roadmap 2.15)`.
