# Reasons to book Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md: subagents only for independent tasks). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** For a spa that comes to its guests, every post sells one of five reasons to book today, dealt by code with a fact that removes a doubt, written from a new prompt with five sample posts, and checked by five new records; every other business keeps `posts-18`.

**Architecture:** Code decides more, the model less. A new deal (`lib/posts/reasons.ts`) gives each set-up a reason, then a treatment and a part of the body that fit it, then a light; `lib/posts/facts.ts` deals each set-up a fact. A new prompt module (`lib/posts/reasons-prompt.ts`) states the goal, the reasons, the rules that stay and the samples (`lib/posts/samples.ts`); `lib/posts/run.ts` picks the old or new path with `comesToGuests(profile)`. New records (`lib/posts/reason-records.ts`) run only on posts whose set-up has a reason, so nothing changes for other businesses.

**Tech Stack:** TypeScript, Next.js route handlers, zod, Vercel AI SDK with Gemini Flash-Lite, Vitest, pnpm.

**Spec:** `docs/specs/posts/reasons-to-book/spec.md` (approved 2026-11-23). Read it before each task.

## Global Constraints

- A business comes to its guests when `isSpa(profile.category)` and `profile.location.serviceArea` is set. Every other business: `posts-18`'s prompt text byte for byte, `dealSetups` seed for seed, today's records.
- Prompt version: `posts-19` for a business that comes to its guests, `posts-18` for any other, in the run's log, the final line and the eval's recordings.
- Reasons, in this order: `dayOut`, `stayIn`, `twoOfYou`, `firstNight`, `laptop`.
- Look → reasons: `couple` → `twoOfYou`, `stayIn`; `foot` → `dayOut`, `stayIn`, `firstNight`; `head` → `laptop`, `stayIn`, `firstNight`; `pregnancy` → `stayIn`; every other look → `dayOut`, `stayIn`, `firstNight`, `laptop`.
- Reason → free parts: `dayOut` → legs, back, shoulders and neck; `stayIn`, `twoOfYou` → all four free parts; `firstNight` → back, shoulders and neck, legs; `laptop` → shoulders and neck, back, arms and hands.
- Turned-away words, whole words, case ignored: only, strictly, sexual, sex, erotic, extra service, extra services, happy ending.
- Only-where: six words or fewer and holds "your villa", "your hotel", "your room", "your apartment" or "your home".
- The hours fact is the line `Hours: <profile.hours.value>`, on a night post only.
- First-person words: I, I'm, my, me, we, our, us. Two-guest words: both of you, the two of you, each of you, you both, side by side, couple.
- Maré's places: Maré, Lisbon, Sintra, Alfama, Belém, Chiado. The samples' phrases: copied from the spec's list, verbatim.
- Record texts, verbatim: `post-1: question in the first person`, `post-2: question misses its reason (laptop)`, `post-1: "professional therapeutic massage only"`, `post-2 copies a sample: "in bed by ten"`, `post-2: caption for two guests, image of one`.
- Kept from `posts-18`: question ≤ 12 words and 125 characters ending in "?"; answer sentences ≤ 12 words; 80 to 280 characters asked, cut at 400; three paragraphs at most; a spa's caption holds exactly 2 flowers and its story text 1; story text ≤ 10 words and 60 characters asked (120 checked); never a price; never a call to action.
- No new visible string: `messages/*.json` don't change.
- Commits: Conventional Commits, scope `posts` (spec, plan and journal: `docs(posts)`), files staged by path, author `SiegfriedBz <siegfried.bozza@protonmail.com>`, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- No model call before Task 10, and that one only with the maintainer's go-ahead.

## Review Focus

- A profile whose offerings give fewer than two reasons (a pregnancy massage only, a couple massage only): the deal still returns two set-ups, `stayIn` filling in, with no loop or crash. Test in Task 2.
- A profile with no highlight left to deal and no hours: no `### Facts` line for that post, no `fact` in its set-up, and the run still ends with a checked batch. Tests in Tasks 3 and 7.
- A post saved before this spec (a kind of question, no reason), or with no set-up at all, through "Write new texts" and a caption update: it gets a reason its look takes, never the other post's, or, without a set-up, goes as it is. Tests in Task 7.
- A recent list from a phone that hasn't reloaded (no `reason` on its posts): the plan body parses, and those posts count as no reason used. Tests in Tasks 1 and 2.
- An owner who deletes the highlight a post's fact came from: the caption update deals another fact and never sends the old one. Test in Task 7.

---

### Task 1: Reasons in the set-up, and who gets them

**Files:**
- Modify: `lib/posts/setup.ts` (constants after `QUESTIONS`, `setupSchema`)
- Create: `lib/posts/reasons.ts`
- Modify: `lib/posts/batch.ts` (`recentSchema`)
- Modify: `lib/posts/store.ts` (`recentPosts`)
- Create: `docs/specs/posts/reasons-to-book/journal.md`
- Test: `tests/unit/posts-reasons.test.ts` (new), `tests/unit/posts-setup.test.ts`, `tests/unit/posts-store.test.ts`, `tests/unit/posts-batch.test.ts`

**Interfaces:**
- Produces: `REASONS`, `type Reason` and `setupSchema`'s optional `reason: z.enum(REASONS)` and `fact: z.string().min(1)` in `lib/posts/setup.ts`; `comesToGuests(profile: Profile): boolean` in `lib/posts/reasons.ts`; `RecentPost` gains `reason?: Reason`.

- [ ] **Step 1: Write the journal's head.** `journal.md` from `docs/templates/journal.md` if it exists, else headings `# Reasons to book: journal`, `## Calls made along the way`, `## RED`, `## GREEN`. Under the calls, note the builder check's two calls already in the spec (copies matched by the listed phrases; eval steered by made-up recent posts), and this plan's own calls as you make them.

