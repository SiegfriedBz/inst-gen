# Generate images Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn each saved post's image prompt into a 1080×1920 story and a
1080×1350 post JPEG with Nano Banana 2.1, shown on the post cards and kept on
the phone.

**Architecture:** One non-streamed route, `POST /api/posts/image`, makes one
image: allowlist check, the image-model module, `sharp` resize and crop,
base64 JSON back. The browser starts six of them in parallel when a batch is
saved, tracks them in a run record of kind `images` (decision 0005), and saves
each answer in a new IndexedDB store `images`.

**Tech Stack:** Next.js 16 route handlers, `ai` + `@ai-sdk/google`, `sharp`
(new direct dependency), `idb`, zod 4, next-intl, Vitest, Playwright.

**Spec:** `docs/specs/posts/generate-images/spec.md`

## Global Constraints

- Model id `gemini-nano-banana-2.1`, key `GOOGLE_IMAGE_API_KEY` only, never `GOOGLE_GENERATIVE_AI_API_KEY`.
- `responseModalities: ['IMAGE']`, `imageConfig: { aspectRatio: '9:16', imageSize: '2K' }`, `maxRetries: 0`, `request.signal` reaches the call.
- `IMAGE_PROMPT_VERSION = 'images-1'`; `IMAGE_USD = 0.05`.
- Route: `runtime = 'nodejs'`, `maxDuration = 300`, own cut-off 60 s; `cache-control: no-store` on every answer.
- Story 1080×1920, post 1080×1350 = the story's rows 285 to 1634; JPEG quality 85, sRGB, no metadata.
- `IMAGE_OWNERS` comma-separated owner ids; empty or missing key = images off for everyone.
- Only the image prompt goes to Google. The log line never holds the prompt.
- Every visible string in `messages/en.json`, `id.json`, `vi.json` in the same commit.
- Commits: Conventional Commits, scope `posts` (or `deps` for the `sharp` add, `docs` for docs); stage by path.
- `lib/ai/` holds the only importers of `@ai-sdk/google`; update AGENTS.md's map line for `lib/ai/`.
- Journal: `docs/specs/posts/generate-images/journal.md`, from `docs/templates/journal.md`, created in Task 1; RED and GREEN summary lines copied as Vitest prints them.

## Review Focus

1. **Two images for one batch finish at the same moment.** Both write the
   run record; neither step's status may be lost. → Task 5 test
   `two steps finishing together both land`.
2. **"Forget my business" while images are still being made.** A late answer
   must not save an image for a forgotten owner. → Task 6 test
   `an answer after stop saves nothing`.
3. **The page reloads with a step whose image was saved but whose run still
   says running.** It must not be asked for again. → Task 6 test
   `resume skips posts that already have an image`.
4. **A model that returns a JPEG or WebP, or a non-9:16 size.** Still a
   1080×1920 and 1080×1350 JPEG. → Task 2 test `an off-ratio JPEG input`.
5. **An owner whose id is listed with spaces or capitals in `IMAGE_OWNERS`**
   (`" Sen, svarga "`). Trimmed and lower-cased. → Task 1 test
   `owner list is trimmed and lower-cased`.

---

### Task 1: Image types, access and prompt

**Files:**
- Create: `lib/posts/image.ts`, `lib/posts/image-access.ts`, `lib/posts/image-prompt.ts`
- Modify: `.env.example` (add `GOOGLE_IMAGE_API_KEY=` and `IMAGE_OWNERS=sen,svarga` with a comment citing decision 0004 and this spec), `playwright.config.ts` `testEnv` (add `GOOGLE_IMAGE_API_KEY: 'test-image-key-not-real'`, `IMAGE_OWNERS: 'sen,svarga'`)
- Test: `tests/unit/posts-image.test.ts`

