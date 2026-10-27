# Friendlier Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** A smaller header with one language button, the three home tabs in a
bottom bar, "Create Posts" as a grid of six per attempt that opens one
suggestion in a sheet and ticks the ones saved and copied, "Your business"
with what's missing first, and "Reviews" with one reply at a time.

**Architecture:** Browser work only; no route, model call or counter
changes. Two small pure modules carry the new rules (`lib/posts/taken.ts`
for "Saved and copied", `lib/brand/missing.ts` for the missing fields and
section summaries); the rest is component work in `components/` and three
message files. The post schema gains two optional timestamps, so no
IndexedDB version bump.

**Tech Stack:** Next.js 16, React 19, next-intl, Tailwind v4, shadcn/ui on
Radix (`Tabs`, `Sheet`), Phosphor icons, `idb`, Vitest + Testing Library +
fake-indexeddb, Playwright. No new dependency.

**Spec:** `docs/specs/platform/friendlier-home/spec.md` (approved 2026-10-27).
Mocks: <https://claude.ai/artifact/3j4zXdSZAG1S2ezZxmaxKV>, row "Chosen
design".

## Global Constraints

- Tokens only (`page`, `ink`, `ink-secondary`, `field`, `field-muted`, `edge`, `accent`, `on-accent`, `accent-tint`, `accent-tint-ink`, `error`); one radius, `rounded-control` (12px); no shadows, no gradients.
- Solid `accent` is for each tab's main button and the tile check only; the open tab and the current language use `accent-tint` / `accent-tint-ink`.
- Every control at least 44px tall; no horizontal scroll at 320px in en, id and vi.
- Every visible string in `messages/en.json`, `id.json` and `vi.json` in the same commit (the i18n test fails otherwise); the translations are the spec's table.
- The language switch keeps working without JavaScript (form post to `setLocale`, `returnTo`).
- No type labels, post numbers or feed preview on suggestions (2.6).
- The tile label never says "posted": `Saved and copied`, or `Copied` without images.
- Commits: Conventional Commits, scopes from `commitlint.config.mjs` (`web`, `posts`, `brand`, `reviews`, `docs`); stage files by path.
- Record calls made and each task's RED and GREEN summary lines, as Vitest prints them, in `docs/specs/platform/friendlier-home/journal.md` (from `docs/templates/`).

## Review Focus