- [ ] **Step 2: Write the failing tests**

```ts
// tests/unit/posts-reasons.test.ts
describe('comesToGuests', () => {
  it('a spa with a service area comes to its guests', () => {
    expect(comesToGuests(svargaProfile())).toBe(true);
  });
  it('a spa with no service area does not', () => {
    expect(comesToGuests(senProfile())).toBe(false); // the helper's Sen has none
  });
  it('a business that is no spa does not, service area or not', () => {
    expect(comesToGuests({ ...svargaProfile(), category: 'bakery' })).toBe(false);
  });
  it("Sen's and Svarga's saved reads do", async () => {
    for (const slug of ['sen', 'svarga']) {
      expect(comesToGuests(await fixtureProfile(join(FIXTURES_DIR, slug)))).toBe(true);
    }
  });
});
```

In `posts-setup.test.ts`: the schema takes `{ ...setup, reason: 'laptop', fact: 'No upfront deposit required' }`, refuses `reason: 'tip'` and `fact: ''`. In `posts-store.test.ts`: `recentPosts` of a batch whose first post's set-up has `reason: 'laptop'` gives `{ type, topic, reason: 'laptop' }` for it and `{ type, topic }` (no `reason` key) for a post without one. In `posts-batch.test.ts`: `planBodySchema` parses `recent` items with and without `reason`, and refuses `reason: 'tip'`.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-reasons.test.ts tests/unit/posts-setup.test.ts tests/unit/posts-store.test.ts tests/unit/posts-batch.test.ts`
Expected: FAIL (no `lib/posts/reasons.ts`; the schema refuses `reason`). Copy the summary line into the journal's RED.

- [ ] **Step 4: Implement.** `REASONS = ['dayOut', 'stayIn', 'twoOfYou', 'firstNight', 'laptop'] as const` in `setup.ts` (so `batch.ts` and `reasons.ts` import it without a cycle), the two optional schema fields, `recentSchema`'s optional `reason`, `recentPosts` adding `reason` only when `post.setup?.reason` is set, and `comesToGuests` from `isSpa` (`lib/posts/emoji.ts`) and `location.serviceArea`.

- [ ] **Step 5: Run the same tests, then all posts tests**

Run: `pnpm exec vitest run tests/unit/posts-*`
Expected: PASS.

- [ ] **Step 6: Commit** the spec, the roadmap row, this plan, the journal and Task 1's files: `feat(posts): reasons in the set-up and who gets them (roadmap 2.23)`.

---

### Task 2: The deal of reasons

**Files:**
- Modify: `lib/posts/setup.ts` (export helpers out of `dealSetups`)
- Modify: `lib/posts/reasons.ts`
- Test: `tests/unit/posts-reasons.test.ts`, `tests/unit/posts-setup.test.ts` (unchanged, must stay green)

**Interfaces:**
- Consumes: Task 1's `REASONS`, `Reason`, `RecentPost.reason`.
- Produces, in `setup.ts`: `FIXED_PARTS`, `FREE_PARTS`, `shuffled`, `pick`, `eligibleNames(profile: Profile): string[]`, `dealOfferTreatments(offer: Offer, random): string[]`, `dealGuests(looks: LookKey[], random): Setup['guests'][]`, `dealScenes(looks: LookKey[], random): Scene[]`, each lifted out of `dealSetups` so that `dealSetups` makes the same random calls in the same order.
- Produces, in `reasons.ts`: `LOOK_REASONS: Record<LookKey, readonly Reason[]>`, `REASON_PARTS: Record<Reason, readonly BodyPart[]>`, `reasonFor(look: LookKey, taken: readonly Reason[], random: () => number): Reason`, and `dealReasonSetups(profile: Profile, offer: Offer | undefined, random: () => number, recent?: readonly RecentPost[]): Setup[]` (facts come in Task 3).

- [ ] **Step 1: Write the failing tests** in `posts-reasons.test.ts`, with these helpers:

```ts
const BASE = svargaProfile(); // a spa with a service area
const guestsProfile = (names: string[]): Profile => ({
  ...BASE,
  offerings: names.map((name) => ({ name, lengths: [], source: BASE.siteUrl })),
});
const recentWith = (...reasons: Reason[]): RecentPost[] =>
  reasons.map((reason, i) => ({ type: 'offer', topic: `t${i}`, reason }));
const offerOn = (treatments: string[]): Offer => ({
  kind: 'discount', percent: 10, treatments, until: '2026-12-01', lastDay: 'Tuesday 1 December',
});
const SEEDS = Array.from({ length: 40 }, (_, i) => `s${i}`);
const dealt = (p: Profile, seed: string, recent: RecentPost[] = [], offer?: Offer) =>
  dealReasonSetups(p, offer, seededRandom(seed), recent);
const MIX = guestsProfile(['Balinese Massage', 'Couple Massage', 'Foot Reflexology']);
```