**Interfaces:**
- Produces, `lib/posts/image.ts`:
  - `imageBodySchema = z.object({ postId: text, imagePrompt: text (refine: ≤ POSTS_LIMITS.imagePromptWords words), scene: z.enum(SCENES) })`, `type ImageBody`
  - `imageResponseSchema = z.object({ postId, story: z.base64(), post: z.base64(), model: text, promptVersion: text, ms: z.number().int().min(0) })`, `type ImageResponse`
  - `IMAGE_ERROR_CODES = ['invalid_request', 'images_off', 'images_paused', 'image_blocked', 'image_timeout', 'image_failed'] as const`, `type ImageErrorCode`
  - `IMAGE_ERROR_STATUS: Record<ImageErrorCode, number>` = 400, 403, 503, 502, 504, 502
  - `IMAGE_SIZES = { story: { width: 1080, height: 1920 }, post: { width: 1080, height: 1350 } } as const`
- Produces, `lib/posts/image-access.ts`:
  - `imageOwners(env?: Record<string, string | undefined>): string[]` (default `process.env`)
  - `imagesOn(ownerId: string, env?): boolean` — key present and owner listed; logs `images: GOOGLE_IMAGE_API_KEY is not set` once per process when the key is missing.
- Produces, `lib/posts/image-prompt.ts`: `IMAGE_PROMPT_VERSION`, `IMAGE_STYLE: string`, `imagePrompt(postPrompt: string): string` (= `${postPrompt.trim()} ${IMAGE_STYLE}`).

- [ ] **Step 1: Write the failing tests**

```ts
test('a prompt over 80 words is refused', () => {
  const long = Array.from({ length: 81 }, () => 'word').join(' ');
  expect(imageBodySchema.safeParse({ postId: 'p', imagePrompt: long, scene: 'detail' }).success).toBe(false);
});
test('an unknown scene is refused', ...scene: 'room' → success false);
test('error statuses', () => expect(IMAGE_ERROR_STATUS).toEqual({ invalid_request: 400, images_off: 403, images_paused: 503, image_blocked: 502, image_timeout: 504, image_failed: 502 }));
test('owner list is trimmed and lower-cased', () =>
  expect(imageOwners({ IMAGE_OWNERS: ' Sen, svarga ,' })).toEqual(['sen', 'svarga']));
test('images are on for a listed owner with a key', () =>
  expect(imagesOn('sen', { IMAGE_OWNERS: 'sen', GOOGLE_IMAGE_API_KEY: 'k' })).toBe(true));
test('off for an owner not listed', ...'dev' → false);
test('off for everyone without a key', ...{ IMAGE_OWNERS: 'sen' } → false);
test('off with an empty list', ...{ IMAGE_OWNERS: '', GOOGLE_IMAGE_API_KEY: 'k' } → false);
test('the prompt ends with the style line and asks for a centred subject', () => {
  const p = imagePrompt('  Warm oil on shoulders at dusk. ');
  expect(p.startsWith('Warm oil on shoulders at dusk. ')).toBe(true);
  expect(p).toContain('Keep the subject in the middle of the frame, with calm space above and below it.');
  expect(p).toMatch(/no text, letters, labels, logos or watermarks/i);
  expect(IMAGE_PROMPT_VERSION).toBe('images-1');
});
```

- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image.test.ts` — Expected: FAIL (modules missing). Copy the summary line to the journal as RED.
- [ ] **Step 3: Implement** the three modules. `IMAGE_STYLE` is the bake-off's style line (spec, "The model step"), verbatim:
  "Vertical photograph for an Instagram story, shot on a full-frame camera with a 50mm lens. Low, soft, warm light: dim and intimate, gentle shadows, nothing bright, harsh or overexposed. A quiet, relaxing mood that invites introspection, as if time has slowed down. Realistic skin and textures, natural anatomy. No face is visible or recognisable. The image contains no text, letters, labels, logos or watermarks; bottles and jars are plain. Keep the subject in the middle of the frame, with calm space above and below it."
- [ ] **Step 4: Run** the test — Expected: PASS. Journal: GREEN line.
- [ ] **Step 5: Commit** `feat(posts): image request, access list and style prompt (roadmap 2.3)` with the five files and the test.

### Task 2: Shrink and crop with sharp

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (`pnpm add sharp`, exact version as the repo pins others)
- Create: `lib/posts/image-crop.ts`
- Test: `tests/unit/posts-image-crop.test.ts`

**Interfaces:**
- Produces: `storyAndPost(data: Uint8Array): Promise<{ story: Buffer; post: Buffer; inWidth: number; inHeight: number }>`

- [ ] **Step 1: Write the failing tests.** Make inputs with `sharp({ create: { width, height, channels: 3, background } })`; for the crop test, a 1536×2752 PNG whose top 20 % is red, middle green, bottom 20 % blue (composite three bands).

```ts
test('a 1536×2752 PNG becomes a 1080×1920 story and a 1080×1350 post', async () => {
  const out = await storyAndPost(png1536x2752);
  expect(await sharp(out.story).metadata()).toMatchObject({ format: 'jpeg', width: 1080, height: 1920 });
  expect(await sharp(out.post).metadata()).toMatchObject({ format: 'jpeg', width: 1080, height: 1350 });
  expect([out.inWidth, out.inHeight]).toEqual([1536, 2752]);
});
test('the post is the story centre', async () => {
  // banded input: post's first and last rows are green, story's are red and blue
  const { data } = await sharp(out.post).raw().toBuffer({ resolveWithObject: true });
  expect(pixelAt(data, 0, 0).g).toBeGreaterThan(200); // and last row
});
test('metadata is stripped', ... (await sharp(out.story).metadata()).exif toBeUndefined);
test('an off-ratio JPEG input', ...1024×1024 JPEG → same two sizes);
test('a non-image throws', ... await expect(storyAndPost(new Uint8Array([1, 2, 3]))).rejects.toThrow());
```

- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image-crop.test.ts` — Expected: FAIL. Journal RED.
- [ ] **Step 3: Implement.** Story: `sharp(data).rotate().resize(1080, 1920, { fit: 'cover', position: 'centre' }).toColorspace('srgb').jpeg({ quality: 85 })`. Post: extract `{ left: 0, top: 285, width: 1080, height: 1350 }` from the resized pixels (not from the re-decoded JPEG), same JPEG options. No `withMetadata`.
- [ ] **Step 4: Run** — Expected: PASS. Journal GREEN, plus the story and post byte sizes for the 1536×2752 test image.
- [ ] **Step 5: Commit** `build(deps): add sharp` (package.json, lockfile) then `feat(posts): shrink and crop an image to story and post (roadmap 2.3)`.

### Task 3: The image-model module

**Files:**
- Create: `lib/ai/image-model.ts`
- Modify: `AGENTS.md` map row for `lib/ai/` ("The text-model and image-model modules, the only importers of `@ai-sdk/google`, and the replayer for recorded calls")
- Test: `tests/unit/ai-image-model.test.ts`

**Interfaces:**
- Produces:
  - `IMAGE_MODEL = 'gemini-nano-banana-2.1'`, `IMAGE_USD = 0.05`
  - `type ImageFile = { data: Uint8Array; mediaType: string }`
  - `interface ImageModel { makeImage(prompt: string, signal: AbortSignal): Promise<ImageFile | null> }` — `null` when the answer holds no image (safety block, text only).
  - `class ImageModelError extends Error { kind: 'paused' | 'failed' }`
  - `geminiImageModel(apiKey: string, modelId?: string): ImageModel`
  - `toImageModelError(error: unknown): ImageModelError` (exported for tests)

- [ ] **Step 1: Write the failing tests** (no network: test the error mapping and the null case with `APICallError` instances from `ai`).

```ts
test('429 is paused', () => expect(toImageModelError(apiError(429, 'Resource exhausted')).kind).toBe('paused'));
test('a spent prepaid balance is paused', () =>
  expect(toImageModelError(apiError(403, 'Your prepayment credits are depleted')).kind).toBe('paused'));
test('a nested 429 is paused', ...new Error('x', { cause: apiError(429, '') }) → 'paused');
test('anything else is failed', ...apiError(500, 'boom') → 'failed'; new Error('x') → 'failed');
```

