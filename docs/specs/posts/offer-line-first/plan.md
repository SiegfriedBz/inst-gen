# Offer line first Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md, "Plans"). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every post that carries the special offer opens on its exact offer line, written by code, and its story text is that line; the prompt says the order once.

**Architecture:** A new module, `lib/posts/offer-line.ts`, writes the line from the offer and the post's treatment, puts it first in a caption and makes the story text from it. `checkedWords` (`lib/posts/checks.ts`) runs it on each carrying post, in the plan as posts stream and in rewrites, and records each fix in `dropped` (field `offer`); `run.ts` counts them into the log's `offer_fixes=`. `lib/posts/prompt.ts` becomes `posts-9`: the hook rule names the offer line, and the plan's and rewrite's "### Special offer" blocks give each line in full.

**Tech Stack:** TypeScript, Vitest, pnpm.

**Spec:** `docs/specs/posts/offer-line-first/spec.md`

## Global Constraints

- `POSTS_PROMPT_VERSION = 'posts-9'`. Without an offer, `planPrompt(false, spa)`, `rewritePrompt(false, spa)` and `planUserText`/`rewriteUserText` without an offer stay byte for byte as `posts-8`.
- The line, exactly: discount `` `${percent}% off our ${OFFER_LIMITS.minutes}-minute ${treatment}, until ${lastDay}.` ``; free extra `` `Free ${gift} with a ${OFFER_LIMITS.minutes}-minute ${treatment}, until ${lastDay}.` ``.
- `dropped` records, field `offer`, reasons exactly: `<id>: offer line put first`, `<id>: offer line added`, `<id>: story text set to the offer line`, `<id>: offer line too long for the story text`, `<id>: no treatment for the offer line`. `offer_fixes=` counts all but the last.
- A story text never goes over `POSTS_LIMITS.storyChars` (120, `.length`): the batch schema refuses it.
- Posts that don't carry the offer, and batches without one, are untouched. The owner's own edits (`lib/posts/edit.ts`) are not fixed.
- No new visible strings (no `messages/*.json` change).
- Commits: Conventional Commits, scope `posts`; stage by path; author `SiegfriedBz <siegfried.bozza@protonmail.com>`; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `pnpm eval:posts … --offer --record` spends 1 Flash-Lite request each, 3 in all: ask the maintainer right before, never on a pilot day.

## Review Focus

1. **A flower or emoji before the model's offer line** ("🌸 10% off our …"): not "starts with the line", so the sentence is replaced and the caption opens on the exact line, with one flower after it, not two. Test in Task 1.
2. **Numbers that look like the offer**: "100% natural oils" and "110%" in another sentence stay; only the offer's own percentage ("10%", "10 %") marks a sentence. Test in Task 1.
3. **A rewrite of a post saved before 2.12** (no set-up) whose caption names the treatment in another case ("thai massage"): the treatment is found and the line fixed. Test in Task 2.
4. **A caption that is only the offer sentence**: the result is the line (and flower) alone, no trailing space. Test in Task 1.
5. **A post that carries the offer but whose set-up treatment isn't on offer** (the model put an offer post at 3): the caption's named treatment is used, else the post is left and `no treatment` recorded. Test in Task 2.

---

### Task 1: The offer line

**Files:**
- Create: `lib/posts/offer-line.ts`
- Modify: `lib/posts/story.ts` (export `sentences`)
- Test: `tests/unit/posts-offer-line.test.ts`
- Create: `docs/specs/posts/offer-line-first/journal.md` (headings `## Calls made along the way`, `## RED`, `## GREEN`, as `docs/specs/posts/day-and-night-images/journal.md`)