Tests, each over all `SEEDS`:
1. `two set-ups, two different reasons, no kind of question`: length 2, `reason`s differ, `question` undefined on both.
2. `the reasons least used by the recent posts come first`: `dealt(MIX, seed, recentWith('dayOut', 'stayIn'))` holds neither `dayOut` nor `stayIn`.
3. `recent posts without a reason count as none used`: `dealt(MIX, seed, [{ type: 'offer', topic: 'x' }])` deals two different reasons.
4. `twoOfYou only with a couple massage`: `guestsProfile(['Balinese Massage', 'Foot Reflexology'])` never deals it.
5. `twoOfYou always on the couple massage`: on `MIX`, any `twoOfYou` set-up matches `{ treatment: 'Couple Massage', guests: 'couple', therapists: 2 }`; with `recentWith('dayOut', 'stayIn', 'firstNight', 'laptop')` it is dealt.
6. `each look takes only its reasons`: with `offerOn(['Head Massage'])` on `guestsProfile(['Head Massage', 'Balinese Massage'])`, every reason is in `['laptop', 'stayIn', 'firstNight']`.
7. `the free parts fit the reason`: on `guestsProfile(['Balinese Massage', 'Couple Massage'])`, each set-up's `bodyPart` is in `REASON_PARTS[reason]`.
8. `the first night is the night post`: on `guestsProfile(['Balinese Massage'])` with `recentWith('dayOut', 'stayIn', 'laptop')`, `firstNight` is dealt, its light `night`, the other's `day`.
9. `one day and one night otherwise`: on `MIX`, the lights are `day` and `night` in some order.
10. `with an offer, its treatments first, each with a reason it takes`: `offerOn(['Couple Massage', 'Foot Reflexology'])` on `MIX`: the treatments are those two; the couple's reason in `['twoOfYou', 'stayIn']`, the foot's in `['dayOut', 'stayIn', 'firstNight']`, and they differ.
11. `stayIn when nothing else is left`: `guestsProfile(['Pregnancy Massage'])` deals `['stayIn', 'stayIn']`.
12. `a couple massage alone`: `guestsProfile(['Couple Massage'])` deals `twoOfYou` and `stayIn`.
13. `the same seed deals the same`.
14. `reasonFor`: `reasonFor('couple', ['twoOfYou'], r)` is `stayIn`; `reasonFor('pregnancy', ['stayIn'], r)` is `stayIn`; `reasonFor('head', [], r)` is in `['laptop', 'stayIn', 'firstNight']`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-reasons.test.ts`
Expected: FAIL (`dealReasonSetups` is not exported).

- [ ] **Step 3: Lift the helpers out of `dealSetups`** without changing what it deals.

Run: `pnpm exec vitest run tests/unit/posts-setup.test.ts`
Expected: PASS, "the kinds come last: the set-ups are as before" included.

- [ ] **Step 4: Implement `dealReasonSetups`.** The rules, in order:
  1. The looks: `lookOf` of each of `eligibleNames(profile)`, or `['plain']` when there is none. The open reasons: those `LOOK_REASONS` of some look takes.
  2. Uses: how many recent posts carry each reason; a recent post without one counts for none.
  3. Without an offer: reason 1 is the least used open reason, at random among equals (`pick`); reason 2 the same among the open reasons left, or `stayIn` when none is left. Then the treatment: `twoOfYou` takes a couple offering; the other reasons take the least used eligible offering (counted within the attempt, as `dealTreatments` counts) whose look takes the reason, at random among equals; no treatment when there is no eligible offering.
  4. With an offer: the treatments from `dealOfferTreatments`, then each a reason from `LOOK_REASONS[look]` (an excluded name counts as `plain`), never the first post's, least used first, at random among equals, `stayIn` when none is left.
  5. The part: a look in `FIXED_PARTS` keeps its least used fixed part, as today; any other takes the least used of `FREE_PARTS` that `REASON_PARTS[reason]` holds, at random among equals.
  6. Guests from `dealGuests`, scenes from `dealScenes`, therapists 2 for `fourHands` and `couple`, `locals` from `localsOf`.
  7. The light: a `firstNight` post is `night` and the other `day`; otherwise one of each, shuffled.
  8. No `question` and no `hook`.

  `reasonFor(look, taken, random)` picks at random among `LOOK_REASONS[look]` not in `taken`, and gives `stayIn` when none is left.

- [ ] **Step 5: Run the posts tests**

Run: `pnpm exec vitest run tests/unit/posts-*`
Expected: PASS.

- [ ] **Step 6: Commit**: `feat(posts): deal a reason to book into each set-up (roadmap 2.23)`.

---

### Task 3: The facts, dealt by code

**Files:**
- Create: `lib/posts/facts.ts`
- Modify: `lib/posts/reasons.ts` (`dealReasonSetups` ends by dealing the facts)
- Modify: `lib/posts/input.ts` (`postsPromptInput`)
- Test: `tests/unit/posts-facts.test.ts` (new), `tests/unit/posts-reasons.test.ts`

**Interfaces:**
- Consumes: Task 1's `setupSchema.fact`; `Light` from `setup.ts`.
- Produces, in `facts.ts`: `turnsAway(text: string): boolean`, `onlySaysWhere(text: string): boolean`, `factsOf(profile: Profile): string[]` (highlight values that are neither, trimmed, each once, in profile order), `hoursFact(profile: Profile): string | null` (`Hours: ${hours.value}`), `pickFact(profile: Profile, light: Light, avoid: readonly (string | undefined)[], random: () => number): string | undefined` (at random among `factsOf`, plus `hoursFact` on a night post, minus `avoid`), `dealFacts(profile: Profile, setups: Setup[], random: () => number): Setup[]` (each set-up in order gets a fact the earlier ones don't have, or none), `newFact(profile: Profile, setup: Setup, other: Setup | undefined, random: () => number): string | undefined` (avoid its own and the other's; then only the other's; then nothing), `keptFact(profile: Profile, setup: Setup): string | undefined` (the set-up's fact while `factsOf`, or `hoursFact` on a night post, still holds it).
- Produces, in `input.ts`: `postsPromptInput(profile: Profile): PostsModelInput`, `postsModelInput` without the highlights `turnsAway` finds. `profileHash` keeps using `postsModelInput`.

- [ ] **Step 1: Write the failing tests.** Helpers: `withHighlights(values: string[], hours: string | null = null): Profile` over `svargaProfile()`, in the test file, and `setupAt(light: Light): Setup` (`look: 'plain'`, `guests: 'man'`, `therapists: 1`, `bodyPart: 'back'`, `scene: 'treatment'`, `locals: 'Vietnamese'`, `reason: 'stayIn'`, `light`), added to `tests/unit/helpers/posts.ts` for Task 5 too. `SEN = ['Trained local Vietnamese therapists', 'Free travel in our core areas', 'Linens, towels and oils included', 'Professional therapeutic massage only', 'No upfront deposit required']`.

1. `turnsAway`: true for "Professional therapeutic massage only" and "Strictly no sexual services"; false for "No upfront deposit required" and "Free travel in our core areas".
2. `onlySaysWhere`: true for "Massage at your villa or hotel"; false for "No upfront deposit for villas and hotels" and "Fresh linens, towels, and natural oils brought to you".
3. `factsOf(withHighlights(SEN))` equals `SEN` without its fourth.
4. Over 100 seeds, `dealFacts(withHighlights(SEN, '08:30-23:00 daily'), [setupAt('day'), setupAt('night')], seededRandom(seed))`: the two facts differ; the day post's never starts with `Hours: `; neither is the turned-away one; and some seed gives the night post `Hours: 08:30-23:00 daily`.
5. `no fact when none is left`: `withHighlights(['Professional therapeutic massage only'])` gives `[undefined, undefined]`; `withHighlights(['No upfront deposit required'])` gives the first post the fact and the second none.
6. `newFact`: with `SEN`'s four, a set-up holding the first and another holding the second never get either back; with one fact only, the post gets it back.
7. `keptFact`: kept while the profile holds it; `undefined` once the highlight is gone; an `Hours: …` fact kept on a night post while the hours are the same.
8. `postsPromptInput(withHighlights(SEN)).highlights` lacks the turned-away one; `postsModelInput` of the same profile still holds it.

In `posts-reasons.test.ts`: every set-up `dealReasonSetups` deals on `withHighlights(SEN)`-style offerings carries a fact, and none the turned-away one.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-facts.test.ts tests/unit/posts-reasons.test.ts`
Expected: FAIL (no `lib/posts/facts.ts`).

