# Story text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md, "Plans"). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each suggestion gets a short story text the owner may copy (at most 120 characters by `.length`), captions follow a hook-to-positive-ending order, spas get flower emojis fixed by code, one translation request covers caption and story text, and the suggestion sheet becomes three boxed parts with their own buttons.

**Architecture:** Two new pure modules: `lib/posts/emoji.ts` (the spa test and the emoji fixes) and `lib/posts/story.ts` (the story text's cleanup, cut and checks). `checkedWords` in `lib/posts/checks.ts` runs both for every planned or rewritten post and returns its records into `dropped`; `run.ts` counts them into the log line. The translation route, model call, client and phone store carry an optional story text beside the caption. On screen, `PostCard` lays out three `SheetPart`s and the old two-step `TakeAway` splits into three buttons that live inside them.

**Tech Stack:** Next.js App Router, TypeScript, zod, AI SDK (`@ai-sdk/google`), next-intl, Vitest, Playwright, pnpm.

**Spec:** `docs/specs/posts/story-text/spec.md`

## Global Constraints

- `POSTS_PROMPT_VERSION = 'posts-5'`; `TRANSLATE_PROMPT_VERSION = 'translate-2'`. The image prompt doesn't change.
- Story text: the model is asked for at most **100** characters; code's limit is **120**, counted with `.length` (UTF-16 code units).
- Over 120: keep whole sentences that fit; if the first doesn't, whole words; never cut inside an emoji (grapheme).
- Flowers, exactly: 🌸 🌺 🌼 🌷 🪷. Spa: category matches `spa`, `massage`, `pijat`, `mát xa`, `mát-xa` or `reflexology` as whole words, case and accents ignored.
- Spa limits: caption 1 to 3 flowers, story text 1 or 2; no other emoji. Other businesses: at most 2 emoji each, any kind, and code changes nothing.
- An emoji is a grapheme (`Intl.Segmenter`, granularity `grapheme`) that matches `\p{Extended_Pictographic}`.
- Code's fixes on a spa: remove non-flower emoji and tidy spaces; keep the first flowers up to the limit; add ` 🌸` at the end when none is left.
- Records go in `dropped`: field `story` (reasons `post-N: story text cut from X to Y`, `post-N: no story text`) and field `emoji` (one entry per fix). The log line gains `story_cuts=` and `emoji_fixes=`, numbers only.
- An offer post's story text is its offer line, word for word, plus a flower for a spa.
- The story text can't be edited; editing the caption leaves it as it is. Copying it never sets `savedAt` or `copiedAt`.
- A missing story text never makes a post out of date (`isPostStale`, `staleUnedited` unchanged).
- Strings: every visible string in `messages/en.json`, `id.json` and `vi.json` in the same commit, exactly as the spec's tables give them.
- Commits: Conventional Commits, scope `posts` (or `docs`); stage by path; author `SiegfriedBz <siegfried.bozza@protonmail.com>`; end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `pnpm eval:posts` and `pnpm eval:translate` spend the app's daily Gemini pool: ask the maintainer before each run, never on a pilot day.

## Review Focus

1. **Emojis built from several pieces** (🧘‍♀️, 👍🏽, 🏵️): removed whole, never leaving a lone joiner, skin tone or variation selector. Test in Task 1.
2. **A story text that is only hashtags and emoji** ("#danang 💆"): after cleanup no letter is left, so the post has no story text, rather than a lone 🌸. Test in Task 2.
3. **A batch saved before this spec** (no `storyText`, no `storyUnchecked`): the sheet opens with two parts, the tile's "Check the text" ignores the missing flags, and the translation asks for the caption alone. Tests in Tasks 5 and 6.
4. **The phone refuses the clipboard for the story text**: the "Copy it from here." sheet shows the story text, not the post text. Test in Task 6.
5. **Two quick taps**, one on each "Show in…" link before the first answer: one request, both parts shown. Test in Task 5.

---

### Task 1: The spa test and emoji fixes

**Files:**
- Create: `lib/posts/emoji.ts`
- Test: `tests/unit/posts-emoji.test.ts`

**Interfaces:**
- Produces:
  - `FLOWERS: readonly ['🌸', '🌺', '🌼', '🌷', '🪷']`
  - `isSpa(category: string): boolean`
  - `emojisIn(text: string): string[]` (the emoji graphemes, in order)
  - `stripEmojis(text: string, maxFlowers: number): { text: string; fixes: string[] }` — removes non-flower emoji, keeps the first `maxFlowers` flowers, tidies spaces; `fixes` reads like `removed 💆`, `removed 🌸 over 2 flowers`.
  - `addFlower(text: string): { text: string; fixes: string[] }` — appends ` 🌸` when `text` holds no flower (`fixes: ['added 🌸']`), else unchanged.

- [ ] **Step 1: Write the failing tests**

```ts
test.each(['massage spa', 'Spa', 'Pijat Refleksi', 'Mát-xa Đà Nẵng', 'Foot Reflexology', 'day-spa'])('%s is a spa', (c) => expect(isSpa(c)).toBe(true));
test.each(['bakery', 'yoga retreat', 'spaghetti house', ''])('%s is not a spa', (c) => expect(isSpa(c)).toBe(false));
test('emojisIn keeps joined emoji whole', () => expect(emojisIn('Relax 🧘‍♀️ now 👍🏽 🏵️')).toEqual(['🧘‍♀️', '👍🏽', '🏵️']));
test('stripEmojis removes other emoji and tidies spaces', () =>
  expect(stripEmojis('Relax tonight 💆 in your room! 🌸', 2)).toEqual({ text: 'Relax tonight in your room! 🌸', fixes: ['removed 💆'] }));
test('stripEmojis leaves no lone joiner or selector', () => expect(stripEmojis('Calm 🧘‍♀️ 🏵️.', 2).text).toBe('Calm.'));
test('stripEmojis keeps the first flowers', () => expect(stripEmojis('A 🌸 B 🌺 C 🌼', 2).text).toBe('A 🌸 B 🌺 C'));
test('addFlower adds one only when none', () => {
  expect(addFlower('Wake up light!')).toEqual({ text: 'Wake up light! 🌸', fixes: ['added 🌸'] });
  expect(addFlower('Wake up light! 🌺')).toEqual({ text: 'Wake up light! 🌺', fixes: [] });
});
```

- [ ] **Step 2: Run them, expect FAIL** — `pnpm exec vitest run tests/unit/posts-emoji.test.ts`: cannot find `lib/posts/emoji`.

- [ ] **Step 3: Implement `lib/posts/emoji.ts`**

`isSpa` folds the category like `slug` in `lib/posts/take-away.ts` (NFD, strip marks, `đ`→`d`, lower case) and tests `/\b(spa|massage|pijat|mat[ -]xa|reflexology)\b/`. `emojisIn` segments with `new Intl.Segmenter('en', { granularity: 'grapheme' })`. Tidying: collapse runs of spaces, drop a space before `.,!?`, trim.

- [ ] **Step 4: Run them, expect PASS.**

- [ ] **Step 5: Commit** — `git add lib/posts/emoji.ts tests/unit/posts-emoji.test.ts`; `feat(posts): flower emojis for spas, fixed by code (story text)`.

### Task 2: The story text's checks, and the post's new fields

**Files:**
- Create: `lib/posts/story.ts`
- Modify: `lib/posts/batch.ts` (`POSTS_LIMITS`, `postSchema`, `modelPostPlanSchema`, `modelRewriteSchema`)
- Test: `tests/unit/posts-story.test.ts`, `tests/unit/posts-batch.test.ts`

**Interfaces:**
- Consumes: Task 1's `stripEmojis`, `addFlower`. (No import from `checks.ts`, which imports this module: the flags are Task 3's.)
- Produces:
  - `POSTS_LIMITS.storyChars = 120`, `POSTS_LIMITS.storyAsked = 100`, `POSTS_LIMITS.captionFlowers = 3`, `POSTS_LIMITS.storyFlowers = 2`, `POSTS_LIMITS.otherEmoji = 2`.
  - `postSchema` gains `storyText: z.string().min(1).max(POSTS_LIMITS.storyChars).optional()` and `storyUnchecked: z.array(flagSchema).optional()`.
  - `modelPostPlanSchema` and `modelRewriteSchema` posts gain `storyText: loose`.
  - `cutStory(text: string, max: number): string`
  - `cleanStory(raw: string | undefined, opts: { id: string; spa: boolean }): { storyText?: string; dropped: Dropped[] }`

