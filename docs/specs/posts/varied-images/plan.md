# Varied images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md, "Plans"). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Code deals six image set-ups (treatment, guests, therapists, body part, scene) before the post plan, the model writes each image prompt inside its set-up, and the image model reads a code-written cast line plus a style line that makes every therapist a local woman with healthy, tanned skin and perfect hands.

**Architecture:** One new pure module, `lib/posts/setup.ts`, holds the looks table, the word filter, the therapists' origin, a seeded random and the deal; it also writes the set-up's line for the post plan and its cast line for the image model. `streamPlan` deals the set-ups and hands set-up *n* to the *n*-th streamed post; the post keeps it, and the image request sends it back. `countryOf` moves to `lib/brand/country.ts` so the server can use it without the browser's search client.

**Tech Stack:** Next.js route handlers, TypeScript, zod, Vitest, pnpm.

**Spec:** `docs/specs/posts/varied-images/spec.md`

## Global Constraints

- `POSTS_PROMPT_VERSION = 'posts-4'`; `IMAGE_PROMPT_VERSION = 'images-5'`.
- Six set-ups, one per post, dealt **before** the model call; set-up *n* belongs to the *n*-th post as streamed, before checks drop any.
- Guests: couples not counted; the rest half men, half women; odd → the extra one is a man; a pregnancy set-up is always a woman and counts as one.
- Two therapists only for the four-hands and couple looks.
- No scene more than twice (`POSTS_LIMITS.perScene`); code writes each post's `scene` from its set-up.
- With an offer: its treatments go to set-ups 1 and 2; posts 1 and 2 are the offer posts.
- Style line's therapist sentence, verbatim: "Every therapist is a young local woman with warm, golden-tan skin, as women from here have: smooth, healthy and glowing, yet real, with natural texture; never pale or white, never dark. Her hands and arms are perfectly formed and look healthy: five slender fingers on each hand, clean short nails, natural joints and wrists, no extra or missing fingers, hands or arms."
- Nothing of the profile reaches Google's image model but the look's words and `locals`.
- No new visible strings (no `messages/*.json` change).
- Commits: Conventional Commits, scope `posts` (or `brand` for Task 1's move); stage by path; author `SiegfriedBz <siegfried.bozza@protonmail.com>`; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `pnpm eval:posts` and `pnpm eval:images` spend quota or money: ask the person before each run.

## Review Focus

1. **The model writes fewer or more than six posts.** Post 7 gets no set-up and is cut by `checkPlan` as today; a plan of five posts uses set-ups 1–5. Test in Task 4.
2. **A post dropped by the checks** (unknown type, empty caption) takes its set-up with it; the next post keeps its own index's set-up, not the dropped one's. Test in Task 4.
3. **"woman" contains "man".** The guest check must use whole words: an image prompt with only "a woman" fails a `man` set-up. Test in Task 4.
4. **An offer on a treatment the word list excludes, or a profile with one or zero eligible offerings.** The offer's treatment is still dealt (plain look); one eligible offering fills all six; zero gives six plain set-ups with no `treatment`. Tests in Task 2.
5. **A post saved before this change** (no `setup`) goes through "Update captions" and "New image": the rewrite keeps it without a set-up, the image request is valid without `setup`, and the prompt has no cast line. Tests in Task 5.

---

### Task 1: Looks, filter and therapists' origin

**Files:**
- Create: `lib/brand/country.ts`, `lib/posts/setup.ts`
- Modify: `lib/brand/search-client.ts` (import `countryOf` from `./country`, keep re-exporting it), `lib/reviews/client.ts:2` (import from `@/lib/brand/country`)
- Test: `tests/unit/posts-setup.test.ts`

**Interfaces:**
- Produces, in `lib/brand/country.ts`: `countryOf(profile: Profile): 'VN' | 'ID' | null` (moved as is).
- Produces, in `lib/posts/setup.ts`:
  - `type LookKey = 'fourHands' | 'couple' | 'thai' | 'foot' | 'stone' | 'head' | 'scrub' | 'pregnancy' | 'plain'`
  - `lookOf(name: string): LookKey | 'excluded'`
  - `type Locals = 'Vietnamese' | 'Balinese' | 'Indonesian' | 'Southeast Asian'`; `localsOf(profile: Profile): Locals`
  - `seededRandom(seed: string): () => number`
  - `BALI_PLACES: readonly string[]` (the spec's fifteen names)

- [ ] **Step 1: Write the failing tests**

```ts
describe('lookOf', () => {
  it.each([
    ['Four-Hands Massage', 'fourHands'], ['4 Hands Massage', 'fourHands'],
    ['Couple Massage', 'couple'], ['Thai Massage', 'thai'], ['Foot Reflexology', 'foot'],
    ['Hot Stone Therapy', 'stone'], ['Head & Scalp Massage', 'head'], ['Balinese Facial', 'head'],
    ['Coffee Body Scrub', 'scrub'], ['Baby on Board Pregnancy Massage', 'pregnancy'],
    ['Aroma Massage', 'plain'], ['Signature Massage', 'plain'], ['Mát-xa Thái', 'thai'],
  ])('%s → %s', (name, look) => expect(lookOf(name)).toBe(look));
  it.each(['Gift Voucher', 'Anak Anak Kids Massage', 'Manicure', 'Ear Candling', 'Reiki',
    'Singing Bowl Healing', 'Yoga Class', 'Airport Transfer'])('%s is excluded', (name) =>
    expect(lookOf(name)).toBe('excluded'));
  it('ignores case and accents', () => expect(lookOf('THAÏ massage')).toBe('thai'));
});

describe('localsOf', () => {
  it('Sen is Vietnamese', () => expect(localsOf(senProfile())).toBe('Vietnamese'));
  it('Svarga is Balinese', () => expect(localsOf(svargaProfile())).toBe('Balinese'));
  it('a Bali town without "Bali" is Balinese', () => { /* svarga, area null, town Pererenan, host example.com */ });
  it('"bali" only in the host is Balinese', () => { /* town Canggu removed, host svargabalimassage.com */ });
  it('elsewhere in Indonesia is Indonesian', () => { /* +62, town Yogyakarta, host example.com */ });
  it('no country is Southeast Asian', () => { /* no phone, host example.com */ });
});

it('seededRandom repeats for one seed and differs between seeds', () => {
  const a = seededRandom('sen'), b = seededRandom('sen'), c = seededRandom('svarga');
  const xs = [a(), a(), a()];
  expect([b(), b(), b()]).toEqual(xs);
  expect(c()).not.toBe(xs[0]);
  for (const x of xs) expect(x >= 0 && x < 1).toBe(true);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run tests/unit/posts-setup.test.ts`
Expected: FAIL, `lib/posts/setup.ts` not found.

- [ ] **Step 3: Implement**

- Move `countryOf` to `lib/brand/country.ts`; `search-client.ts` imports it and re-exports it (`export { countryOf } from './country'`).
- `lookOf`: normalise with `name.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()`, then match whole words in this order: excluded words (spec's two "never drawn" rows; `card` and `night` as whole words) → pregnancy words → four-hands (`four hands`, `four-hand`, `4 hands`, `4-hand`) → couple → thai/stretch → foot/reflexology → stone → head/scalp/face/facial → scrub/body wrap → `plain`. "baby" is not an excluded word, so "Baby on Board Pregnancy Massage" is a pregnancy.
- `localsOf`: `countryOf` → `VN` Vietnamese; `ID` and (town, area or service area holds a `BALI_PLACES` name as a whole word, or the site's host holds `bali`) → Balinese; `ID` → Indonesian; else Southeast Asian.
- `seededRandom`: mulberry32 seeded with `parseInt(hashText(seed), 16)` (`hashText` from `./input`).

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run tests/unit/posts-setup.test.ts tests/unit/brand-search-client.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/country.ts lib/brand/search-client.ts lib/reviews/client.ts lib/posts/setup.ts tests/unit/posts-setup.test.ts
git commit -m "feat(posts): treatment looks and the therapists' origin (varied images)"
```

### Task 2: The deal

**Files:**
- Modify: `lib/posts/setup.ts`
- Test: `tests/unit/posts-setup.test.ts`

**Interfaces:**
- Consumes: Task 1's `lookOf`, `localsOf`, `LookKey`, `Locals`.
- Produces:
  - `BODY_PARTS = ['back', 'shoulders and neck', 'legs', 'feet', 'arms and hands', 'head', 'whole body'] as const`
  - `setupSchema` (zod) and `type Setup = { treatment?: string; look: LookKey; guests: 'man' | 'woman' | 'couple'; therapists: 1 | 2; bodyPart: BodyPart; scene: Scene; locals: Locals }`. `locals` lives in the set-up (the spec's separate request field folded in: one object travels from plan to image).
  - `dealSetups(profile: Profile, offer: Offer | undefined, random: () => number): Setup[]` — always six.

- [ ] **Step 1: Write the failing tests** (all with `seededRandom('t')`)

```ts
it('six different treatments when there are six or more', ...)        // a profile with 8 plain offerings
it('each offering once before any twice when fewer', ...)              // senProfile(): 2 offerings → each 3 times
it('the excluded offerings are never drawn', ...)                      // "Kids Massage", "Gift Voucher" + 2 massages
it('no eligible offering: six plain set-ups without a treatment', ...) // only "Gift Voucher"
it('half men, half women without a couple', ...)                       // count guests: 3 man, 3 woman
it('a couple: two therapists, and 3 men, 2 women among the others', ...)
it('a pregnancy is always a woman and counts as one', ...)
it('two therapists only for four hands and couple', ...)
it('feet for reflexology, whole body for thai, back for stone, head for a facial', ...)
it('the plain look never repeats a body part when it can be avoided', ...) // 6 plain: 4 parts → no part 3 times
it('no scene more than twice', ...)                                     // over 50 seeds
it('offer treatments go to set-ups 1 and 2', ...)                       // offer on ['Thai Massage'] → both Thai
it('an offer with two treatments shows both, once each, first', ...)
it('an offer on an excluded treatment is still dealt, plain look', ...)
it('the same seed deals the same six', ...)
it('every set-up carries the profile locals', ...)
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run tests/unit/posts-setup.test.ts`
Expected: FAIL, `dealSetups` is not exported.

- [ ] **Step 3: Implement `dealSetups` in `lib/posts/setup.ts`**

Order of the deal (one `random`, used in this order so a seed fixes everything):
1. Treatments: the offer's treatments shuffled, the first two (or the one twice) → set-ups 1, 2. Then fill to six from the eligible offerings (`lookOf !== 'excluded'`) not yet used, in shuffled passes, so each is used once before twice. No eligible offering → `plain`, no `treatment`.
2. Looks from `lookOf` (an offer treatment that is `excluded` → `plain`); therapists 2 for `fourHands`/`couple`.
3. Body parts: fixed for `foot` (feet), `thai` (whole body), `stone` (back), `head` (head), `pregnancy` (back), `scrub` (back or arms and hands); the rest from `['back', 'shoulders and neck', 'legs', 'arms and hands']`, least-used first, ties broken at random.
4. Guests: couple → `couple`; pregnancy → `woman`; the other *n* slots get `ceil(n/2)` men and `floor(n/2)` women minus the pregnancies already counted (never below zero), shuffled.
5. Scenes: shuffle `[...SCENES, ...SCENES]`, take six.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run tests/unit/posts-setup.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/setup.ts tests/unit/posts-setup.test.ts
git commit -m "feat(posts): deal six image set-ups (varied images)"
```

### Task 3: The words: set-up lines, the plan prompt, the cast line

**Files:**
- Modify: `lib/posts/setup.ts`, `lib/posts/prompt.ts`
- Test: `tests/unit/posts-setup.test.ts`, `tests/unit/posts-prompt.test.ts`

**Interfaces:**
- Consumes: Task 2's `Setup`.
- Produces:
  - `setupLine(setup: Setup): string` — e.g. `Four-Hands Massage: one guest, a man, on a massage bed; two therapists working in step, one on each side; the back; scene guest, from above.` (no treatment → starts with `A massage:`)
  - `castLine(setup: Setup): string`
  - `planUserText(input, recent, offer: Offer | undefined, setups: Setup[]): string` (new 4th parameter)
  - `POSTS_PROMPT_VERSION = 'posts-4'`

- [ ] **Step 1: Write the failing tests**

```ts
it('setupLine for four hands', () => expect(setupLine({ treatment: 'Four-Hands Massage', look: 'fourHands',
  guests: 'man', therapists: 2, bodyPart: 'back', scene: 'guest', locals: 'Balinese' })).toBe(
  'Four-Hands Massage: one guest, a man, on a massage bed; two therapists working in step, one on each side; the back; scene guest, from above.'));
it('castLine, one guest and one therapist', () => expect(castLine(/* woman, 1, Vietnamese */)).toBe(
  'One guest, a woman. One therapist, a young Vietnamese woman.'));
it('castLine, two therapists', () => expect(castLine(/* man, fourHands, Balinese */)).toBe(
  'One guest, a man. Two therapists, both young Balinese women.'));
it('castLine, a couple', () => expect(castLine(/* couple, Balinese */)).toBe(
  'Two guests, a man and a woman, on two beds side by side. Two therapists, both young Balinese women.'));
// posts-prompt.test.ts
it('the user text lists the set-ups in order under "### Image set-ups"', ...) // "1. …" to "6. …"
it('planPrompt says post n uses set-up n, names man/woman and "two therapists"', ...)
it('the offer rules say posts 1 and 2 are the offer posts', ...)
it('the version is posts-4', ...)
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run tests/unit/posts-setup.test.ts tests/unit/posts-prompt.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- Look phrases (one per `LookKey`) and scene cameras from the spec: `treatment` "from the side", `detail` "a close view of the hands on the body", `place` "the room with the treatment in it", `guest` "from above".
- `planPrompt`: replace the closing "The scene, and every scene…" paragraph with the spec's "What the model gets" rules: post *n* uses set-up *n* and never changes it, never adds a guest or a therapist; the scene is the set-up's; names "a man" / "a woman" / "two therapists"; the `detail` scene shows the guest's body; an `offer` post leads on its set-up's treatment. Keep every other image rule. `OFFER_RULES` gains "Posts 1 and 2 are the two offer posts."
- `planUserText` appends `\n\n### Image set-ups\n` + one `${n}. ${setupLine(s)}` per set-up.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run tests/unit/posts-setup.test.ts tests/unit/posts-prompt.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/setup.ts lib/posts/prompt.ts tests/unit/posts-setup.test.ts tests/unit/posts-prompt.test.ts
git commit -m "feat(posts): set-ups in the post plan prompt, posts-4 (varied images)"
```

### Task 4: The plan run keeps set-ups, and code's checks

**Files:**
- Modify: `lib/posts/batch.ts` (`postSchema.setup: setupSchema.optional()`), `lib/posts/run.ts`, `lib/posts/checks.ts`
- Test: `tests/unit/posts-run.test.ts`, `tests/unit/posts-checks.test.ts`, `tests/unit/posts-fixtures-replay.test.ts`

**Interfaces:**
- Consumes: Task 2's `dealSetups`, `Setup`; Task 3's `planUserText(…, setups)`.
- Produces:
  - `PostsDeps.random?: () => number` (default `Math.random`)
  - `checkPost(raw, profile, id, context?, setup?: Setup)` — with a set-up, `scene` comes from it (the model's `scene` is neither read nor a reason to drop), and the post carries `setup`.
  - `setupFlags(post: Post): Dropped[]` — `{ field: 'image', reason: '<id>: no "man" in the image prompt' }`, likewise `"woman"`, `"two therapists"`; whole words, case ignored.
  - `checkPlan(posts, dropped, profile, offer?: Offer)` — with an offer, `{ field: 'mix', reason: 'offer posts are not posts 1 and 2' }` when `posts[0]` or `posts[1]` isn't type `offer`.

- [ ] **Step 1: Write the failing tests**

```ts
// posts-run.test.ts (fake model streaming planRecording())
it('deals set-ups and gives set-up n to the n-th streamed post', ...)   // random: seededRandom('t'); compare to dealSetups(profile, undefined, seededRandom('t'))
it("the post's scene is its set-up's, whatever the model wrote", ...)
it('a dropped post takes its set-up with it', ...)                      // raw post 2 has type "banana" → kept post 2 carries set-up 3
it('a seventh post gets no set-up and is cut', ...)
it('the model user text holds the set-ups', ...)                        // capture the input given to streamPostPlan
// posts-checks.test.ts
it('flags a prompt with only "a woman" for a man set-up', ...)
it('flags a four-hands prompt without "two therapists"', ...)
it('a couple needs both man and woman', ...)
it('no flag when the prompt matches', ...)
it('flags an offer plan whose posts 1 and 2 are not offer posts', ...)
it('no offer, no position flag', ...)
```

In `posts-fixtures-replay.test.ts`, pass `{ model, random: seededRandom(slug) }` to every `streamPlan` call.

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run tests/unit/posts-run.test.ts tests/unit/posts-checks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `streamPlan`: `const setups = dealSetups(body.profile, body.offer, deps.random ?? Math.random)` once; `planUserText(input, body.recent, body.offer, setups)`; `checkPlan(streamed, dropped, body.profile, body.offer)`.
- `run` gains an optional `setups?: Setup[]`; `emit` passes `setups?.[seen]` to `checkPost` and pushes `setupFlags(post)` into `dropped` for a kept post with a set-up. `streamRewrite` passes none: its posts keep theirs through `{ ...post, ... }`.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run tests/unit/posts-run.test.ts tests/unit/posts-checks.test.ts tests/unit/posts-fixtures-replay.test.ts tests/unit/posts-batch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/batch.ts lib/posts/run.ts lib/posts/checks.ts tests/unit/posts-run.test.ts tests/unit/posts-checks.test.ts tests/unit/posts-fixtures-replay.test.ts
git commit -m "feat(posts): posts keep their image set-up, checked by code (varied images)"
```

### Task 5: The image model reads the set-up

**Files:**
- Modify: `lib/posts/image.ts` (`imageBodySchema.setup: setupSchema.optional()`), `lib/posts/image-prompt.ts`, `lib/posts/image-run.ts`, `lib/posts/image-client.ts:116-123`, `lib/posts/image-log.ts` (`cast: boolean`)
- Test: `tests/unit/posts-image.test.ts`, `tests/unit/posts-image-client.test.ts`, `tests/unit/posts-image-run.test.ts`

**Interfaces:**
- Consumes: Task 3's `castLine`, Task 2's `setupSchema`.
- Produces: `imagePrompt(postPrompt: string, hint?: string, setup?: Setup): string`; `imageStyle(who: string): string` with `IMAGE_STYLE = imageStyle('local')` kept as an export; `IMAGE_PROMPT_VERSION = 'images-5'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('cast line first, then the prompt, the hint, the style', () =>
  expect(imagePrompt('Oil on a back at dusk.', 'more green', fourHandsMan)).toBe(
    `One guest, a man. Two therapists, both young Balinese women. Oil on a back at dusk. The owner asks: more green. ${IMAGE_STYLE}`));
it('without a set-up: no cast line, therapists read as Southeast Asian', () =>
  expect(imagePrompt('A room at dusk.')).toBe(`A room at dusk. ${imageStyle('Southeast Asian')}`));
it("the style line holds the spec's therapist sentence", ...)          // exact text from Global Constraints
it('the version is images-5', ...)
it('the body accepts a set-up and accepts none', ...)
it('the body refuses a set-up with three therapists', ...)
it("the client sends the post's set-up, and none for an old post", ...) // posts-image-client.test.ts
it('the log says whether a cast line was sent', ...)                   // posts-image-run.test.ts
it('a rewrite keeps an old post without a set-up', ...)                // posts-run.test.ts, streamRewrite
```

- [ ] **Step 2: Run them and see them fail**

Run: `pnpm vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-client.test.ts tests/unit/posts-image-run.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

- `imageStyle(who)`: today's `IMAGE_STYLE` sentences, then the therapist sentence with "a young {who} woman" (with `who = 'local'` it reads exactly as the spec). `imagePrompt` puts `castLine(setup)` first when there is a set-up, and ends with `imageStyle(setup ? 'local' : 'Southeast Asian')`.
- `makePostImage` passes `body.setup`; the log gets `cast: body.setup !== undefined`.
- `image-client.ts` adds `...(post.setup ? { setup: post.setup } : {})` to the body.

- [ ] **Step 4: Run them and see them pass**

Run: `pnpm vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-client.test.ts tests/unit/posts-image-run.test.ts tests/unit/posts-run.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/image.ts lib/posts/image-prompt.ts lib/posts/image-run.ts lib/posts/image-client.ts lib/posts/image-log.ts tests/unit/posts-image.test.ts tests/unit/posts-image-client.test.ts tests/unit/posts-image-run.test.ts tests/unit/posts-run.test.ts
git commit -m "feat(posts): cast line and local therapists in the image prompt, images-5 (varied images)"
```

### Task 6: Evals, re-recording and verdicts

**Files:**
- Modify: `scripts/eval-posts.ts`, `scripts/eval-images.ts`
- Create: `docs/specs/posts/varied-images/journal.md` (from `docs/templates/` journal)
- Re-recorded: `tests/fixtures/sites/{sen,svarga}/posts.json`, `posts-offer.json`

**Interfaces:**
- Consumes: `seededRandom`, `PostsDeps.random`, `Post.setup`.

- [ ] **Step 1: Seed both evals by slug**

`eval-posts.ts` and `eval-images.ts` pass `random: seededRandom(slug)` (offer runs: `seededRandom(\`${slug}:offer\`)`) to `streamPlan`, so a replay deals the same set-ups as the recording. `eval-posts` prints each post's `setupLine`; `eval-images` passes `setup: post.setup` to `makePostImage` and prints the cast line.

- [ ] **Step 2: Full check**

Run: `pnpm check`
Expected: every step passes; Vitest's summary line copied into the journal as GREEN.

- [ ] **Step 3: Ask, then re-record the plans**

Ask the person (4 Gemini requests from today's pool; never on a pilot day). Then:
`pnpm eval:posts sen svarga --record` and `pnpm eval:posts sen svarga --offer --record`.
Expected: each post's image prompt names its guests as dealt; the journal records the dropped `image` flags, if any.

- [ ] **Step 4: Ask, then make the twelve images**

Ask the person (about $0.60 of the prepaid balance). Then `pnpm eval:images sen svarga`. The person gives a verdict per image (set-up shown, skin, hands, "a tourist would book this"); verdicts go in the journal with `posts-4` and `images-5`. Pass: the spec's "Tests and evaluation" line.

- [ ] **Step 5: Roadmap and commit**

Set 2.12's status to `done` in `docs/roadmap.md` in the PR that ships it.

```bash
git add scripts/eval-posts.ts scripts/eval-images.ts tests/fixtures/sites/sen/posts.json tests/fixtures/sites/sen/posts-offer.json tests/fixtures/sites/svarga/posts.json tests/fixtures/sites/svarga/posts-offer.json docs/specs/posts/varied-images/journal.md docs/roadmap.md
git commit -m "test(posts): re-record Sen and Svarga with set-ups, image verdicts (varied images)"
```