- [ ] **Step 3: Implement** the functions above; whole words as `lib/posts/variety.ts`'s `holdsWords` matches them, on `folded` text. `dealReasonSetups` returns `dealFacts(profile, setups, random)`, drawing after everything else.

- [ ] **Step 4: Run the posts tests**

Run: `pnpm exec vitest run tests/unit/posts-*`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(posts): deal each post a fact that removes a doubt (roadmap 2.23)`.

---

### Task 4: The five samples

**Files:**
- Create: `lib/posts/samples.ts`
- Test: `tests/unit/posts-samples.test.ts` (new)

**Interfaces:**
- Consumes: `Reason`, `Light` from `setup.ts`.
- Produces: `SAMPLES: readonly { reason: Reason; light: Light; guests: 'one' | 'two'; caption: string; story: string }[]` in `REASONS` order; `SAMPLE_FACTS: readonly string[]`; `SAMPLE_PLACES = ['Maré', 'Lisbon', 'Sintra', 'Alfama', 'Belém', 'Chiado'] as const`; `SAMPLE_PHRASES: readonly string[]`; `samplesText(): string`.

- [ ] **Step 1: Write the failing tests**

1. `one sample per reason, in order`: `SAMPLES.map((s) => s.reason)` equals `[...REASONS]`; lights `['night', 'night', 'day', 'night', 'day']`; guests two only for `stayIn` and `twoOfYou`.
2. For each sample: three paragraphs (`paragraphsOf`); its first ends in "?" before its flower and holds at most 12 words; each sentence of its second at most 12 words (`sentenceWords`); 80 to 280 characters; 2 flowers and no other emoji (`emojisIn`, `FLOWERS`); its story text at most 10 words, at most 60 characters, 1 flower.
3. `every sample holds a phrase or a place code can catch`: folded, each caption plus story holds one of `SAMPLE_PHRASES` or `SAMPLE_PLACES`.
4. `samplesText()` holds every caption, every story text and every one of `SAMPLE_FACTS`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-samples.test.ts`
Expected: FAIL (no module).

- [ ] **Step 3: Implement.** The captions and story texts are the spec's, verbatim (section "Five sample posts"), with `\n\n` between paragraphs. `SAMPLE_FACTS` are Maré's five highlights from the spec; `SAMPLE_PHRASES` the spec's list, verbatim. `samplesText()`:

```
Samples: five posts of Maré, a made-up business that sends therapists to hotels and flats in Lisbon, one for each reason. They show the voice, the length and the three paragraphs. Write new posts for this business in the same spirit, and never a sample's words, places or facts: Maré, its places and its facts are not this business's.

Maré's facts: <SAMPLE_FACTS joined with "; ">.

<for each sample>
<reason>, a <light> post, <one guest | two guests on a couple massage>:
<caption>
Story text: <story>
```

- [ ] **Step 4: Run the tests**

Run: `pnpm exec vitest run tests/unit/posts-samples.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(posts): five sample posts of a made-up Lisbon business (roadmap 2.23)`.

---

### Task 5: Code's new records

**Files:**
- Create: `lib/posts/reason-records.ts`
- Modify: `lib/posts/variety.ts` (export `plainSentences`, `questionOf`, `holdsWords`, `BODY_WORDS`)
- Modify: `lib/posts/checks.ts` (`checkPlan`, `checkRewrite`, `checkNewTexts`)
- Test: `tests/unit/posts-reason-records.test.ts` (new)