- [ ] **Step 1: Write the failing tests**

```ts
const long = 'Long flight? Deep tissue in your room for sixty minutes tonight. Our local therapists ease every knot. Wake up light and happy tomorrow!'; // 136
test('cutStory keeps whole sentences', () => expect(cutStory(long, 120)).toBe('Long flight? Deep tissue in your room for sixty minutes tonight. Our local therapists ease every knot.'));
test('cutStory falls back to whole words, never inside an emoji', () => {
  const out = cutStory(`${'word '.repeat(23)}🧘‍♀️ end`, 120);
  expect(out.length).toBeLessThanOrEqual(120);
  expect(out).not.toMatch(/‍$|️$/);
});
test('a spa story text gets its flower within 120', () => {
  const { storyText, dropped } = cleanStory(`${'a'.repeat(119)}`, { id: 'post-1', spa: true });
  expect(storyText?.endsWith(' 🌸')).toBe(true);
  expect(storyText?.length).toBeLessThanOrEqual(120);
  expect(dropped.map((d) => d.field)).toEqual(expect.arrayContaining(['emoji']));
});
test('hashtags go', () => expect(cleanStory('Calm tonight #danang 🌸', { id: 'post-1', spa: true }).storyText).toBe('Calm tonight 🌸'));
test('only hashtags and emoji leave no story text', () => {
  const out = cleanStory('#danang 💆', { id: 'post-2', spa: true });
  expect(out.storyText).toBeUndefined();
  expect(out.dropped).toContainEqual({ field: 'story', reason: 'post-2: no story text' });
});
test('undefined from an old recording leaves no story text', () => expect(cleanStory(undefined, { id: 'post-1', spa: false }).storyText).toBeUndefined());
test('a cut is recorded', () => expect(cleanStory(long, { id: 'post-3', spa: false }).dropped).toContainEqual({ field: 'story', reason: 'post-3: story text cut from 136 to 102' }));
test('another business keeps its emoji', () => expect(cleanStory('Fresh bread 🥐', { id: 'post-1', spa: false }).storyText).toBe('Fresh bread 🥐'));
```

