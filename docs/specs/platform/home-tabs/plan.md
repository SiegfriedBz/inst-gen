# Home tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the home screen into "Your business" and "Create your posts"
once a business is saved, rewrite the newest batch's captions automatically
after a business edit, move the language switch to the top right as
EN · VI · ID, and fix three of 2.4's leftovers.

**Architecture:** Browser work only; no route, store or model change. The
three leftovers are small changes in `lib/posts/` and `PostCard`. The
automatic update is one pure rule in `lib/posts/edit.ts` and an effect in
`PostsSection`, which learns from `BrandHome` whether its tab is showing and
whether the essence search runs. The tabs are a shadcn-style
`components/ui/tabs.tsx` over Radix Tabs (already in `radix-ui`), with both
panels force-mounted and the inactive one hidden, so switching never
unmounts a run. The language switch keeps its server form and moves into
the header.

**Tech Stack:** Next.js 16, React 19, `radix-ui` Tabs, next-intl, Tailwind 4
tokens, Vitest + Testing Library + fake-indexeddb, Playwright. No new
dependency.

**Spec:** `docs/specs/platform/home-tabs/spec.md` (approved 2026-10-25)

## Global Constraints

- "Super easy to use": no control beyond the spec's. The tab row adds one control; "Update captions" shows only after a failed automatic update.
- Tabs show only with `view.kind === 'panel'` and a saved profile; never while empty or reading.
- Open tab: `accent` fill, `on-accent` text; others `ink-secondary`, transparent; all weight 500; no dot, no icon; each tab at least 44px high (`min-h-11`), 14px text; labels wrap, never cut; not sticky.
- Tab labels: `home.tabs.label` Home / Beranda / Trang chính; `home.tabs.business` Your business / Usaha Anda / Doanh nghiệp; `home.tabs.posts` Create your posts / Buat postingan / Tạo bài đăng.
- New line `posts.updating`: "Updating your captions to match your business…" / "Memperbarui keterangan agar sesuai dengan usaha Anda…" / "Đang cập nhật chú thích cho khớp với doanh nghiệp của bạn…".
- Automatic update: newest batch by `createdAt` only; unedited out-of-date posts only; never while a plan, rewrite or images run or resume, or while the essence search runs; no automatic retry after a failure until the tab is opened again; images never change.
- Language switch: order `en`, `vi`, `id`, shown as `EN`, `VI`, `ID`; accessible name and `title` from `LOCALE_NAMES`; `lang` set; current one `accent`-filled with `aria-current="true"`; targets at least 44px high and 40px wide; still a plain form post; `LOCALES` unchanged.
- No horizontal scroll at 320px in any language (`tests/e2e/i18n.spec.ts` "fits 320px").
- Every new visible string in `messages/en.json`, `id.json` and `vi.json` in the same commit.
- Commits: Conventional Commits; scope `posts` for Tasks 1 to 5, `web` for Tasks 6 and 7, `docs` for docs only; stage by path; never push before Task 8.
- Journal: `docs/specs/platform/home-tabs/journal.md`, from `docs/templates/journal.md`, created in Task 1; RED and GREEN summary lines copied as the tool prints them.
- No eval command spends quota in this plan.

## Review Focus