**Interfaces:**
- Consumes: `Offer`, `OFFER_LIMITS`, `mentionsDay` (`lib/posts/offer.ts`); `FLOWERS`, `emojisIn` (`lib/posts/emoji.ts`); `POSTS_LIMITS` (`lib/posts/batch.ts`); `sentences(text: string): string[]` from `lib/posts/story.ts`, now exported, unchanged.
- Produces:
  - `offerLine(offer: Offer, treatment: string): string`
  - `offerTreatment(offer: Offer, setupTreatment: string | undefined, caption: string): string | null`: the set-up's treatment when `offer.treatments` holds it; else the first of `offer.treatments` the caption names, case ignored; else `null`.
  - `statesOffer(sentence: string, offer: Offer): boolean`: `mentionsDay(sentence, offer.until)`, or for a discount the offer's percentage as a whole number before `%` (`(?<!\d)10\s?%`), or for a free extra `\bfree\b` and the gift's name, case ignored.
  - `putOfferLineFirst(caption: string, line: string, offer: Offer, spa: boolean): { caption: string; fix: 'put first' | 'added' | null }`
  - `offerStory(line: string, caption: string, story: string | undefined, spa: boolean): { storyText?: string; fix: 'set' | 'too long' | null }`

- [ ] **Step 1: Write the failing tests**

With `const offer: Offer = { kind: 'discount', percent: 10, treatments: ['Thai Massage', 'Vietnamese Traditional Massage'], until: '2026-11-01', lastDay: 'Sunday 1 November' }`, `const free: Offer = { kind: 'freeExtra', gift: 'Foot Reflexology', treatments: ['Thai Massage'], until: '2026-11-01', lastDay: 'Sunday 1 November' }` and `const LINE = '10% off our 90-minute Thai Massage, until Sunday 1 November.'`:

```ts
it('writes the discount line and the free extra line', () => {
  expect(offerLine(offer, 'Thai Massage')).toBe(LINE);
  expect(offerLine(free, 'Thai Massage')).toBe(
    'Free Foot Reflexology with a 90-minute Thai Massage, until Sunday 1 November.',
  );
});

it("takes the set-up's treatment, else the caption's, else none", () => {
  expect(offerTreatment(offer, 'Thai Massage', '')).toBe('Thai Massage');
  expect(offerTreatment(offer, 'Hot Stone', 'Our vietnamese traditional massage.')).toBe(
    'Vietnamese Traditional Massage',
  );
  expect(offerTreatment(offer, undefined, 'Warm oil tonight.')).toBeNull();
});

it('knows a sentence that states the offer', () => {
  expect(statesOffer('Book before 1 Nov.', offer)).toBe(true);
  expect(statesOffer(' 🌸 10 % off tonight.', offer)).toBe(true);
  expect(statesOffer('100% natural oils.', offer)).toBe(false);
  expect(statesOffer('A 110% welcome.', offer)).toBe(false);
  expect(statesOffer('Free foot reflexology with it!', free)).toBe(true);
  expect(statesOffer('Foot reflexology helps.', free)).toBe(false);
});

it('keeps a caption that opens on its line', () => {
  const caption = `${LINE} 🌺 Long flight? Feel light again.`;
  expect(putOfferLineFirst(caption, LINE, offer, true)).toEqual({ caption, fix: null });
});

it('puts the line first when a hook comes before it', () => {
  expect(
    putOfferLineFirst(`Long flight? 🌸 ${LINE} Feel light again.`, LINE, offer, true),
  ).toEqual({ caption: `${LINE} 🌸 Long flight? Feel light again.`, fix: 'put first' });
});

it('replaces the line in other words, and one with a flower before it', () => {
  const other = '10% off the 90-minute thai massage until Sunday 1 November! Feel light.';
  expect(putOfferLineFirst(other, LINE, offer, false)).toEqual({
    caption: `${LINE} Feel light.`,
    fix: 'put first',
  });
  expect(putOfferLineFirst(`🌸 ${LINE} Feel light.`, LINE, offer, true).caption).toBe(
    `${LINE} 🌸 Feel light.`,
  );
});

it('adds the line to a caption without the offer', () => {
  expect(putOfferLineFirst('Long flight? 🌸 Feel light.', LINE, offer, true)).toEqual({
    caption: `${LINE} 🌸 Long flight? 🌸 Feel light.`,
    fix: 'added',
  });
});

it('leaves the line alone when the caption was only the offer', () => {
  expect(putOfferLineFirst('10% off, until 1 Nov!', LINE, offer, false)).toEqual({
    caption: LINE,
    fix: 'put first',
  });
});

it("keeps a story text that is the line and a flower, any of the five", () => {
  expect(offerStory(LINE, `${LINE} 🌸 Feel light.`, `${LINE} 🌺`, true)).toEqual({
    storyText: `${LINE} 🌺`,
    fix: null,
  });
  expect(offerStory(LINE, `${LINE} Feel light.`, LINE, false)).toEqual({ storyText: LINE, fix: null });
});

it("sets the story text from the caption's flower, else 🌸", () => {
  expect(offerStory(LINE, `${LINE} 🌼 Feel light.`, 'Long flight? 🌸', true)).toEqual({
    storyText: `${LINE} 🌼`,
    fix: 'set',
  });
  expect(offerStory(LINE, `${LINE} Feel light.`, undefined, true)).toEqual({
    storyText: `${LINE} 🌸`,
    fix: 'set',
  });
  expect(offerStory(LINE, LINE, 'Long flight?', false)).toEqual({ storyText: LINE, fix: 'set' });
});

it('gives no story text rather than one over 120', () => {
  const long = `Free Foot Reflexology with a 90-minute ${'Very '.repeat(12)}Long Massage, until Sunday 1 November.`;
  expect(offerStory(long, long, undefined, true)).toEqual({ fix: 'too long' });
});
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-offer-line.test.ts`
Expected: FAIL, `Failed to load url @/lib/posts/offer-line` (or "does not provide an export"). Copy the summary line to the journal's RED.