`posts-batch.test.ts`: a post with a 121-character `storyText` fails `postSchema`; one without `storyText` passes.

- [ ] **Step 2: Run them, expect FAIL** — `pnpm exec vitest run tests/unit/posts-story.test.ts tests/unit/posts-batch.test.ts`.

- [ ] **Step 3: Implement `lib/posts/story.ts` and the schema fields**

`cleanStory` order: `raw ?? ''` → trim → remove `#word` (`/(^|\s)#[\p{L}\p{M}\p{N}_]+/gu`) → for a spa, `stripEmojis(text, POSTS_LIMITS.storyFlowers)` → no letter or digit left (`/[\p{L}\p{N}]/u`) means empty → `cutStory(text, 120)` → for a spa with no flower, `cutStory(text, 117)` then `addFlower`. Each emoji fix becomes `{ field: 'emoji', reason: \`${id}: story text ${fix}\` }`.

- [ ] **Step 4: Run them, expect PASS.**

- [ ] **Step 5: Commit** — `feat(posts): story text cleanup, cut and checks (story text)`.

### Task 3: Every planned and rewritten post carries its story text

**Files:**
- Modify: `lib/posts/checks.ts` (`checkedWords`, `checkPost`, `checkRewrite`), `lib/posts/run.ts`, `lib/posts/log.ts`, `lib/posts/edit.ts`
- Test: `tests/unit/posts-checks.test.ts`, `tests/unit/posts-run.test.ts`, `tests/unit/posts-log.test.ts`, `tests/unit/posts-edit.test.ts`

