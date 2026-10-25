# Generate copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, AGENTS.md "Plans") to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the saved brand profile into six checked posts (type, topic, scene, caption, call to action, hashtags, alt text, image prompt) kept on the phone, and rewrite a batch's captions in one call after a brand edit.

**Architecture:** Two route handlers (`/api/posts/plan`, `/api/posts/rewrite`) each stream one structured Gemini call as NDJSON, checking each post as it completes and the whole batch at the end. The browser drives the step as a decision 0005 run, saves the batch in a new IndexedDB store, and shows it under the brand panel. All post logic lives in `lib/posts/`; the text-model module gains two methods.

**Tech Stack:** Next.js route handlers, AI SDK (`streamText` + `Output.object`) with `@ai-sdk/google`, zod 4, idb, next-intl, Vitest, Playwright.

**Spec:** `docs/specs/posts/generate-copy/spec.md` (approved). Journal: `docs/specs/posts/generate-copy/journal.md`.

## Global Constraints

- Model constant `TEXT_MODELS.posts = 'gemini-3.5-flash-lite'`; prompt version `POSTS_PROMPT_VERSION = 'posts-1'`, bumped on every prompt change.
- Route `maxDuration = 300`; the step gives up at `POSTS_TIMEOUT_MS = 60_000`; `maxRetries: 0`; `request.signal` reaches the model.
- The model input never holds `contact.*` or `location.address`.
- Limits: 6 posts; ≤ 2 per type; ≤ 2 per scene; first line ≤ 125 chars; caption 250–700 chars before the call to action; 3–5 hashtags `[a-z0-9]+`; alt text ≤ 125 chars; image prompt ≤ 80 words; topic ≤ 12 words; `recent` = newest 12.
- Call to action, added by code: `Book on WhatsApp: {contact.whatsapp.value}`.
- Every visible string in `messages/en.json`, `id.json`, `vi.json` in the same commit.
- No model call in unit tests; recordings replay. `pnpm eval:posts` spends 1 Gemini request per fixture: a few slugs at a time, never on a pilot day.
- Commits: Conventional Commits, scope from `commitlint.config.mjs`; stage by path; RED and GREEN summary lines copied into the journal.

## Review Focus

1. **A profile with one offering, no highlights, no promise** (thin site): the plan must still give 6 posts with no `proof` post and no invented fact; code must not crash when the mix can't be met. Test in Task 3 (`checkPlan` on a thin profile answer) and Task 9 (replay on a thin fixture).
2. **Prices written the way the site writes them** (`350.000đ`, `IDR 250K`, `Rp 250.000`, `$25`, `250k`): a matching price must not be flagged, a different one must. Test table in Task 3.
3. **The owner edits the WhatsApp number while a batch is being made**: the saved batch must carry the new number. Test in Task 6 (`applyCta` after save) .
4. **The page reloads mid-run, then the owner taps "Forget my business"**: no orphan run or batch is left, and the plan isn't requested again. Test in Task 6.
5. **The stream drops after 3 posts**: the cards go away and the run resumes once; no half batch is saved. Test in Task 7.

---

### Task 1: Checks before code

**Files:**
- Create: `docs/specs/posts/generate-copy/journal.md` (from `docs/templates/journal.md`)

