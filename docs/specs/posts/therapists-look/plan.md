# The therapists' look in images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The brand read writes down what the therapists wear and their hair (`staffLook`); "Your look" shows it and lets the owner change it; every image asked for from then on carries it, with the cast and again in the last rules.

**Architecture:** The look is a sourced profile field (`lib/brand/profile.ts`, version 3), checked by code after the model call (`lib/brand/checks.ts`) with two small rules of its own (`lib/brand/staff-look.ts`: names a man, cut to size), and edited in the "look" section (`lib/brand/edit.ts`, `components/brand/*`). It never enters `postsModelInput`, so captions are untouched. The phone sends `profile.staffLook.value` with each image request (`lib/posts/image-client.ts`); the route passes it to `imagePrompt` (`lib/posts/image-prompt.ts`, `images-10`) and `castLine` (`lib/posts/setup.ts`).

**Tech Stack:** TypeScript, zod, React (Next.js), next-intl, Vitest, Playwright, pnpm.

**Spec:** `docs/specs/posts/therapists-look/spec.md`

## Global Constraints

- `BRAND_PROMPT_VERSION = 'brand-8'`; `IMAGE_PROMPT_VERSION = 'images-10'`; `profileSchema.schemaVersion` is `3`.
- `LIMITS.staffLookWords = 30`, `LIMITS.staffLookChars = 300` (`lib/brand/profile.ts`). The profile caps the look at both, so the phone never sends one the route refuses (300 characters).
- A man is named by the whole words `man`, `men`, `male`, `males`, `boy`, `boys`, `gentleman`, `gentlemen`, `he`, `his`, any case. "woman", "women" and "female" are not.
- Dropped reasons: `unknown_source`, `no_photos`, `names_a_man`, on field `staffLook`.
- Strings exactly as the spec's table (`brand.panel.fields.staffLook`, `brand.edit.errors.namesAMan`), in `en.json`, `id.json` and `vi.json`, in the same commit as the code that shows them.
- Without a look, the image prompt is images-9's word for word apart from the version.
- No AI call that spends quota or money without the maintainer's yes at the time, never on a pilot day (Task 6).
- Commits: Conventional Commits, scope `brand`, `posts`, `web` or `docs`; stage by path; author SiegfriedBz with the protonmail email; the Co-Authored-By trailer.

## Review Focus

1. A 30-word look of long words is over 300 characters: the form refuses it and the read cuts it, so no image request is ever refused for it (Task 1 and Task 3 tests).
2. An owner's look typed with a trailing full stop or a line break: the image prompt reads "Her look: … ." once, on one line (Task 4 test).
3. "women", "woman" or "female" in a look are not a man (Task 1 test).
4. A partial line of the read, with the look's value but no source yet, shows nothing and records no drop (Task 2 test).
5. A look of only spaces typed in the form saves `null` and sends nothing (Task 3 and Task 4 tests).

---

### Task 1: The look's field and its rules

**Files:** Create `lib/brand/staff-look.ts`; Modify `lib/brand/profile.ts`, `lib/brand/checks.ts` (`finalise` only); Test `tests/unit/brand-staff-look.test.ts` (new), `tests/unit/brand-profile.test.ts`, `tests/unit/brand-store.test.ts`, `tests/unit/brand-home.test.tsx`, `tests/unit/brand-checks.test.ts`, `tests/unit/helpers/brand.ts`

**Interfaces:**
- Produces: `namesAMan(text: string): boolean`; `cutLook(text: string): string`; `LIMITS.staffLookWords`, `LIMITS.staffLookChars`; `Profile['staffLook']: { value: string; source: string } | null`; `ModelProfile['staffLook']`: loose sourced, nullable; `upgradeProfile` turns version 1 and 2 into 3.

