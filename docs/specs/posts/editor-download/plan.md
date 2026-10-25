# Editor and download Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner preview each batch as an Instagram grid, edit a
post's words, read a caption in Indonesian or Vietnamese, ask for a new image
with a hint, and get each post and story out of the app, after fixing 2.3's
shared image keys.

**Architecture:** Mostly browser work on the existing "Your posts" section:
pure functions in `lib/posts/` (edits, staleness per post, the rewrite merge,
copy text, file names), small components in `components/posts/`, and the
phone's IndexedDB at version 4 (images keyed by batch and post, a new
`translations` store). Two server changes: the image route takes an optional
`hint`, and a new non-streamed `POST /api/posts/translate` calls Flash-Lite
through the text-model module.

**Tech Stack:** Next.js 16 route handlers, `ai` + `@ai-sdk/google`, `idb`,
zod 4, next-intl, Vitest with fake-indexeddb, Playwright. No new dependency.

**Spec:** `docs/specs/posts/editor-download/spec.md` (approved 2026-10-25)

## Global Constraints

- "Super easy to use": no control beyond the spec's; nothing on a card but the seven controls the spec lists, plus "Rewrite this one too" while it applies.
- Instagram's limit: caption, call to action and hashtags together at most 2,200 characters (`INSTAGRAM_CAPTION_MAX = 2200`). An edited caption is never cut at 700.
- Hashtags: 2.2's `cleanHashtags` rules, at most 5. Alt text at most 125 characters (`POSTS_LIMITS.altTextChars`).
- Hint: optional, at most 60 characters, trimmed, line breaks removed; prompt sentence `The owner asks: {hint}.` before `IMAGE_STYLE`; `IMAGE_PROMPT_VERSION = 'images-4'`.
- Translation: `TEXT_MODELS.light`, thinking `minimal`, `maxRetries: 0`, `request.signal` passed, 20 s cut-off, `TRANSLATE_PROMPT_VERSION = 'translate-1'`. Only the caption goes to Gemini, never the call to action. Logs never hold the caption, the translation or the hint.
- Database: `DB_VERSION = 4`; images keyed `['batchId', 'postId']`; translations keyed `['batchId', 'postId', 'locale']`; both indexed by `ownerId`.
- `LOCALE_NAMES` gives the button's language name, never translated.
- Every new visible string in `messages/en.json`, `id.json` and `vi.json` in the same commit.
- Commits: Conventional Commits, scope `posts` (`docs` for docs only); stage by path; never push before Task 10.
- Journal: `docs/specs/posts/editor-download/journal.md`, from `docs/templates/journal.md`, created in Task 1; RED and GREEN summary lines copied as Vitest prints them.
- Evals spend quota: ask the owner before `pnpm eval:translate` (2 Flash-Lite calls) and never run `eval:images`.

## Review Focus

1. **The owner taps "Edit" while "Update captions" is still running.** The
   rewrite's answer must not overwrite what they save. "Edit" is disabled
   while any posts run is busy. → Task 4 test `edit is disabled while a run
   is busy`.
2. **A caption of only spaces or line breaks.** Save stays disabled with
   "Write a caption first." → Task 4 test `a blank caption can't be saved`.
3. **The owner taps "Make it" twice, or "New image" while the first is still
   being made.** One request only; the button is disabled while that post's
   image is being made. → Task 7 test `new image is disabled while one is
   made`.
4. **A translation answer arrives after the owner edited the caption.** It is
   saved under the caption it was asked for and never shown for the new one.
   → Task 8 test `a translation for an older caption isn't used`.
5. **A business name with Vietnamese letters or symbols**
   ("Sen Đà Nẵng Spa!"). The file name is plain ASCII: `sen-da-nang-spa`.
   → Task 6 test `file names fold accents and symbols`.

---

### Task 1: Images keyed by batch and post (2.3's bug)