**Interfaces:**
- Consumes: `turnsAway` (Task 3), `SAMPLES`, `SAMPLE_PHRASES`, `SAMPLE_PLACES` (Task 4).
- Produces: `reasonRecords(posts: Post[], profile: Profile): Dropped[]`, run only on posts whose `setup.reason` is set, in this order per post: first person, missed reason, turned-away highlight, copied sample, two guests on one. The three checks call it right after `copyRecords`.

- [ ] **Step 1: Write the failing tests.** A post helper: `post({ id, caption, storyText, setup: { ...setupAt('night'), reason, guests, look } })` from `tests/unit/helpers/posts.ts`. Each record's text is the spec's, verbatim:

1. "Can a therapist bring oils to my hotel tonight? 🌸" on a `stayIn` post: `{ field: 'mix', reason: 'post-1: question in the first person' }`; on an offer post, its question is the first sentence after the offer line.
2. "Sore shoulders after a surf at My Khe? 🌸" on a `laptop` post: `{ field: 'mix', reason: 'post-1: question misses its reason (laptop)' }`; on a `dayOut` post, none. "Tired in Da Nang?" on a `dayOut` post: recorded (no part of the body).
3. "We offer professional therapeutic massage only in your hotel room." in a caption, Sen's highlights in the profile: `{ field: 'words', reason: 'post-1: "professional therapeutic massage only"' }`.
4. "Then a shower, and you're in bed by ten." : `{ field: 'words', reason: 'post-1 copies a sample: "in bed by ten"' }`; "a day at Belem" records `belém`'s match the same way, accents ignored. "Just landed? We come to you tonight 🌸" as a story text: none.
5. "Both of you, side by side?" on a one-guest `stayIn` post: `{ field: 'mix', reason: 'post-1: caption for two guests, image of one' }`; "Two therapists work on your back" on a `fourHands` post for one guest: none; the same caption on a `couple` post: none.
6. `none on a post without a reason`: a post with `setup.question: 'ask'` and the first-person question: none of the five.
7. `the samples pass every record but the copy`: each of `SAMPLES` as a post with its reason, light and guests (two guests: `look: 'couple'`, `guests: 'couple'`, `therapists: 2`) gives no record but `copies a sample`.
8. In `posts-checks.test.ts`, `checkPlan` on a batch with a first-person reason post holds the record.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-reason-records.test.ts tests/unit/posts-checks.test.ts`
Expected: FAIL (no module).

- [ ] **Step 3: Implement.** Words are matched whole on `folded` text with `holdsWords`; the question is `questionOf(post)`; a highlight is matched without its final stop; the reason words are the spec's lists (record 2), `dayOut` using `BODY_WORDS`. Each record once per post.

- [ ] **Step 4: Run the posts tests**

Run: `pnpm exec vitest run tests/unit/posts-*`
Expected: PASS: no existing test changes, since no post before this task had a reason.

- [ ] **Step 5: Commit**: `feat(posts): records for the reasons, the facts and the samples (roadmap 2.23)`.

---

### Task 6: The prompt for a business that comes to its guests

**Files:**
- Modify: `lib/posts/prompt.ts` (export the shared parts; user texts)
- Create: `lib/posts/reasons-prompt.ts`
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-reasons-prompt.test.ts` (new)

**Interfaces:**
- Consumes: `samplesText()` (Task 4), `Setup.reason` and `Setup.fact`.
- Produces, in `prompt.ts`: exported `emojiRule`, `offerRules`, `rewriteOfferRules`, and three constants lifted out of today's text with no change to it: `IMAGE_RULES` (from "The image prompt: English" to the end of the scene paragraph), `HASHTAG_RULES` (the "Hashtags:" paragraph), `ALT_RULES` (the "Alt text:" paragraph). `planUserText`, `rewriteUserText` and `newTextsUserText` add the reasons and facts when the set-ups have them.
- Produces, in `reasons-prompt.ts`: `REASONS_PROMPT_VERSION = 'posts-19'`, `reasonsPlanPrompt(withOffer?: boolean, spa?: boolean): string`, `reasonsRewritePrompt(withOffer?: boolean, spa?: boolean): string`, `reasonsNewTextsPrompt(withOffer?: boolean, spa?: boolean): string`.

- [ ] **Step 1: Pin today's prompts.** A test in `posts-prompt.test.ts` asserts `hashText` (`lib/posts/input.ts`) of each of `planPrompt`, `rewritePrompt` and `newTextsPrompt` for `withOffer` and `spa` in `false`/`true` (12 values). Run it once against today's code to get the 12 hashes, paste them in as the expected values, and run it again.

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts`
Expected: PASS before any change.

- [ ] **Step 2: Write the failing tests** for the new prompts and the user texts:

1. `reasonsPlanPrompt(false, true)` starts with the goal ("Who reads these posts"), holds `dayOut:`, `stayIn:`, `twoOfYou:`, `firstNight:`, `laptop:`, `samplesText()`, `IMAGE_RULES`, `HASHTAG_RULES`, `ALT_RULES`, "Never in the first person", "names only a mood", "Post 1 is an offer post and post 2 a moment post", and none of "tip:", "ritual:", "sore:", "ask:", "Never a question about how the guest feels", "Never reuse a phrase from these instructions".
2. With an offer: "Posts 1 and 2 are both offer posts" and `offerRules(true)`.
3. `reasonsRewritePrompt` and `reasonsNewTextsPrompt` hold the reasons, the samples, `its "light"`, `its "fact"`, and "A post without a "reason" takes stayIn"; the new texts' prompt holds "a different question for its reason".
4. `planUserText` with two reason set-ups holds, after `### Image set-ups`, `### Reasons\n1. laptop\n2. stayIn` and `### Facts\n1. No upfront deposit required` (no line for a post without a fact), and no `### Questions`.
5. `rewriteUserText` and `newTextsUserText` give a post with a reason and a fact `"reason": "laptop"` and `"fact": "…"` next to its `light`, and a post without them neither key.
6. The pinned `posts-18` hashes still match.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-reasons-prompt.test.ts`
Expected: FAIL (no module).

- [ ] **Step 4: Lift the shared parts out of `prompt.ts`**, add the reasons and facts to the three user texts, and run the pin.

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts`
Expected: PASS, the 12 hashes unchanged.