- [ ] **Step 1: Write the failing tests.**
  - `namesAMan`: true for "white tunics; the men wear shirts", "a male therapist", "His uniform"; false for "a woman in white", "women in navy tunics", "female staff", "a white tunic, white trousers, dark hair in a neat low bun".
  - `cutLook`: a 12-word look comes back trimmed and whole; a 40-word look with commas comes back ending before a comma, at most 30 words; 40 words with no comma come back as the first 30; 30 words of 12 letters (over 300 characters) come back at most 300 characters, ending on a whole word.
  - `profileSchema`: a version 3 profile with `staffLook: { value: 'a white tunic', source: 'model' }` passes; 31 words fail; 301 characters fail.
  - `upgradeProfile`: version 1 and version 2 profiles parse as version 3 with `staffLook: null`, their other fields unchanged (`brand-profile.test.ts`, `brand-store.test.ts`'s "version 1 opens as 2" becomes 3).
  - `finalise` writes `schemaVersion: 3` and `staffLook: null` when the merged profile has none (`brand-checks.test.ts`).
  - The tests that use `schemaVersion: 3` as a later, unknown version (`brand-home.test.tsx`, `brand-store.test.ts`) use 4. `helpers/brand.ts` builds version 3 with `staffLook: null`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/brand-staff-look.test.ts tests/unit/brand-profile.test.ts tests/unit/brand-store.test.ts tests/unit/brand-checks.test.ts`. Expected: FAIL (no module, version 2).
- [ ] **Step 3: Implement.** `staff-look.ts` holds the two functions; `cutLook` is:

```ts
export function cutLook(text: string): string {
  const whole = text.trim().replace(/\s+/g, ' ');
  let kept = whole.split(' ').slice(0, LIMITS.staffLookWords).join(' ');
  if (kept.length > LIMITS.staffLookChars) {
    kept = kept.slice(0, LIMITS.staffLookChars + 1).replace(/\s+\S*$/, '');
  }
  if (kept === whole) return kept;
  const comma = kept.lastIndexOf(',');
  return comma > 0 ? kept.slice(0, comma) : kept;
}
```

  `profile.ts`: the two limits; `staffLook` in `modelProfileSchema` (`looseSourced`) and in `profileSchema` (sourced text of at most 30 words and 300 characters, nullable); `schemaVersion: z.literal(3)`; `upgradeProfile` adds `staffLook: null` (and v1's essence and search fields) to version 1 or 2. `finalise`: `schemaVersion: 3`, `staffLook: profile.staffLook ?? null`.
- [ ] **Step 4: Run** the same files, then `pnpm test`. Expected: PASS; fix any other test that builds a version 2 profile by hand.
- [ ] **Step 5: Commit** `feat(brand): a profile field for the therapists' look, version 3 (roadmap 2.16)`.

### Task 2: The brand read writes it down

**Files:** Modify `lib/brand/prompt.ts`, `lib/brand/checks.ts` (`mergeAndCheck`), `lib/brand/eval/score.ts`, `scripts/eval-brand.ts` (print the look); Test `tests/unit/brand-prompt.test.ts`, `tests/unit/brand-checks.test.ts`, `tests/unit/brand-eval-score.test.ts`

**Interfaces:**
- Consumes: `namesAMan`, `cutLook` (Task 1).
- Produces: `Expected['staffLookWords']?: string[]`; the failure name `'staffLook'` in `scoreFixture`.

- [ ] **Step 1: Write the failing tests.**
  - The prompt is at `brand-8`; rule 3 reads "The visual style describes the photos' palette, light, textures and mood, for an image model to imitate. Never describe people in it. Leave it empty when no photos are given."; it has a `- staffLook:` field note that holds "the top (its cut, sleeves, collar and colour), the trousers or skirt and their colour", "then the hair", "at most 30 words", the spec's example, "what most of them show", "never name a man", "source \"model\"" and "Never a face, skin, body or age".
  - `mergeAndCheck`: a look with source `/about` keeps the page's URL; with `model` and one photo, `model`; with `model` and no photo, dropped `{ field: 'staffLook', reason: 'no_photos' }`; with `https://other.vn/` dropped `unknown_source`; naming a man, dropped `names_a_man`; a 40-word look is cut by `cutLook`; a look with a value but no source yet gives `null` and no drop.
  - `scoreFixture`: with `staffLookWords: ['white']`, a look "a white tunic…" passes; none, "a black top…", or "white shirts on the men" fails with `staffLook`; without `staffLookWords`, the look isn't scored.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/brand-prompt.test.ts tests/unit/brand-checks.test.ts tests/unit/brand-eval-score.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The field note, after `visualStyle.summary`, reads: "- staffLook: what the staff who give the service (for a spa, its therapists) wear, and their hair, for an image model to dress them alike: the top (its cut, sleeves, collar and colour), the trousers or skirt and their colour, anything else they wear for work, then the hair. One phrase of at most 30 words, with no \"she\", \"they\" or name, for example \"a white short-sleeved tunic with a small stand-up collar, white trousers, dark hair in a neat low bun\". When a page says what they wear, use it, with that page's URL; otherwise what the photos show, with the source \"model\"; when the photos disagree, what most of them show. Only what the women wear: never name a man, and leave it empty when only men are shown. Never a face, skin, body or age. Leave it empty when no page or photo shows the staff." `mergeAndCheck` gets the look through a small local function after the visual style; `scoreFixture` scores it only when `staffLookWords` is given; `eval-brand.ts` prints `look: …` under the style.
- [ ] **Step 4: Run** the same files, then `pnpm test` (the fixture replays keep passing: their recordings have no look). Expected: PASS.
- [ ] **Step 5: Commit** `feat(brand): the brand read writes down the therapists' look (roadmap 2.16)`.

### Task 3: "Your look" shows it and lets the owner change it

**Files:** Modify `lib/brand/edit.ts`, `lib/brand/missing.ts`, `components/brand/panel.tsx`, `components/brand/section-sheet.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`; Test `tests/unit/brand-edit.test.ts`, `tests/unit/brand-missing.test.ts`, `tests/unit/brand-panel.test.tsx`, `tests/unit/brand-section-sheet.test.tsx`

**Interfaces:**
- Consumes: `namesAMan`, `LIMITS.staffLookWords` (Task 1).
- Produces: `LookValues['staffLook']: string`; `FieldError` `'namesAMan'`; `FieldKey` `'staffLook'`.

- [ ] **Step 1: Write the failing tests.**
  - `sectionValues(profile, 'look').staffLook` is the look's text, `''` without one.
  - `applySection` on `look`: a new text saves `{ value, source: 'owner' }`; the same text keeps its source; `'   '` saves `null`; 31 words gives `{ staffLook: 'tooManyWords' }`; over 300 characters gives an error on `staffLook`; "dark navy tunics; the men wear white shirts" gives `{ staffLook: 'namesAMan' }` and nothing is saved.
  - `countOwnerEdits` counts an owner's look.
  - `missingFields` lists `{ field: 'staffLook', section: 'look' }` when the look is `null`, right after `visualStyle`, and not when it's set.
  - The panel's "Your look" shows "Your therapists' look", the text, and "our guess from your photos" for `source: 'model'`.
  - The "Your look" form has a "Your therapists' look" field with "Up to 30 words"; saving a look that names a man shows "Describe what your women therapists wear: the images always show women."
- [ ] **Step 2: Run** those four files. Expected: FAIL.
- [ ] **Step 3: Implement.** `edit.ts`: `staffLook` in `LookValues`, `sectionValues` and `build` (`field(profile.staffLook, v.staffLook)`, and `errors.staffLook = 'namesAMan'` first); `profile.staffLook` in `countOwnerEdits`'s list. `missing.ts`: the field after `visualStyle`. `panel.tsx`: `<SourcedField label={f('staffLook')} section="look" field={profile.staffLook} />` after "Visual style". `section-sheet.tsx`: a `TextField` labelled `l.field('staffLook')`, hint `l.words(LIMITS.staffLookWords)`, error `error('staffLook')`, after the visual style's fieldset. The two strings in the three files, as the spec's table.
- [ ] **Step 4: Run** the same files, then `pnpm test` (the strings check included). Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): the therapists' look in "Your look" (roadmap 2.16)`.

