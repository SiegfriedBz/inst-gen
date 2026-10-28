# Day and night images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md, "Plans"). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Code deals each batch three day and three night images; the post plan, code's swaps and the style line all follow the set-up's light, in the place's own room open onto its green plants.

**Architecture:** The set-up (`lib/posts/setup.ts`) gains `light`, dealt last so the rest of a deal is unchanged. `cleanLight` and `imageStyle` (`lib/posts/image-prompt.ts`) take that light; `imagePrompt` reads it from the set-up, `day` when there is none. `planPrompt` and `planUserText` (`lib/posts/prompt.ts`) tell the model the light and stop showing it the brand's own light. This replaces the golden-hour version already on this branch (commits `8b72af3`…`10df55e`), whose place table, moment sign and "low" rows stay.

**Tech Stack:** TypeScript, zod, Vitest, pnpm.

**Spec:** `docs/specs/posts/day-and-night-images/spec.md`

## Global Constraints

- `IMAGE_PROMPT_VERSION = 'images-8'`; `POSTS_PROMPT_VERSION = 'posts-7'`.
- `LIGHTS = ['day', 'night'] as const`; `type Light`. A set-up or post without `light` is `day`.
- Three day and three night per deal of six, shuffled by the deal's own `random`, drawn **after** every other field.
- `PLACES` (the room, view, flower table) stays as built in `955e9a8`.
- Swaps: whole words, first letter's case kept, rows top to bottom; "bright" alone, "dark" alone, "late afternoon" by day, and "sun" before lounger(s), deck, hat, bed(s), terrace, umbrella, shade, cream or screen are never swapped. The owner's hint is never swapped.
- `postsModelInput` and `profileHash` don't change; only `planUserText` drops `visualStyle.light`.
- No new visible strings (no `messages/*.json` change).
- Commits: Conventional Commits, scope `posts`; stage by path; author `SiegfriedBz <siegfried.bozza@protonmail.com>`; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `pnpm eval:posts` spends 4 Flash-Lite requests (approved with the spec); `pnpm eval:images` about $0.60: ask right before it. If the images fail, stop and report.

## Review Focus

1. **A post saved before this spec** (set-up without `light`, or no set-up) going through "New image": schema accepts it, it is a day, its prompt's dusk and low words become day words. Test in Task 3.
2. **"Sun" inside other words or before a thing that isn't light**: "sunflower", "Sunday", "sun lounger", "sun deck" stay. Test in Task 2.
3. **Swapping the other light twice**: by night "in the afternoon" becomes "in the evening", not "in the evening evening"; by day "at dusk" becomes "in the late afternoon" once. Test in Task 2.
4. **The deal's other fields**: adding lights must not change Sen's treatments, guests, body parts or scenes for a given seed, or every recorded fixture's replay shifts. Test in Task 1.
5. **The plan's user text without `visualStyle.light` when `visualStyle` is null** (a profile with no style read): no crash, `visualStyle: null` stays. Test in Task 4.

---

### Task 1: The set-up's light

**Files:**
- Modify: `lib/posts/setup.ts` (`LIGHTS`, `Light`, `setupSchema`, `dealSetups`, `setupLine`)
- Test: `tests/unit/posts-setup.test.ts`
- Modify: `docs/specs/posts/day-and-night-images/journal.md`

**Interfaces:**
- Produces: `LIGHTS`, `type Light = 'day' | 'night'`; `Setup['light']?: Light`; `dealSetups(...)` returns six set-ups each with `light`; `setupLine(setup)` ends `…; scene <scene>, <camera>; <light>.` (`day` when missing).

- [ ] **Step 0: Record the deal as it is**

Before touching `setup.ts`, print `dealSetups(senProfile(), undefined, seededRandom('t'))` and paste its six set-ups into the test as `SEN_DEAL_BEFORE`.

- [ ] **Step 1: Write the failing tests**