**Files:**
- Modify: `lib/brand/store.ts` (version 4 upgrade, `translations` in `ShopfrontDb`, `forgetBrand`), `lib/posts/image-store.ts`, `lib/posts/image-client.ts`, `components/posts/posts-section.tsx`
- Create: `docs/specs/posts/editor-download/journal.md` (from the template, with the calls already made: ids optional fields, per-post `profileHash`, ASCII file names, grid only when images are on, `crop` dropped)
- Test: `tests/unit/posts-image-store.test.ts`, `tests/unit/posts-image-client.test.ts`, `tests/unit/posts-section-images.test.tsx`, `tests/unit/brand-store.test.ts`

**Interfaces:**
- Produces: `imageKey(batchId: string, postId: string): string` (`${batchId}/${postId}`) in `image-store.ts`; `loadImages(ownerId)` returns `Map<string, SavedImage>` keyed by `imageKey`; `ImageEvent` error and offline variants carry `batchId`; `isImageRunning(batchId, postId)`; `SavedTranslation` type and the `translations` store in `ShopfrontDb` (Task 8 fills it).

- [ ] **Step 1: Write the failing tests**
  - `two batches keep their own images`: save `post-1` for batch `a` and for batch `b`; `loadImages` has 2 entries and `get(imageKey('a', 'post-1')).batchId === 'a'`.
  - `the version 4 upgrade moves saved images under their batch`: open `shopfront` at version 3 with raw `idb` and the v3 stores, put one image `{ postId: 'post-2', batchId: 'b1', … }`, close, `resetStoreForTests()`; `loadImages` has key `imageKey('b1', 'post-2')`, and the database has a `translations` store.
  - `resume treats another batch's image as not done` (image client): an open run for batch `b` with step `post-1` pending, a saved image for batch `a` `post-1`; the resume asks for `post-1`.
  - `two batches show their own images` (section): two saved batches with the same post ids and different images; each batch's first card shows its own image's object URL.
  - `forget deletes translations` (brand store): put a translation for the owner and one for another owner; after `forgetBrand`, only the other remains.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image-store.test.ts tests/unit/posts-image-client.test.ts tests/unit/posts-section-images.test.tsx tests/unit/brand-store.test.ts`. Expected: the five new tests FAIL. Copy the summary line into the journal's RED.
- [ ] **Step 3: Implement.** In the upgrade, `if (oldVersion < 4)`: when `oldVersion >= 3`, read `transaction.objectStore('images').getAll()`, `db.deleteObjectStore('images')`; create `images` with `keyPath: ['batchId', 'postId']` and the `ownerId` index, put the records back; create `translations` with `keyPath: ['batchId', 'postId', 'locale']` and an `ownerId` index. Key `livePosts`, `supersede` (skip runs of another `batchId`), `resumeImages`' `saved.has`, and the section's `images`, `making` and `failed` by `imageKey`.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: all pass.
- [ ] **Step 5: Commit** `fix(posts): key images by batch and post, not post alone` (the files above).

### Task 2: Edits, staleness per post, and the rewrite merge

**Files:**
- Modify: `lib/posts/batch.ts` (`postSchema` gains `edited: z.boolean().optional()`, `altToCheck: z.boolean().optional()`, `profileHash: z.string().optional()`; absent means `false`, `false`, the batch's hash)
- Create: `lib/posts/edit.ts`
- Test: `tests/unit/posts-edit.test.ts`, `tests/unit/posts-batch.test.ts`

**Interfaces:**
- Produces, in `lib/posts/edit.ts`:
  - `INSTAGRAM_CAPTION_MAX = 2200`
  - `type PostEdit = { caption: string; hashtags: string; altText: string }`
  - `parseHashtags(text: string): string[]` — splits on spaces and commas, then `cleanHashtags`
  - `postText(post: Pick<Post, 'caption' | 'hashtags'>, cta: string): string` — caption, blank line, call to action, blank line, `#tag #tag`; empty parts and their blank lines left out
  - `charsOver(edit: PostEdit, cta: string): number` — `postText` length past 2,200, else 0
  - `applyEdit(post: Post, edit: PostEdit, profile: Profile): Post` — trimmed caption (no cut), parsed hashtags, trimmed alt text, `unchecked: findFlags(caption, profile)`, `edited: true`, `altToCheck: false`, `profileHash: profileHash(profile)`
  - `postHash(post: Post, batch: PostBatch): string`
  - `isPostStale(post: Post, batch: PostBatch, profile: Profile): boolean`
  - `staleUnedited(batch: PostBatch, profile: Profile): Post[]`
  - `flagsFor(post: Post, batch: PostBatch, profile: Profile): Flag[]` — `findFlags` against today's profile for an edited stale post, else `post.unchecked`
  - `mergeRewrite(batch: PostBatch, result: PlanResult, sentIds: string[]): PostBatch` — sent posts from `result` with `edited: false` and `profileHash: result.profileHash`; the others kept with `profileHash: postHash(post, batch)`; batch takes `result`'s `profileHash`, `model`, `promptVersion`, `dropped`
  - `markNewImage(batch: PostBatch, postId: string): PostBatch` — that post's `altToCheck: true`