### Task 4: Every new image follows it

**Files:** Modify `lib/posts/image.ts`, `lib/posts/setup.ts` (`castLine`), `lib/posts/image-prompt.ts`, `lib/posts/image-run.ts`, `lib/posts/image-log.ts`, `lib/posts/image-client.ts`, `components/posts/posts-section.tsx`, `scripts/eval-images.ts`; Test `tests/unit/posts-setup.test.ts`, `tests/unit/posts-image.test.ts`, `tests/unit/posts-image-run.test.ts`, `tests/unit/posts-image-route.test.ts`, `tests/unit/posts-image-client.test.ts`, `tests/unit/posts-input.test.ts`

**Interfaces:**
- Consumes: `LIMITS.staffLookChars`, `Profile['staffLook']` (Task 1).
- Produces: `ImageBody['staffLook']?: string`; `castLine(setup: Setup, staffLook?: string): string`; `imageStyle(locals?: Locals, light?: Light, staffLook?: string): string`; `imagePrompt(postPrompt: string, hint?: string, setup?: Setup, staffLook?: string): string`; `startImages(input: { ownerId; batch; postIds; hint?; staffLook? }, onEvent, deps?)`; `resumeImages(ownerId, batches, onEvent, deps = defaultReadDeps(), staffLook?: string)`; `ImageLog['look']: boolean`.

- [ ] **Step 1: Write the failing tests.**
  - `castLine(oneTherapist, 'a white tunic, white trousers, dark hair in a neat low bun')` is "One guest, a man. One therapist, a young Vietnamese woman. Her look: a white tunic, white trousers, dark hair in a neat low bun."; with two therapists, "… Two therapists, both young Balinese women, dressed alike. Their look: …."; without a look, unchanged.
  - `imagePrompt(prompt, undefined, setup, look)` holds the cast line with the look first, and "Every therapist's look, whatever the scene says: {look}." after "Her face is turned away, lowered or out of frame." and before the guests' faces; with no set-up, the last rule only; without a look, the prompt equals images-9's text with only the version changed (pin it from the current output before the change); `IMAGE_PROMPT_VERSION` is `images-10`.
  - `makePostImage` passes the look cleaned to one line, without its trailing full stop ("a white tunic.\n" gives "Her look: a white tunic."); the log line says `cast=yes look=yes`, or `look=no`.
  - The route refuses a `staffLook` of 301 characters (`invalid_request`) and accepts 300.
  - `startImages` with a look sends `staffLook` in each request body; without one, or with `''`, sends no `staffLook`; `resumeImages(…, deps, look)` sends it too.
  - `postsModelInput` and `profileHash` are the same for two profiles that differ only in `staffLook`.