**Interfaces:**
- Consumes: Task 1 (`isSpa`, `stripEmojis`, `addFlower`), Task 2 (`cleanStory`).
- Produces:
  - `checkedWords(raw, profile, id, context?)` now returns `{ words: Pick<Post, 'caption' | 'cta' | 'hashtags' | 'altText' | 'unchecked' | 'storyText' | 'storyUnchecked'>; dropped: Dropped[] }`; `checkPost` and `checkRewrite` push its `dropped`.
  - Caption on a spa: `cutCaption` → `stripEmojis(caption, 3)` → `addFlower`; fixes recorded as `post-N: caption removed 💆` (field `emoji`).
  - `PostsLog` gains `storyCuts: number` and `emojiFixes: number`; `formatPostsLog` prints `story_cuts=` and `emoji_fixes=` after `flags=`.
  - `storyFlagsFor(post: Post, batch: PostBatch, profile: Profile, newest = true): Flag[]` in `edit.ts`, mirroring `flagsFor` on `post.storyText` (`[]` without one).

- [ ] **Step 1: Write the failing tests**

- `checkPost` on Sen's profile with a raw post whose caption holds 💆 and no flower and whose `storyText` is "Relax tonight 💆 in your room!": the post's `storyText` is "Relax tonight in your room! 🌸", its caption ends with ` 🌸` and holds no 💆, and `dropped` has three `emoji` entries.
- `checkPost` on a bakery's profile keeps 🥐 in caption and story text and records nothing.
- `checkRewrite` gives a rewritten post the answer's new `storyText`; an answer without one leaves the post with none.
- the story text gets 2.6's checks: "Only VND 900k tonight 🌸" on Sen's profile gives `storyUnchecked` holding `{ kind: 'price', text: 'VND 900k' }`; the caption's `unchecked` doesn't.
- `streamPlan` with a replayed plan whose third post's story text is 140 characters: the log entry has `storyCuts: 1`; `formatPostsLog` holds `story_cuts=1 emoji_fixes=0` for it.
- `storyFlagsFor` on an edited, out-of-date post re-checks its story text against today's profile; on a post without `storyText` it is `[]`.
- `applyEdit` keeps `storyText` and `storyUnchecked` as they were.

- [ ] **Step 2: Run them, expect FAIL** — `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/posts-run.test.ts tests/unit/posts-log.test.ts tests/unit/posts-edit.test.ts`.

- [ ] **Step 3: Implement.** `storyCuts` counts `dropped` entries with field `story` whose reason holds `cut from`; `emojiFixes` counts field `emoji`.