- [ ] **Step 1: Write the failing tests** (`posts-edit.test.ts`):
  - `hashtags are cleaned on save`: `parseHashtags('#DaNang massage, danang #spa')` equals `['danang', 'massage', 'spa']`.
  - `an edited caption isn't cut`: a 900-character caption survives `applyEdit` whole.
  - `a price the owner adds is flagged`: `applyEdit` with caption `… only 450k` on `senProfile()` gives an `unchecked` entry of kind `price`. (Pick a price not in Sen's offerings; check the helper.)
  - `charsOver counts the whole post`: caption of `2200 - postText(rest).length + 3` characters gives 3.
  - `an edit stamps today's hash`: `applyEdit(...).profileHash === profileHash(profile)` and `edited === true`, `altToCheck === false`.
  - `old posts take the batch's hash`: a post without `profileHash` has `postHash === batch.profileHash`.
  - `only unedited stale posts need the update`: batch of 6, 2 edited, profile changed; `staleUnedited` has 4.
  - `the merge keeps what wasn't sent`: `mergeRewrite` with 4 sent ids keeps the 2 others' captions and freezes their old hash, so they stay stale against the new profile.
  - `postText` with no call to action has no blank-line pair for it.
  - (`posts-batch.test.ts`) `a stored batch without the new fields still parses`.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-edit.test.ts tests/unit/posts-batch.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `lib/posts/edit.ts` and the schema fields.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(posts): edits, per-post staleness and the rewrite merge`.

### Task 3: "Update captions" leaves edited posts alone

**Files:**
- Modify: `lib/posts/client.ts` (`startRewrite` takes `postIds`; the body holds only those posts; `toBatch` uses `mergeRewrite`), `lib/runs/run-record.ts` (`newPostsRun` input and `RunRecord` gain `postIds?: string[]`, so a resumed rewrite sends the same posts), `components/posts/posts-section.tsx`, `messages/*.json` (`posts.staleEdited`, `posts.rewriteOne`)
- Test: `tests/unit/posts-client.test.ts`, `tests/unit/posts-section.test.tsx`

**Interfaces:**
- Consumes: Task 2's `staleUnedited`, `mergeRewrite`, `isPostStale`.
- Produces: `startRewrite(input: { ownerId: string; profile: Profile; batch: PostBatch; postIds: string[] }, onEvent, deps?)`.

- [ ] **Step 1: Write the failing tests**
  - (client) `a rewrite sends only the posts asked for`: request body `posts` has the 4 ids given.
  - (client) `a rewrite keeps the posts it didn't send`: the final batch has 6 posts, the 2 unsent unchanged.
  - (client) `a resumed rewrite sends the same posts`.
  - (section) `update captions leaves edited posts out`: 2 edited of 6; tap "Update captions"; the body has 4 posts; "Posts you edited stay as you wrote them." shows.
  - (section) `no stale line when only edited posts are out of date`: all 6 edited, profile changed; no "Your business details changed", and each card shows "Rewrite this one too".
  - (section) `rewrite this one too sends one post` and the card loses "Edited" after the answer.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-client.test.ts tests/unit/posts-section.test.tsx`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** The stale line shows while `staleUnedited(batch, profile).length > 0`; "Update captions" sends those ids; `isStale` in `lib/posts/store.ts` goes (no caller left). "Rewrite this one too" shows on an edited card while `isPostStale`, disabled while busy. Each card gets `flags={flagsFor(post, batch, profile)}`, so an edited stale post's "Check before posting:" is checked against today's details with no call; test `an edited post's flags follow the new details`.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(posts): update captions leaves edited posts alone`.

### Task 4: The card's layout and the editor

**Files:**
- Create: `components/posts/post-editor.tsx`
- Modify: `components/posts/post-card.tsx`, `components/posts/post-image.tsx` ("See the story" beside a "New image" slot, filled in Task 7), `components/posts/posts-section.tsx` (`saveEdit`: `applyEdit`, `saveBatch`, state), `messages/*.json` (`posts.number`, `posts.edit.*`: edit, save, cancel, edited, caption, hashtags, hashtagsHint, altText, altCount, tooLong, empty)
- Test: `tests/unit/posts-card-edit.test.tsx`

**Interfaces:**
- Consumes: Task 2's `PostEdit`, `charsOver`, `parseHashtags`, `flagsFor`.
- Produces: `PostCard` props `{ post: Post; cta: string; number?: number; anchorId?: string; flags?: Flag[]; image?: { state: ImageState; onRetry?: () => void; onNewImage?: (hint: string) => void }; onSave?: (edit: PostEdit) => void; onRewrite?: () => void; busy?: boolean; translation?: ReactNode; takeAway?: ReactNode }`. No `onSave` (a streaming post) means no "Edit".

- [ ] **Step 1: Write the failing tests**
  - `the card follows the mockup's order`: image, "See the story", type and "Post 1", caption, call to action, hashtags, "Image description", "Edit", in DOM order.
  - `edit, save, and the card says Edited`: change the caption, Save; `onSave` gets the new caption; re-rendered with `edited: true`, "Edited" shows.
  - `cancel puts the fields back`.
  - `too long for Instagram`: a caption 10 characters past the limit disables Save and shows "Too long for Instagram: 10 characters over."
  - `a blank caption can't be saved`: `"  \n "` disables Save and shows "Write a caption first."
  - `the alt text counter`: shows `76/125` for a 76-character alt text; the input has `maxLength` 125.
  - `edit is disabled while a run is busy`.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-card-edit.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** The caption textarea grows with its text (`field-sizing: content`, with `rows` as the fallback). The call to action stays read-only below it.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(posts): edit a post's caption, hashtags and alt text`.

### Task 5: The feed preview

**Files:**
- Create: `components/posts/feed-preview.tsx`, `components/posts/object-url.ts` (move `useObjectUrl` out of `post-image.tsx`, backed by a module `WeakMap<Blob, string>` so a card and its tile share one URL; nothing revoked while the page lives)
- Modify: `components/posts/posts-section.tsx` (the preview above each batch's cards when images are on; each card's `anchorId` is `post-${batch.id}-${post.id}`), `messages/*.json` (`posts.feed.title`, `posts.feed.order`)
- Test: `tests/unit/posts-feed-preview.test.tsx`

**Interfaces:**
- Produces: `FeedPreview({ batch, images, onPick }: { batch: PostBatch; images: Map<string, SavedImage>; onPick: (postId: string) => void })`.

- [ ] **Step 1: Write the failing tests**
  - `tiles show post 6 first`: six tiles, the first's label is 6, the last's is 1.
  - `a post with no image shows its type`: the tile has the type label and no `img`.
  - `a tap picks the post`: `onPick('post-3')`.
  - `the order note shows`: "Post them from 1 to 6: the last one you post shows first."
  - (section) `tapping a tile scrolls to its card`: `scrollIntoView` called on the element with id `post-<batch>-post-3`.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-feed-preview.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** A 3-column grid, 2 px gaps, tiles `aspect-[3/4] object-cover` (centred slice of the 4:5 post). Check Instagram's grid ratio on a real profile and record it in the journal.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(posts): feed preview above each batch`.

### Task 6: Taking it away

**Files:**
- Create: `lib/posts/take-away.ts`, `components/posts/take-away.tsx`
- Modify: `components/posts/posts-section.tsx` (passes `profile.name` and the batch's `createdAt`), `messages/*.json` (`posts.takeAway.*`: copy, copied, copyHere, savePost, saveStory)
- Test: `tests/unit/posts-take-away.test.ts`, `tests/unit/posts-take-away.test.tsx`

**Interfaces:**
- Consumes: Task 2's `postText`.
- Produces: `imageFileName(name: string, createdAt: string, n: number, kind: 'post' | 'story'): string`; `copyToClipboard(text: string, clipboard?: Pick<Clipboard, 'writeText'>): Promise<boolean>`; `saveImageFile(blob: Blob, fileName: string, env?: { navigator: Navigator; document: Document }): Promise<'shared' | 'downloaded' | 'cancelled'>`; `TakeAway({ post, cta, image, name, createdAt, number })`.

- [ ] **Step 1: Write the failing tests**
  - `file names`: `imageFileName('Sen Da Nang Massage', '2026-10-25T09:00:00.000Z', 2, 'post')` is `sen-da-nang-massage-2026-10-25-2-post.jpg`.
  - `file names fold accents and symbols`: `'Sen Đà Nẵng Spa!'` gives `sen-da-nang-spa-…` (NFD, marks stripped, `đ` → `d`, runs of `-` collapsed, none at the ends).
  - `copy text holds caption, call to action and hashtags`.
  - `a refused clipboard returns false`.
  - `saving shares when files can be shared`: `canShare` true calls `share({ files: [File] })`, returns `shared`; an `AbortError` returns `cancelled`.
  - `saving downloads otherwise`: an `<a download="…">` is clicked, returns `downloaded`.
  - (component) `Copied for 2 s`, then "Copy caption" again (fake timers); `a refused clipboard opens the sheet` with the text selected and "Copy it from here."; `no save buttons without an image`.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-take-away.test.ts tests/unit/posts-take-away.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** The date is `createdAt.slice(0, 10)`. "Copy caption" is the full-width main button, the two saves side by side under it.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(posts): copy the words and save each image`.

### Task 7: A new image with a hint

**Files:**
- Modify: `lib/posts/image.ts` (`hint: z.string().max(60).optional()`), `lib/posts/image-prompt.ts` (`IMAGE_PROMPT_VERSION = 'images-4'`; `cleanHint`; `imagePrompt(postPrompt, hint?)`), `lib/posts/image-run.ts` and `lib/posts/image-log.ts` (log `hint=yes|no`, never the text), `lib/posts/image-client.ts` (`startImages` input `hint?`; the body carries it; the run keeps it for a resume), `lib/runs/run-record.ts` (`hint?: string` on an images run), `components/posts/post-image.tsx` (the form; the old image dimmed with "Making the image…" over it; a failure under the old image; "Check that the image description still fits."), `components/posts/posts-section.tsx` (`newImage`; on its answer, `markNewImage` and `saveBatch`), `messages/*.json` (`posts.images.newImage`, `hintLabel`, `hintPlaceholder`, `makeIt`, `cancel`, `checkAlt`)
- Test: `tests/unit/posts-image.test.ts`, `tests/unit/posts-image-route.test.ts`, `tests/unit/posts-image-client.test.ts`, `tests/unit/posts-image-card.test.tsx`, `tests/unit/posts-section-images.test.tsx`

**Interfaces:**
- Produces: `cleanHint(raw: string | undefined): string | undefined` (trimmed, `\s*[\r\n]+\s*` → one space, trailing `.` dropped, empty → undefined); `imagePrompt(postPrompt: string, hint?: string): string`; `ImageState` `ready` gains `making?: boolean; failure?: ImageErrorCode | 'no_space' | 'offline'`.

- [ ] **Step 1: Write the failing tests**
  - `a hint goes before the style line`: `imagePrompt('A room', 'more green')` contains `The owner asks: more green. ` immediately before `IMAGE_STYLE`; without a hint, as `images-3` built it.
  - `a hint is cleaned`: `cleanHint('  more\ngreen. ')` is `more green`; `cleanHint('  ')` is undefined.
  - `61 characters is invalid`: the schema rejects it; the route answers `400 invalid_request`.
  - `the route passes the cleaned hint and logs no text`.
  - (client) `the hint is in the body` and `a resumed run sends the same hint`.
  - (card) `the old image stays dimmed while a new one is made`; `a failed new image keeps the old one and shows the error`; `new image is disabled while one is made`; `no New image when images are off`.
  - (section) `a new image asks the owner to check the description`, and the line goes after a saved edit, also after a reload.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image.test.ts tests/unit/posts-image-route.test.ts tests/unit/posts-image-client.test.ts tests/unit/posts-image-card.test.tsx tests/unit/posts-section-images.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** In the section, an image answer for a post that already had one replaces it only once saved (the store write happens before the event, as today), then `markNewImage`.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: pass.
- [ ] **Step 5: Commit** `feat(posts): a new image with an optional hint`.

### Task 8: The owner's-language view

**Files:**
- Create: `lib/posts/translate.ts` (schemas, error codes), `lib/posts/translate-prompt.ts`, `lib/posts/translate-run.ts` (the step with its 20 s cut-off and log line), `lib/posts/translation-store.ts`, `lib/posts/translate-client.ts`, `app/api/posts/translate/route.ts`, `components/posts/caption-translation.tsx`
- Modify: `lib/ai/text-model.ts` (`translateCaption`), `lib/ai/replay.ts` (`translation?: Recording`), `lib/brand/deps.ts` (`defaultTranslateDeps`), `lib/posts/input.ts` (export the FNV-1a text hash `profileHash` uses as `hashText(text: string): string`), `components/posts/posts-section.tsx`, `messages/*.json` (`posts.translate.*`: show, hide, label, errors.model_busy, model_timeout, model_failed)
- Test: `tests/unit/posts-translate.test.ts`, `tests/unit/posts-translate-route.test.ts`, `tests/unit/posts-translation-store.test.ts`, `tests/unit/posts-translation.test.tsx`, `tests/unit/ai-text-model.test.ts`

**Interfaces:**
- Produces:
  - `translateBodySchema`: `{ text: z.string().min(1).max(2200), locale: z.enum(['id', 'vi']) }`; `TRANSLATE_ERROR_CODES = ['invalid_request', 'model_busy', 'model_timeout', 'model_failed']` and `type TranslateErrorCode`, with statuses 400, 503, 504, 502; answer `{ text: string; model: string; promptVersion: string }`
  - `TextModel.translateCaption(text: string, locale: 'id' | 'vi', signal: AbortSignal): Promise<string>`
  - `SavedTranslation = { batchId: string; postId: string; ownerId: string; locale: 'id' | 'vi'; captionHash: string; text: string; model: string; promptVersion: string; createdAt: string }`
  - `loadTranslation(batchId: string, postId: string, locale: 'id' | 'vi', caption: string): Promise<SavedTranslation | null>` (null when `captionHash` differs); `saveTranslation(t: SavedTranslation): Promise<void>`
  - `getTranslation(input: { ownerId: string; batchId: string; postId: string; caption: string; locale: 'id' | 'vi' }, deps?: { fetch; now }): Promise<{ ok: true; text: string } | { ok: false; code: TranslateErrorCode | 'offline' | 'signedOut' }>`

- [ ] **Step 1: Write the failing tests**
  - (route) `only the caption is sent`: the replayed model receives the body's `text` exactly; `invalid locale is 400 invalid_request`; `2,201 characters is 400`; `busy is 503 model_busy`; `a hang is 504 model_timeout` (cut-off injected short); `401 without a session` comes from `proxy.ts` (already covered).
  - (run) `the log line has no text`: the formatted line holds owner, locale, model, prompt, chars in and out, ms, outcome, and neither string.
  - (store) `a saved translation is used while the caption matches` and `a translation for an older caption isn't used`.
  - (client) `a saved translation makes no request`; `401 is signedOut`; `a network error is offline`.
  - (component) `no button in English`; `Show in Tiếng Việt` (label from `LOCALE_NAMES`), then the translation in the muted box with "In Tiếng Việt, for you to read. Instagram gets the English." and "Hide"; `a failure shows its message and the button again`.
  - (model) `translateCaption uses flash-lite with minimal thinking and no retries` (mock `generateText`).
  - `replayed translations`: the two recordings from Step 4 parse and replay through the route.
- [ ] **Step 2: Run** `pnpm test tests/unit/posts-translate.test.ts tests/unit/posts-translate-route.test.ts tests/unit/posts-translation-store.test.ts tests/unit/posts-translation.test.tsx tests/unit/ai-text-model.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** The prompt says: translate faithfully into the language for the owner to understand; keep prices, numbers, names and emoji as they are; add nothing; plain text only. The view reads the store only on tap.
- [ ] **Step 4: Record.** Create `scripts/eval-translate.ts` (`pnpm eval:translate [slug…] [--record]`, default `sen:vi svarga:id`, caption from the fixture's recorded posts, writes `tests/fixtures/sites/<slug>/translate-<locale>.json`); add the script to `package.json` and a row to AGENTS.md's Commands. **Ask the owner first** (2 Flash-Lite requests), then run it with `--record`. Read both back through Google Translate for added or lost facts; record the verdict and `translate-1` in the journal.
- [ ] **Step 5: Run** the Step 2 command, then `pnpm check`. Expected: pass.
- [ ] **Step 6: Commit** `feat(posts): read a caption in the owner's language`.

### Task 9: Phone tests

**Files:**
- Create: `tests/e2e/editor.spec.ts`
- Modify: `tests/e2e/helpers/posts-stream.ts` (a translate fulfiller), `tests/e2e/helpers/images.ts` (record request bodies)
- Test: the file above

- [ ] **Step 1: Write the tests**, routes mocked, at the phone viewport, one per spec line: six tiles above a batch, tap one and land on its card; edit, save, reload, kept with "Edited"; edit the summary, "Update captions", the edited caption unchanged, then "Rewrite this one too" replaces it; Vietnamese screen, "Show in Tiếng Việt", translation, reload, open again with no request; a new image with "more green" carries the hint; in a browser without file sharing, "Save post image" downloads `<name>-<date>-2-post.jpg`; two batches keep their own images after a reload.
- [ ] **Step 2: Run** `pnpm test:e2e tests/e2e/editor.spec.ts`. Expected: pass (they run against finished code; any failure is a bug to fix in its task's files, with a unit test first).
- [ ] **Step 3: Run** `pnpm test:e2e` and `pnpm check`. Expected: all pass.
- [ ] **Step 4: Commit** `test(posts): phone tests for the editor and saving`.

### Task 10: Close the branch

**Files:**
- Modify: `docs/roadmap.md` (2.4 → `done`), `docs/specs/posts/editor-download/journal.md` (GREEN line; what's still owed by the owner: the grid ratio on a real profile if not checked, and saving one post and one story to Photos on a real iPhone and a real Android phone, then posting them), AGENTS.md map lines if a path's role changed

- [ ] **Step 1:** `pnpm check` and `pnpm test:e2e`. Expected: pass; copy the Vitest summary into GREEN.
- [ ] **Step 2: Commit** `docs(posts): editor and download journal and roadmap (roadmap 2.4)`.
- [ ] **Step 3:** Push `claude/roadmap-next-item-70a66f` and open a PR to `develop` (superpowers:finishing-a-development-branch).