1. **The owner taps "Create your posts", the update fails (day's limit), and
   the owner stays on the tab.** Nothing is sent again by itself: no loop
   when `batches` or `profile` re-render. → Task 5 test `a failed automatic
   update shows Update captions and sends nothing more until the tab opens
   again`.
2. **The owner edits a post while the automatic update runs.** The edit
   stays: 2.4's `rewritten()` skips posts changed since the request left, and
   "Edit" is disabled while a rewrite runs. → Task 3 test `edit is disabled
   while a rewrite runs`.
3. **A re-read finishes while the owner had "Create your posts" open
   before it.** The panel comes back on "Your business" and the posts
   section is mounted fresh, with no request until the search ends and the
   owner opens the tab. → Task 6 test `a re-read lands on Your business and
   the update waits for the tab`.
4. **Posts saved with a Vietnamese hashtag are read back.** The batch
   schema accepts them, so the batch doesn't vanish on reload. → Task 1 test
   `a batch with a Vietnamese hashtag loads`.
5. **A Vietnamese screen at 320px with the name "Svarga" and three codes.**
   No sideways scroll; the codes stay whole. → Task 7, the updated
   `fits 320px` e2e.

---

### Task 1: Hashtags keep Vietnamese and other letters

**Files:**
- Modify: `lib/posts/checks.ts` (`cleanHashtags`), `lib/posts/batch.ts:46` (hashtag regex)
- Create: `docs/specs/platform/home-tabs/journal.md`
- Test: `tests/unit/posts-checks.test.ts`, `tests/unit/posts-batch.test.ts`, `tests/unit/posts-edit.test.ts`

**Interfaces:**
- Produces: `cleanHashtags(raw: string[]): string[]` (same signature, wider letters); `HASHTAG = /^[\p{L}\p{M}\p{N}]+$/u` exported from `lib/posts/batch.ts`.

- [ ] **Step 1: Create the journal** from the template, with the first call: "2026-10-25: Plan written; executed inline with executing-plans."
- [ ] **Step 2: Write the failing tests**
  - `posts-checks`: `cleanHashtags(['#ĐàNẵng', 'massage'])` → `['đànẵng', 'massage']`; NFD input `'ĐàNẵng'` → `['đànẵng']`; `cleanHashtags(['#da-nang', 'DaNang'])` → `['danang']`; Indonesian `['#PijatBali']` → `['pijatbali']`; seven tags → five.
  - `posts-edit`: `parseHashtags('#ĐàNẵng, #spa')` → `['đànẵng', 'spa']`.
  - `posts-batch`: `a batch with a Vietnamese hashtag loads`: a post with `hashtags: ['đànẵng']` passes the stored batch schema; `'da-nang'` still fails.
- [ ] **Step 3: Run** `pnpm vitest run tests/unit/posts-checks.test.ts tests/unit/posts-edit.test.ts tests/unit/posts-batch.test.ts`. Expected: FAIL on the new cases. Copy the summary line to the journal's RED.
- [ ] **Step 4: Implement**: `tag.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{M}\p{N}]/gu, '')`; the schema uses `HASHTAG`.
- [ ] **Step 5: Run the same command.** Expected: PASS.
- [ ] **Step 6: Commit** `fix(posts): keep Vietnamese letters in hashtags`, staging the five files.

### Task 2: File names in the phone's date

**Files:**
- Modify: `lib/posts/take-away.ts` (`imageFileName`)
- Test: `tests/unit/posts-take-away.test.ts`

**Interfaces:**
- Produces: `imageFileName(name, createdAt, n, kind)` unchanged in signature; the date part is the phone's local `YYYY-MM-DD` of `createdAt`.

- [ ] **Step 1: Write the failing test** `the file name uses the phone's date`: with `process.env.TZ = 'Asia/Ho_Chi_Minh'` set for the test (restore after), `imageFileName('Sen', '2026-10-25T23:30:00.000Z', 1, 'post')` → `'sen-2026-10-26-1-post.jpg'`; with `TZ = 'UTC'` → `'sen-2026-10-25-1-post.jpg'`. If Node caches the zone, build the date from `new Date(createdAt)` with `getFullYear/getMonth/getDate` and test through `vi.stubEnv` plus a fresh `Date`; record what worked in the journal.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-take-away.test.ts`. Expected: FAIL (Ho Chi Minh case gives 25). Copy RED.
- [ ] **Step 3: Implement** a local-date helper in `take-away.ts` from `getFullYear()`, `getMonth() + 1`, `getDate()`, zero-padded.
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit** `fix(posts): name saved images with the phone's date`.

### Task 3: "Edit" doesn't wait for images

**Files:**
- Modify: `components/posts/post-card.tsx` (new prop), `components/posts/posts-section.tsx` (pass it)
- Test: `tests/unit/posts-section-images.test.tsx`, `tests/unit/posts-card-edit.test.tsx`

**Interfaces:**
- Produces: `PostCard` prop `editBusy?: boolean` (defaults to `busy`), which alone disables "Edit". `busy` keeps disabling "Rewrite this one too". `PostsSection` passes `editBusy={running !== null || resuming}`.

- [ ] **Step 1: Write the failing tests**
  - `posts-section-images`: `edit can be tapped while images are made`: images on, a saved batch with no images, an image request held open (deferred fetch); after "Make the images", every "Edit" is enabled and "Make 6 more" is disabled.
  - `posts-section`: `edit is disabled while a rewrite runs`: a stale batch, the rewrite request held open; every "Edit" is disabled until it answers.
- [ ] **Step 2: Run** both files. Expected: the first FAILS (Edit disabled). Copy RED.
- [ ] **Step 3: Implement** the prop and pass it.
- [ ] **Step 4: Run** both files. Expected: PASS.
- [ ] **Step 5: Commit** `fix(posts): let the owner edit while images are made`.

### Task 4: The automatic update's rule

**Files:**
- Modify: `lib/posts/edit.ts`
- Test: `tests/unit/posts-edit.test.ts`

**Interfaces:**
- Produces:
  - `newestBatch(batches: PostBatch[]): PostBatch | undefined`: latest `createdAt` (ISO strings compare as text).
  - `autoRewrite(batches: PostBatch[], profile: Profile): { batch: PostBatch; postIds: string[] } | null`: the newest batch and its `staleUnedited` ids, or `null` when there are none.
  - `flagsFor(post, batch, profile, newest = true): Flag[]`: in the newest batch, 2.4's rule; in an older one (`newest === false`), every out-of-date post, edited or not, gets `findFlags(post.caption, profile)`.

- [ ] **Step 1: Write the failing tests**
  - `autoRewrite picks the newest batch by createdAt`: two batches, the older one first in the array, both out of date → the newer batch's ids.
  - `autoRewrite leaves edited posts out`: newest batch, posts 1 and 2 edited, profile summary changed → `['post-3', … 'post-6']`.
  - `autoRewrite is null when only an older batch is out of date`.
  - `autoRewrite is null when every out-of-date post is edited`.
  - `autoRewrite is null when only the WhatsApp number changed`.
  - `flags on an older batch's unedited out-of-date post follow the current profile`: caption "Only 990k.", `unchecked: []`, `newest = false` → one `price` flag; same post with `newest = true` → `[]`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-edit.test.ts`. Expected: FAIL (no export). Copy RED.
- [ ] **Step 3: Implement** the three functions.
- [ ] **Step 4: Run it.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(posts): pick which posts follow a business edit`.

### Task 5: The posts section updates captions by itself

**Files:**
- Modify: `components/posts/posts-section.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json` (`posts.updating`)
- Test: `tests/unit/posts-section.test.tsx`

**Interfaces:**
- Consumes: `autoRewrite`, `newestBatch`, `flagsFor(…, newest)` (Task 4).
- Produces: `PostsSection` props `active: boolean` (its tab is showing) and `searching: boolean` (the essence search runs). Both required; existing tests pass `active searching={false}`.

Behaviour to build:
- State `autoFailed: boolean`, set when a rewrite started by the effect ends in `error` (not `offline`, which 2.4 resumes); cleared when `active` goes from `false` to `true`, and when a rewrite succeeds.
- An effect on `[active, searching, busy, autoFailed, batches, profile]`: when `active && !searching && !busy && !autoFailed`, and `autoRewrite(batches, profile)` is not null, call the existing `update(batch, postIds)` once, marking the run as automatic (a ref).
- The newest batch, while it has stale unedited posts and `!autoFailed`, shows `posts.updating` above its cards (`role="status"`), and the keep-open line shows. With `autoFailed`, it shows 2.4's box: `stale`, `staleEdited` when it applies, and "Update captions".
- Older batches: no stale box, no `onRewrite`, and `flagsFor(…, false)`.
- The newest batch keeps `onRewrite` ("Rewrite this one too") for edited out-of-date posts.

- [ ] **Step 1: Write the failing tests**, replacing 2.4's stale-box tests:
  - `captions follow a business edit with no tap`: six posts, two edited, `changed()` profile → one rewrite request with posts 3 to 6, "New post-3." shows, "Caption 1." stays, no "Update captions" button.
  - `the updating line shows while the update runs`: the rewrite held open → "Updating your captions to match your business…" visible.
  - `nothing is sent while the tab is hidden`: `active={false}` → no request; rerender with `active` → one request.
  - `nothing is sent while the essence search runs`: `searching` → no request; rerender `searching={false}` → one.
  - `a failed automatic update shows Update captions and sends nothing more until the tab opens again`: a `model_busy` error answer → the error line and "Update captions"; rerender with a new `profile` object of the same values → still one request; rerender `active={false}` then `active` → a second request.
  - `older batches are left alone`: an older out-of-date batch and a current newest one → no request, no "Update captions", no "Rewrite this one too".
  - Keep 2.4's `rewrite this one too sends one post` and `an edited post's flags follow the new details` (now with no stale box).
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/posts-section-images.test.tsx`. Expected: FAIL. Copy RED.
- [ ] **Step 3: Implement** the props, the effect, the lines and the strings in three languages.
- [ ] **Step 4: Run** the same files, then `pnpm test`. Expected: PASS (the i18n messages test checks the three files).
- [ ] **Step 5: Commit** `feat(posts): update captions by themselves after a business edit`.

### Task 6: Two tabs on the home screen

**Files:**
- Create: `components/ui/tabs.tsx`
- Modify: `components/brand/brand-home.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json` (`home.tabs.*`), `AGENTS.md` (Map row for `components/brand/`: "the home screen's tabs, brand read and panel")
- Test: `tests/unit/brand-home.test.tsx`; e2e `tests/e2e/home-tabs.spec.ts` (new), `tests/e2e/posts.spec.ts`, `tests/e2e/editor.spec.ts`, `tests/e2e/images.spec.ts`

**Interfaces:**
- Consumes: `PostsSection` props `active`, `searching` (Task 5).
- Produces: `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` from `components/ui/tabs.tsx`, thin wrappers of `radix-ui`'s `Tabs` styled with the tokens (list: `field-muted` bar, 1px soft edge, 14px radius, `p-1`, equal columns; trigger: `min-h-11`, `text-sm font-medium leading-tight`, `data-[state=active]:bg-accent data-[state=active]:text-on-accent`, visible focus ring; content: `forceMount` and `data-[state=inactive]:hidden`).

Behaviour to build in `BrandHome`:
- `const [tab, setTab] = useState<'business' | 'posts'>('posts')`. `begin()` (every read, first, re-read or resumed) sets `'business'`, so whatever the read's outcome, the panel comes back on "Your business"; a saved profile loaded with no read lands on `'posts'`.
- In `view.kind === 'panel'`: errors and notes stay above; then `Tabs` with the list (`aria-label` `home.tabs.label`) and two panels: "business" holds the intro, panel, site block, sheet and dialogs; "posts" holds `<PostsSection … active={tab === 'posts'} searching={search === 'running'} />`.
- Journal call: the spec's "pure rule" for the opening tab is this one state and `begin()`; it is tested through the component.

- [ ] **Step 1: Write the failing tests** in `brand-home.test.tsx`:
  - `no tabs before a read`: empty store → no `tablist`.
  - `a first read lands on Your business`: after the final event, `tab` "Your business" has `aria-selected="true"`, and the intro is visible.
  - `a saved profile opens on Create your posts`: `aria-selected` on "Create your posts"; the intro is in the DOM but hidden.
  - `a re-read lands on Your business and the update waits for the tab`: start on posts, open "Your business", re-read → no `tablist` while reading → after final, "Your business" selected, and no `/api/posts/rewrite` request.
  - `switching tabs keeps a running posts request alive`: a plan request held open; click "Your business", then "Create your posts"; the request's signal is not aborted.
  - Update existing tests that look for "Your posts" content or the panel after a load (they now open on posts): click "Your business" first where needed.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/brand-home.test.tsx`. Expected: FAIL. Copy RED.
- [ ] **Step 3: Implement** `components/ui/tabs.tsx`, the tab state and layout, and the strings.
- [ ] **Step 4: Run** it, then `pnpm check`. Expected: PASS.
- [ ] **Step 5: e2e.** Add a helper that taps "Create your posts" after a first read in `posts.spec.ts`, `editor.spec.ts` and `images.spec.ts`; change the "rewritten after a brand edit" test in `posts.spec.ts` and "Update captions leaves it alone" in `editor.spec.ts` to edit the summary, tap "Create your posts", and expect the rewrite request with no tap. New `home-tabs.spec.ts`: a first read lands on "Your business" with both tabs; a reload lands on "Create your posts"; "Re-read my website" hides the tab row until it ends. Run `pnpm test:e2e`. Expected: all pass.
- [ ] **Step 6: Commit** `feat(web): split the home screen into two tabs (roadmap 2.5)`.

### Task 7: The language switch at the top right

**Files:**
- Modify: `components/language-switch.tsx`, `app/page.tsx`, `app/enter/page.tsx`
- Test: `tests/e2e/i18n.spec.ts`

**Interfaces:**
- Produces: `LanguageSwitch({ returnTo })`, same props; renders a bordered group of three codes in the order `['en', 'vi', 'id']` (a `SWITCH_ORDER` constant in the component, `satisfies readonly Locale[]`), each a submit button with `aria-label` and `title` `LOCALE_NAMES[code]`, `lang={code}`; the current one a `span` with `aria-current="true"`, `lang`, and the full name in `sr-only` beside the visible code (`aria-hidden`). No `mt-auto pt-10`.

Layout:
- `app/page.tsx` header: mark left; right a `flex min-w-0 items-center gap-2` group with `LanguageSwitch`, then the name pill with `truncate` and a `min-w-0`. The bottom `LanguageSwitch` goes; "Signed in on this phone…" takes `mt-auto pt-10`.
- `app/enter/page.tsx`: a `header` with the mark left and `LanguageSwitch` right; the bottom one goes; the footer line takes `mt-auto pt-10`.

- [ ] **Step 1: Update the e2e tests first**
  - `switching on / keeps the owner there`: the switch is inside `header`; `nav.locator('[aria-current="true"]')` contains "English"; the accessible names in order are `['English', 'Tiếng Việt', 'Bahasa Indonesia']`; click `Tiếng Việt`.
  - `expectFits`: unchanged assertions, plus the three entries are inside `header`; add a case signed in as Svarga (`test-…` passphrase from `playwright.config.ts`) in `vi`.
  - `the switch works` without JavaScript: unchanged (`Bahasa Indonesia` by name).
  - New: no language `navigation` below the main content (`page.getByRole('navigation', { name: 'Language' })` count is 1, inside `header`).
- [ ] **Step 2: Run** `pnpm test:e2e tests/e2e/i18n.spec.ts`. Expected: FAIL (switch at the bottom). Copy RED.
- [ ] **Step 3: Implement** the component and both layouts.
- [ ] **Step 4: Run** `pnpm test:e2e tests/e2e/i18n.spec.ts`, then `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): move the language switch to the top right`.

### Task 8: Roadmap, docs, whole-branch check, PR

**Files:**
- Modify: `docs/roadmap.md`, `docs/specs/platform/i18n/spec.md`, and the number references in `docs/specs/harness/app-scaffold/spec.md`, `docs/specs/brand/extract-site/spec.md`, `docs/specs/brand/brand-panel/spec.md`, `docs/specs/brand/search-essence/spec.md`, `docs/specs/posts/generate-images/spec.md`, `docs/specs/posts/editor-download/spec.md`; the journal

- [ ] **Step 1: Roadmap.** Insert `| 2.5 | \`platform/home-tabs\`: two tabs on the home screen, captions that follow business edits, the language switch at the top right | spec | done |`; renumber reviews 2.6, usage counters 2.7, owner guide 2.8; update the gate line if it names numbers.
- [ ] **Step 2: Other specs.** Change only references to roadmap items, highest first (2.7 → 2.8, 2.6 → 2.7, 2.5 → 2.6), checking each line by hand: never version numbers (`Biome 2.6.2`, `ipaddr.js 2.5.0`, Gemini 2.5). Plans and journals are untouched. Add to `platform/i18n`'s "The switch": "Since 2.5 (`platform/home-tabs`), the switch is three codes at the top right; see that spec."
- [ ] **Step 3: Verify.** `pnpm check` and `pnpm test:e2e`. Copy the Vitest and Playwright summary lines to the journal's GREEN.
- [ ] **Step 4: Whole-branch review** with superpowers:requesting-code-review; fix important findings test-first, record the rest in the journal.
- [ ] **Step 5: Commit** `docs(docs): mark roadmap 2.5 done and renumber the items after it`.
- [ ] **Step 6: Push** `git push -u origin claude/vigilant-einstein-t6eybn` and open a PR to `develop` on github.com, titled `feat(web): home tabs (roadmap 2.5)`.