- [ ] **Step 4: Run them, expect PASS**, then `pnpm test` for the fixture replays (old recordings have no `storyText`: their posts get none, and spas' captions gain a flower).

- [ ] **Step 5: Commit** — `feat(posts): plans and rewrites carry the story text (story text)`.

### Task 4: The plan prompt, `posts-5`

**Files:**
- Modify: `lib/posts/prompt.ts`, `lib/posts/run.ts` (pass `isSpa(body.profile.category)`)
- Test: `tests/unit/posts-prompt.test.ts`

**Interfaces:**
- Produces: `planPrompt(withOffer = false, spa = false): string`; `rewritePrompt(withOffer = false, spa = false): string`. `CAPTION_RULES` becomes `captionRules(spa: boolean)`; `OFFER_RULES` becomes `offerRules(spa: boolean)`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(POSTS_PROMPT_VERSION).toBe('posts-5');
expect(planPrompt()).toContain('Each post has a type, a topic, a scene, a caption, a story text, hashtags, alt text and an image prompt.');
expect(planPrompt(false, true)).toContain('flowers only, from 🌸 🌺 🌼 🌷 🪷: 1 to 3 in the caption and 1 or 2 in the story text');
expect(planPrompt(false, false)).toContain('At most 2 emoji in the caption and at most 2 in the story text.');
expect(planPrompt(false, false)).not.toContain('🌸');
expect(planPrompt(true, true)).toContain("Each offer post's story text is its first line, word for word, followed by one flower");
expect(rewritePrompt(false, true)).toContain('story texts');
```
Plus: the caption rules name the hook, the guest's feeling, one concrete detail and the positive last sentence; the story text rule says "at most 100 characters".

- [ ] **Step 2: Run, expect FAIL** — `pnpm exec vitest run tests/unit/posts-prompt.test.ts`.

- [ ] **Step 3: Write the rules.** Exact copy (the rest of `CAPTION_RULES` stays word for word; "at most 2 emoji" leaves its line):

```
- Each caption sells, in this order: a hook, its first line of at most 125 characters, that works on its own and stops a tourist scrolling (a question or a promise they feel, such as "Long flight?"), since it is all Instagram shows before "more"; what the guest will feel, rather than what the business does; one concrete detail that makes it real (the treatment, its price or duration when the profile gives them, the place); and a last sentence on a positive note, a good feeling or a warm promise (such as "Wake up light tomorrow.").
- Emoji: flowers only, from 🌸 🌺 🌼 🌷 🪷: 1 to 3 in the caption and 1 or 2 in the story text. No other emoji.   ← spa
- At most 2 emoji in the caption and at most 2 in the story text.   ← any other business

Story text: a short version of its own caption, for the post's Instagram story, which the owner may paste on the story image: its hook cut down, the one thing that matters, and a positive ending. English, at most 100 characters, emoji included; one or two short lines. No hashtags, no phone number, no link and no call to action: the owner adds a link sticker.
```

Offer: append to `offerRules` "Each offer post's story text is its first line, word for word, followed by one flower." (spa) or "…is its first line, word for word." (other), and "The other four posts never mention a discount, a free treatment or a deadline, in their captions or story texts." The rewrite's offer rule adds "in its caption's first line and as its story text". `rewritePrompt` says "You rewrite the captions, story texts, hashtags and alt text".

- [ ] **Step 4: Run, expect PASS.**

- [ ] **Step 5: Commit** — `feat(posts): hook, positive ending and story text in the plan prompt, posts-5 (story text)`.

### Task 5: One translation for caption and story text, `translate-2`

**Files:**
- Modify: `lib/posts/translate.ts`, `lib/posts/translate-prompt.ts`, `lib/ai/text-model.ts`, `lib/ai/replay.ts`, `lib/posts/translate-run.ts`, `app/api/posts/translate/route.ts` (body only), `lib/posts/translate-client.ts`, `lib/posts/translation-store.ts`, `components/posts/caption-translation.tsx`, `scripts/eval-translate.ts`
- Test: `tests/unit/posts-translate.test.ts`, `posts-translate-route.test.ts`, `posts-translate-replay.test.ts`, `posts-translation-store.test.ts`, `posts-translation.test.tsx`

**Interfaces:**
- Produces:
  - `translateBodySchema`: `{ text, story?: z.string().min(1).max(POSTS_LIMITS.storyChars), locale }`; `translateResponseSchema`: `{ text, story?: string, model, promptVersion }`.
  - `TextModel.translatePost(input: { caption: string; story?: string }, locale: TranslateLocale, signal: AbortSignal): Promise<{ caption: string; story?: string }>` replaces `translateCaption`. With a story text: `generateText` with `Output.object({ schema: z.object({ caption: z.string(), story: z.string() }) })`; without, plain text as today. The replayer reads a string `final` as `{ caption: final }`.
  - `translatePrompt(locale, withStory: boolean)`; with a story text, the user text is `### Caption\n…\n\n### Story text\n…`.
  - `getTranslation(input: { ownerId; batchId; postId; caption; story?: string; locale })` → `{ ok: true; text: string; story?: string } | { ok: false; code }`; an in-memory map keyed by batch, post, locale and both texts' hashes shares one request between two taps and keeps its answer.
  - `SavedTranslation` gains `storyHash?: string` and `story?: string`; `loadTranslation(batchId, postId, locale, caption, story?)` returns a saved one only when both hashes match.
  - `CaptionTranslation` gains `part: 'caption' | 'story'` (default `'caption'`) and `story?: string`; it shows `text` or `story` of the result.

- [ ] **Step 1: Write the failing tests**

- the body with a 121-character `story` is refused (`invalid_request`); without `story`, accepted as today;
- `runTranslate` with a story text returns both, logs `chars_in` as both lengths added, and fails `model_failed` when the story's translation comes back empty;
- `TRANSLATE_PROMPT_VERSION` is `'translate-2'`; the prompt with a story text names both;
- the store reuses a saved translation only while caption and story text are unchanged; one saved before (no `storyHash`) isn't reused for a post with a story text;
- two `getTranslation` calls started together make one `fetch`;
- `CaptionTranslation` with `part="story"` shows the story's translation; for a post with no story text the request carries no `story` (Review Focus 3).

- [ ] **Step 2: Run, expect FAIL.**

- [ ] **Step 3: Implement.** The route still takes one `translations` unit per request. `eval-translate` sends the first recorded post's caption and `storyText` (when the recording has one).

- [ ] **Step 4: Run, expect PASS**, then `pnpm typecheck`.

- [ ] **Step 5: Commit** — `feat(posts): one translation for the caption and the story text, translate-2 (story text)`.

### Task 6: The suggestion sheet in three parts

**Files:**
- Create: `components/posts/sheet-part.tsx`
- Modify: `components/posts/take-away.tsx`, `components/posts/post-card.tsx`, `components/posts/suggestion-sheet.tsx`, `components/posts/posts-section.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/posts-take-away.test.tsx`, `tests/unit/posts-section.test.tsx`, `tests/unit/posts-section-images.test.tsx`, `tests/unit/posts-card-edit.test.tsx`

**Interfaces:**
- Consumes: `storyFlagsFor` (Task 3), `CaptionTranslation` with `part` (Task 5).
- Produces:
  - `SheetPart({ n, title, optional = false, children }: { n: number; title: string; optional?: boolean; children: ReactNode })`: a `<section aria-labelledby>` on `bg-field`, `rounded-control`, a thin `border-edge` border (dashed when optional), padding 14px; its heading is the number in a 22px `accent-tint` circle, the title at 14px weight 600, and "(optional)" at 13px `ink-secondary`.
  - `take-away.tsx` exports `SaveImages({ image, name, createdAt, attempt, n, onTaken })`, `CopyPost({ post, cta, imagesOn, onTaken })`, `CopyStory({ storyText, imagesOn })`; each is one app `Button` (no outline class) plus its hint; `TakeAway` goes.
  - `PostCard` drops `takeAway` and gains `imagesOn: boolean`, `saveImages?: ReactNode`, `copyPost: ReactNode`, `copyStory?: ReactNode`, `storyFlags?: Flag[]`, `storyTranslation?: ReactNode`. Parts: Images (only when `imagesOn`), Post text, Story text (only when `post.storyText`), numbered in order.
  - `SuggestionSheet` drops `actions` and its pinned bar.
  - Message keys under `posts`: `parts.images`, `parts.postImage`, `parts.storyImage`, `parts.postText`, `parts.storyText`, `parts.optional`, `saveImages`, `copyText`, `copyStory`, `hints.images`, `hints.post`, `hints.postOwnPhoto`, `hints.story`, `hints.storyOwnPhoto`; `howTo` and `howToTextOnly` go; `empty` and `emptyTextOnly` change. Values: the spec's "Strings" tables.

- [ ] **Step 1: Write the failing tests**

- the sheet with images and a story text shows headings "Images", "Post text", "Story text" with "(optional)", and buttons "Save post & story images", "Copy post text", "Copy optional story text", in that order, each before its hint; no button outside the parts;
- without images: "Post text" numbered 1, "Story text" numbered 2, hints "In Instagram, make a post with your own photo and paste this text." and "In Instagram, make a story with your own photo, add text and paste.";
- a post without `storyText` shows no story part (Review Focus 3), and its tile's check ignores the missing `storyUnchecked`;
- "Copy optional story text" writes the story text to the clipboard and leaves `savedAt`/`copiedAt` unset; with the clipboard refused, the "Copy it from here." sheet holds the story text (Review Focus 4);
- a story text's price flag shows in the story part, and its tile shows "Check the text";
- "Edit the text" comes before "Show in Tiếng Việt" on a Vietnamese screen, and the story part has its own "Show in Tiếng Việt";
- the message files have the same keys (the existing parity test).

- [ ] **Step 2: Run, expect FAIL** — `pnpm exec vitest run tests/unit/posts-take-away.test.tsx tests/unit/posts-section.test.tsx tests/unit/posts-section-images.test.tsx tests/unit/posts-card-edit.test.tsx`.

- [ ] **Step 3: Implement**, then check the sheet at a phone viewport in the dev server against mockup v6 (`.superpowers/brainstorm/1533965-1793133410/content/story-text-sheet-v6.html`).

- [ ] **Step 4: Run, expect PASS**, then `pnpm test`.

- [ ] **Step 5: Commit** — `feat(posts): the suggestion sheet in three parts, with the story text (story text)`.

### Task 7: The owner guide

**Files:**
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (`guide.posts.make`, `guide.posts.edit`, `guide.posts.update`, `guide.instagram.save`, `guide.instagram.copy`, `guide.instagram.story`, `guide.instagram.noImages`, `guide.languages.captions`), `components/guide/owner-guide.tsx` (`'instagram.story': { button: t('posts.copyStory') }`)
- Test: `tests/unit/guide.test.tsx`

- [ ] **Step 1: Write the failing test** — the guide names "Save post & story images", "Copy post text" and "Copy optional story text" in bold, never "1 Save" or "2 Copy", and no longer says "A story has no text to paste".
- [ ] **Step 2: Run, expect FAIL** — `pnpm exec vitest run tests/unit/guide.test.tsx`.
- [ ] **Step 3: Write the lines** as the spec's three tables give them (`**…**` becomes `<b>…</b>` with the same placeholders).
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Commit** — `docs(posts): the owner guide speaks of the story text (story text)`.

### Task 8: Phone tests

**Files:**
- Create: `tests/e2e/story-text.spec.ts`
- Modify: `tests/e2e/helpers/posts-stream.ts` (each post gets `storyText: \`Story ${i + 1} 🌸\``), `tests/e2e/friendlier-home.spec.ts`, `tests/e2e/editor.spec.ts` (new button names)

- [ ] **Step 1: Write the e2e tests** — at the phone viewport: open a suggestion, see the three parts in order; tap "Copy optional story text", see "Copied"; the tile isn't ticked until the images are saved and the post text copied; on a Vietnamese screen, tap the story part's "Show in Tiếng Việt" and see one request to `/api/posts/translate` carrying `story`.
- [ ] **Step 2: Run, expect FAIL** — `pnpm test:e2e tests/e2e/story-text.spec.ts`.
- [ ] **Step 3: Fix the old specs' button names**; nothing else should need to change.
- [ ] **Step 4: Run all, expect PASS** — `pnpm test:e2e` (in the background; it builds the app).
- [ ] **Step 5: Commit** — `test(posts): the three parts on a phone (story text)`.

### Task 9: Recordings and verdicts

**Files:**
- Modify: `scripts/eval-posts.ts` (print `story (N): <text>` with `.length` and `⚠` story flags under each caption), `tests/unit/posts-fixtures-replay.test.ts`, `tests/fixtures/sites/{sen,svarga}/posts.json`, `posts-offer.json`, `tests/fixtures/sites/sen/translate-vi.json`, `tests/fixtures/sites/svarga/translate-id.json`, `docs/specs/posts/story-text/journal.md`

- [ ] **Step 1: Write the failing replay test** — for `sen` and `svarga`, plain and offer: every post has a `storyText` of at most 120, with 1 or 2 flowers and no other emoji; every caption has 1 to 3 flowers and no other emoji; each offer post's `storyText` starts with its caption's first line.
- [ ] **Step 2: Run, expect FAIL** — the `posts-4` recordings have no story texts.
- [ ] **Step 3: Ask the maintainer**, then run `pnpm eval:posts sen svarga --record`, `pnpm eval:posts sen svarga --offer --record` (4 Gemini requests) and `pnpm eval:translate --record` (2 Flash-Lite requests).
- [ ] **Step 4: Run, expect PASS**; write the 24 verdicts in the journal (hook and positive ending; story text a fair short version; offer story text its offer line and flower), with the count of emoji fixes and story cuts. Pass bar as the spec's.
- [ ] **Step 5: Commit** — `test(posts): re-record Sen and Svarga with story texts, posts-5 (story text)`.

### Task 10: Finish the branch

- [ ] **Step 1:** Roadmap 2.13 → `done`; the journal's RED and GREEN lines complete.
- [ ] **Step 2:** `pnpm check` → green apart from the known `.superpowers/guide/` repo-check line.
- [ ] **Step 3:** Commit `docs(posts): roadmap 2.13 done (story text)`; push `claude/story-text-4e5ccc` over SSH to `origin`; give the maintainer the PR title and full description for `develop`.