```ts
it('three days and three nights', () => {
  const lights = deal(senProfile()).map((s) => s.light);
  expect(count(lights, 'day')).toBe(3);
  expect(count(lights, 'night')).toBe(3);
});

it('the same seed, the same lights', () => {
  expect(deal(senProfile(), undefined, 'x').map((s) => s.light)).toEqual(
    deal(senProfile(), undefined, 'x').map((s) => s.light),
  );
});

it('the lights come last: the rest of the deal is as before', () => {
  expect(deal(senProfile()).map(({ light, ...rest }) => rest)).toEqual(SEN_DEAL_BEFORE);
});

it('the schema takes a light, none, and refuses another', () => {
  expect(setupSchema.safeParse(fourHandsMan).success).toBe(true);
  expect(setupSchema.safeParse({ ...fourHandsMan, light: 'night' }).success).toBe(true);
  expect(setupSchema.safeParse({ ...fourHandsMan, light: 'dusk' }).success).toBe(false);
});

it('setupLine ends with the light, day when missing', () => {
  expect(setupLine({ ...fourHandsMan, light: 'night' })).toMatch(/; night\.$/);
  expect(setupLine(fourHandsMan)).toMatch(/; day\.$/);
});
```

The existing "names every scene" test expects `` `scene ${scene}, ${camera};` `` instead of `` `…${camera}.` ``, and the two `toBe` lines for four hands and no treatment gain `; day` before the final full stop.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-setup.test.ts`
Expected: FAIL (no `light`). Journal's RED.

- [ ] **Step 3: Implement**

`setupSchema` gains `light: z.enum(LIGHTS).optional()`. In `dealSetups`, after the scenes, `shuffled(['day','day','day','night','night','night'], random)` gives each set-up its light in order. `setupLine` appends `; ${setup.light ?? 'day'}` before the final full stop.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm exec vitest run tests/unit/posts-setup.test.ts tests/unit/posts-fixtures-replay.test.ts`
Expected: PASS (the replay still passes: the recorded plans are text; code writes the scene). Journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/setup.ts tests/unit/posts-setup.test.ts docs/specs/posts/day-and-night-images/journal.md
git commit -m "feat(posts): deal three day and three night set-ups"
```

### Task 2: Swaps by light

**Files:**
- Modify: `lib/posts/image-prompt.ts` (the `LIGHT` table and `cleanLight`)
- Test: `tests/unit/posts-image.test.ts` ("light and weather in the post prompt")

**Interfaces:**
- Consumes: `type Light` (Task 1).
- Produces: `cleanLight(text: string, light: Light = 'day'): string`.

- [ ] **Step 1: Write the failing tests**

Replace the golden-hour `test.each` with two tables, one per light, with a row for each line of the spec's swap table; among them:

```ts
// day
['Bright sunlight on the towels', 'Soft daylight on the towels'],
['Sunbeams across the bed', 'Soft light across the bed'],
['A sunset balcony', 'A late afternoon balcony'],
['Golden hour sunlight flooding the room', 'Late afternoon soft daylight flooding the room'],
['low warm golden sun', 'gentle warm golden soft daylight'],
['A sunlit, sunny room', 'A softly lit, soft room'],
['A villa at dusk', 'A villa in the late afternoon'],
['A balcony at night', 'A balcony in the late afternoon'],
['Evening on the terrace', 'Late afternoon on the terrace'],
['A villa in the morning', 'A villa in the late afternoon'],
['A warm, low-lit hotel room', 'A warm, softly lit hotel room'],
['A dimly lit room', 'A softly lit room'],
['A dim, darkened room', 'A soft, soft room'],
['Low, soft and warm lighting', 'Gentle, soft and warm lighting'],
['Low-light interior', 'Soft light interior'],
['an overcast sky over a misty, wet terrace', 'a soft blue sky over a quiet, clean terrace'],
// night
['Golden hour light streams through a sunlit window', 'Evening light streams through a lamp-lit window'],
['Bright sunlight on the towels', 'Lamplight on the towels'],
['Daylight and sunshine', 'Lamplight and lamplight'],
['A villa in the afternoon', 'A villa in the evening'],
['Late afternoon on the terrace', 'Evening on the terrace'],
['A sunrise view', 'A evening view'],
['A dimly lit room', 'A warmly lit room'],
['Soft low candlelight', 'Soft glowing candlelight'],
['an overcast sky', 'a deep blue sky'],
```

(`'A evening view'` is what a word swap gives; the image model reads past it.) Kept by both: `'A sunflower on a table'`, `'Sunday'`, `'A sun lounger by the pool'`, `'A sun deck'`, `'Smooth dark stones along the back'`, `'never a small dark bottle'`, `'A low table beside the bed'`, `'A bright villa room'`; kept by day: `'Late afternoon on the balcony'`, `'Daylight through the window'`; kept by night: `'A balcony at night'`. The 24 `POSTS_5_PROMPTS`, read as day, come out with no `/\blow\b[^.]*\blight/`, `/\blow[- ]lit\b/`, `/\b(?:dim|dimly|dusk)\b/` and no `/\bsun\b/`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-image.test.ts`
Expected: FAIL. Journal's RED.

