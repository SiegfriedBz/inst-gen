# Golden-hour images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md, "Plans"). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every image is lit at golden hour, in the room a tourist pictures for their stay, open onto the place's green plants, with the place's flower and, on a moment post only, one discreet sign of the guest's day; Sen's images become as bright and warm as Svarga's.

**Architecture:** Three prompt changes, no new module. `cleanLight` (`lib/posts/image-prompt.ts`) gets a new swap table that turns dark, dusk and midday words into golden hour; `imageStyle` takes the set-up's `locals` and writes golden-hour light, the new mood and the place's room, view and flower from a table in the same file; `planPrompt` (`lib/posts/prompt.ts`) changes its light and room rules and adds the moment sign. Then both pilot fixtures are re-recorded and their images judged.

**Tech Stack:** TypeScript, Vitest, pnpm.

**Spec:** `docs/specs/posts/golden-hour-images/spec.md`

## Global Constraints

- `IMAGE_PROMPT_VERSION = 'images-7'`; `POSTS_PROMPT_VERSION = 'posts-6'`.
- Order of `imagePrompt` unchanged: cast line, swapped post prompt, owner's hint, style line. The hint is never swapped.
- Swaps are whole words, keep the first letter's case, and never touch "sunlit", "sunlight", "sunshine", "bright" alone, "late afternoon" or "dark".
- The place table, verbatim from the spec:

  | `locals` | room | view | flower |
  |---|---|---|---|
  | `Balinese` | a Balinese villa room with carved and natural wood, rattan and a thatched alang-alang roof | a tropical garden of frangipani trees, banana leaves, coconut palms and ferns | frangipani flowers on the tray |
  | `Indonesian` | an Indonesian villa room with natural wood and rattan | a tropical garden of banana leaves, palms and ferns | frangipani flowers on the tray |
  | `Vietnamese` | a Vietnamese boutique hotel room or villa with warm wood, rattan and bamboo | a garden of areca palms, bamboo, banana leaves and coconut palms | a pink lotus floating in a bowl of water |
  | `Southeast Asian` | a tropical boutique hotel room or villa with warm wood and rattan | tropical greenery: palms, banana leaves and ferns | orchids in a small vase |

- No other sentence of the style line names a flower or a plant, so Sen's line never says frangipani and Svarga's never says lotus.
- No new visible strings (no `messages/*.json` change).
- Commits: Conventional Commits, scope `posts` (docs: `docs`); stage by path; author `SiegfriedBz <siegfried.bozza@protonmail.com>`; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `pnpm eval:posts` spends 4 Flash-Lite requests (approved with the spec); `pnpm eval:images` spends about $0.60: ask the person right before running it.

## Review Focus

1. **"New image" on a post saved with `posts-5`.** Its prompt says "Low, soft and warm lighting" or "Soft low lighting"; after the swap it holds no low, dim or dusk light. Test in Task 1 on the twelve recorded prompts.
2. **"Dark" in a hot-stone set-up and in the oil rule.** "smooth dark stones" and "never a small dark bottle" come out unchanged. Test in Task 1.
3. **Our own replacement fed to a later row.** "bright sunlight" becomes "low golden sun", which the "low" row must not turn into "golden-hour golden sun". Test in Task 1.
4. **An article before a grey sky.** "an overcast sky" becomes "a golden sky", never "an golden sky". Test in Task 1.
5. **A post with no set-up.** The style line uses the `Southeast Asian` row and "Southeast Asian" therapists, as today. Test in Task 2.

---

### Task 1: The swap table

**Files:**
- Modify: `lib/posts/image-prompt.ts:42-72` (the `LIGHT` table and its comment)
- Test: `tests/unit/posts-image.test.ts` ("light and weather in the post prompt")
- Create: `docs/specs/posts/golden-hour-images/journal.md` (from `docs/templates/journal.md`)