- [ ] **Step 3: Export `sentences` from `lib/posts/story.ts`, and write `lib/posts/offer-line.ts`**

`putOfferLineFirst`: trim; if it `startsWith(line)` return it with `fix: null`. Else split with `sentences`, drop those for which `statesOffer` is true, `join('')` and trim what's left as the rest; the head is `line`, plus ` 🌸` for a spa; the caption is the head, a space and the rest, or the head alone when nothing is left; `fix` is `'put first'` when a sentence was dropped, else `'added'`.

`offerStory`: kept (`fix: null`) when `story` is `line` (not a spa), or `line` followed by optional spaces and exactly one of `FLOWERS` (a spa). Else the flower is the first emoji after the line in the caption when the caption starts with the line and that emoji, after spaces, is one of `FLOWERS`; else `🌸`. The new text is `line`, plus a space and the flower for a spa; over `POSTS_LIMITS.storyChars` by `.length`, return `{ fix: 'too long' }`.

Head the module with a comment citing `docs/specs/posts/offer-line-first`, as `story.ts` does.

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm exec vitest run tests/unit/posts-offer-line.test.ts tests/unit/posts-story.test.ts`
Expected: PASS. Copy the summary line to the journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/offer-line.ts lib/posts/story.ts tests/unit/posts-offer-line.test.ts docs/specs/posts/offer-line-first/journal.md
git commit -m "feat(posts): code writes the offer line and puts it first"
```

### Task 2: Code's checks fix the posts that carry the offer

**Files:**
- Modify: `lib/posts/checks.ts` (`checkedWords`, `checkPost`, `checkRewrite`)
- Test: `tests/unit/posts-checks.test.ts` (in `describe('the special offer')`)

**Interfaces:**
- Consumes: Task 1's `offerLine`, `offerTreatment`, `putOfferLineFirst`, `offerStory`.
- Produces: `checkedWords(raw, profile, id, context?, setupTreatment?: string)`; `checkPost` passes `setup?.treatment`, `checkRewrite` passes `post.setup?.treatment`. Signatures of `checkPost` and `checkRewrite` don't change.

- [ ] **Step 1: Write the failing tests**