- [ ] **Step 5: Write `reasons-prompt.ts`.** Its plan prompt, in this order (exact copy; `${…}` are the parts named above):

```
Who reads these posts: a tourist or expat near the business, on their phone, often in their hotel room, apartment or villa. What a post is for: it makes them want a massage today from this business, which comes to them, so they message it. Its edge over any spa: the guest never leaves their room, with no taxi there and back and nothing to get dressed for afterwards.

You plan two Instagram posts for this business, and write them as its owner would. You get its brand profile, read from its website and checked by the owner, and the topics of its recent posts.

Each post has a type, a topic, a scene, a caption, a story text, hashtags, alt text and an image prompt.

${withOffer ? 'Posts 1 and 2 are both offer posts.' : 'Post 1 is an offer post and post 2 a moment post.'} Both sell, each through its reason to book. Never repeat the topic of a recent post.${withOffer ? offerRules(spa) : ''}

The topic: one line, at most 12 words, saying what the post is about.

${REASONS('The reasons: code gives each post its reason to book today, under "### Reasons": post 1 takes reason 1, and so on.', 'set-up gives')}

${CAPTIONS(spa, withOffer, 'the last word of its set-up', 'under "### Facts"')}

${samplesText()}

${IMAGE_RULES}
```

`REASONS(intro, partFrom)`:

```
${intro} Each post sells its reason, to the guests its set-up shows:
- dayOut: the guest's body after a day out: a walk, a climb, a hike, a surf. Its question names the part of the body its ${partFrom}, in its own word (legs, feet, shoulders, neck, back, arms, hands, head; for "whole body", one its treatment's description names), and the day out it comes from: one of the essence's moments about a day out, or one of the business's real places, never the same moment in both posts.
- stayIn: the guest would rather not go out: it's late, it's raining, or the kids are asleep. Its question names that moment; the answer says they don't have to go anywhere.
- twoOfYou: two guests, a couple or friends, both massaged at the same time, side by side, each with their own therapist.
- firstNight: the guest has just landed after a long flight. Its question names the flight in their body: a stiff back, neck or legs.
- laptop: days of work on a laptop. Its question names the screen days in their neck, shoulders or back.
A moment of the essence about a flight is firstNight's, one about a laptop or work is laptop's, the others are dayOut's.
```

`CAPTIONS(spa, withOffer, lightFrom, factFrom)`:

```
Captions:
- English, in the business's tone words, written as its owner would, to tourists and expats nearby.
- Three paragraphs, with a blank line between them: never more.
- The first line is the question, alone on its line: the post's reason, asked to the guest with "you" or "your", in a tourist's own words, about the moment they are living. It ends with "?", at most 12 words and 125 characters: it is all Instagram shows before "more". Never in the first person (I, my, me, we, our, us): the business writes the post, and the question is about the guest. Never a question that names only a mood: a long day, a break, unwinding, stress.${withOffer ? ' A post that carries the special offer opens on its offer line instead, alone on its first line; its question opens the second paragraph.' : ''}
- The second paragraph answers it: what the guest gets and how easy it is, in two short sentences of at most 12 words each. It says a therapist comes to the guest's own hotel room, apartment or villa, as the profile writes it, and what changes for the rest of their day or evening, the guest's body and plans named in a few words. It may name the post's treatment. A person does the acting: "we", the therapist or "you"; never the pressure, the strokes, the massage, the oil or the towels. Nothing else in the caption is a question.${withOffer ? ' On a post that carries the special offer, the second paragraph opens on its question, then answers it.' : ''}
- The third paragraph is the post's fact, ${factFrom}, in one short sentence, as the profile writes it; for "Hours: …", until when the business comes, every day, in a few words. A post with no fact ends on its second paragraph.
- The caption speaks to the guests its set-up shows: two guests on a couple massage are both massaged at once, side by side, each with a therapist; one guest is massaged alone.
- Never describe the setting: the light, the sky, the sunset, the garden, the room, the lamps, candles or linens, the oil's colour, or how quiet, calm or peaceful it is. Never describe what the photo shows: the image prompt's light, room and garden are for the image only. The story text follows the same rule.
- Each caption names one of the business's real places, as its profile writes it, in its question or the paragraph right after it: its town or area, a place it serves, or a landmark among its place symbols. A flower, a plant, an oil or an object is never a place.
- A caption or story text that says when follows its post's light, ${lightFrom}: a day post speaks of the guest's afternoon, with the evening still ahead, never of sleep, bed or waking up; a night post of the guest's evening, the day done, never of the afternoon, the midday sun or the morning just past.
- The captions open differently and end differently, and never say the same idea twice in other words. Never reuse a phrase from the image set-ups: they describe the photos.
- Plain, concrete words: never a word that only adds intensity, such as completely, deeply, truly, ultimate or pure.
- Never "Imagine…", a "not this, it's that" contrast, an em dash (—), three adjectives in a row, or these words: unwind, indulge, pamper, oasis, escape, melt away, soothe.
- ${POSTS_LIMITS.captionMin} to ${POSTS_LIMITS.captionAsked} characters in all, before the app's WhatsApp line. No hashtags in the text.
- ${emojiRule(spa)}
- Never a price, in a caption or a story text.
- Facts only from the profile: a duration, a number of years, a place name, a quality (signature, expert, best) or a claim appears only if the profile holds it, written as the profile writes it.
- No call to action and no contact details, ever: the app adds its own booking line with the number after the caption.${withOffer ? " On a post that carries the special offer, the app's line also gives the offer's end." : ''}
- Never these words, nor anything that suggests more than a professional treatment: ${BANNED_WORDS.join(', ')}.

${HASHTAG_RULES}

${ALT_RULES}

Story text: its own line for the post's Instagram story, which the owner pastes on the story image above a link sticker to WhatsApp, read in two seconds: at most ${POSTS_LIMITS.storyWords} words and ${POSTS_LIMITS.storyAsked} characters, emoji included, one idea. It names the post's moment in a few words and says the business comes to the guest, at the post's time of day. Never advice, never the treatment's name alone, never the caption's first sentence, never a price. English. No hashtags, no phone number, no link and no call to action, and never the words book, reserve, WhatsApp, message, DM or click: the sticker asks. It follows the captions' rules on the setting, the clichés and the light.
```