**Interfaces:**
- Produces: `cleanLight(text: string): string`, exported from `lib/posts/image-prompt.ts` (exported now so tests can call it alone; `imagePrompt` still calls it).

- [ ] **Step 0: Commit the spec, the plan and the roadmap row**

```bash
git add docs/specs/posts/golden-hour-images/spec.md docs/specs/posts/golden-hour-images/plan.md docs/roadmap.md
git commit -m "docs(posts): golden-hour images spec and plan (roadmap 2.14)"
```

- [ ] **Step 1: Start the journal**

Calls made so far, dated 2026-10-28: the cause found (Svarga's visual style asks for sunlight through foliage and reaches the post prompts; Sen stays dim), the maintainer's verdict (Sen too dark, wants Svarga's brightness and mood, local green plants), the four ideas taken (the moment sign "very subtle and discreet"), and the five calls made after the builder check (the "low" row, the flower not forced, `imagePrompt` not learning the scene, the style line winning over the hint, decision 0004 left as approved).

- [ ] **Step 2: Write the failing tests**

Replace the `test.each` table and the Sen "lamp-lit" test; keep "grey skies…" and "words that only contain a light word…".

```ts
test.each([
  ['Bright sunlight on the towels', 'Low golden sun on the towels'],
  ['A sunny balcony', 'A golden balcony'],
  ['Daylight through the window', 'Golden-hour light through the window'],
  ['A villa in the morning', 'A villa at golden hour'],
  ['Oil on a back at dusk', 'Oil on a back at golden hour'],
  ['A balcony at night', 'A balcony at golden hour'],
  ['Midday on the terrace', 'Golden hour on the terrace'],
  ['A dimly lit room', 'A warmly lit room'],
  ['A dim room', 'A warm room'],
  ['A darkened villa', 'A warm villa'],
  ['Low, soft and warm lighting', 'Golden-hour, soft and warm lighting'],
  ['Soft low lighting', 'Soft golden-hour lighting'],
  ['Warm low light', 'Warm golden-hour light'],
  ['A dimly lit villa at dusk, sunny balcony at midday', 'A warmly lit villa at golden hour, golden balcony at golden hour'],
  ['an overcast sky over a misty, wet terrace', 'a golden sky over a quiet, clean terrace'],
])('%s → %s', (input, output) => {
  expect(cleanLight(input)).toBe(output);
});

test.each([
  'A clean, sunlit Da Nang hotel room',
  'Sunlight and sunshine on a bright villa room',
  'Late afternoon on the balcony',
  'Smooth dark stones along the back',
  'Golden oil in clear glass, never a small dark bottle',
  'A low table beside the bed',
])('%s stays as written', (text) => {
  expect(cleanLight(text)).toBe(text);
});

// The image prompts of Sen's and Svarga's posts-5 plans, as saved on the
// phones: "New image" on one of them must not stay dim.
test.each(POSTS_5_PROMPTS)('a posts-5 prompt loses its low light: %s', (prompt) => {
  const out = cleanLight(prompt);
  expect(out).not.toMatch(/\blow\b[^.]*\blight/i);
  expect(out).not.toMatch(/\b(?:dim|dusk)\b/i);
});
```

`POSTS_5_PROMPTS` is a `const` array in the test file holding the twelve `imagePrompt` strings of `final.posts` in `tests/fixtures/sites/sen/posts.json` and `svarga/posts.json` (`promptVersion: "posts-5"`), copied verbatim before Task 4 re-records them.

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-image.test.ts`
Expected: FAIL; `cleanLight` is not exported, and the old table writes "lamplight" and "dusk". Copy the summary line into the journal's RED.

- [ ] **Step 4: Rewrite the `LIGHT` table and export `cleanLight`**

Rows in this order (the order is what keeps "low golden sun" from being swapped again):

1. `bright (sun|sunlight|sunshine)` → `low golden sun`
2. `sunny` → `golden`
3. `daylight` → `golden-hour light`
4. `in the (morning|afternoon|evening)`, `at (dusk|night)` → `at golden hour`
5. `morning|midday|noon|daytime|dusk|evening|night` → `golden hour`
6. `dimly lit` → `warmly lit`
7. `dim|darkened` → `warm`
8. `low` followed only by any of `soft`, `warm`, `and`, commas and spaces, then `light` or `lighting` → `golden-hour` (a lookahead; "low" is the only word replaced)
9. an optional `a`/`an`, then one or more of `overcast`, `grey`, `gray`, then `sky` → `a golden sky` when an article was matched, `golden sky` otherwise
10. `overcast` → `calm`; `misty|foggy` → `quiet`; `damp|wet` → `clean`; `rainy|rain|mist|fog` → removed (as today)

The comment above the table points to `docs/specs/posts/golden-hour-images` and says why the "low" row exists.

- [ ] **Step 5: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-image.test.ts`
Expected: the swap tests PASS. The style-line tests in the same file still expect the old line; they change in Task 2.

- [ ] **Step 6: Commit**

```bash
git add lib/posts/image-prompt.ts tests/unit/posts-image.test.ts docs/specs/posts/golden-hour-images/journal.md
git commit -m "feat(posts): swap dark, dusk and midday light for golden hour"
```

### Task 2: The style line

**Files:**
- Modify: `lib/posts/image-prompt.ts:1-40, 84-92` (`imageStyle`, `IMAGE_STYLE`, `imagePrompt`, the version)
- Test: `tests/unit/posts-image.test.ts`, `tests/unit/posts-image-run.test.ts:34`

**Interfaces:**
- Consumes: `type Locals` from `lib/posts/setup.ts`.
- Produces:
  - `PLACES: Record<Locals, { room: string; view: string; flower: string }>` (the Global Constraints table).
  - `imageStyle(locals?: Locals): string`: with `locals`, therapists read "local" and the place is `PLACES[locals]`; without, therapists read "Southeast Asian" and the place is `PLACES['Southeast Asian']`.
  - `imagePrompt(postPrompt: string, hint?: string, setup?: Setup): string` (signature unchanged; passes `setup?.locals`).
  - `IMAGE_STYLE` is removed; tests use `imageStyle('Balinese')` and `imageStyle()`.

- [ ] **Step 1: Write the failing tests**

```ts
test('golden hour, never dusk or dim', () => {
  const style = imageStyle('Vietnamese');
  expect(style).toContain('Whatever the scene says, the light is golden hour: the low warm sun from outside, with lamps or candles lit.');
  expect(style).toContain('a treat the guest has earned');
  expect(style).not.toMatch(/\bdusk\b|dim and intimate|introspection/i);
});

test("Sen's room: Vietnamese, palms and bamboo, a lotus, never frangipani", () => {
  const style = imageStyle('Vietnamese');
  expect(style).toContain('a Vietnamese boutique hotel room or villa');
  expect(style).toContain('areca palms, bamboo, banana leaves and coconut palms');
  expect(style).toContain('a pink lotus floating in a bowl of water');
  expect(style).not.toMatch(/frangipani/i);
});

test("Svarga's room: Balinese villa, frangipani, never a lotus", () => {
  const style = imageStyle('Balinese');
  expect(style).toContain('a Balinese villa room');
  expect(style).toContain('frangipani trees, banana leaves, coconut palms and ferns');
  expect(style).toContain('frangipani flowers on the tray');
  expect(style).not.toMatch(/lotus/i);
});

test('no set-up: Southeast Asian row and therapists', () => {
  const p = imagePrompt('A room.');
  expect(p).toBe(`A room. ${imageStyle()}`);
  expect(p).toContain('tropical greenery: palms, banana leaves and ferns');
  expect(p).toContain('orchids in a small vase');
  expect(p).toContain('Every therapist is a young Southeast Asian woman');
});

test('only plants of the place, a discreet sign of the day', () => {
  const style = imageStyle('Balinese');
  expect(style).toContain('never plants from elsewhere');
  expect(style).toContain("Any object from the guest's day is small, far in the background and out of focus.");
});
```

Update the existing tests: the safety-net list says `'Curtains are open and hang still; there is no wind.'`; "the light wins over the scene" expects the golden-hour sentence above; `IMAGE_STYLE` becomes `imageStyle('Balinese')` in "cast line first…" and in the therapist and face tests; the version test expects `images-7`, and so does `posts-image-run.test.ts:34`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts`
Expected: FAIL (no golden hour, no place, `images-6`). Journal's RED.

- [ ] **Step 3: Rewrite `imageStyle` and bump the version**

Sentences, in this order (exact copy the spec fixes; `{…}` from `PLACES` and the therapist word):

1. The camera sentence, as today.
2. "Golden hour: the low, warm sun of late afternoon comes in through open doors or a wide window, and lamps or candles are lit; the room glows honey and amber. Bright and happy, never harsh midday sun, a grey sky, mist or rain, never a dark or dim room."
3. "A warm, bright and happy holiday mood: calm and restful, a treat the guest has earned."
4. Skin and textures, no text, centred subject, massage under way, relaxed guest, neat linens, homely room: as today.
5. "Curtains are open and hang still; there is no wind."
6. The golden oil sentence, as today.
7. "Whatever the scene says, the light is golden hour: the low warm sun from outside, with lamps or candles lit."
8. "When the room shows, it is {room}, open onto {view}, lit by the golden sun; only green plants that grow here, never plants from elsewhere."
9. "When a tray, a table or the room shows, a touch of the place: {flower}; no other kind of flower."
10. "Any object from the guest's day is small, far in the background and out of focus."
11. The therapist sentences and the two face sentences, as today, with "local" or "Southeast Asian".

Update the file's top comment (golden-hour spec, `images-7`) and `IMAGE_PROMPT_VERSION = 'images-7'`.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts`
Expected: PASS. Journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/image-prompt.ts tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts docs/specs/posts/golden-hour-images/journal.md
git commit -m "feat(posts): golden-hour style line with the place's room, plants and flower"
```

### Task 3: The post plan's prompt

**Files:**
- Modify: `lib/posts/prompt.ts:10, 79-87` (the version and the image rules)
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-run.test.ts:77`

**Interfaces:**
- Produces: `planPrompt(withOffer?: boolean, spa?: boolean): string` (signature unchanged), `POSTS_PROMPT_VERSION = 'posts-6'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('asks for golden hour, never dusk', () => {
  const prompt = planPrompt();
  expect(prompt).toContain('Light is golden hour: the low, warm sun of late afternoon comes in through open doors or a wide window, with lamps or candles lit; the room glows honey and amber.');
  expect(prompt).toContain('never harsh midday sun, a grey sky, mist, rain or damp, never a dark or dim room');
  expect(prompt).not.toMatch(/\bdusk\b/);
});

it('opens the room onto the place', () => {
  expect(planPrompt()).toContain('The room opens onto the outside: open doors, a wide window or a balcony onto green plants that grow in that place, and the sea or a pool where the place has one.');
});

it('allows a sign of the guest\'s day only in a moment post', () => {
  const prompt = planPrompt();
  expect(prompt).toContain("Only in a moment post's image, one small, plain object from that moment may show");
  expect(prompt).toContain('far in the background, half hidden and out of focus');
  expect(prompt).toContain('Most images have none.');
});
```

In "holds every rule of the spec", replace `'dusk'` with `'golden hour'`; the version test expects `posts-6`, and so does `posts-run.test.ts:77`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`
Expected: FAIL. Journal's RED.

- [ ] **Step 3: Change the image rules and bump the version**

- The light rule becomes: "Light is golden hour: the low, warm sun of late afternoon comes in through open doors or a wide window, with lamps or candles lit; the room glows honey and amber. Bright and happy: never harsh midday sun, a grey sky, mist, rain or damp, never a dark or dim room."
- After the "warm and homely" rule: "The room opens onto the outside: open doors, a wide window or a balcony onto green plants that grow in that place, and the sea or a pool where the place has one."
- "Still air: curtains hang still, no wind." becomes "Still air: curtains open and hanging still, no wind." (the `curtains hang still` assertion moves to `curtains open and hanging still`).
- New rule after the place-symbols rule: "Only in a moment post's image, one small, plain object from that moment may show (a surfboard against the balcony rail, hiking boots by the door, a suitcase, a closed laptop): far in the background, half hidden and out of focus, never near the guest and never the subject, with no logo or text. Most images have none."
- `POSTS_PROMPT_VERSION = 'posts-6'`.

- [ ] **Step 4: Run them to see them pass, then the whole check**

Run: `pnpm vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`, then `pnpm check`
Expected: PASS, then `pnpm check` exits 0. Journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/prompt.ts tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts docs/specs/posts/golden-hour-images/journal.md
git commit -m "feat(posts): golden-hour rooms open onto the place in the post plan"
```

### Task 4: Re-record Sen's and Svarga's plans

**Files:**
- Modify: `tests/fixtures/sites/{sen,svarga}/posts.json`, `tests/fixtures/sites/{sen,svarga}/posts-offer.json`
- Modify: `docs/specs/posts/golden-hour-images/journal.md`

- [ ] **Step 1: Record**

Run: `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`
Expected: four plans printed with `posts-6`; read each image prompt: no dusk, dim or low light; rooms open onto plants; at most a discreet object, on moment posts only. Note anything off in the journal.

- [ ] **Step 2: Replay**

Run: `pnpm vitest run tests/unit/posts-fixtures-replay.test.ts`, then `pnpm check`
Expected: PASS; `pnpm check` exits 0.

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures/sites/sen/posts.json tests/fixtures/sites/svarga/posts.json tests/fixtures/sites/sen/posts-offer.json tests/fixtures/sites/svarga/posts-offer.json docs/specs/posts/golden-hour-images/journal.md
git commit -m "test(posts): re-record Sen's and Svarga's plans with posts-6"
```

### Task 5: Judge the images, close the item

**Files:**
- Modify: `docs/specs/posts/golden-hour-images/journal.md`, `docs/roadmap.md` (2.14 → `done`)

- [ ] **Step 1: Ask, then make the images**

Ask the person before spending about $0.60. Run: `pnpm eval:images sen svarga`
Expected: twelve `ok` lines with `images-7`; images under `.superpowers/eval-images/{sen,svarga}/`.

- [ ] **Step 2: Measure and show**

Measure each story image's mean brightness (0 to 255, Pillow) and put it in the journal next to the 27 Oct run (Svarga 72, Sen 83). Build one side-by-side sheet (Svarga's six stories over Sen's) and show it to the maintainer.

- [ ] **Step 3: Verdicts**

The maintainer judges against the spec's pass rule: Sen as bright and positive as Svarga; no grey, rainy, glaring or dark image; every room shown open onto the place's green plants; any flower the place's own; any sign of the day discreet; at least 4 of 6 per spa a tourist would book. Verdicts go in the journal with `posts-6` and `images-7`. If it fails, go back to Task 2 or 3 with the maintainer's words, bump the version again and repeat Tasks 4–5.

- [ ] **Step 4: Close the item and commit**

Set roadmap 2.14 to `done`.

```bash
git add docs/roadmap.md docs/specs/posts/golden-hour-images/journal.md
git commit -m "docs(posts): golden-hour images judged, roadmap 2.14 done"
```

- [ ] **Step 5: Push and open the PR**

Push the branch over SSH and give the person a paste-ready PR title and body for github.com, base `develop` (no `gh`).