In the file's `describe('the special offer')` (its `offer` is 10% on `['Thai Massage']` until `Tuesday 27 October`; `profile()` is a spa), with `const LINE = '10% off our 90-minute Thai Massage, until Tuesday 27 October.'` and `const thaiSetup: Setup = { treatment: 'Thai Massage', look: 'plain', guests: 'man', therapists: 1, bodyPart: 'back', scene: 'treatment', locals: 'Balinese' }` (the shape `describe('the image set-ups')` uses):

```ts
it('checkPost puts the offer line before a hook, and sets the story text', () => {
  const { post: checked, dropped } = checkPost(
    raw({ type: 'offer', caption: `Long flight? 🌸 ${LINE} Feel light again.`, storyText: 'Long flight? 🌸' }),
    profile(), 'post-1', { offer, carries: true }, thaiSetup,
  );
  expect(checked?.caption).toBe(`${LINE} 🌸 Long flight? Feel light again.`);
  expect(checked?.storyText).toBe(`${LINE} 🌸`);
  expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: offer line put first' });
  expect(dropped).toContainEqual({ field: 'offer', reason: 'post-1: story text set to the offer line' });
});

it('checkPost adds a missing offer line, and the last day is no longer flagged', () => {
  const { post: checked, dropped } = checkPost(
    raw({ type: 'offer' }), profile(), 'post-2', { offer, carries: true }, thaiSetup,
  );
  expect(checked?.caption.startsWith(LINE)).toBe(true);
  expect(offerFlags(checked?.unchecked ?? [])).toEqual([]);
  expect(dropped).toContainEqual({ field: 'offer', reason: 'post-2: offer line added' });
});

it('checkPost keeps a post that is already right, with no offer record', () => {
  const caption = `${LINE} 🌺 Long flight? Warm oil and slow hands.`;
  const { post: checked, dropped } = checkPost(
    raw({ type: 'offer', caption, storyText: `${LINE} 🌺` }),
    profile(), 'post-1', { offer, carries: true }, thaiSetup,
  );
  expect(checked?.caption).toBe(caption);
  expect(checked?.storyText).toBe(`${LINE} 🌺`);
  expect(dropped.filter((d) => d.field === 'offer')).toEqual([]);
});

it('a post that does not carry the offer is left as written', () => {
  const { post: checked, dropped } = checkPost(
    raw({ type: 'moment', caption: 'Long flight? 🌸 Warm oil and slow hands.' }),
    profile(), 'post-3', { offer, carries: false }, thaiSetup,
  );
  expect(checked?.caption).toBe('Long flight? 🌸 Warm oil and slow hands.');
  expect(dropped.filter((d) => d.field === 'offer')).toEqual([]);
});

it("uses the caption's treatment when the set-up's is not on offer, else records none", () => {
  const { post: named } = checkPost(
    raw({ type: 'offer', caption: 'Long flight? Our thai massage waits.' }),
    profile(), 'post-3', { offer, carries: true }, { ...thaiSetup, treatment: 'Hot Stone' },
  );
  expect(named?.caption.startsWith(LINE)).toBe(true);
  const { post: left, dropped } = checkPost(
    raw({ type: 'offer', caption: 'Long flight? Warm oil.' }),
    profile(), 'post-3', { offer, carries: true },
  );
  // Only the spa's flower fix touches it.
  expect(left?.caption).toBe('Long flight? Warm oil. 🌸');
  expect(dropped).toContainEqual({ field: 'offer', reason: 'post-3: no treatment for the offer line' });
});

it('checkRewrite puts the line back first on an old post without a set-up', () => {
  const original = post({ id: 'a', offer: true, caption: `${LINE} Warm oil.` });
  const answer = { posts: [{ id: 'a', caption: 'Long flight? Our thai massage, 10% off until 27 Oct.', hashtags: ['canggu'], altText: 'x', storyText: 'Long flight?' }] };
  const { posts, dropped } = checkRewrite(answer, [original], profile(), offer);
  expect(posts[0].caption.startsWith(LINE)).toBe(true);
  expect(posts[0].storyText).toBe(`${LINE} 🌸`);
  expect(dropped).toContainEqual({ field: 'offer', reason: 'a: offer line put first' });
});
```