The rewrite prompt keeps `posts-18`'s first paragraph ("The owner changed their business's brand profile…"), then the goal paragraph, then `REASONS('The reasons: each post\'s "reason" names it. A post without a "reason" takes stayIn.', 'image prompt shows')`, `CAPTIONS(spa, withOffer, 'its "light"', 'its "fact"')`, `samplesText()` and `withOffer ? rewriteOfferRules(spa) : ''`. The new texts' prompt keeps `posts-18`'s first paragraph ("The owner of a small business wants new words…"), its "Something different" paragraph with "a different question of the kind its "question" names" made "a different question for its reason" and, for `dayOut`, the part of the body staying the one its image prompt shows, plus "Its "fact" is new: use it.", then the same parts as the rewrite.

- [ ] **Step 6: Run the prompt tests**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-reasons-prompt.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**: `feat(posts): the posts-19 prompt for spas that come to their guests (roadmap 2.23)`.

---

### Task 7: The runs: plan, caption updates, new texts

**Files:**
- Modify: `lib/posts/run.ts`
- Modify: `lib/posts/reasons.ts` (`withReasons`, `newTextsPost`)
- Modify: `lib/posts/edit.ts` (`mergeRewrite`)
- Test: `tests/unit/posts-run.test.ts`, `tests/unit/posts-edit.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Consumes: Tasks 2, 3, 5 and 6.
- Produces: `promptVersionFor(profile: Profile): string` in `run.ts`; `withReasons(posts: Post[], profile: Profile, random: () => number): Post[]` (each post with a set-up gets a reason, `setup.reason ?? reasonFor(setup.look, the other posts' reasons, random)`, and a fact, `keptFact ?? pickFact(…, the other posts' facts, …)`; a post without a set-up goes as it is) and `newTextsPost(post: Post, other: Post | undefined, profile: Profile, random: () => number): Post` (its reason as above, never `other`'s, and `newFact`) in `reasons.ts`.

- [ ] **Step 1: Write the failing tests.** In `posts-run.test.ts`, `const atTheSpa = () => ({ ...svargaProfile(), location: { ...svargaProfile().location, serviceArea: null } })` takes the place of `svargaProfile()` in each test that pins `posts-18` (those comparing with `dealSetups`, `planPrompt` or `### Questions`). New tests:

1. A plan for `svargaProfile()`: the system prompt is `reasonsPlanPrompt(false, true)`; the user text holds `### Reasons` and `### Facts`; the final line's `promptVersion` is `posts-19`, and so is the log's; every post's set-up has a reason; the posts' types are `offer` then `moment` though the model wrote `tip` for post 2; with an offer, both `offer`.
2. A plan for `atTheSpa()`: the system prompt is `planPrompt(false, true)`, the user text holds `### Questions`, `promptVersion` is `posts-18`.
3. `recent` posts carrying `dayOut` and `stayIn` keep both out of the plan's set-ups.
4. The plan's user text for a profile with "Professional therapeutic massage only" doesn't hold it.
5. A profile with no highlight and no hours ends with a checked batch and no `### Facts`.
6. A caption update of a post saved with `question: 'ask'` and no reason: the user text gives it a reason in `LOOK_REASONS[look]`, not the other post's, and the returned post's set-up holds it; a post with a fact the profile still holds keeps it; one whose highlight was removed gets another, never the old one; a post with no set-up goes through with neither key.
7. New texts keep the post's reason and give it a fact that is neither its own nor the other post's while another is left.
8. In `posts-edit.test.ts`: `mergeRewrite` stores the answer's `reason` and `fact` on the stored post's set-up and keeps its other set-up fields.

In `posts-fixtures-replay.test.ts`, the new texts' "The image, its set-up and the hashtags stay" compares the set-ups without their `fact`, and checks the reason is the same.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-run.test.ts tests/unit/posts-edit.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement.** In `streamPlan`, `streamRewrite` and `streamNewTexts`, `const guests = comesToGuests(profile)` and `const random = deps.random ?? Math.random` choose: the deal (`dealReasonSetups(profile, offer, random, body.recent)` or `dealSetups`), the input (`postsPromptInput` or `postsModelInput`), the prompts, the version (`run` takes it in place of `POSTS_PROMPT_VERSION`), and the posts sent (`withReasons`, `newTextsPost`). For these businesses, the plan's `complete` sets each model post's `type` to `offer` for post 1, and for post 2 to `offer` with an offer, else `moment`. `checkRewrite` and `checkNewTexts` get the prepared posts, so the posts they return carry the new set-ups. `mergeRewrite` copies `reason` and `fact` from the answer's set-up onto the stored one, only when the answer's set-up has them.