- [ ] **Step 2: Run** those six files. Expected: FAIL.
- [ ] **Step 3: Implement.** `image.ts`: `staffLook: z.string().min(1).max(LIMITS.staffLookChars).optional()`. `image-run.ts`: `cleanHint(body.staffLook)` gives the look, passed to `imagePrompt`; `entry.look`. `image-log.ts`: `look` after `cast`, printed `look=yes|no`. `image-client.ts`: `request` takes the look and adds it to the body only when non-empty. `posts-section.tsx`: `makeImages` and `tryResumeImages` pass `profileRef.current.staffLook?.value`. `eval-images.ts`: sends the fixture profile's look and prints `castLine(setup, look)`.
- [ ] **Step 4: Run** the same files, then `pnpm test`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): every new image dresses the therapists in their look (roadmap 2.16)`.

### Task 5: The phone test and the documents

**Files:** Create `tests/e2e/therapists-look.spec.ts`; Modify `tests/e2e/helpers/images.ts` (keep each request's body), `docs/specs/brand/extract-site/spec.md`, `docs/specs/brand/brand-panel/spec.md`, `docs/specs/posts/varied-images/spec.md`; Create `docs/specs/posts/therapists-look/journal.md`

- [ ] **Step 1: Write the Playwright test** at the phone viewport, models mocked: Sen's profile with `staffLook: { value: 'a white short-sleeved tunic, white trousers, dark hair in a neat low bun', source: 'model' }` is read; "Your look" shows "Your therapists' look", the text and "our guess from your photos"; "Make 2 suggestions" sends both image requests with that look; the owner edits the look to "a pale green tunic, white trousers, hair in a low bun" and saves; no caption update is asked for; "Create new image" on a suggestion sends the edited look.
- [ ] **Step 2: Run** `pnpm test:e2e tests/e2e/therapists-look.spec.ts` (in the background: it builds the app). Expected: PASS (Tasks 3 and 4 are in).
- [ ] **Step 3: Write the documents.** The dated notes "> Changed by `posts/therapists-look` (2026-11-08): …" in `brand/extract-site` ("The model call" and "The brand profile"), `brand/brand-panel` ("The panel") and `posts/varied-images` (the cast line and the therapist rules). The journal, from `docs/templates/journal.md`, with the calls made and the RED and GREEN lines of Tasks 1 to 4.
- [ ] **Step 4: Run** `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `test(web): the therapists' look on the phone, and the documents (roadmap 2.16)`.

### Task 6: Checked with the real model (the maintainer's yes, asked at the time)

**Files:** Modify `tests/fixtures/sites/sen/*`, `tests/fixtures/sites/svarga/*` (pages, css, manifest, robots, `expected.json`, `recording.json`), the journal, `docs/roadmap.md`

- [ ] **Step 1:** Ask the maintainer, in one plain question, for the yes to save the two new sites (free), read them with the AI (2 requests from the day's allowance) and make 4 test images (about $0.20), and whether today is a pilot day.
- [ ] **Step 2:** `pnpm fixtures:save https://sendanangmassage.com/ sen` and `pnpm fixtures:save https://svargabalimassage.com/ svarga`, the URLs the old copies were saved from. Check each `expected.json` against the new pages (name, WhatsApp, town, offerings, colours) and add `"staffLookWords": ["white"]` (Sen) and `["black", "navy", "dark"]` (Svarga).
- [ ] **Step 3:** `pnpm eval:brand sen svarga --record`. Expected: both pass, each look holds its words and names no man. If Sen's look says black, stop and ask.
- [ ] **Step 4:** `pnpm test` (the replays on the new recordings). Expected: PASS.
- [ ] **Step 5:** `pnpm eval:images sen svarga`; show the maintainer the 4 images and write their verdict in the journal.
- [ ] **Step 6:** Mark 2.16 `done` in the roadmap; commit `test(brand): record Sen's and Svarga's new sites with their look (roadmap 2.16)` and `docs(docs): the therapists' look is done (roadmap 2.16)`.

### Task 7: The branch's end

- [ ] **Step 1:** `git fetch origin`; if `origin/develop` has moved (2.15), merge it and resolve by hand (the roadmap rows in number order; `lib/posts/setup.ts`'s set-up fields); `pnpm check` and `pnpm test:e2e`. Expected: PASS; copy the GREEN lines into the journal.
- [ ] **Step 2:** Push the branch over SSH; give the maintainer the compare link and the full PR title and body for `develop`.