The existing tests "checkPost marks a carrying post…" and "checkRewrite keeps the badge…" stay unchanged and must still pass (no treatment found, so their captions and `15%` flags are untouched).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-checks.test.ts`
Expected: the six new tests FAIL (caption unchanged, no `offer` records). Copy the summary line to RED.

- [ ] **Step 3: Wire Task 1 into `checkedWords`**

On a carrying post (`context?.carries`), before `cutCaption`: find the treatment with `offerTreatment(context.offer, setupTreatment, raw.caption)`; none → record `no treatment for the offer line` and go on as today; else `putOfferLineFirst(raw.caption, offerLine(…), context.offer, spa)` and record `put first` or `added`. After `cleanStory`, `offerStory(line, caption, story.storyText, spa)` on the final caption (after `spaCaption`), recording `set` as `story text set to the offer line` and `too long` as `offer line too long for the story text`. Flags run on the fixed caption and story text, as today.

- [ ] **Step 4: Run the tests to see them pass**

Run: `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/posts-run.test.ts tests/unit/posts-edit.test.ts`
Expected: PASS. Copy the summary line to GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/checks.ts tests/unit/posts-checks.test.ts docs/specs/posts/offer-line-first/journal.md
git commit -m "feat(posts): the posts that carry the offer open on its line"
```

### Task 3: `offer_fixes=` in the log

**Files:**
- Modify: `lib/posts/log.ts` (`PostsLog.offerFixes`, `formatPostsLog`), `lib/posts/run.ts` (the entry)
- Test: `tests/unit/posts-log.test.ts`, `tests/unit/posts-run.test.ts`

**Interfaces:**
- Produces: `PostsLog['offerFixes']: number`; the line holds `emoji_fixes=<n> offer_fixes=<n> model_ms=`.

- [ ] **Step 1: Write the failing tests**

In `posts-log.test.ts`, add `offerFixes: 0` to each entry, and the first test's expected line becomes `… emoji_fixes=0 offer_fixes=0 model_ms=9000 …`; the count test sets `offerFixes: 3` and expects `' emoji_fixes=7 offer_fixes=3 model_ms=10 '`.

In `posts-run.test.ts`, `describe('the special offer')`:

```ts
test('counts offer_fixes, but not a post without a treatment', async () => {
  const entries: PostsLog[] = [];
  const model = replayTextModel(brand, { posts: threeOffers() });
  await drain(streamPlan({ ...body(), offer }, deps(model, { log: (e) => entries.push(e) }), new AbortController().signal));
  // Posts 1 and 2 lack the offer line and a story text: 2 added, 2 stories set.
  expect(entries[0].offerFixes).toBe(4);
});
```