- [ ] **Step 2: Run** `pnpm test tests/unit/ai-image-model.test.ts` — Expected: FAIL. Journal RED.
- [ ] **Step 3: Implement.** `makeImage` calls `generateText({ model: createGoogleGenerativeAI({ apiKey })(modelId), prompt, providerOptions: { google: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '9:16', imageSize: '2K' } } }, abortSignal: signal, maxRetries: 0 })` and returns the first `result.files` entry whose `mediaType` starts with `image/` as `{ data: file.uint8Array, mediaType }`, else `null`. On error: rethrow `signal.reason` if aborted, else `toImageModelError`. Paused = status 429, or status 400/403 whose message matches `/billing|prepay|credit|balance/i` (best effort; the journal records what Google really answers the first time the balance runs out).
- [ ] **Step 4: Run** — Expected: PASS. Journal GREEN.
- [ ] **Step 5: Commit** `feat(posts): image-model module for Nano Banana 2.1 (roadmap 2.3)`.

### Task 4: The image step and its route

**Files:**
- Create: `lib/posts/image-run.ts`, `lib/posts/image-log.ts`, `app/api/posts/image/route.ts`
- Modify: `lib/brand/deps.ts` (add `defaultImageDeps()`)
- Test: `tests/unit/posts-image-run.test.ts`, `tests/unit/posts-image-route.test.ts`

**Interfaces:**
- Consumes: Task 1 schemas, codes, `imagesOn`, `imagePrompt`; Task 2 `storyAndPost`; Task 3 `ImageModel`, `ImageModelError`, `IMAGE_MODEL`, `IMAGE_USD`.
- Produces:
  - `lib/posts/image-log.ts`: `type ImageLog = { owner: string; postId: string; scene: Scene; model: string; promptVersion: string; size: string | null; storyBytes: number | null; postBytes: number | null; modelMs: number | null; totalMs: number; outcome: 'ok' | 'aborted' | ImageErrorCode; usd: number; error?: string }`, `formatImageLog(log): string` → `image owner=… post=… scene=… model=… prompt=… size=1536x2752 story_bytes=… post_bytes=… model_ms=… total_ms=… outcome=… usd=0.05` (`-` for nulls; `error="…"` as `formatPostsLog` does). `usd` is `IMAGE_USD` once the model answered with an image, else 0.
  - `lib/posts/image-run.ts`: `IMAGE_TIMEOUT_MS = 60_000`; `type ImageDeps = { model: ImageModel; modelId?: string; timeoutMs?: number; log?: (entry: ImageLog) => void }`; `makePostImage(body: ImageBody, ownerId: string, deps: ImageDeps, signal: AbortSignal): Promise<{ ok: true; response: ImageResponse } | { ok: false; code: ImageErrorCode } | { ok: false; code: 'aborted' }>`
  - `lib/brand/deps.ts`: `defaultImageDeps(): ImageDeps | null` — null without `GOOGLE_IMAGE_API_KEY`; log via `console.info(formatImageLog(entry))`.
  - Route: `POST` answers `200 ImageResponse`, or `IMAGE_ERROR_STATUS[code]` with `{ error: code }`; `aborted` answers 499 with no body.

- [ ] **Step 1: Write the failing tests.** `posts-image-run.test.ts` with a fake `ImageModel` returning a generated 1536×2752 PNG:

```ts
test('an image comes back as base64 story and post', ...ok, response.postId === 'post-3', decoded story is 1080×1920, promptVersion 'images-1', model 'gemini-nano-banana-2.1');
test('the model gets the post prompt then the style line', ...fake records prompt; expect(prompt).toBe(imagePrompt(body.imagePrompt)));
test('no image is image_blocked', ...fake returns null → { ok: false, code: 'image_blocked' });
test('paused is images_paused', ...throws new ImageModelError('paused', '') → 'images_paused');
test('past the cut-off is image_timeout', ...timeoutMs: 20, fake never resolves → 'image_timeout');
test('a crop failure is image_failed', ...fake returns { data: Uint8Array.of(1,2,3), mediaType: 'image/png' } → 'image_failed');
test('a closed request is aborted and logs aborted', ...);
test('the log line never holds the prompt', ...expect(formatImageLog(entry)).not.toContain(body.imagePrompt); entry.usd 0.05 on ok, 0 on blocked);
```

`posts-image-route.test.ts`, mocking `@/lib/brand/deps` (fake model) and `@/lib/pilot/current-owner` (`getCurrentOwner` → `'sen'` or `'dev'`), with `vi.stubEnv('IMAGE_OWNERS', 'sen,svarga')` and `vi.stubEnv('GOOGLE_IMAGE_API_KEY', 'k')`:

```ts
test('runs on Node.js with a 300 s ceiling', ...runtime 'nodejs', maxDuration 300);
test('a bad body answers 400 invalid_request', ...);
test('an owner not listed answers 403 images_off', ...'dev');
test('no key answers 403 images_off', ...stubEnv key '' );
test('a listed owner gets 200 and an ImageResponse', ...imageResponseSchema.parse(await res.json()));
test('every answer is no-store', ...);
```

- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image-run.test.ts tests/unit/posts-image-route.test.ts` — Expected: FAIL. Journal RED.
- [ ] **Step 3: Implement.** In `makePostImage`, race the model call against `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)])` as `lib/posts/run.ts` does; map: `null` → `image_blocked`, `ImageModelError` paused → `images_paused`, timeout → `image_timeout`, anything else including `storyAndPost` → `image_failed`. The route checks, in this order: the session owner (`getCurrentOwner`), then `imagesOn(owner)` and `defaultImageDeps() !== null` (else 403 `images_off`), then the body (else 400 `invalid_request`).
- [ ] **Step 4: Run** — Expected: PASS. Journal GREEN.
- [ ] **Step 5: Commit** `feat(posts): image route makes one story and post (roadmap 2.3)`.

### Task 5: Images on the phone and the run record

**Files:**
- Modify: `lib/brand/store.ts` (`DB_VERSION = 3`, `images` store keyPath `postId`, index `ownerId`; `forgetBrand` also clears `images`), `lib/runs/run-record.ts`, `lib/runs/store.ts`
- Create: `lib/posts/image-store.ts`
- Test: `tests/unit/posts-image-store.test.ts`, extend `tests/unit/runs-record.test.ts`, `tests/unit/runs-store.test.ts`

**Interfaces:**
- Produces, `lib/posts/image-store.ts`:
  - `type SavedImage = { postId: string; batchId: string; ownerId: string; story: Blob; post: Blob; imagePrompt: string; model: string; promptVersion: string; createdAt: string }`
  - `saveImage(image: SavedImage): Promise<void>` — throws `ImageStoreFullError` on a `QuotaExceededError`.
  - `class ImageStoreFullError extends Error`
  - `loadImages(ownerId: string): Promise<Map<string, SavedImage>>` keyed by `postId`
  - `toSavedImage(response: ImageResponse, ctx: { batchId: string; ownerId: string; imagePrompt: string }, now: Date): SavedImage` (base64 → `Blob` of type `image/jpeg`)
- Produces, `lib/runs/run-record.ts`:
  - `RunStep` gains `| { name: 'image'; postId: string; status: StepStatus }`; `RunKind` gains `'images'`.
  - `newImagesRun(input: { ownerId: string; batchId: string; postIds: string[] }, now: Date, id: string): RunRecord` — all steps `running`.
- Produces, `lib/runs/store.ts`:
  - `loadOpenRuns(ownerId: string, kind: RunKind): Promise<RunRecord[]>` (newest first; `loadOpenRun` uses it)
  - `setImageStep(runId: string, postId: string, status: StepStatus): Promise<RunRecord | null>` — one readwrite transaction; deletes the run and returns null once it is finished.

- [ ] **Step 1: Write the failing tests** (node environment, `fake-indexeddb/auto`, as `posts-store.test.ts`).

```ts
test('an image saved is loaded with its blobs', ...saveImage → loadImages('sen').get('post-1').story.size > 0 and type 'image/jpeg');
test('images of another owner are not loaded', ...);
test('forget removes the owner\'s images', ...forgetBrand('sen') → loadImages('sen').size === 0; svarga's kept);
test('a version 2 database upgrades and keeps its batches', ...openDB v2 with brands/runs/posts + a batch, then loadBatches still finds it and saveImage works);
test('toSavedImage decodes base64 into JPEG blobs', ...);
// runs
test('newImagesRun has one running image step per post', ...kind 'images', steps [{ name: 'image', postId: 'post-1', status: 'running' }, …]);
test('resume sets lost image steps back to pending', ...resumeRun);
test('two steps finishing together both land', async () => {
  await saveRun(newImagesRun({ ownerId: 'sen', batchId: 'b', postIds: ['p1', 'p2', 'p3'] }, now, 'r'));
  await Promise.all([setImageStep('r', 'p1', 'done'), setImageStep('r', 'p2', 'failed')]);
  const [run] = await loadOpenRuns('sen', 'images');
  expect(run.steps.map((s) => s.status)).toEqual(['done', 'failed', 'running']);
});
test('the run is deleted once every step ended', ...setImageStep p3 done → null, loadOpenRuns empty);
test('an images run never hides a posts run', ...loadOpenRun(owner,'posts') still finds the posts run);
```

- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image-store.test.ts tests/unit/runs-record.test.ts tests/unit/runs-store.test.ts` — Expected: FAIL. Journal RED.
- [ ] **Step 3: Implement.** Add `images: { key: string; value: SavedImage; indexes: { ownerId: string } }` to `ShopfrontDb`; `if (oldVersion < 3)` creates it. Fix any exhaustive switch over `RunStep['name']` that TypeScript reports.
- [ ] **Step 4: Run** the three tests and `pnpm typecheck` — Expected: PASS. Journal GREEN.
- [ ] **Step 5: Commit** `feat(posts): keep images on the phone, and image steps in the run record (roadmap 2.3)`.

### Task 6: The browser's image client

**Files:**
- Create: `lib/posts/image-client.ts`
- Test: `tests/unit/posts-image-client.test.ts`

**Interfaces:**
- Consumes: Task 1 `ImageErrorCode`, `IMAGE_ERROR_CODES`, `imageResponseSchema`; Task 5 store and run functions; `ReadDeps`, `RunningRead`, `defaultReadDeps` from `lib/brand/read-client.ts`; `PostBatch` from `lib/posts/batch.ts`.
- Produces:
  - `type ImageEvent = { type: 'image'; image: SavedImage } | { type: 'error'; postId: string; code: ImageErrorCode | 'no_space' } | { type: 'offline'; postId: string } | { type: 'signedOut' }`
  - `startImages(input: { ownerId: string; batch: PostBatch; postIds: string[] }, onEvent: (e: ImageEvent) => void, deps?: ReadDeps): RunningRead` — saves an `images` run, then one `fetch('/api/posts/image', …)` per post id, all at once; `done` settles when all have.
  - `resumeImages(ownerId: string, batches: PostBatch[], onEvent, deps?): Promise<(RunningRead & { postIds: string[] }) | null>` — for every open `images` run not live: steps `running`/`pending` become requests again, except posts that already have a saved image (marked `done`) or whose batch is gone; at most 2 resumes per run (`resumes`), then those steps are marked failed with `image_failed`.
  - `isImageRunning(postId: string): boolean` — whether a request for that post is alive in this page.

- [ ] **Step 1: Write the failing tests** with a fake `fetch` (as `posts-client.test.ts` does) answering per post id.

```ts
test('six requests start at once', ...fetch called 6 times before any answers; bodies hold postId, imagePrompt, scene and nothing else);
test('an answer is saved then reported', ...event 'image' after loadImages has it; run step done);
test('one failure leaves the others', ...post-3 → 502 { error: 'image_blocked' }; events: 5 image + 1 error image_blocked);
test('401 reports signedOut', ...);
test('a quota error on save reports no_space', ...saveImage throws ImageStoreFullError);
test('a dropped connection reports offline and keeps the step running', ...fetch rejects TypeError → offline; loadOpenRuns shows running);
test('an answer after stop saves nothing', ...stop() before fetch resolves → loadImages empty, run deleted);
test('resume skips posts that already have an image', ...run with p1,p2 running, image saved for p1 → only p2 fetched, p1 marked done);
test('resume gives up after two tries', ...resumes 2 → no fetch, error image_failed for each step);
test('try again asks for one post only', ...startImages with postIds ['post-3'] → one fetch);
```

- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image-client.test.ts` — Expected: FAIL. Journal RED.
- [ ] **Step 3: Implement**, following `lib/posts/client.ts`'s shape: a module `live` set of `runId:postId`, an `AbortController` per run, `errorCodeOf` that falls back to `image_failed`, `setImageStep` after each settle; an answer that arrives after `stop()` is dropped before `saveImage`. Journal the call: the images get a run of their own, kind `images`, started once the plan's run has ended, rather than six steps added to the plan's run as the spec words it; same resume rule, and the plan client stays as it is.
- [ ] **Step 4: Run** — Expected: PASS. Journal GREEN.
- [ ] **Step 5: Commit** `feat(posts): ask for a batch's images from the phone, and resume them (roadmap 2.3)`.

### Task 7: Images on the post cards

**Files:**
- Create: `components/posts/post-image.tsx`
- Modify: `components/posts/post-card.tsx`, `components/posts/posts-section.tsx`, `components/brand/brand-home.tsx` (pass `imagesOn`), `app/page.tsx` (`imagesOn(ownerId)` server side), `messages/en.json`, `id.json`, `vi.json`
- Test: extend `tests/unit/posts-section.test.tsx`; create `tests/unit/posts-image-card.test.tsx`

**Interfaces:**
- Consumes: Task 6 `startImages`, `resumeImages`, `ImageEvent`; Task 5 `loadImages`, `SavedImage`; `components/ui/sheet.tsx`.
- Produces:
  - `type ImageState = { kind: 'off' } | { kind: 'none' } | { kind: 'making' } | { kind: 'ready'; image: SavedImage } | { kind: 'failed'; code: ImageErrorCode | 'no_space' }`
  - `PostImage({ state, altText, onRetry }: { state: ImageState; altText: string; onRetry(): void })`
  - `PostCard` gains `image?: { state: ImageState; onRetry(): void }`, rendered above the type label.
  - `PostsSection` gains prop `imagesOn: boolean`; `BrandHome` gains `imagesOn: boolean`.
- Messages, under `posts.images` (en; id and vi translated in the same commit):
  `make` "Make the images", `making` "Making the image…", `seeStory` "See the story", `retry` "Try again", `close` "Close", `off` "Images aren't turned on for your account yet.", and `errors`: `images_paused` "Images are paused for now. Your captions are ready.", `image_blocked` "This image couldn't be made. Try again for a new one.", `image_timeout` "This image took too long. Try again.", `image_failed` / `invalid_request` "Something went wrong while making this image.", `no_space` "Your phone is out of space for images.", `offline` "You're offline. Your images will carry on when you're back." (`images_off` maps to `off`).

Behaviour to wire in `PostsSection`:
- On a `final` plan event with `imagesOn`, call `startImages` for all the batch's post ids. A rewrite's `final` starts nothing.
- On mount and on `visibilitychange`/`online`, after `loadBatches`, load images (`loadImages`) and call `resumeImages`.
- `busy` (disables "Make my posts" / "Make 6 more", shows the keep-open line, holds the wake lock) is also true while any image request is alive.
- "Make the images" shows above a batch when `imagesOn`, no post of it has an image, and none of its images is making; it calls `startImages` for posts without an image.
- `PostImage` renders: `off` → muted line, no button; `none` → nothing when the batch shows "Make the images", else "Try again"; `making` → 4:5 muted box with "Making the image…"; `ready` → `<img>` of `URL.createObjectURL(image.post)` (revoked on unmount), `alt={altText}`, `aspect-[4/5] w-full object-cover`, and a "See the story" button opening a full-screen `Sheet` with the story; `failed` → the message and "Try again" (none for `images_off`).

- [ ] **Step 1: Write the failing tests** (jsdom; stub `URL.createObjectURL`/`revokeObjectURL`).

```ts
test('making shows the placeholder', ...getByText('Making the image…'));
test('ready shows the post crop with its alt text, and the story on tap', ...getByRole('img', { name: post.altText }); click 'See the story' → second img in dialog);
test('failed shows its message and Try again; images_off shows no button', ...);
test('off shows the off line', ...);
// posts-section, with startImages/resumeImages mocked via vi.mock('@/lib/posts/image-client')
test('a saved plan starts its six images', ...startImages called with the batch's 6 ids);
test('a rewrite starts no image', ...);
test('images off: no request, the off line on every card', ...imagesOn false);
test('an old batch shows Make the images', ...);
test('Make my posts stays disabled while images are made', ...);
```

- [ ] **Step 2: Run** `pnpm test tests/unit/posts-image-card.test.tsx tests/unit/posts-section.test.tsx` — Expected: FAIL. Journal RED.
- [ ] **Step 3: Implement** as above; the i18n messages test in `pnpm check` must pass with the three files.
- [ ] **Step 4: Run** `pnpm check` — Expected: all green. Journal GREEN.
- [ ] **Step 5: Commit** `feat(posts): show each post's image and story on its card (roadmap 2.3)`.

### Task 8: Phone-viewport end-to-end test

**Files:**
- Create: `tests/e2e/images.spec.ts`; a helper `fulfilImages(page, answers: Record<string, ImageResponse | { status: number; error: string }>)` in `tests/e2e/helpers/images.ts`, answering with small real JPEGs made by `sharp` once per file.

- [ ] **Step 1: Write the test**, after the same sign-in and read as `tests/e2e/posts.spec.ts`, with the plan mocked by `postsBody`:
  1. Image route answers after 500 ms; post 3 answers `502 { error: 'image_blocked' }`.
  2. Tap "Make my posts"; expect six "Making the image…" then five `img` in `article`s and, on the third card, "This image couldn't be made. Try again for a new one.".
  3. Tap "See the story" on card 1 → dialog with an `img`; close it.
  4. Reload → five images still there; the third card shows "Try again"; tap it with the route now answering 200 → six images; assert the image route was called 7 times in all.
- [ ] **Step 2: Run** `pnpm test:e2e tests/e2e/images.spec.ts` — Expected: PASS (it exercises code already written; fix what it finds).
- [ ] **Step 3: Mock the image route in `tests/e2e/posts.spec.ts`** to answer 403 `{ error: 'images_off' }`, so no e2e test ever reaches Google with the fake key; then run the whole `pnpm test:e2e` — Expected: all pass.
- [ ] **Step 4: Commit** `test(posts): images on the phone, end to end (roadmap 2.3)`.

### Task 9: `pnpm eval:images` and the real-model check

**Files:**
- Create: `scripts/eval-images.ts`
- Modify: `package.json` (`"eval:images": "tsx scripts/eval-images.ts"`), `AGENTS.md` commands table, `docs/specs/posts/generate-images/journal.md`

- [ ] **Step 1: Write the script.** Header comment in `scripts/eval-posts.ts`'s style with the ⚠️ cost (about $0.30 of the prepaid balance per fixture). Usage `pnpm eval:images <slug…>`; no default slugs (a slug is required, so it never spends by accident). For each slug: the posts from replaying the fixture's `posts.json` through `streamPlan` with `replayTextModel` (no text call), then `makePostImage` for all six in parallel with `geminiImageModel(process.env.GOOGLE_IMAGE_API_KEY)`, writing `.superpowers/eval-images/<slug>/<n>-story.jpg` and `<n>-post.jpg` and printing per image: scene, ms, input size, bytes, outcome; and the slug's total spend.
- [ ] **Step 2: Run** `pnpm check` — Expected: green. Commit `feat(posts): pnpm eval:images makes a fixture's images with the real model (roadmap 2.3)`.
- [ ] **Step 3: Ask the developer** before spending: run `pnpm eval:images sen svarga` (about $0.60). After it, show them the twelve post crops and stories (`.superpowers/eval-images/`) and record in the journal, per image: "a tourist would book this" or not, and whether the crop cuts the subject; times and sizes; prompt version `images-1`. Pass: at least 4 of 6 for each, no cut subject. If it fails, change the style line, bump `IMAGE_PROMPT_VERSION` to `images-2`, and ask again before another run.
- [ ] **Step 4: Run** `pnpm dev` with `IMAGE_OWNERS` set and make one batch on the phone viewport in the browser pane, to see the real flow once (about $0.30, ask first). Journal: real time from the plan's end to the sixth image.
- [ ] **Step 5: Update** `docs/roadmap.md` 2.3 to `done`, commit `docs(docs): generate-images done (roadmap 2.3)`, push, and give the developer the PR title and full body for a PR to `develop`.