- [ ] **Step 3: Implement**

`LIGHT` becomes rows of `[RegExp, day: string, night: string | null]` (`null` = kept), in the spec's order; `cleanLight` picks the column by `light`, skips `null`, then tidies spaces as today. The "low" lookahead allows soft, warm, golden, "and" and commas before light, lighting, daylight, lamp light, lamplight or candlelight. Update the comment above the table (spec path, why rows run in order).

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm exec vitest run tests/unit/posts-image.test.ts`
Expected: the swap tests PASS (style-line tests change in Task 3). Journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/image-prompt.ts tests/unit/posts-image.test.ts docs/specs/posts/day-and-night-images/journal.md
git commit -m "feat(posts): swap words of the other light, day or night"
```

### Task 3: The style line by light

**Files:**
- Modify: `lib/posts/image-prompt.ts` (`imageStyle`, `imagePrompt`, top comment, version)
- Test: `tests/unit/posts-image.test.ts`, `tests/unit/posts-image-run.test.ts` (`images-8` twice)

**Interfaces:**
- Consumes: `cleanLight` (Task 2), `Light` and `Setup['light']` (Task 1), `PLACES`.
- Produces: `imageStyle(locals?: Locals, light: Light = 'day'): string`; `imagePrompt(postPrompt, hint?, setup?)` uses `setup?.light ?? 'day'` for both `cleanLight` and `imageStyle`.

- [ ] **Step 1: Write the failing tests**

```ts
test('a day image: late afternoon, soft daylight, no sunbeams', () => {
  const style = imageStyle('Vietnamese', 'day');
  expect(style).toContain('Late afternoon: lamps are lit inside, and soft natural daylight comes in from the garden through open doors or a wide window.');
  expect(style).toContain('never sunbeams across the room, never harsh sun or blown-out windows');
  expect(style).toContain('Whatever the scene says, it is late afternoon: soft daylight from outside, with lamps lit.');
  expect(style).toContain('open onto a garden of areca palms, bamboo, banana leaves and coconut palms, in soft daylight;');
  expect(style).not.toMatch(/golden hour|evening/i);
});

test('a night image: lamps, candles, lanterns, never dark', () => {
  const style = imageStyle('Balinese', 'night');
  expect(style).toContain('Evening: lamps and candles give the room a warm, golden glow, and the garden outside is lit by lanterns under a deep blue sky.');
  expect(style).toContain('Warm and inviting, never dark, dim or gloomy');
  expect(style).toContain('Whatever the scene says, it is evening: lamps and candles lit, the garden lit by lanterns under a deep blue sky.');
  expect(style).toContain('lit by lanterns at night;');
  expect(style).not.toMatch(/late afternoon|daylight/i);
});

test('a night set-up swaps its prompt and gets the night line', () => {
  const p = imagePrompt('A sunlit room.', undefined, { ...setup, light: 'night' });
  expect(p).toContain('A lamp-lit room.');
  expect(p.endsWith(imageStyle('Vietnamese', 'night'))).toBe(true);
});

test('an old post is a day: no light in its set-up, or no set-up', () => {
  const { light, ...old } = { ...setup, light: 'night' as const };
  expect(imagePrompt('A warm, low-lit room at dusk.', undefined, old)).toContain('A warm, softly lit room in the late afternoon.');
  expect(imagePrompt('A room.').endsWith(imageStyle(undefined, 'day'))).toBe(true);
});
```