- [ ] **Step 4: Run all unit tests**

Run: `pnpm test`
Expected: PASS.

- [ ] **Step 5: Commit**: `feat(posts): plans, caption updates and new texts with reasons to book (roadmap 2.23)`.

---

### Task 8: The eval and the replay deal the same steered set-ups

**Files:**
- Modify: `lib/brand/fixtures.ts`
- Modify: `scripts/eval-posts.ts`
- Modify: `tests/unit/posts-fixtures-replay.test.ts`
- Test: `tests/unit/posts-reasons.test.ts`

**Interfaces:**
- Produces: `fixtureRecent(slug: string, withOffer: boolean): RecentPost[]` in `lib/brand/fixtures.ts`: made-up recent posts for `sen` and `svarga`, `[]` for every other slug.

- [ ] **Step 1: Write the failing test** `the four recordings deal every reason and the hours`: for `sen` and `svarga`, without an offer (`seededRandom(slug)`) and with `fixtureOffer(profile)` (`seededRandom(`${slug}:offer`)`), `dealReasonSetups(profile, offer, random, fixtureRecent(slug, withOffer))` over the four gives all five reasons, and some night set-up's fact starts with `Hours: `.

- [ ] **Step 2: Run it to see it fail**

Run: `pnpm exec vitest run tests/unit/posts-reasons.test.ts`
Expected: FAIL (`fixtureRecent` doesn't exist).

- [ ] **Step 3: Implement `fixtureRecent`**, choosing its recent posts (each `{ type: 'offer', topic: '…', reason }`) until the test passes; `twoOfYou` can only come from a run without an offer (the fixtures' offer is on two other treatments). Note the chosen lists in the journal. Then `eval-posts.ts` sends `recent: fixtureRecent(slug, withOffer)` in every plan, replayed or not, prints each post's `reason` and `fact` after its set-up, and saves and prints `promptVersionFor(profile)`; the replay test sends the same `recent` in each `streamPlan` for `sen` and `svarga`.

- [ ] **Step 4: Run all unit tests**

Run: `pnpm test`
Expected: PASS: the `posts-18` recordings replay through the new deal and keep every assertion they had.

- [ ] **Step 5: Commit**: `test(posts): steer the eval's deal to every reason (roadmap 2.23)`.

---

### Task 9: Every check

**Files:** `docs/specs/posts/reasons-to-book/journal.md`

- [ ] **Step 1: Run the repo's checks**

Run: `pnpm check`
Expected: every check passes. Copy its summary line into the journal's GREEN.

- [ ] **Step 2: Run the phone tests.** First `ss -ltnp | grep :3000`: if another project holds port 3000, never stop it; run Playwright with a scratch config in `.superpowers/` on port 3101, as earlier items did.

Run: `pnpm test:e2e`
Expected: all pass (a first build may stop on Next.js's security notice: run once more). Copy the summary line into GREEN.

- [ ] **Step 3: Commit** the journal: `docs(posts): reasons to book, checks green (roadmap 2.23)`.

---

### Task 10: Record and judge with the real model

**Files:** `tests/fixtures/sites/sen/{posts,posts-offer,new-texts}.json`, the same for `svarga`, `tests/unit/posts-fixtures-replay.test.ts`, `journal.md`

- [ ] **Step 1: Ask the maintainer** for 6 Flash-Lite requests from the app's daily pool, never on a pilot day. Without a `.env.local` in this worktree, give them the one-line command that copies only the `GOOGLE_GENERATIVE_AI_API_KEY=` line from another worktree's `.env.local`, and let them run it.

- [ ] **Step 2: Record**

Run: `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`, then `pnpm eval:posts sen svarga --new-texts --record`
Expected: `posts eval: 2/2 made · prompt posts-19` each time; on a 503 or 429, rerun the slug that failed.

- [ ] **Step 3: Write the journal's evaluation**: each new post next to `posts-18`'s, with its reason, its fact and code's records, then the spec's score table, and the pass verdict. When a check fails, say why and ask the maintainer whether the prompt changes and the plans are recorded again.

- [ ] **Step 4: Add the replay assertions** for the `posts-19` recordings of `sen` and `svarga`, with and without an offer: no record `question in the first person`, `copies a sample` or `caption for two guests, image of one`; no turned-away highlight's words in a caption or story text; every set-up has a reason.

Run: `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts`
Expected: PASS.

- [ ] **Step 5: Show the maintainer** the eight posts and the two new texts, as the owner would see them, and ask whether they would post both posts of each attempt as they are. Record their words in the journal.

- [ ] **Step 6: Commit**: `test(posts): posts-19 recordings for Sen and Svarga (roadmap 2.23)`.

---

### Task 11: Ship

**Files:** `docs/roadmap.md`, `journal.md`

- [ ] **Step 1:** Set 2.23's status to `done` in `docs/roadmap.md`; run `pnpm check`; copy its line into GREEN.
- [ ] **Step 2: Commit**: `docs(posts): reasons to book done (roadmap 2.23)`.
- [ ] **Step 3:** Push the branch over SSH, `git push -u origin HEAD`, and give the maintainer the PR to `develop`: a title and a full description, ready to paste, ending with the attribution line. Say plainly that nothing is live until they open and merge it.