- [ ] **Step 1:** Check Instagram's current hashtag limit per post and alt-text length limit on Instagram's own help pages; write the date, the URLs and the numbers in the journal. If they differ from 5 and 125, stop and tell the developer before any code (the spec's limits change).
- [ ] **Step 2:** Commit: `git add docs/specs/posts/generate-copy/journal.md && git commit -m "docs(docs): record Instagram's limits for generate-copy"`

### Task 2: Post schemas and the model input

**Files:**
- Create: `lib/posts/batch.ts`, `lib/posts/input.ts`
- Test: `tests/unit/posts-batch.test.ts`, `tests/unit/posts-input.test.ts`

**Interfaces:**
- Consumes: `Profile`, `LIMITS` from `lib/brand/profile.ts`.
- Produces (in `lib/posts/batch.ts`):
  - `POST_TYPES = ['offer','moment','local','ritual','tip','proof'] as const`, `type PostType`
  - `SCENES = ['treatment','detail','place','guest'] as const`, `type Scene`
  - `POSTS_LIMITS = { posts: 6, perType: 2, perScene: 2, firstLineChars: 125, captionMin: 250, captionMax: 700, hashtagsMin: 3, hashtags: 5, altTextChars: 125, imagePromptWords: 80, topicWords: 12, recent: 12 } as const`
  - `type Flag = { kind: 'price' | 'duration' | 'banned' | 'firstLine'; text: string }`
  - `postSchema` (zod) / `type Post = { id: string; type: PostType; topic: string; scene: Scene; caption: string; cta: string; hashtags: string[]; altText: string; imagePrompt: string; unchecked: Flag[] }`
  - `planResultSchema` / `type PlanResult = { posts: Post[]; dropped: { field: string; reason: string }[]; promptVersion: string; model: string; profileHash: string }` (what the route's final line carries)
  - `batchSchema` / `type PostBatch = PlanResult & { id: string; ownerId: string; createdAt: string; profileReadAt: string }`
  - `modelPostPlanSchema` (loose strings, no limits, as `modelProfileSchema`): `{ posts: { type, topic, scene, caption, hashtags: string[], altText, imagePrompt }[] }`, `type ModelPostPlan`
  - `modelRewriteSchema`: `{ posts: { id, caption, hashtags: string[], altText }[] }`, `type ModelRewrite`
  - `type RecentPost = { type: PostType; topic: string }`
  - `planBodySchema = z.object({ profile: profileSchema, recent: z.array(recentSchema).max(12) })`, `rewriteBodySchema = z.object({ profile: profileSchema, posts: z.array(postSchema.pick({ id, type, topic, scene, caption, imagePrompt })).min(1).max(6) })`
  - `POSTS_ERROR_CODES = ['invalid_profile','model_busy','model_timeout','model_failed'] as const`, `POSTS_ERROR_STATUS = { invalid_profile: 400, model_busy: 503, model_timeout: 504, model_failed: 502 }`
- Produces (in `lib/posts/input.ts`):
  - `type PostsModelInput` = the profile minus `contact`, `location.address`, `siteUrl`, `readAt`, `pagesRead`, `photoUrls`, `logoUrl`, `dropped`, `promptVersion`, `searchedAt`, `searchPromptVersion`, `thin`, `schemaVersion`
  - `postsModelInput(profile: Profile): PostsModelInput`
  - `profileHash(profile: Profile): string`: FNV-1a 32-bit hex of a key-sorted `JSON.stringify(postsModelInput(profile))` (synchronous, same in browser and Node)
  - `ctaFor(profile: Profile): string | null`: `Book on WhatsApp: ${whatsapp.value}`, or null without one

- [ ] **Step 1: Write the failing tests**
  - `postsModelInput holds no contact field and no address`: build a profile with WhatsApp, email, phone, address; `JSON.stringify(input)` contains none of their values; contains `name.value`, an offering's price, `essence.searchTerms`.
  - `profileHash changes on a summary edit, not on a WhatsApp edit`.
  - `profileHash is stable across key order`.
  - `ctaFor gives "Book on WhatsApp: +84 905 123 456"`, and `null` without WhatsApp.
  - `batchSchema accepts a six-post batch and refuses a hashtag with "#"` (`postSchema.hashtags` items match `/^[a-z0-9]+$/`).
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-batch.test.ts tests/unit/posts-input.test.ts`: FAIL (modules missing).
- [ ] **Step 3:** Implement both modules with the signatures above.
- [ ] **Step 4:** Same command: PASS.
- [ ] **Step 5:** Commit `feat(posts): post schemas, model input and profile hash`.

### Task 3: Code's checks

**Files:**
- Create: `lib/posts/checks.ts`
- Test: `tests/unit/posts-checks.test.ts`

**Interfaces:**
- Consumes: Task 2's types; `BANNED_WORDS` from Task 4 (create `lib/posts/banned.ts` here with `export const BANNED_WORDS: readonly string[]`, at least `sensual`, `happy ending`, `body to body`, `nuru`, `erotic`, `sexy`, `nude`; Task 4's prompt imports it).
- Produces:
  - `checkPost(raw: ModelPostPlan['posts'][number], profile: Profile, id: string): { post: Post | null; dropped: Dropped[] }`: null when `type` or `scene` isn't one of the enums, or caption is empty.
  - `checkPlan(posts: Post[], dropped: Dropped[]): { posts: Post[]; dropped: Dropped[] }`: cuts past 6; records `{ field: 'mix', reason }` for a type or scene over 2, and for fewer than 2 `offer` posts when `offerings.length >= 2`.
  - `checkRewrite(raw: ModelRewrite, original: Post[], profile: Profile): { posts: Post[]; dropped: Dropped[] }`: keeps each original's id, type, topic, scene, image prompt; a missing or unknown id keeps the original post unchanged and records it.
  - `cleanHashtags(raw: string[]): string[]`, `findFlags(caption: string, profile: Profile): Flag[]`, `cutCaption(caption: string): string`

Price and duration matching, the one algorithm the tests don't fully pin:

```ts
// A price: a currency mark next to a number, or a number with k/K. Compared on
// digits only, after expanding "k" to "000" (250k → 250000, 350.000đ → 350000).
const PRICE = /(?:(?:\$|USD|VND|IDR|Rp\.?|đ)\s?\d[\d.,]*\s?[kK]?|\d[\d.,]*\s?(?:[kK]\b|VND|IDR|USD|đ|\$))/g;
const DURATION = /\d+\s?(?:minutes?|mins?|hours?|hrs?|h)\b/gi; // compared as minutes
```

- [ ] **Step 1: Write the failing tests**, with exact values:
  - `a matching price is not flagged`: offering price `350,000 VND`; captions with `350.000đ`, `350k`, `VND 350,000` → `[]`.
  - `an unknown price is flagged`: same profile, `only 450k` → `[{ kind: 'price', text: '450k' }]`.
  - `durations compare in minutes`: offering duration `90 minutes`; `1.5 hours` and `90 min` pass; `60 min` → `{ kind: 'duration', text: '60 min' }`.
  - `a banned word is flagged`: `a sensual escape` → `{ kind: 'banned', text: 'sensual' }`.
  - `a long first line is flagged, not cut`: 130-char first line → `{ kind: 'firstLine', … }`, caption unchanged.
  - `a caption over 700 characters is cut at the last full sentence`.
  - `hashtags are cleaned`: `['#DaNang','massage danang','danang','Spa!','aftersurf','relax','balcony']` → `['danang','massagedanang','spa','aftersurf','relax']`.
  - `alt text is cut to 125 characters at a word boundary`; `image prompt is cut to 80 words`.
  - `checkPost drops an unknown type` and records it.
  - `checkPost sets cta from the profile`.
  - `checkPlan keeps 6 of 7 and records a type used 3 times` as `{ field: 'mix' }`.
  - `checkPlan on a thin profile`: one offering, 4 posts → keeps 4, no throw (Review Focus 1).
  - `checkRewrite keeps the original's type, topic, scene and image prompt`, and `keeps an original whose id the model left out`.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-checks.test.ts`: FAIL.
- [ ] **Step 3:** Implement `lib/posts/banned.ts` and `lib/posts/checks.ts`.
- [ ] **Step 4:** Same command: PASS.
- [ ] **Step 5:** Commit `feat(posts): check the model's posts`.

### Task 4: Prompt and text-model methods

**Files:**
- Create: `lib/posts/prompt.ts`
- Modify: `lib/ai/text-model.ts`, `lib/ai/replay.ts`, `lib/brand/fixtures.ts` (`noModel`)
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/ai-text-model.test.ts`

**Interfaces:**
- Produces:
  - `POSTS_PROMPT_VERSION = 'posts-1'`
  - `planPrompt(): string`, `planUserText(input: PostsModelInput, recent: RecentPost[]): string`
  - `rewritePrompt(): string`, `rewriteUserText(input: PostsModelInput, posts: RewriteBody['posts']): string`
  - In `text-model.ts`: `TEXT_MODELS.posts = 'gemini-3.5-flash-lite'`; `type PostsModelCall = { system: string; text: string }`; on `TextModel`: `streamPostPlan(input: PostsModelCall, signal: AbortSignal): ModelStream<ModelPostPlan>` and `streamPostRewrite(input: PostsModelCall, signal: AbortSignal): ModelStream<ModelRewrite>`; `geminiTextModel` takes `modelId` for posts from `opts.postsModelId ?? TEXT_MODELS.posts` (so the eval can try `gemini-3.8-flash`).
  - In `replay.ts`: `replayTextModel(recording, { …, posts?: Recording })` replays `posts.partials`/`posts.final` for both posts methods; `recordingTextModel(…, onPosts?: (r: Recording) => void)`.

- [ ] **Step 1: Write the failing tests**
  - `planPrompt holds every rule of the spec's "What the model writes"`: contains each `POST_TYPES` value, each `SCENES` value, `125`, `700`, `80 words`, `never from behind`, `no text`, `dusk`, every `BANNED_WORDS` item, `No call to action`.
  - `planUserText lists recent topics` and `says none` when empty; `holds no "whatsapp"` for a profile with one.
  - `rewritePrompt says type, topic, scene and image prompt stay`.
  - `replayTextModel replays a posts recording` through `streamPostPlan`: partials then `final`.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-prompt.test.ts tests/unit/ai-text-model.test.ts`: FAIL.
- [ ] **Step 3:** Write the prompts (the rules of the spec's "What the model writes", decision 0004's prompt lessons, the type table); add the two methods to `geminiTextModel` with `streamText` + `Output.object`, thinking `low`, `maxRetries: 0`, errors through `toModelError`, as `streamBrandProfile`; add them to `replayTextModel`, `recordingTextModel` and `noModel`.
- [ ] **Step 4:** Same command, then `pnpm typecheck`: PASS.
- [ ] **Step 5:** Commit `feat(posts): post plan prompt and model calls`.

### Task 5: Server step and routes

**Files:**
- Create: `lib/posts/run.ts`, `lib/posts/log.ts`, `lib/posts/stream.ts`, `lib/stream/ndjson.ts`, `app/api/posts/plan/route.ts`, `app/api/posts/rewrite/route.ts`
- Modify: `lib/brand/stream.ts` (its `readLines` calls `readNdjson`), `lib/brand/deps.ts`
- Test: `tests/unit/posts-run.test.ts`, `tests/unit/posts-route.test.ts`, `tests/unit/posts-log.test.ts`, `tests/unit/brand-stream.test.ts` (still green)

**Interfaces:**
- Produces:
  - `lib/stream/ndjson.ts`: `readNdjson<T>(body: ReadableStream<Uint8Array>, parse: (raw: string) => T): AsyncGenerator<T>` (the body of today's `readLines`, moved).
  - `lib/posts/stream.ts`: `type PostsLine = { type: 'post'; index: number; post: Post } | { type: 'final'; result: PlanResult } | { type: 'error'; code: PostsErrorCode }`; `encodePostsLine`, `readPostsLines(body)`.
  - `lib/posts/run.ts`: `type PostsDeps = { model: TextModel; timeoutMs?: number; log?: (e: PostsLog) => void }`; `streamPlan(body: PlanBody, deps, signal): AsyncGenerator<PostsLine>`; `streamRewrite(body: RewriteBody, deps, signal): AsyncGenerator<PostsLine>`. Each yields a `post` line for post `i` once the partial holds post `i + 1` (post `i` is then complete), runs `checkPost` on it, and at the end yields the rest, then `final` with `checkPlan`'s result, `POSTS_PROMPT_VERSION`, the model id and `profileHash(body.profile)`. Errors: `ModelError('busy')` → `model_busy`; the 60 s timeout → `model_timeout`; anything else → `model_failed`; a client abort ends silently.
  - `lib/posts/log.ts`: `type PostsLog = { host; kind: 'plan' | 'rewrite'; model; promptVersion; kept; flags; modelMs; totalMs; outcome; error? }`, `formatPostsLog(log): string` (one line, never captions).
  - `lib/brand/deps.ts`: `defaultPostsDeps(): PostsDeps`.
  - Routes: `POST` parses with `planBodySchema` / `rewriteBodySchema` → `400 { error: 'invalid_profile' }`; otherwise NDJSON as `app/api/brand/read/route.ts`, `maxDuration = 300`, `runtime = 'nodejs'`.

- [ ] **Step 1: Write the failing tests**
  - `streamPlan yields six post lines then a final` with a replayed recording (build one in the test: partials growing post by post).
  - `a post line comes as soon as the next post starts` (index 0 is yielded before partial 3 of 6 is consumed).
  - `final carries promptVersion posts-1, the model id and profileHash`.
  - `busy → error line model_busy`; `hang past timeoutMs: 50 → model_timeout`; `failed → model_failed`.
  - `the model's input holds no WhatsApp` (spy on the input given to `streamPostPlan`).
  - `streamRewrite keeps image prompts` (end-to-end through `checkRewrite`).
  - Route: `invalid body → 400 invalid_profile`; `valid body → application/x-ndjson`; module mock of `@/lib/brand/deps`, as `brand-route.test.ts` does.
  - `formatPostsLog has no caption text`.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-run.test.ts tests/unit/posts-route.test.ts tests/unit/posts-log.test.ts tests/unit/brand-stream.test.ts`: the posts tests FAIL.
- [ ] **Step 3:** Implement; move `readLines`'s loop into `readNdjson` and keep `readLines`' signature.
- [ ] **Step 4:** Same command: PASS.
- [ ] **Step 5:** Commit `feat(posts): post plan and rewrite routes`.

### Task 6: On the phone: store, run record, call to action

**Files:**
- Create: `lib/posts/store.ts`
- Modify: `lib/brand/store.ts` (DB version 2, `posts` store, `forgetBrand`), `lib/runs/run-record.ts`
- Test: `tests/unit/posts-store.test.ts`, `tests/unit/runs-record.test.ts`, `tests/unit/brand-store.test.ts`

**Interfaces:**
- `lib/brand/store.ts`: `DB_VERSION = 2`; `ShopfrontDb.posts: { key: string; value: PostBatch; indexes: { ownerId: string } }`; `upgrade(db, oldVersion)` creates `brands` and `runs` only when `oldVersion < 1`, and `posts` (keyPath `id`, index `ownerId`) when `oldVersion < 2`; `forgetBrand` also deletes the owner's batches in the same transaction.
- `lib/runs/run-record.ts`: `RunStep` becomes `{ name: 'brand'; … } | { name: 'plan' | 'rewrite'; status: StepStatus; output?: PostBatch }`; `RunRecord.kind` adds `'posts'`, with optional `batchId?: string` (the batch a rewrite replaces); `newPostsRun(input: { ownerId: string; step: 'plan' | 'rewrite'; batchId?: string }, now: Date, id: string): RunRecord` (its `url` is `''`, `reread` false). `resumeRun`, `stepsToRequest`, `isFinished` work unchanged for the new steps.
- `lib/posts/store.ts`:
  - `saveBatch(batch: PostBatch): Promise<void>` (put; a rewrite keeps the id)
  - `loadBatches(ownerId: string): Promise<PostBatch[]>` newest first, invalid records skipped
  - `recentPosts(batches: PostBatch[]): RecentPost[]` newest 12
  - `applyCta(ownerId: string, cta: string): Promise<PostBatch[]>` sets `cta` on every post of every batch, returns the batches
  - `isStale(batch: PostBatch, profile: Profile): boolean` (`profileHash` differs)
  - `loadOpenPostsRun(ownerId)`: like `loadOpenRun` but `kind === 'posts'`; `loadOpenRun` in `lib/runs/store.ts` gains a `kind` argument instead if simpler.

- [ ] **Step 1: Write the failing tests** (fake-indexeddb, as `brand-store.test.ts`)
  - `a version-1 database opens as version 2 with its brand kept and an empty posts store`.
  - `loadBatches returns newest first`; `recentPosts takes 12 across batches`.
  - `applyCta changes every post's cta and nothing else`; `a batch saved after a WhatsApp edit carries the new number when applyCta runs after saveBatch` (Review Focus 3: the client calls `applyCta` after every brand save and after saving a batch).
  - `isStale is false after a WhatsApp edit, true after a summary edit`.
  - `forgetBrand deletes batches and posts runs` (Review Focus 4).
  - `newPostsRun` makes a `running` `plan` step; `resumeRun` sends it back to `pending`; a `done` step is never requested.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-store.test.ts tests/unit/runs-record.test.ts tests/unit/brand-store.test.ts`: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command: PASS.
- [ ] **Step 5:** Commit `feat(posts): keep batches on the phone`.

### Task 7: Browser client

**Files:**
- Create: `lib/posts/client.ts`
- Test: `tests/unit/posts-client.test.ts`

**Interfaces:**
- Consumes: `readPostsLines`, `saveBatch`, `applyCta`, `newPostsRun`, `saveRun`, `deleteRun`, `ctaFor`.
- Produces:
  - `type PostsEvent = { type: 'post'; index: number; post: Post } | { type: 'final'; batch: PostBatch } | { type: 'error'; code: PostsErrorCode } | { type: 'offline' } | { type: 'signedOut' }`
  - `startPlan(input: { ownerId: string; profile: Profile; recent: RecentPost[] }, onEvent, deps = defaultReadDeps()): RunningRead`
  - `startRewrite(input: { ownerId: string; profile: Profile; batch: PostBatch }, onEvent, deps): RunningRead`
  - `resumePosts(ownerId: string, profile: Profile, onEvent, deps): Promise<RunningRead | null>`: re-requests a lost `plan` or `rewrite` step, at most 2 times as `resumeRead` (`MAX_RESUMES`), with `recent` re-read from the store.
  - On `final`: `saveBatch` (new id, `createdAt`, `profileReadAt` for a plan; same id for a rewrite), then `applyCta(ownerId, ctaFor(currentProfile))` with the profile as saved now, then `deleteRun`.
  - Mirror `lib/brand/read-client.ts`: the `live` set, 401 → `signedOut`, `TypeError` → `offline`, a stream that ends without `final` → `offline` and no batch saved.

- [ ] **Step 1: Write the failing tests** (fetch stubbed with NDJSON bodies)
  - `six post lines then final save one batch and delete the run`.
  - `the request body holds the profile and recent`.
  - `a stream that drops after 3 posts saves nothing and reports offline; resumePosts asks once more` (Review Focus 5).
  - `an error line deletes the run and reports the code`.
  - `a rewrite keeps the batch id`.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-client.test.ts`: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Same command: PASS.
- [ ] **Step 5:** Commit `feat(posts): drive post runs from the browser`.

### Task 8: The posts section on the home screen

**Files:**
- Create: `components/posts/posts-section.tsx`, `components/posts/post-card.tsx`
- Modify: `components/brand/brand-home.tsx` (render `PostsSection` under the panel; after each brand save call `applyCta`), `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/posts-section.test.tsx`

**Interfaces:**
- `PostsSection({ ownerId, profile, busy }: { ownerId: string; profile: Profile; busy: boolean })`: loads batches, runs `resumePosts` on mount and `visibilitychange`, holds the wake lock (`lib/brand/wake-lock.ts`) during a run.
- `PostCard({ post }: { post: Post })`.
- Messages under a new `posts` namespace, English text exactly as the spec: `make` "Make my posts", `makeMore` "Make 6 more", `needWhatsapp` reuses `brand.panel.warnWhatsapp`, `keepOpen` "Keep this page open for about a minute while your posts are made.", `heading` "Your posts", `types.offer` "Offer", `types.moment` "Why people come", `types.local` "Your town", `types.ritual` "The ritual", `types.tip` "Tip", `types.proof` "What people say", `imageDescription` "Image description", `check` "Check before posting:", `flags.price` and `flags.duration` "{text} is not on your site", `flags.banned` "\"{text}\" may not be allowed on Instagram", `flags.firstLine` "The first line is longer than Instagram shows before \"more\"", `fewer` "We made {count} posts this time.", `stale` "Your business details changed since these posts were made.", `update` "Update captions", `errors.model_busy` "Shopfront has used today's free writing. Try again tomorrow.", `errors.model_timeout` "Writing your posts took too long. Try again.", `errors.model_failed` and `errors.invalid_profile` "Something went wrong while writing your posts. Try again.". Indonesian and Vietnamese written by the builder, in the tone of the existing files.

- [ ] **Step 1: Write the failing tests** (Testing Library, as `brand-home.test.tsx`)
  - `the button is disabled without WhatsApp and shows the warning`.
  - `the button is disabled while busy` (a brand read runs).
  - `the button reads "Make 6 more" when a batch exists`.
  - `a card shows type label, caption, call to action, #hashtags and the image description, and never the image prompt`.
  - `a flagged post shows "Check before posting:" and "450k is not on your site"`.
  - `a stale batch shows the line and "Update captions"`; `a batch made from the current profile doesn't`.
  - `an error event shows its message and enables the button`.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/i18n-messages.test.ts`: FAIL.
- [ ] **Step 3:** Implement with the shadcn/ui components already in `components/ui/`.
- [ ] **Step 4:** Same command, then `pnpm check`: PASS.
- [ ] **Step 5:** Commit `feat(posts): show posts under the brand panel`.

### Task 9: Recordings, eval and model pick

**Files:**
- Create: `scripts/eval-posts.ts`, `tests/unit/posts-fixtures-replay.test.ts`, `tests/fixtures/sites/{sen,svarga,karsa-spa,serenity-bali,orient-spa}/posts.json`
- Modify: `lib/brand/fixtures.ts` (`Fixture.posts: PostsFixture | null`, `type PostsFixture = { modelId: string; promptVersion: string; recording: Recording }`; export `fixtureProfile(dir): Promise<Profile>`, moved from `scripts/eval-search.ts`'s `replayedProfile` and merging the recorded search answer when `search.json` exists), `scripts/eval-search.ts` (uses it), `package.json` (`"eval:posts": "tsx scripts/eval-posts.ts"`), `AGENTS.md` (commands row with the ⚠️ on quota), `docs/specs/posts/generate-copy/journal.md`

**Interfaces:**
- `pnpm eval:posts [slug…] [--record] [--model=<id>]`: per slug, `fixtureProfile`, then `streamPlan` with the real model (or `--model`), prints each post (type, scene, topic, caption + cta, hashtags, alt text, flags), the mix drops and the total ms; `--record` writes `posts.json`.

- [ ] **Step 1: Write the failing test** `posts-fixtures-replay.test.ts`: for each fixture with `posts.json`, replay through `streamPlan`: the final has 1 to 6 posts, every post's `cta` starts with `Book on WhatsApp:` when the profile has WhatsApp, hashtags 3–5 matching `/^[a-z0-9]+$/`, no `proof` post when the profile has no highlights and no promise.
- [ ] **Step 2:** `pnpm vitest run tests/unit/posts-fixtures-replay.test.ts`: FAIL (no recordings, no `fixtureProfile`).
- [ ] **Step 3:** Implement `fixtureProfile` and `scripts/eval-posts.ts`; `pnpm eval:search` still runs replay-only paths unchanged.
- [ ] **Step 4:** Ask the developer before spending quota, then run `pnpm eval:posts sen svarga --model=gemini-3.8-flash` and `pnpm eval:posts sen svarga`. Record each run's model, prompt version and total ms in the journal. Flash wins only under 45 s and if the developer judges it better; if so, set `TEXT_MODELS.posts` to it.
- [ ] **Step 5:** The developer reads Sen's and Svarga's batches with the spec's rubric (as written / after a small edit / wouldn't post; any ungrounded fact); verdicts in the journal. Below 4 of 6 "as written" for either: change the prompt, bump `POSTS_PROMPT_VERSION`, rerun (one slug at a time).
- [ ] **Step 6:** With the final prompt: `pnpm eval:posts sen svarga karsa-spa serenity-bali orient-spa --record` (5 requests; split over days if the quota is short), then the Step 1 command: PASS.
- [ ] **Step 7:** Commit `test(posts): recorded post plans and the posts eval`.

### Task 10: End-to-end, roadmap, PR

**Files:**
- Create: `tests/e2e/posts.spec.ts`, `tests/e2e/helpers/posts-stream.ts`
- Modify: `docs/roadmap.md` (2.2 → `done`), `docs/specs/posts/generate-copy/journal.md`

- [ ] **Step 1: Write the e2e test** at the phone viewport, `/api/brand/read` and `/api/posts/*` mocked with `page.route` as `brand-search.spec.ts` does:
  - tap "Make my posts" → "Keep this page open…" shows → six cards → reload → six cards still there;
  - edit the summary → "Your business details changed…" and "Update captions" show; tap it → one `/api/posts/rewrite` request;
  - a `model_busy` line → "Shopfront has used today's free writing. Try again tomorrow." and the button enabled.
- [ ] **Step 2:** `pnpm test:e2e tests/e2e/posts.spec.ts`: PASS (it fails first only if Task 8 missed something; fix there).
- [ ] **Step 3:** `pnpm check` and `pnpm test:e2e`: all green; copy the summary lines into the journal.
- [ ] **Step 4:** Set 2.2 to `done` in `docs/roadmap.md`; commit `docs(docs): generate-copy done (roadmap 2.2)`.
- [ ] **Step 5:** Push the branch and give the developer a full PR title and body for a PR to `develop` (no `gh`).