`setup` is the Vietnamese set-up already in "golden hour and the place", moved to that describe's scope. Existing tests: the golden-hour sentence assertions become the day ones above; the mood test expects `'A warm, happy holiday mood: calm and restful, a treat the guest has earned.'`; the version test and `posts-image-run.test.ts` expect `images-8`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts`
Expected: FAIL. Journal's RED.

- [ ] **Step 3: Implement**

`imageStyle` keeps the sentence order built in `955e9a8`, with these by light (exact copy):

| | day | night |
|---|---|---|
| light | "Late afternoon: lamps are lit inside, and soft natural daylight comes in from the garden through open doors or a wide window. Soft and warm, never sunbeams across the room, never harsh sun or blown-out windows, never a grey sky, mist or rain." | "Evening: lamps and candles give the room a warm, golden glow, and the garden outside is lit by lanterns under a deep blue sky. Warm and inviting, never dark, dim or gloomy, never a grey sky, mist or rain." |
| mood (both) | "A warm, happy holiday mood: calm and restful, a treat the guest has earned." | same |
| whatever | "Whatever the scene says, it is late afternoon: soft daylight from outside, with lamps lit." | "Whatever the scene says, it is evening: lamps and candles lit, the garden lit by lanterns under a deep blue sky." |
| place | "When the room shows, it is {room}, open onto {view}, in soft daylight; only green plants that grow here, never plants from elsewhere." | "…, open onto {view}, lit by lanterns at night; only green plants…" |

`IMAGE_PROMPT_VERSION = 'images-8'`; the top comment points to `docs/specs/posts/day-and-night-images` and no longer calls the style line fixed.

- [ ] **Step 4: Run them to see them pass, then the suite**

Run: `pnpm exec vitest run tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts`, then `pnpm exec vitest run` and `pnpm typecheck`
Expected: PASS; suite and typecheck green. Journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/image-prompt.ts tests/unit/posts-image.test.ts tests/unit/posts-image-run.test.ts docs/specs/posts/day-and-night-images/journal.md
git commit -m "feat(posts): day and night style lines"
```

### Task 4: The post plan follows the light

**Files:**
- Modify: `lib/posts/prompt.ts` (light rule, set-up sentence, visual style rule, `planUserText`, version)
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-run.test.ts:77` (`posts-7`)

**Interfaces:**
- Consumes: `setupLine` ending with the light (Task 1).
- Produces: `planPrompt` (unchanged signature), `planUserText` (unchanged signature, without `visualStyle.light`), `POSTS_PROMPT_VERSION = 'posts-7'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('the light follows the set-up', () => {
  const prompt = planPrompt();
  expect(prompt).toContain("Light follows the set-up's last word.");
  expect(prompt).toContain('Day: late afternoon, lamps lit inside and soft natural daylight from the garden through open doors or a wide window; soft and warm, never sunbeams across the room or harsh sun.');
  expect(prompt).toContain('Night: evening, lamps and candles giving the room a warm, golden glow, the garden outside lit by lanterns under a deep blue sky; warm and inviting, never dark or gloomy.');
  expect(prompt).toContain('scene, camera and light');
  expect(prompt).not.toMatch(/golden hour|\bdusk\b/i);
});

it("the visual style gives palette and textures, not light", () => {
  expect(planPrompt()).toContain("Use the visual style's palette and textures");
  const profile = svargaProfile();
  const text = planUserText(postsModelInput(profile), []);
  expect(profile.visualStyle?.light).toBeTruthy();
  expect(text).not.toContain(profile.visualStyle?.light as string);
  expect(text).toContain(profile.visualStyle?.palette as string);
  expect(postsModelInput(profile).visualStyle?.light).toBe(profile.visualStyle?.light);
});

it('a profile with no visual style still plans', () => {
  const input = { ...postsModelInput(svargaProfile()), visualStyle: null };
  expect(planUserText(input, [])).toContain('"visualStyle": null');
});
```