Check the expected count against the replay before trusting it: `threeOffers()`'s posts 1 and 2 have `Caption n. …` and no `storyText`, and their set-ups hold `Balinese massage` (the offer's only treatment).

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-log.test.ts tests/unit/posts-run.test.ts`
Expected: FAIL on `offer_fixes` and `offerFixes`. Copy to RED.

- [ ] **Step 3: Add `offerFixes`**

In `run.ts`, start it at 0 and set it from `result.dropped`: field `offer`, reason not ending in `no treatment for the offer line`. In `log.ts`, comment it as 2.13's counts are commented, citing `docs/specs/posts/offer-line-first`.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm exec vitest run tests/unit/posts-log.test.ts tests/unit/posts-run.test.ts`
Expected: PASS. Copy to GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/log.ts lib/posts/run.ts tests/unit/posts-log.test.ts tests/unit/posts-run.test.ts docs/specs/posts/offer-line-first/journal.md
git commit -m "feat(posts): count the offer line fixes in the log"
```

### Task 4: The prompt states one order (`posts-9`)

**Files:**
- Modify: `lib/posts/prompt.ts` (`POSTS_PROMPT_VERSION`, `captionRules`, `offerRules`, `REWRITE_OFFER_RULES` → `rewriteOfferRules(spa)`, `offerText`, `planUserText`, `rewriteUserText`)
- Test: `tests/unit/posts-prompt.test.ts`

**Interfaces:**
- Consumes: Task 1's `offerLine`, `offerTreatment`.
- Produces: `planPrompt`, `planUserText`, `rewritePrompt`, `rewriteUserText` with unchanged signatures; `captionRules(spa: boolean, withOffer = false)`.

- [ ] **Step 0: Save the `posts-8` prompts without an offer**

Before touching `prompt.ts`, write `planPrompt(false, s)` and `rewritePrompt(false, s)` for `s` in `[false, true]` to `.superpowers/posts-8-no-offer.txt` (a `pnpm exec tsx -e` one-off).

- [ ] **Step 1: Write the failing tests**

Replace the old offer-rule strings in `describe('the special offer')` and `describe('the story text and the captions that sell')` with:

```ts
it('says the order once, by the hook: the offer line comes first', () => {
  const prompt = planPrompt(true, true);
  expect(prompt).toContain(
    'on a post that carries the special offer, the hook is its offer line, word for word, with nothing before it, and a question or a promise may follow it',
  );
  expect(prompt).toContain(`Each offer post's caption starts with its offer line, given under "### Special offer", word for word.`);
  expect(prompt).toContain("Each offer post's story text is its offer line, word for word, followed by one flower.");
  expect(planPrompt(true, false)).toContain("Each offer post's story text is its offer line, word for word.");
  expect(prompt).not.toContain('<percentage>');
  expect(prompt).not.toContain("first line states the offer");
});

it('gives the plan its two offer lines, from set-ups 1 and 2', () => {
  const setups = dealSetups(svargaProfile(), offer, seededRandom('t'));
  const text = planUserText(postsModelInput(svargaProfile()), [], offer, setups);
  expect(text.endsWith(
    "- Until: Tuesday 27 October\n- Post 1's offer line: 10% off our 90-minute Balinese massage, until Tuesday 27 October.\n- Post 2's offer line: 10% off our 90-minute Balinese massage, until Tuesday 27 October.",
  )).toBe(true);
});

it("gives a rewrite each carrying post's line, by id", () => {
  const text = rewriteUserText(
    postsModelInput(svargaProfile()),
    [post({ id: 'post-1', offer: true, caption: 'Our Balinese massage.' }), post({ id: 'post-3' })],
    offer,
  );
  expect(text).toContain("- post-1's offer line: 10% off our 90-minute Balinese massage, until Tuesday 27 October.");
  expect(text).not.toContain("post-3's offer line");
  expect(rewritePrompt(true, true)).toContain(
    'A post marked offer: true keeps the offer: its caption starts with its offer line, given under "### Special offer", word for word, and its story text is that line, followed by one flower; the other posts never mention it.',
  );
});

it('is posts-9', () => {
  expect(POSTS_PROMPT_VERSION).toBe('posts-9');
});
```

Keep the existing checks that still hold ("Exactly 2 offer posts carry the special offer", "never a price", "Posts 1 and 2 are the two offer posts.", "The other four posts never mention…"); drop the ones on the removed template.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts`
Expected: FAIL on the new strings and `posts-9`. Copy to RED.

- [ ] **Step 3: Change the prompt**