- A long spa name ("Serenity Bali Spa & Wellness Retreat") at 320px: the name is cut with an ellipsis, Guide and EN keep their 44px targets (Task 11's e2e).
- An attempt with fewer than six suggestions (the model's `dropped`): the grid's last row is partial, tiles say "of 4" (Task 6).
- The language changes while a suggestion's sheet is open: the sheet stays open on the same suggestion, in the new language (Task 7).
- The open suggestion disappears (a new attempt pushes nothing out, but the daily reset or "Forget this business" removes it): the sheet closes instead of showing nothing or throwing (Task 7).
- A thin site with nearly everything missing (about 18 buttons) in Vietnamese: the buttons wrap, nothing scrolls sideways at 320px (Task 9).

---

### Task 1: The language button

Before the first step, create `docs/specs/platform/friendlier-home/journal.md`
from `docs/templates/journal.md`; every task appends its RED and GREEN lines.

**Files:**
- Modify: `components/language-switch.tsx` (the whole `LanguageSwitch`)
- Modify: `messages/en.json`, `messages/id.json`, `messages/vi.json` (`language.button`)
- Test: `tests/unit/language-switch.test.tsx`

**Interfaces:**
- Produces: `LanguageSwitch({ returnTo }: { returnTo: string })`, unchanged signature; used by `app/page.tsx`, `app/enter/page.tsx`, `app/guide/page.tsx` as today.

- [ ] **Step 1: Rewrite the tests for the new button**

Replace the "three codes" tests with:

```tsx
test('closed: a globe and the current code, named "Language: English"', () => {
  show();
  const summary = screen.getByText('EN').closest('summary');
  expect(summary).not.toBeNull();
  expect(summary?.getAttribute('aria-label')).toBe('Language: English');
  expect(summary?.closest('details')?.open).toBe(false);
});

test('open: three full names in their own language, the current one checked and inert', () => {
  show();
  fireEvent.click(screen.getByText('EN'));
  const names = screen.getAllByRole('button').map((b) => [b.textContent, b.getAttribute('lang')]);
  expect(names).toEqual([['Tiếng Việt', 'vi'], ['Bahasa Indonesia', 'id']]);
  const current = screen.getByText('English').closest('[aria-current="true"]');
  expect(current?.getAttribute('lang')).toBe('en');
});

test('picking Tiếng Việt switches the screen and closes the list', async () => {
  show();
  fireEvent.click(screen.getByText('EN'));
  await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Tiếng Việt' })));
  expect(screen.getByRole('heading').textContent).toBe('Chào bạn, Sen'); // vi `home.welcome`
  expect(saveLocale).toHaveBeenCalledWith('vi');
  expect(screen.getByText('VI').closest('details')?.open).toBe(false);
});

test('without JavaScript each language is a submit button of the form', () => {
  show();
  const vi = screen.getByRole('button', { name: 'Tiếng Việt', hidden: true });
  expect(vi.getAttribute('type')).toBe('submit');
  expect(vi.getAttribute('name')).toBe('locale');
  expect(vi.getAttribute('value')).toBe('vi');
});

test('Escape closes the list and gives focus back to the button', () => {
  show();
  fireEvent.click(screen.getByText('EN'));
  fireEvent.keyDown(document, { key: 'Escape' });
  const summary = screen.getByText('EN').closest('summary');
  expect(summary?.closest('details')?.open).toBe(false);
  expect(document.activeElement).toBe(summary);
});
```

Keep the existing tests on `persist` and the offline retry. Use the actual
`home.welcome` string from `messages/vi.json` in the third test.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/language-switch.test.tsx`
Expected: FAIL (no `summary`).

- [ ] **Step 3: Rebuild `LanguageSwitch`**

A `<details>` whose `<summary>` (`aria-label={t('button', { name: LOCALE_NAMES[current] })}`, globe icon `Globe` from Phosphor, `current.toUpperCase()`, 14px weight 500, `min-h-11`) opens an absolutely placed list (right-aligned, `bg-field`, 1px `border-edge`, `rounded-control`, `w-56`). The list is today's `<form action={setLocale}>` with the hidden `returnTo`, in the order English, Tiếng Việt, Bahasa Indonesia: the current one a `span` with `aria-current="true"`, `bg-accent-tint text-accent-tint-ink`, a `Check` icon; the others submit buttons (`name="locale"`, `value`, `lang`), 48px rows. Keep today's `onClick` (prevent default, `switchTo`, `persist`) and close the `details` after it. Close on Escape (keydown listener while open, then focus the summary) and on a pointer down outside (listener while open). Keep today's `<nav aria-label={t('label')}>` around the `details`.

- [ ] **Step 4: Add `language.button`** to the three files: `Language: {name}` / `Bahasa: {name}` / `Ngôn ngữ: {name}`.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/unit/language-switch.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/language-switch.tsx messages/en.json messages/id.json messages/vi.json tests/unit/language-switch.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(web): one language button with a list of three"
```

### Task 2: The header

**Files:**
- Modify: `app/page.tsx` (header; `Welcome` leaves the page)
- Modify: `components/guide/guide-links.tsx` (`GuideLink` icon only)
- Modify: `components/brand/brand-home.tsx` (takes `name`, shows the welcome on the empty screen only)
- Test: `tests/unit/brand-home.test.tsx`, `tests/unit/guide.test.tsx`

**Interfaces:**
- Produces: `BrandHome({ ownerId, name, imagesOn }: { ownerId: string; name: string; imagesOn: boolean })`.
- Produces: `GuideLink()`, unchanged signature, now an icon-only link with `aria-label` and `title` `guide.link`.

- [ ] **Step 1: Tests**

```tsx
// brand-home.test.tsx
test('the welcome shows only before a business is saved', async () => {
  renderHome({ name: 'Sen' }); // no saved brand
  expect(await screen.findByRole('heading', { name: 'Welcome, Sen' })).toBeTruthy();
  cleanup();
  await saveBrand('sen', senProfile());
  renderHome({ name: 'Sen' });
  await screen.findByRole('tablist');
  expect(screen.queryByText('Welcome, Sen')).toBeNull();
});

// guide.test.tsx
test('the Guide link is an icon named "Guide"', () => {
  render(<Intl><GuideLink /></Intl>);
  const link = screen.getByRole('link', { name: 'Guide' });
  expect(link.getAttribute('href')).toBe('/guide');
  expect(link.textContent).toBe('');
  expect(link.getAttribute('title')).toBe('Guide');
});
```

(`renderHome` is the file's existing helper, given the new `name` prop.)

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/guide.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`app/page.tsx` header: left the mark and `<span className="min-w-0 truncate text-[16px] font-medium">{name}</span>`; right `<GuideLink />` and `<LanguageSwitch returnTo="/" />`; `h-14`; no pill; no `<Welcome>`. `BrandHome` renders `<h1>` `home.welcome` above the website form when `view.kind === 'empty'` (reuse `Welcome` from `components/screen-text.tsx` if it is client-safe; it is a plain `useTranslations` component). `GuideLink`: `Question` icon 22px, `text-ink-secondary`, `size-11` hit area, no text.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/guide.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/page.tsx components/guide/guide-links.tsx components/brand/brand-home.tsx tests/unit/brand-home.test.tsx tests/unit/guide.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(web): a smaller header, the welcome on the empty screen only"
```

### Task 3: The bottom tab bar and the usage line

**Files:**
- Create: `components/brand/home-tab-bar.tsx`
- Create: `components/brand/use-typing.ts`
- Modify: `components/brand/brand-home.tsx` (tabs block)
- Modify: `app/layout.tsx` (`viewportFit: 'cover'`; bottom padding when the bar shows is in `BrandHome`, not here)
- Test: `tests/unit/brand-home.test.tsx`

**Interfaces:**
- Produces: `HomeTabBar({ label, tabs }: { label: string; tabs: { value: HomeTab; label: string; icon: Icon }[] })`, rendering Radix `TabsList` + `TabsTrigger` (it sits inside `BrandHome`'s `<Tabs>`); `HomeTab` exported from `brand-home.tsx` as `'business' | 'posts' | 'reviews'`.
- Produces: `useTyping(): boolean` — true while an `input` (not checkbox, radio, button, submit) or `textarea` inside the document has focus and `window.visualViewport.height` is less than 75% of `window.innerHeight`; false where `visualViewport` is missing.

- [ ] **Step 1: Tests**

```tsx
test('the tabs are a bar at the bottom, in order, Create Posts open', async () => {
  await saveBrand('sen', senProfile());
  renderHome();
  const list = await screen.findByRole('tablist', { name: 'Home' });
  expect(list.closest('[data-tab-bar]')).not.toBeNull();
  expect(screen.getAllByRole('tab').map((t) => t.textContent)).toEqual([
    'Your business', 'Create Posts', 'Reviews',
  ]);
  expect(screen.getByRole('tab', { name: 'Create Posts' }).getAttribute('aria-selected')).toBe('true');
});

test('no bar before a business is saved', async () => {
  renderHome();
  await screen.findByLabelText('Your website');
  expect(document.querySelector('[data-tab-bar]')).toBeNull();
});

test('the usage line is the first line of each tab panel', async () => {
  await saveBrand('sen', senProfile());
  renderHome();
  const panel = await screen.findByRole('tabpanel');
  expect(panel.firstElementChild?.getAttribute('data-testid')).toBe('usage-bar');
});

test('the bar hides while typing with the keyboard up', async () => {
  // visualViewport stub: height 400, innerHeight 800; focus the review textarea
  ...
  expect(document.querySelector('[data-tab-bar]')?.hasAttribute('hidden')).toBe(true);
});
```

The fourth test stubs `window.visualViewport` (an `EventTarget` with `height: 400`) and `window.innerHeight = 800`, opens "Reviews", focuses "The review" and fires `resize` on the stub.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`HomeTabBar`: a `div[data-tab-bar]` `fixed inset-x-0 bottom-0 border-t border-edge/40 bg-field pb-[env(safe-area-inset-bottom)]`, inner `mx-auto grid max-w-[420px] grid-cols-3 h-16`; each trigger a column with the icon (24px) over the label (12px); `data-[state=active]` puts the icon on a `h-7 w-14 rounded-full bg-accent-tint` pill and the label in `text-accent-tint-ink font-medium`; inactive `text-ink-secondary`. Icons: `Storefront`, `ImageSquare`, `ChatText`. `hidden` when `useTyping()`. In `BrandHome`: drop the old `TabsList`; move `<UsageBar tab=… />` to the top of each `TabsContent` (pass the panel's own tab, not the open one); add `pb-24` to the panel wrapper when the bar shows. In `app/layout.tsx`, `viewport.viewportFit = 'cover'`. `components/ui/tabs.tsx` stays as it is; `HomeTabBar` passes its own `className` to `TabsList` and `TabsTrigger`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/usage-bar.test.tsx tests/unit/usage-limits-ui.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/brand/home-tab-bar.tsx components/brand/use-typing.ts components/brand/brand-home.tsx app/layout.tsx tests/unit/brand-home.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(web): home tabs in a bottom bar, usage line at the top of each tab"
```

### Task 4: "Saved and copied" on the phone

**Files:**
- Create: `lib/posts/taken.ts`
- Modify: `lib/posts/batch.ts` (`postSchema`)
- Modify: `lib/posts/edit.ts` (`applyEdit`, `mergeRewrite`, `markNewImage`)
- Modify: `lib/posts/store.ts` (`applyCta`)
- Test: `tests/unit/posts-taken.test.ts`, `tests/unit/posts-edit.test.ts`, `tests/unit/posts-store.test.ts`

**Interfaces:**
- Produces: `postSchema` gains `savedAt: z.iso.datetime().optional()` and `copiedAt: z.iso.datetime().optional()`.
- Produces: `type TakenStep = 'saved' | 'copied'`.
- Produces: `markTaken(batch: PostBatch, postId: string, step: TakenStep, at: string): PostBatch`.
- Produces: `takenLabel(post: Post, imagesOn: boolean): 'savedAndCopied' | 'copied' | null` — with images, `'savedAndCopied'` when both are set, else null; without images, `'copied'` when `copiedAt` is set, else null.

- [ ] **Step 1: Tests**

```ts
// posts-taken.test.ts
test('both steps, in either order, make "savedAndCopied"', () => {
  let b = batchOf(post({ id: 'p1' }));
  b = markTaken(b, 'p1', 'copied', '2026-10-27T10:00:00.000Z');
  expect(takenLabel(b.posts[0], true)).toBeNull();
  b = markTaken(b, 'p1', 'saved', '2026-10-27T10:01:00.000Z');
  expect(takenLabel(b.posts[0], true)).toBe('savedAndCopied');
});
test('without images, copied alone is "copied"', () => {
  const b = markTaken(batchOf(post({ id: 'p1' })), 'p1', 'copied', NOW);
  expect(takenLabel(b.posts[0], false)).toBe('copied');
});
test('only the named post changes', () => { ... expect(b.posts[1].copiedAt).toBeUndefined(); });
test('a batch saved before this item still parses', () => {
  expect(batchSchema.safeParse(oldBatchWithoutTimestamps).success).toBe(true);
});

// posts-edit.test.ts
test('an edit clears copied, keeps saved', () => {
  const p = applyEdit(post({ savedAt: NOW, copiedAt: NOW }), edit, profile);
  expect(p.copiedAt).toBeUndefined();
  expect(p.savedAt).toBe(NOW);
});
test('a rewritten post loses copied, keeps saved', () => { /* mergeRewrite on a sent id */ });
test('a new image clears saved, keeps copied', () => { /* markNewImage */ });

// posts-store.test.ts
test('a new WhatsApp number clears copied on every post', async () => {
  // saveBatch with copiedAt on two posts; applyCta; every post's copiedAt undefined, savedAt kept
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-taken.test.ts tests/unit/posts-edit.test.ts tests/unit/posts-store.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the two schema fields, `markTaken` and `takenLabel`; `applyEdit` and `applyCta` drop `copiedAt`; `mergeRewrite` keeps the old post's `savedAt` and drops `copiedAt` for each answered post (the answer replaces the post object); `markNewImage` drops `savedAt`.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/unit/posts-taken.test.ts tests/unit/posts-edit.test.ts tests/unit/posts-store.test.ts tests/unit/posts-batch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/taken.ts lib/posts/batch.ts lib/posts/edit.ts lib/posts/store.ts tests/unit/posts-taken.test.ts tests/unit/posts-edit.test.ts tests/unit/posts-store.test.ts docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(posts): remember a suggestion saved and copied"
```

### Task 5: The two steps report what happened

**Files:**
- Modify: `components/copy-text.tsx`
- Modify: `components/posts/take-away.tsx`
- Test: `tests/unit/posts-take-away.test.tsx`

**Interfaces:**
- Consumes: `TakenStep` (Task 4); `saveImageFiles` (returns `'shared' | 'downloaded' | 'cancelled'`).
- Produces: `CopyText({ text, label, className, onCopied }: { …; onCopied?: () => void })` — calls `onCopied` after a successful copy and when the "Copy it from here." sheet opens.
- Produces: `TakeAway({ …today's props, onTaken }: { …; onTaken?: (step: TakenStep) => void })` — `'saved'` after `saveImageFiles` resolves `'shared'` or `'downloaded'`, never after `'cancelled'`; `'copied'` from `CopyText`'s `onCopied`.

- [ ] **Step 1: Tests**

```tsx
test('a finished share reports "saved"', async () => { /* canShare+share resolve; expect(onTaken).toHaveBeenCalledWith('saved') */ });
test('a cancelled share reports nothing', async () => { /* share rejects AbortError; expect(onTaken).not.toHaveBeenCalled() */ });
test('a download reports "saved"', async () => { /* no canShare */ });
test('a copy reports "copied"', async () => { /* clipboard.writeText resolves */ });
test('the copy-by-hand sheet reports "copied"', async () => { /* clipboard rejects; sheet opens; onTaken('copied') */ });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-take-away.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** the two callbacks as specified.

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/unit/posts-take-away.test.tsx tests/unit/reviews-section.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/copy-text.tsx components/posts/take-away.tsx tests/unit/posts-take-away.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(posts): the two steps say when they're done"
```

### Task 6: The grid of tiles

**Files:**
- Create: `components/posts/suggestion-tile.tsx`
- Modify: `components/posts/posts-section.tsx` (attempt rendering)
- Modify: messages (`posts.saved`, `posts.copiedOnly`, `posts.checkText`, `posts.tile`)
- Test: `tests/unit/posts-section.test.tsx`, `tests/unit/posts-section-images.test.tsx`

**Interfaces:**
- Consumes: `takenLabel` (Task 4); `ImageState` (`components/posts/post-image.tsx`).
- Produces: `SuggestionTile({ post, cta, n, count, image, taken, check, onOpen, disabled }: { post: Post; cta: string; n: number; count: number; image: ImageState; taken: 'savedAndCopied' | 'copied' | null; check: boolean; onOpen: () => void; disabled?: boolean })` — one `<button>`.
- Produces: in `PostsSection`, state `open: { batchId: string; postId: string } | null` and `setOpen`, used by Task 7.

- [ ] **Step 1: Tests**

```tsx
test('an attempt of six is a grid of six buttons, three to a row, no type labels', async () => {
  await seed(batch(6));
  renderSection();
  const grid = await screen.findByTestId('attempt-grid');
  expect(grid.className).toContain('grid-cols-3');
  expect(within(grid).getAllByRole('button')).toHaveLength(6);
  expect(grid.textContent).not.toMatch(/Offer|Moment|Local|Ritual|Tip/);
});
test("a tile's name: number, first words, its state", async () => {
  // post 2 with savedAt and copiedAt, post 3 with a price flag
  expect(screen.getByRole('button', { name: /^Suggestion 2 of 6.*Saved and copied$/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: /^Suggestion 3 of 6.*Check the text$/ })).toBeTruthy();
});
test('an attempt of four says "of 4"', async () => { /* Review Focus */ });
test('without images a tile shows the caption and "Copied"', async () => { /* imagesOn false, copiedAt set */ });
test('a tile whose image is being made shows "Making the image…" and still opens', async () => { ... });
test('tiles streaming in during a plan are shown but disabled', async () => { ... });
test('"Make the images" and "Update captions" stay above their attempt', async () => { ... });
```

Update the existing tests that count `article` cards or click a card's buttons: open the tile first (after Task 7) or count tiles.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/posts-section-images.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement `SuggestionTile`** per the spec's "A tile" (image 4:5 `rounded-control`; the muted block with 2.3's state text for `making`, `failed`, `none`; text-only `bg-field` card with up to 6 lines when `image.kind === 'off'`; first words `line-clamp-2` 13px; `check` → `posts.checkText` in `text-error`; `taken` → the corner check, a `size-[22px] rounded-full bg-accent` with an `on-accent` `Check`, and the label). Accessible name: `t('tile', { n, count })`, the caption's first words, then the label or `checkText`. In `PostsSection`, each attempt renders its heading, its attempt-wide controls (today's `needsImages` button, the `updating` line, the `stale` box) and a `div[data-testid="attempt-grid"].grid.grid-cols-3.gap-x-2.gap-y-3` of tiles; `check` is `flagsFor(…).some(f => SHOWN_FLAGS.includes(f.kind))` (export `SHOWN_FLAGS` from `post-card.tsx`). Streaming posts render as tiles with `disabled`.

- [ ] **Step 4: Add the four strings** from the spec's table to the three files.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/posts-section-images.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/posts/suggestion-tile.tsx components/posts/posts-section.tsx components/posts/post-card.tsx messages/en.json messages/id.json messages/vi.json tests/unit/posts-section.test.tsx tests/unit/posts-section-images.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(posts): each attempt as a grid of six tiles"
```

### Task 7: The suggestion sheet

**Files:**
- Create: `components/posts/suggestion-sheet.tsx`
- Modify: `components/posts/post-card.tsx` (images side by side; no `StoryLink` at the bottom; no `article` frame when in the sheet)
- Modify: `components/posts/post-image.tsx` (`StoryLink` gains a thumbnail form)
- Modify: `components/posts/posts-section.tsx` (one sheet for `open`; `onTaken` → `markTaken` + `saveBatch`)
- Modify: messages (`posts.sheetTitle`, `posts.close`)
- Test: `tests/unit/posts-section.test.tsx`, `tests/unit/posts-card-edit.test.tsx`, `tests/unit/posts-image-card.test.tsx`

**Interfaces:**
- Consumes: `open`/`setOpen` (Task 6), `TakeAway.onTaken` (Task 5), `markTaken` (Task 4).
- Produces: `SuggestionSheet({ title, onClose, children, actions }: { title: string; onClose: () => void; children: ReactNode; actions: ReactNode })` — a `Sheet` open while mounted, `SheetContent` `h-[94dvh]` from the bottom, a header row with `title` (13px `ink-secondary`, also the `SheetTitle`) and a close button (`X`, `aria-label` `posts.close`, `size-11`), a scrolling body, and `actions` pinned at the bottom above `env(safe-area-inset-bottom)`.
- Produces: `StoryLink({ image, altText, thumbnail })` with `thumbnail?: boolean`: when true, the button is the 9:16 story image itself (`aria-label` `posts.images.seeStory`), opening today's full view.

- [ ] **Step 1: Tests**

```tsx
test('tapping a tile opens its sheet with both steps', async () => {
  await seed(batch(6)); renderSection();
  fireEvent.click(await screen.findByRole('button', { name: /^Suggestion 4 of 6/ }));
  const sheet = await screen.findByRole('dialog', { name: 'Attempt 1, suggestion 4 of 6' });
  expect(within(sheet).getByRole('button', { name: /Save the 2 images/ })).toBeTruthy();
  expect(within(sheet).getByRole('button', { name: /Copy the text/ })).toBeTruthy();
  expect(within(sheet).getByRole('button', { name: 'Edit the text' })).toBeTruthy();
  expect(within(sheet).queryByText('See the story image')).toBeNull();
});
test('closing returns focus to the tile', async () => { ... expect(document.activeElement).toBe(tile) });
test('save then copy, close: the tile says "Saved and copied", kept after a reload', async () => {
  // share resolves, clipboard resolves; close; tile name ends with "Saved and copied";
  // loadBatches(): the post has savedAt and copiedAt
});
test('the back gesture closes the sheet', async () => { /* history.back(); popstate → no dialog */ });
test('a language change keeps the same suggestion open', async () => { /* Review Focus: switch locale via LocaleProvider; dialog name in vi */ });
test('the open suggestion gone closes the sheet', async () => { /* Review Focus: remove its batch (forget / reset) → no dialog, no throw */ });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/posts-card-edit.test.tsx tests/unit/posts-image-card.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement**

`PostCard` loses its `article` border (the sheet is the frame), shows `PostImage` and `StoryLink thumbnail` in a `grid grid-cols-[2fr_1fr] gap-2`, with `NewImageLink` under the story; the text, warnings and the links row ("Edit the text", the translation toggle) follow; `takeAway` moves out to the sheet's `actions`. `PostsSection` renders, when `open` names a post still on screen, one `SuggestionSheet` titled `t('sheetTitle', { attempt, n, count })` around that post's `PostCard`, with its `TakeAway` (given `onTaken`) as `actions`; when `open` names nothing on screen, it sets `open` to null. On open, `history.pushState({ suggestion: true }, '')`; a `popstate` while open closes it; closing by button or outside tap calls `history.back()` when the state it pushed is current. Return focus to the tile (`ref` map by post id). `onTaken(step)`: `markTaken(batch, post.id, step, new Date().toISOString())`, then `batchesRef`/`setBatches`/`saveBatch` as `saveEdit` does.

- [ ] **Step 4: Add the two strings** from the spec's table.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/posts-section-images.test.tsx tests/unit/posts-card-edit.test.tsx tests/unit/posts-image-card.test.tsx tests/unit/posts-translation.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/posts/suggestion-sheet.tsx components/posts/post-card.tsx components/posts/post-image.tsx components/posts/posts-section.tsx messages/en.json messages/id.json messages/vi.json tests/unit/posts-section.test.tsx tests/unit/posts-card-edit.test.tsx tests/unit/posts-image-card.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(posts): open one suggestion in a sheet"
```

### Task 8: What's missing, and the section summaries

**Files:**
- Create: `lib/brand/missing.ts`
- Modify: `components/brand/panel.tsx` (imports `SearchState` from `lib/brand/missing.ts` and re-exports it)
- Test: `tests/unit/brand-missing.test.ts`

**Interfaces:**
- Consumes: `Profile` (`lib/brand/profile.ts`), `SectionId` (`lib/brand/edit.ts`), `SearchState` (`components/brand/panel.tsx`; move the type to `lib/brand/missing.ts` and re-export it from the panel).
- Produces:

```ts
export type FieldKey =
  | 'name' | 'summary' | 'category' | 'offerings' | 'highlights'
  | 'town' | 'area' | 'address' | 'serviceArea' | 'hours'
  | 'whatsapp' | 'phone' | 'email' | 'instagram' | 'bookingUrl'
  | 'colours' | 'visualStyle'
  | 'promise' | 'feeling' | 'moments' | 'placeSymbols' | 'senses' | 'tone' | 'searchTerms';
export type MissingField = { field: FieldKey; section: SectionId };
export function missingFields(profile: Profile, search: SearchState): {
  listed: MissingField[];   // the buttons, in panel order
  count: number;            // listed + empty WhatsApp/town
};
export function missingIn(listed: MissingField[], section: SectionId, profile: Profile): number;
export function sectionSummary(profile: Profile, section: Exclude<SectionId, 'business'>): string | null;
```

`FieldKey` names are the `brand.panel.fields.*` keys, so the label is `t(`fields.${field}`)`.

- [ ] **Step 1: Tests**

```ts
test('the fields in panel order, logo and photos never', () => {
  const p = profileWith({ address: null, phone: null, instagram: null, logoUrl: null, photoUrls: [] });
  expect(missingFields(p, null).listed.map((m) => m.field)).toEqual(['address', 'phone', 'instagram']);
});
test('WhatsApp and town are counted, not listed', () => {
  const r = missingFields(profileWith({ whatsapp: null, town: null, phone: null }), null);
  expect(r.listed.map((m) => m.field)).toEqual(['phone']);
  expect(r.count).toBe(3);
});
test("the search's fields wait for the search", () => {
  const p = profileWith({ searchTerms: [], moments: [], placeSymbols: [] });
  expect(missingFields(p, 'running').listed).toEqual([]);
  expect(missingFields(p, null).listed.map((m) => m.field)).toEqual(['moments', 'placeSymbols', 'searchTerms']);
});
test('nothing missing: empty list, count 0', () => { ... });
test('summaries', () => {
  expect(sectionSummary(sen, 'place')).toBe('Da Nang, Every day, 10am to 11pm');
  expect(sectionSummary(sen, 'contact')).toBe('+84898661224');
  expect(sectionSummary(onlyEmail, 'contact')).toBe('hello@sen.vn');
  expect(sectionSummary(sen, 'look')).toBe(sen.visualStyle?.summary ?? null);
  expect(sectionSummary(sen, 'feeling')).toBe('relaxing, warm, cared for. calm, warm, caring');
  expect(sectionSummary(empty, 'place')).toBeNull();
});
```

Use the fixture's actual values (`tests/unit/helpers/brand.ts`, `senProfile()`) in the summary assertions. Summary rules: place = town, then hours, joined by `, `; contact = WhatsApp, else phone, email, Instagram (first set); look = `visualStyle.summary`; feeling = `essence.feeling` joined by `, `, then `. `, then `tone` joined by `, `. Empty parts are skipped; nothing left is `null`.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-missing.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** `lib/brand/missing.ts`, empty by 1.2's rule (`null`, blank text or an empty list; for sourced fields, a blank `value`).

- [ ] **Step 4: Run the tests**

Run: `pnpm vitest run tests/unit/brand-missing.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/missing.ts components/brand/panel.tsx tests/unit/brand-missing.test.ts docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(brand): what's missing from a profile, and a line per section"
```

### Task 9: "Your business" with what's missing first

**Files:**
- Create: `components/brand/missing-block.tsx`
- Modify: `components/brand/panel.tsx` (a `home` mode: collapsible sections, empty fields hidden, warnings out)
- Modify: `components/brand/section-sheet.tsx` (`focus` prop)
- Modify: `components/brand/brand-home.tsx` (business tab top and footer)
- Modify: messages (`brand.home.title`, `brand.home.subtitle`, `brand.missing.*`, `brand.home.readFrom`, `brand.home.reread` changed; remove `brand.home.intro`, `brand.home.lastRead`)
- Test: `tests/unit/brand-panel.test.tsx`, `tests/unit/brand-home.test.tsx`, `tests/unit/brand-section-sheet.test.tsx`

**Interfaces:**
- Consumes: `missingFields`, `missingIn`, `sectionSummary`, `FieldKey` (Task 8).
- Produces: `MissingBlock({ listed, count, onAdd }: { listed: MissingField[]; count: number; onAdd: (m: MissingField) => void })`; renders nothing when `count === 0`.
- Produces: `BrandPanel` gains `mode?: 'reading' | 'home'` (default `'reading'`, today's look, used while a read streams). In `'home'`: "Your business" open by default, showing name, what you offer, kind of business and services as label-beside-value rows (`grid-cols-[7rem_1fr]`), highlights not shown (they stay in its form), with its sources under each value; the other four collapsed rows (`button` with `aria-expanded`, title, `sectionSummary` or `t('missing.inSection', { count })`, a `CaretDown` that turns), any number open, state not stored; unfilled fields render nothing; the WhatsApp and town warnings render above the panel (the `BrandHome` notes area), not in their fields.
- Produces: `SectionSheet({ …today's props, focus }: { …; focus?: FieldKey | null })` — the field with that key gets `autoFocus`; for list and chip fields, the list's "Add" input.
- Produces: `BrandHome` state `editing: { section: SectionId; focus: FieldKey | null } | null` (was `SectionId | null`).

- [ ] **Step 1: Tests**

```tsx
// brand-home.test.tsx
test('Your business: title, notes, missing block, sections, footer, in that order', async () => {
  await saveBrand('sen', senProfile()); // no address, phone, instagram
  renderHome(); fireEvent.click(await screen.findByRole('tab', { name: 'Your business' }));
  expect(screen.getByRole('heading', { name: 'What we know about Sen' })).toBeTruthy();
  expect(screen.getByRole('heading', { name: /things we couldn't find/ })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Add Phone' })).toBeTruthy();
  expect(screen.queryByText('Not found on your site')).toBeNull();
  expect(screen.getByText(/^Read from sendanangmassage\.com /)).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Read it again' })).toBeTruthy();
});
test('"+ Phone" opens "How people reach you" with Phone focused', async () => {
  fireEvent.click(screen.getByRole('button', { name: 'Add Phone' }));
  const dialog = await screen.findByRole('dialog');
  expect(document.activeElement).toBe(within(dialog).getByLabelText('Phone'));
});
test('the WhatsApp warning shows above, with no "+ WhatsApp"', async () => { ... });
test('no block when nothing is missing', async () => { ... });
test('a thin Vietnamese profile: every button wraps, no sideways scroll', async () => {
  // Review Focus: ~18 missing, locale vi; the block's container has `flex-wrap`, each button `min-h-11`
});

// brand-panel.test.tsx
test('home mode: Your business open, the others collapsed with their summary', () => {
  render(<Panel mode="home" profile={sen} />);
  expect(screen.getByRole('button', { name: /Where and when/ }).getAttribute('aria-expanded')).toBe('false');
  expect(screen.getByText('Da Nang, Every day, 10am to 11pm')).toBeTruthy();
  expect(screen.queryByText('from /contact')).toBeNull();
});
test('opening a row shows its values with sources and Edit', () => { ... });
test('a section with nothing to summarise says "{n} to add"', () => { ... });
test('reading mode is unchanged', () => { /* today's assertions */ });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/brand-panel.test.tsx tests/unit/brand-section-sheet.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** the block (an `accent-tint` box, heading 16px weight 500 `missing.title`, `missing.body`, a `flex flex-wrap gap-2` of `min-h-11` buttons: `bg-field border border-accent text-accent-tint-ink`, text `+ {label}`, `aria-label` `missing.add`), the panel's `home` mode, the sheet's `focus`, and the business tab: usage line, `title`/`subtitle`, the notes and the two warnings, `MissingBlock`, `BrandPanel mode="home"`, then the footer (`readFrom` with `site` = `siteUrl` without `https://` and a trailing `/`, `when` = `lastReadLabel(…)`; a row of "Read it again" and "Forget this business" links in `text-accent` / `text-error`, each `min-h-11`, keeping today's confirmations and `readLimitLine`).

- [ ] **Step 4: Strings**: add the spec's rows; change `brand.home.reread`; remove `brand.home.intro`, `brand.home.lastRead`, and `brand.panel.notFound`/`brand.panel.add` only if `grep -rn` finds no other use.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/brand-panel.test.tsx tests/unit/brand-section-sheet.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/brand/missing-block.tsx components/brand/panel.tsx components/brand/section-sheet.tsx components/brand/brand-home.tsx messages/en.json messages/id.json messages/vi.json tests/unit/brand-home.test.tsx tests/unit/brand-panel.test.tsx tests/unit/brand-section-sheet.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(brand): Your business shows what's missing first"
```

### Task 10: One reply at a time

**Files:**
- Modify: `components/reviews/reviews-section.tsx` (with-replies view)
- Modify: `components/reviews/reply-card.tsx` (no heading; `copyLabel`)
- Modify: messages (`reviews.which`, `reviews.copy`; `reviews.short`, `reviews.warm` changed)
- Test: `tests/unit/reviews-section.test.tsx`, `tests/unit/reviews-section-storage.test.tsx`

**Interfaces:**
- Produces: `ReplyCard({ title, text, translation, edited, onSave, copyLabel }: { …today's; copyLabel: string })` — `title` becomes the textarea's `aria-label` only; no `h3`; the reply 17px.
- Produces: in `ReviewsSection`, state `which: 'short' | 'warm'`, set to `'short'` when the first replies for a review arrive (`write` with `again: false`) and on "Paste a new review"; kept on `again: true`.

- [ ] **Step 1: Tests**

```tsx
test('one card, Short picked, one "Copy the reply"', async () => {
  // replies shown
  const group = screen.getByRole('radiogroup', { name: 'Which reply' });
  expect(within(group).getByRole('radio', { name: 'Short' }).getAttribute('aria-checked')).toBe('true');
  expect(screen.getAllByRole('button', { name: 'Copy the reply' })).toHaveLength(1);
  expect(screen.getByText(SHORT_TEXT)).toBeTruthy();
  expect(screen.queryByText(WARM_TEXT)).toBeNull();
});
test('Warmer shows the warmer reply; arrow keys move between the two', async () => { ... });
test('an edit to Short stays across a switch', async () => { ... });
test('"Write 2 other replies" keeps Warmer picked', async () => { ... });
test('a new review starts on Short', async () => { ... });
test('a reload starts on Short', async () => { /* reviews-section-storage */ });
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/reviews-section.test.tsx tests/unit/reviews-section-storage.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement** the switch (`RadioGroup` from `radix-ui`, which gives the roles and arrow keys, `aria-label` `reviews.which`; a `field-muted` bar, 1px `edge`, `p-1`, `grid-cols-2`, each `min-h-11`; picked `bg-field ring-1 ring-accent text-accent-tint-ink font-medium`, other `text-ink-secondary`), one `ReplyCard` keyed `${record.createdAt}-${which}`, the `howTo` line, then the two links on one row (`flex flex-wrap justify-center gap-x-6`).

- [ ] **Step 4: Strings**: add `reviews.which`, `reviews.copy`; change `reviews.short`, `reviews.warm` to the spec's values.

- [ ] **Step 5: Run the tests**

Run: `pnpm vitest run tests/unit/reviews-section.test.tsx tests/unit/reviews-section-storage.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/reviews/reviews-section.tsx components/reviews/reply-card.tsx messages/en.json messages/id.json messages/vi.json tests/unit/reviews-section.test.tsx tests/unit/reviews-section-storage.test.tsx docs/specs/platform/friendlier-home/journal.md
git commit -m "feat(reviews): one reply at a time, Short or Warmer"
```

### Task 11: The guide, the other specs, the e2e tests

**Files:**
- Modify: messages (`guide.business.check`, `guide.business.missing`, `guide.posts.open` new, `guide.reviews.pick`, `guide.languages.switch`, `guide.allowance.bar`), in the three files
- Modify: `components/guide/owner-guide.tsx` (renders `guide.posts.open` after `guide.posts.make`, with `saved`; `guide.reviews.pick` with `short`, `warm`)
- Modify: the seven specs listed in the spec's "Other documents" (a dated "> Changed by `platform/friendlier-home` (2026-10-27): …" note at each section)
- Modify: `tests/e2e/*.spec.ts` that read the old layout (`posts`, `suggestions`, `editor`, `images`, `home-tabs`, `reviews`, `i18n`, `brand-panel`, `brand-search`, `usage`, `guide`)
- Create: `tests/e2e/friendlier-home.spec.ts`
- Test: `tests/unit/guide.test.tsx`

**Interfaces:**
- Consumes: everything above.

- [ ] **Step 1: Guide test**

```tsx
test('the guide names the new controls', () => {
  renderGuide('en');
  expect(screen.getByText(/Tap a suggestion to open it/)).toBeTruthy();
  expect(screen.getByText(/The EN button at the top right/)).toBeTruthy();
  expect(screen.getByText(/Switch between/)).toBeTruthy();
});
```

- [ ] **Step 2: Run it to see it fail**, then change the six guide lines (English from the spec; Indonesian and Vietnamese in the guide's register, `Anda`, `bạn`), render `guide.posts.open`, and run `pnpm vitest run tests/unit/guide.test.tsx tests/unit/i18n-messages.test.ts`: PASS.

- [ ] **Step 3: Write `tests/e2e/friendlier-home.spec.ts`** at the phone viewport, routes mocked with the existing helpers (`fulfilRead`, `fulfilPosts`, `fulfilImages`):
  - a saved brand opens on "Create Posts" with `[data-tab-bar]` at the bottom of the viewport;
  - open tile 2, "1 Save the 2 images" (stub `navigator.share` and `canShare` with `page.addInitScript`), "2 Copy the text" (grant clipboard), close; tile 2's name ends with "Saved and copied"; reload; still;
  - "Your business": the missing block first; "+ Phone" opens the form with Phone focused;
  - Reviews: write two replies, "Warmer", "Copy the reply", "Copied";
  - the language button: open, "Tiếng Việt", the same tab in Vietnamese;
  - 320px wide in en, id and vi: `document.documentElement.scrollWidth <= 320` on each tab and on `/enter`;
  - a long spa name at 320px: Guide and EN each `toBeInViewport({ ratio: 1 })` (Review Focus);
  - typing in "The review" with the keyboard simulated (`page.setViewportSize` height halved): `[data-tab-bar]` hidden.

- [ ] **Step 4: Update the old e2e tests** (open a tile before using a suggestion's buttons; tabs by role still work; the language by the button; one reply card; `Read it again`).

- [ ] **Step 5: Run the e2e tests**

Run: `pnpm test:e2e`
Expected: all pass.

- [ ] **Step 6: The spec notes** in the seven specs, and `docs/roadmap.md` 2.10 → `done`.

- [ ] **Step 7: Full check and the guide PDF**

Run: `pnpm check`
Expected: PASS (biome, typecheck, Vitest, docs and repo checks).
Run: `pnpm guide:pdf` (needs port 3000 free); open the three PDFs under `.superpowers/guide/` and check the changed lines read well.

- [ ] **Step 8: Commit**

```bash
git add messages/en.json messages/id.json messages/vi.json components/guide/owner-guide.tsx tests/unit/guide.test.tsx tests/e2e docs/specs docs/roadmap.md
git commit -m "docs(docs): the guide, the specs and the e2e tests follow the friendlier home"
```

Stage `tests/e2e` and `docs/specs` by listing each changed file, not the folder, per AGENTS.md.