The golden-hour tests in this file are replaced by the first one above; "holds every rule" checks `'late afternoon'` and `'lanterns'` instead of `'golden hour'`; the version test and `posts-run.test.ts:77` expect `posts-7`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`
Expected: FAIL. Journal's RED.

- [ ] **Step 3: Implement**

- The light rule (exact): "- Light follows the set-up's last word. Day: late afternoon, lamps lit inside and soft natural daylight from the garden through open doors or a wide window; soft and warm, never sunbeams across the room or harsh sun. Night: evening, lamps and candles giving the room a warm, golden glow, the garden outside lit by lanterns under a deep blue sky; warm and inviting, never dark or gloomy. Never a grey sky, mist, rain or damp."
- The open-room rule and the moment rule stay; "the room opens onto … green plants" stays.
- "Use the visual style's palette, light and textures, and …" → "Use the visual style's palette and textures, and …".
- The set-up sentence: "…part of the body, scene and camera; it never changes them" → "…part of the body, scene, camera and light; it never changes them".
- `planUserText` builds its profile text from `{ ...input, visualStyle: input.visualStyle && omit light }`; `rewriteUserText` unchanged.
- `POSTS_PROMPT_VERSION = 'posts-7'`; the top comment points to the new spec.

- [ ] **Step 4: Run them to see them pass, then the suite**

Run: `pnpm exec vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`, then `pnpm exec biome ci && pnpm typecheck && pnpm exec vitest run`
Expected: PASS; all green. Journal's GREEN.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/prompt.ts tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts docs/specs/posts/day-and-night-images/journal.md
git commit -m "feat(posts): the post plan follows the set-up's light"
```

### Task 5: Re-record Sen's and Svarga's plans

**Files:**
- Modify: `tests/fixtures/sites/{sen,svarga}/posts.json`, `…/posts-offer.json`, `tests/unit/posts-fixtures-replay.test.ts:89` (comment: `posts-7`), the journal

- [ ] **Step 1: Record**

Run: `pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga --offer --record`
Expected: four plans with `posts-7`. Read each image prompt against its set-up's light: day ones with no sun, night ones with lamps and lanterns, no grey or rain. Note what's off in the journal.

- [ ] **Step 2: Replay and check**

Run: `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts`, then `pnpm exec biome ci && pnpm typecheck && pnpm exec vitest run`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/fixtures/sites/sen/posts.json tests/fixtures/sites/svarga/posts.json tests/fixtures/sites/sen/posts-offer.json tests/fixtures/sites/svarga/posts-offer.json tests/unit/posts-fixtures-replay.test.ts docs/specs/posts/day-and-night-images/journal.md
git commit -m "test(posts): re-record Sen's and Svarga's plans with posts-7"
```

### Task 6: Images, verdicts, PR

**Files:**
- Modify: the journal, `docs/roadmap.md` (2.14 → `done` only on a pass)

- [ ] **Step 1: Ask, then make the images**

Ask before spending about $0.60. Run: `pnpm eval:images sen svarga`
Expected: twelve `ok` lines with `images-8`. On timeouts, check the network and ask before running again.

- [ ] **Step 2: Measure and show**

Mean brightness of each story image into the journal, next to 27 Oct (Svarga 72, Sen 83) and the golden-hour tests (104, 113). One sheet: Svarga's 27 Oct stories, then Svarga's and Sen's new ones, each marked day or night. Show it.

- [ ] **Step 3: Verdicts**

The maintainer judges against the spec's pass rule; verdicts in the journal. On a fail: stop and report.

- [ ] **Step 4: Close and push**

On a pass, set 2.14 to `done` and commit:

```bash
git add docs/roadmap.md docs/specs/posts/day-and-night-images/journal.md
git commit -m "docs(posts): day and night images judged, roadmap 2.14 done"
```

Push the branch over SSH and give the person a paste-ready PR title and body, base `develop` (no `gh`).