- `captionRules(spa, withOffer)`: after `since it is all Instagram shows before "more"`, only with an offer, insert `; on a post that carries the special offer, the hook is its offer line, word for word, with nothing before it, and a question or a promise may follow it`.
- `offerRules(spa)`: drop "Each states the offer as given: … exactly as given." and the "in these words: …" template; say `Each offer post's caption starts with its offer line, given under "### Special offer", word for word.` and `Each offer post's story text is its offer line, word for word${spa ? ', followed by one flower' : ''}.`; keep "Never a bigger discount, never other terms, never a price, never "today only" or "this week"."
- `rewriteOfferRules(spa)` replaces `REWRITE_OFFER_RULES` with the sentence the test pins.
- `offerText(offer, lines: [string, string][])` ends with one `- <name>'s offer line: <line>` per pair. `planUserText` names `Post 1`, `Post 2` from `setups[0..1]` (a set-up whose treatment isn't on offer gives no line); `rewriteUserText` names each post with `offer: true` by its id, its treatment from `offerTreatment(offer, post.setup?.treatment, post.caption)`.
- `POSTS_PROMPT_VERSION = 'posts-9'`; the header comment cites `docs/specs/posts/offer-line-first`.

- [ ] **Step 4: Run them to see them pass, and diff the no-offer prompts**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`
Expected: PASS. Then print the same four prompts again and `diff` against `.superpowers/posts-8-no-offer.txt`: no difference. Copy the summary line and "no-offer prompts unchanged" to the journal.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/prompt.ts tests/unit/posts-prompt.test.ts docs/specs/posts/offer-line-first/journal.md
git commit -m "feat(posts): the prompt puts the offer line first (posts-9)"
```

### Task 5: Record Sen's and Svarga's offer plans with `posts-9`

**Files:**
- Modify: `tests/unit/posts-fixtures-replay.test.ts` (the offer assertion, the comment)
- Modify: `tests/fixtures/sites/svarga/posts-offer.json`, `tests/fixtures/sites/sen/posts-offer.json`
- Modify: `docs/specs/posts/offer-line-first/journal.md`

**Interfaces:**
- Consumes: Task 1's `offerLine`, `offerTreatment`; `fixtureOffer` (`lib/brand/fixtures.ts`).

- [ ] **Step 1: Tighten the replay test**

Replace the "first sentence" check with: for each `post.offer`, `const line = offerLine(offer, offerTreatment(offer, post.setup?.treatment, post.caption) ?? '')`, then `expect(post.caption.startsWith(line)).toBe(true)` and `expect(post.storyText).toMatch(new RegExp(`^${escaped(line)} (🌸|🌺|🌼|🌷|🪷)$`, 'u'))`. Update the describe's comment: all four plans on `posts-9`, Sen's and Svarga's `posts.json` on `posts-8` (their prompt is unchanged).

Run: `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts`
Expected: PASS on the old recordings too (code now fixes them): note it in the journal.

- [ ] **Step 2: Ask the maintainer, then record Svarga**

Ask: 3 Flash-Lite requests today, not a pilot day? On yes:

Run: `pnpm eval:posts svarga --offer --record`
Then: `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts`
Expected: PASS on the first recording. Write in the journal the `dropped offer:` lines the eval printed (the aim is none).

- [ ] **Step 3: Record Svarga once more, to see two in a row**

Run `pnpm eval:posts svarga --offer` (no `--record`) and note its `dropped offer:` lines and whether its offer captions open on the line before code's fix.

- [ ] **Step 4: Record Sen**

Run: `pnpm eval:posts sen --offer --record`, then the replay test. Expected: PASS. Journal its `offer` fixes.

- [ ] **Step 5: Commit**

```bash
git add tests/unit/posts-fixtures-replay.test.ts tests/fixtures/sites/svarga/posts-offer.json tests/fixtures/sites/sen/posts-offer.json docs/specs/posts/offer-line-first/journal.md
git commit -m "test(posts): re-record Sen's and Svarga's offer plans with posts-9"
```

### Task 6: Ship

**Files:**
- Modify: `docs/roadmap.md` (2.13b → `done`)

- [ ] **Step 1:** Run `pnpm check`. Expected: every step green. Copy the Vitest summary to GREEN.
- [ ] **Step 2:** Set 2.13b to `done`, commit `docs(posts): offer line first, roadmap 2.13b done`.
- [ ] **Step 3:** `git push -u origin claude/offer-line-first`; give the maintainer a paste-ready PR title and body for github.com, base `develop`, noting that it is stacked on the 2.14 branch until that PR merges.
