# Brand panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, per `AGENTS.md`) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** The home screen reads the owner's website through 1.1's
`POST /api/brand/read`, streams the profile into an editable panel, keeps it
on the phone in IndexedDB, resumes an interrupted read, and offers "Re-read
my website" and "Forget this business", in English, Indonesian and
Vietnamese.

**Architecture:** Three framework-free modules carry the logic, each tested
on its own: `lib/brand/store.ts` (IndexedDB: brands and runs),
`lib/runs/run-record.ts` (decision 0005's run record and resume rule) and
`lib/brand/edit.ts` (applying a section form to a profile). A fourth,
`lib/brand/read-client.ts`, drives one read: it writes the run record, posts
to the route, reads the NDJSON with 1.1's `readLines`, and reports events.
React only renders: `components/brand/` holds the home state machine, the
panel, the section forms and the confirmations. `app/page.tsx` stays a
Server Component that checks the owner and renders `<BrandHome ownerId>`.

**Tech Stack:** Next.js 16.4.3, React 19.3.1, next-intl 4.14.9, zod 4.6.7,
radix-ui 1.8.1 (Dialog, AlertDialog), libphonenumber-js 1.13.15, Vitest
5.0.5 with jsdom, Playwright 1.64.1. New, pinned, each published at least
two weeks ago:
- `idb` 8.0.3 (ISC), the IndexedDB wrapper;
- `fake-indexeddb` 6.2.5 (Apache-2.0), dev only, for Vitest.

**Spec:** [`spec.md`](spec.md).

## Global Constraints

- One IndexedDB database `shopfront`, version 1, stores `brands` (key path
  `ownerId`) and `runs` (key path `id`, index `ownerId`).
- A brand record is `{ ownerId, profile, savedAt }`; `profile` passes
  `profileSchema` from `lib/brand/profile.ts`. `schemaVersion` stays `1`.
- Sources: a page URL, `"model"`, or `"owner"` (new constant
  `OWNER_SOURCE = 'owner'` in `lib/brand/profile.ts`). Any other string (1.1
  writes `"theme-color"` and `"css:…"` for colours) is shown as "from your
  website", without a link.
- Partial lines are shown, never stored. The profile is stored only from a
  `final` line or a Save.
- Run record: `{ id, ownerId, kind: 'brand-read', reread, url, startedAt,
  steps: [{ name: 'brand', status, output? }] }`, status one of `pending`,
  `running`, `done`, `failed`.
- Every visible string lives in `messages/en.json`, `id.json` and `vi.json`
  under the `brand` key, added in the same commit as the code that shows it.
  The English copy is the spec's, word for word.
- No server change, no new route. CI calls no model and no website: unit
  tests mock `fetch`; Playwright fulfils `/api/brand/read` with `page.route`.
- Phone first: the layout's 420 px column, the existing tokens and the
  `press` utility (decision 0007). Icons from `@phosphor-icons/react`.
- Commits: Conventional Commits, scope `brand` (or `web` for `app/page.tsx`
  only changes); stage by path.

## Review Focus

1. **Colour sources that aren't URLs** (`"theme-color"`, `"css:--color-bg"`
   from 1.1): shown as "from your website", no link, no `new URL` crash. Test
   in Task 5.
2. **A double mount on load** (React Strict Mode in `pnpm dev`, or load plus
   `visibilitychange` firing together): resume sends exactly one request.
   Test in Task 4.
3. **Half-filled partial objects** (`location: { town: { value: 'Da' } }`
   with no source yet, an offering with no name): the panel renders what is
   there and skips the rest. Test in Task 5.
4. **Saving a field unchanged, or with extra spaces:** its source is kept and
   it doesn't count as an owner edit, so re-read doesn't warn for nothing.
   Test in Task 3.
5. **IndexedDB unavailable** (`indexedDB.open` throws or is missing): the
   read still works, the panel shows, with the "won't keep your business"
   notice. Tests in Tasks 1 and 7.

---

### Task 1: The brand store on the phone

**Files:**
- Modify: `package.json`, `pnpm-lock.yaml` (`idb` 8.0.3, `fake-indexeddb`
  6.2.5 as dev)
- Modify: `lib/brand/profile.ts` (add `OWNER_SOURCE`, and a comment on
  `sourced` naming the three source kinds)
- Create: `lib/brand/store.ts`
- Create: `docs/specs/brand/brand-panel/journal.md`, from
  `docs/templates/journal.md`; every task adds its RED and GREEN lines and
  its calls to it, and stages it with its commit
- Test: `tests/unit/brand-store.test.ts`

**Interfaces:**
- Produces:
  - `type BrandRecord = { ownerId: string; profile: Profile; savedAt: string }`
  - `type LoadResult = { kind: 'none' } | { kind: 'saved'; record: BrandRecord } | { kind: 'invalid' } | { kind: 'unavailable' }`
  - `openStore(): Promise<IDBPDatabase<ShopfrontDb> | null>` (null when
    IndexedDB is missing or `open` throws; memoised per page load, with
    `resetStoreForTests()` exported for tests)
  - `loadBrand(ownerId: string): Promise<LoadResult>`
  - `saveBrand(ownerId: string, profile: Profile, now?: Date): Promise<boolean>`
    (parses with `profileSchema` and throws on an invalid profile; false
    when unavailable)
  - `forgetBrand(ownerId: string): Promise<void>` (deletes the brand record
    and every run with that `ownerId`, in one transaction)
  - `requestPersistence(): Promise<void>` (calls `navigator.storage.persist()`
    at most once per page load, swallowing errors)
  - `ShopfrontDb` (the `idb` `DBSchema`, also used by Task 2's run store)

- [ ] **Step 1: Install the two packages**

Run: `pnpm add idb@8.0.3 && pnpm add -D fake-indexeddb@6.2.5`
Expected: both pinned exactly in `package.json` (no `^`).

- [ ] **Step 2: Write the failing tests** (`import 'fake-indexeddb/auto'`,
  `resetStoreForTests()` and a fresh `IDBFactory` in `beforeEach`)

```ts
test('saves and loads a profile by owner', async () => {
  expect(await saveBrand('sen', svargaProfile(), new Date('2026-10-24T10:00:00Z'))).toBe(true);
  expect(await loadBrand('sen')).toEqual({
    kind: 'saved',
    record: { ownerId: 'sen', profile: svargaProfile(), savedAt: '2026-10-24T10:00:00.000Z' },
  });
});
test('another owner sees nothing', async () => {
  await saveBrand('sen', svargaProfile());
  expect(await loadBrand('svarga')).toEqual({ kind: 'none' });
});
test('a record that fails the schema loads as invalid', async () => {
  // put { ownerId: 'sen', profile: { schemaVersion: 2 }, savedAt } straight into the store
  expect(await loadBrand('sen')).toEqual({ kind: 'invalid' });
});
test('refuses to save an invalid profile', async () => {
  await expect(saveBrand('sen', { ...svargaProfile(), name: { value: '', source: SITE } })).rejects.toThrow();
});
test('forget deletes the brand and its runs, not other owners', async () => {
  // save brands for sen and svarga, put a run for each (Task 2 shape, written raw here)
  await forgetBrand('sen');
  expect(await loadBrand('sen')).toEqual({ kind: 'none' });
  expect(await loadBrand('svarga')).toMatchObject({ kind: 'saved' });
  // the runs store holds only svarga's run
});
test('without IndexedDB, load says unavailable and save returns false', async () => {
  // stub globalThis.indexedDB = undefined, resetStoreForTests()
  expect(await loadBrand('sen')).toEqual({ kind: 'unavailable' });
  expect(await saveBrand('sen', svargaProfile())).toBe(false);
});
test('asks for persistent storage once', async () => {
  // stub navigator.storage.persist with a vi.fn resolving true
  await requestPersistence(); await requestPersistence();
  expect(persist).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 3: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-store.test.ts`
Expected: FAIL, `lib/brand/store.ts` not found.

- [ ] **Step 4: Implement `lib/brand/store.ts`** with `idb`'s `openDB`,
  `upgrade` creating both stores and the `runs.ownerId` index. Add
  `OWNER_SOURCE` to `profile.ts`.

- [ ] **Step 5: Run them to see them pass**

Run: `pnpm vitest run tests/unit/brand-store.test.ts`
Expected: PASS, 7 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/brand/profile.ts lib/brand/store.ts tests/unit/brand-store.test.ts
git commit -m "feat(brand): keep the brand profile on the phone in IndexedDB"
```

### Task 2: The run record and the resume rule

**Files:**
- Create: `lib/runs/run-record.ts` (pure), `lib/runs/store.ts` (IndexedDB)
- Test: `tests/unit/runs-record.test.ts`, `tests/unit/runs-store.test.ts`

**Interfaces:**
- Consumes: `openStore()`, `ShopfrontDb` from Task 1.
- Produces:
  - `type StepStatus = 'pending' | 'running' | 'done' | 'failed'`
  - `type RunRecord = { id: string; ownerId: string; kind: 'brand-read'; reread: boolean; url: string; startedAt: string; steps: { name: 'brand'; status: StepStatus; output?: Profile }[] }`
  - `newBrandRun(input: { ownerId: string; url: string; reread: boolean }, now: Date, id: string): RunRecord` (step `running`)
  - `resumeRun(run: RunRecord, isLive: (runId: string) => boolean): RunRecord` (each `running` step of a run that isn't live becomes `pending`; `done` and `failed` untouched)
  - `stepsToRequest(run: RunRecord): ('brand')[]` (the `pending` steps, in order)
  - `isFinished(run: RunRecord): boolean` (every step `done` or `failed`)
  - In `lib/runs/store.ts`: `saveRun(run): Promise<void>`, `loadOpenRun(ownerId): Promise<RunRecord | null>` (the newest run with an unfinished step), `deleteRun(id): Promise<void>`; all no-ops (or null) when the store is unavailable.

- [ ] **Step 1: Write the failing tests**

```ts
// runs-record.test.ts
test('a new run starts with the brand step running', () => {
  const run = newBrandRun({ ownerId: 'sen', url: 'sendanangmassage.com', reread: false }, new Date('2026-10-24T10:00:00Z'), 'r1');
  expect(run).toEqual({ id: 'r1', ownerId: 'sen', kind: 'brand-read', reread: false, url: 'sendanangmassage.com', startedAt: '2026-10-24T10:00:00.000Z', steps: [{ name: 'brand', status: 'running' }] });
});
test('a running step with no live request goes back to pending', () => {
  expect(stepsToRequest(resumeRun(run, () => false))).toEqual(['brand']);
});
test('a running step whose request is alive is left alone', () => {
  expect(stepsToRequest(resumeRun(run, () => true))).toEqual([]);
});
test('a done step is never requested again', () => {
  const done = { ...run, steps: [{ name: 'brand', status: 'done', output: svargaProfile() }] };
  expect(stepsToRequest(resumeRun(done, () => false))).toEqual([]);
  expect(isFinished(done)).toBe(true);
});
// runs-store.test.ts (fake-indexeddb)
test('loads the open run of this owner only', …);
test('a finished run is not open', …);
test('delete removes it', …);
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/runs-record.test.ts tests/unit/runs-store.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both files.** `loadOpenRun` reads the `ownerId`
  index, filters with `!isFinished`, and returns the latest `startedAt`.

- [ ] **Step 4: Run them to see them pass** (same command). Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/runs tests/unit/runs-record.test.ts tests/unit/runs-store.test.ts
git commit -m "feat(brand): add the run record and its resume rule (decision 0005)"
```

### Task 3: Applying an owner's edit

**Files:**
- Create: `lib/brand/edit.ts`
- Test: `tests/unit/brand-edit.test.ts`

**Interfaces:**
- Consumes: `Profile`, `profileSchema`, `LIMITS`, `OWNER_SOURCE` from
  `lib/brand/profile.ts`; `toE164` from `lib/brand/phone.ts`.
- Produces:
  - `type SectionId = 'business' | 'place' | 'contact' | 'look' | 'feeling'`
  - Form values, plain strings, `''` meaning empty:
    - `BusinessValues = { name; summary; category; offerings: { name; description; price; duration; source?: string }[]; highlights: { value; source?: string }[] }`
    - `PlaceValues = { town; area; address; serviceArea; hours }`
    - `ContactValues = { whatsapp; phone; email; instagram; bookingUrl }`
    - `LookValues = { keepLogo: boolean; colours: { hex; role; source?: string }[]; photoUrls: string[]; style: { summary; palette; light; textures; mood } }`
    - `FeelingValues = { promise; feeling: string[]; moments: { value; source?: string }[]; placeSymbols: string[]; senses: string[]; tone: string[] }`
  - `sectionValues(profile: Profile, section: SectionId): SectionValues[typeof section]` (the form's starting values)
  - `type FieldError = 'required' | 'tooManyWords' | 'tooMany' | 'invalidEmail' | 'invalidUrl' | 'invalidPhone' | 'needCountryCode' | 'styleIncomplete' | 'needColour'`
  - `applySection(profile, section, values): { ok: true; profile: Profile } | { ok: false; errors: Record<string, FieldError> }` (error keys are dotted field paths in the values, like `summary`, `offerings.2.name`, `whatsapp`)
  - `countOwnerEdits(profile: Profile): number` (every sourced value, list item and colour whose source is `OWNER_SOURCE`)

Rules the tests pin (spec, "Editing" and "What an edit changes"):
- A sourced string keeps its source when its trimmed value equals the old
  value; `''` becomes `null`; otherwise `{ value: trimmed, source: 'owner' }`.
- A list item (offering, highlight, moment, colour) keeps its source when an
  identical item (every field, trimmed) is in the old list, so reordering
  and removing are not edits; any other item gets `source: 'owner'`.
- Unsourced fields (`category`, `tone`, `feeling`, `placeSymbols`, `senses`,
  `visualStyle`) are taken as typed, trimmed, empty list entries dropped.
- WhatsApp and phone go through `toE164(raw, countryHint(profile))`. The
  hint is the country of the profile's other stored number (from
  `parsePhoneNumberFromString(...).country`), else `'VN'` when the location
  fields mention Vietnam, Da Nang, Hoi An, Hanoi, Ho Chi Minh, Saigon or Nha
  Trang, else `'ID'` when they mention Indonesia, Bali, Canggu, Seminyak,
  Ubud, Jakarta or Lombok (case-insensitive). No `+`, no `00` and no hint →
  `needCountryCode`. A result that isn't `+` and digits → `invalidPhone`.
- Instagram: strip a leading `@`, and reduce `instagram.com/<handle>` links
  to the handle.
- Booking link: add `https://` when no scheme, then must parse as a URL
  (`invalidUrl`). Email: `z.email()` (`invalidEmail`).
- Visual style: all five empty → `null`; some but not all → `styleIncomplete`.
- No colour left → `needColour`. `keepLogo: false` → `logoUrl: null`.
- Everything else is checked by `profileSchema.safeParse` on the result; its
  issues are mapped to `required` (empty name), `tooManyWords` (a word
  limit) and `tooMany` (a list limit), at the matching values path.

- [ ] **Step 1: Write the failing tests** (on `svargaProfile()` from
  `tests/unit/helpers/brand.ts`)

```ts
test('a changed field becomes the owner's', () => {
  const r = applySection(p, 'place', { ...sectionValues(p, 'place'), hours: '9am to midnight' });
  expect(r.ok && r.profile.hours).toEqual({ value: '9am to midnight', source: 'owner' });
});
test('saving a field unchanged, or with extra spaces, keeps its source', () => {
  const r = applySection(p, 'place', { ...sectionValues(p, 'place'), hours: '  Every day, 9am to 10pm ' });
  expect(r.ok && r.profile.hours).toEqual(p.hours);
  expect(r.ok && countOwnerEdits(r.profile)).toBe(0);
});
test('reordering and removing offerings are not edits', …);
test('an emptied field becomes null', …);
test('a WhatsApp number without a country code takes the other number's country', () => {
  // profile with phone +84905123456
  expect(r.ok && r.profile.contact.whatsapp).toEqual({ value: '+84905111222', source: 'owner' });  // typed '0905 111 222'
});
test('without any hint the owner is asked for the country code', () => {
  // no phone, location without a known place
  expect(r).toEqual({ ok: false, errors: { whatsapp: 'needCountryCode' } });
});
test('the town gives the country when there is no other number', …); // Canggu → +62
test('an Instagram link becomes a handle', …); // 'https://www.instagram.com/svarga.bali/' and '@svarga.bali' → 'svarga.bali'
test('a booking link gets https', …); // 'svarga.com/book' → 'https://svarga.com/book'
test('a bad email is refused', …);
test('a 30-word summary is refused', () => {
  expect(r).toEqual({ ok: false, errors: { summary: 'tooManyWords' } });
});
test('the name cannot be emptied', …); // { name: 'required' }
test('half a visual style is refused, none is null', …);
test('the last colour cannot be removed', …);
test('removing the logo sets it to null', …);
test('counts owner edits across the profile', …); // 2 edits → 2
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-edit.test.ts`
Expected: FAIL, `lib/brand/edit.ts` not found.

- [ ] **Step 3: Implement `lib/brand/edit.ts`** to the rules above.

- [ ] **Step 4: Run them to see them pass** (same command). Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/edit.ts tests/unit/brand-edit.test.ts
git commit -m "feat(brand): apply the owner's edits to the brand profile"
```

### Task 4: The read client

**Files:**
- Create: `lib/brand/read-client.ts`
- Test: `tests/unit/brand-read-client.test.ts`

**Interfaces:**
- Consumes: Tasks 1 and 2; `readLines` from `lib/brand/stream.ts`;
  `BrandErrorCode`, `PartialProfile`, `Profile`.
- Produces:
  - `type ReadEvent = { type: 'partial'; profile: PartialProfile } | { type: 'final'; profile: Profile; kept: boolean } | { type: 'error'; code: BrandErrorCode } | { type: 'offline' } | { type: 'signedOut' }`
    (`kept` is `saveBrand`'s result: false when the phone can't keep it)
  - `type ReadDeps = { fetch: typeof fetch; now: () => Date; newId: () => string }`, `defaultReadDeps()` using `globalThis.fetch` and `crypto.randomUUID`
  - `startRead(input: { ownerId: string; url: string; reread: boolean }, onEvent: (e: ReadEvent) => void, deps?: ReadDeps): { stop(): void; done: Promise<void> }`
  - `resumeRead(ownerId: string, onEvent: (e: ReadEvent) => void, deps?: ReadDeps): Promise<{ stop(): void; done: Promise<void>; reread: boolean } | null>`
    (null when there is nothing to resume, or the open run's request is
    already live in this page)

Behaviour:
- `startRead` saves a new run (`newBrandRun`), marks its id live in a
  module-level `Set`, and posts `{ url }` as JSON with the abort signal.
- `401` → `signedOut`; any other non-2xx → `error` with the body's
  `error` code (`model_failed` if it doesn't parse); `partial` lines →
  `partial`; `final` → `saveBrand` then the run is deleted, then `final`;
  `error` line → run deleted, then `error`. 
- A `fetch` rejection or a stream that ends with no `final` or `error`
  line: the id leaves the live set, the run stays `running` in the store,
  and `offline` is sent.
- `stop()` aborts, deletes the run and sends no event.
- `resumeRead` loads the open run, applies `resumeRun` with the live set,
  and if `stepsToRequest` is `['brand']` re-posts it (keeping the run's id
  and `reread`) exactly like `startRead`. A second call while the first is
  in flight returns null.

- [ ] **Step 1: Write the failing tests** (fake-indexeddb; `fetch` is a
  `vi.fn` returning a `Response` built from NDJSON lines with `encodeLine`)

```ts
test('a read streams partials, then saves the final profile and clears the run', async () => {
  const events: ReadEvent[] = [];
  await startRead({ ownerId: 'sen', url: 'svargabalimassage.com', reread: false }, (e) => events.push(e), deps).done;
  expect(events.map((e) => e.type)).toEqual(['partial', 'final']);
  expect(await loadBrand('sen')).toMatchObject({ kind: 'saved' });
  expect(await loadOpenRun('sen')).toBeNull();
  expect(fetchMock).toHaveBeenCalledWith('/api/brand/read', expect.objectContaining({ method: 'POST', body: JSON.stringify({ url: 'svargabalimassage.com' }) }));
});
test('an error line ends the read and keeps nothing', …); // model_busy
test('an error answer before the stream gives its code', …); // 400 { error: 'invalid_url' }
test('a 401 means signed out', …);
test('a dropped stream leaves the run to resume and says offline', async () => {
  // body with one partial line and no final
  expect(events.at(-1)).toEqual({ type: 'offline' });
  expect((await loadOpenRun('sen'))?.steps[0].status).toBe('running');
});
test('resume re-requests an interrupted read once, as a re-read if it was one', async () => {
  // a stored running run with reread: true, nothing live
  const [a, b] = await Promise.all([resumeRead('sen', onEvent, deps), resumeRead('sen', onEvent, deps)]);
  expect([a, b].filter(Boolean)).toHaveLength(1);
  expect(a?.reread ?? b?.reread).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test('nothing to resume after a finished read', …);
test('stop aborts, deletes the run and sends nothing', …);
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-read-client.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `lib/brand/read-client.ts`.** The live set is
  claimed synchronously before the first `await` in `resumeRead`'s request
  path, so two concurrent calls can't both post (Review Focus 2).

- [ ] **Step 4: Run them to see them pass** (same command). Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/read-client.ts tests/unit/brand-read-client.test.ts
git commit -m "feat(brand): drive a brand read from the browser and resume it"
```

### Task 5: The panel, read-only

**Files:**
- Create: `components/brand/source-note.tsx`, `components/brand/panel.tsx`
- Create: `lib/brand/display.ts` (pure helpers for the panel)
- Modify: `messages/en.json`, `id.json`, `vi.json` (`brand.panel.*`,
  `brand.source.*`)
- Test: `tests/unit/brand-display.test.ts`, `tests/unit/brand-panel.test.tsx`

**Interfaces:**
- Consumes: `Profile`, `PartialProfile`, `OWNER_SOURCE`, `SectionId`
  (Task 3).
- Produces:
  - `sourceOf(source: string | undefined, kind: 'fact' | 'guess' | 'suggestion'): { kind: 'page'; path: string; href: string } | { kind: 'home'; href: string } | { kind: 'owner' } | { kind: 'model'; as: 'guess' | 'suggestion' } | { kind: 'site' } | null`
    (`'site'` for a non-URL source like `"theme-color"`; null when the
    source is missing, as in a partial)
  - `lastReadLabel(readAt: string, now: Date, locale: string): string`
    (`Intl.RelativeTimeFormat` with `numeric: 'auto'`: minutes under an
    hour, hours under a day, else days)
  - `<BrandPanel profile={Profile | PartialProfile} editable={boolean} onEdit={(s: SectionId) => void} />`
    (the five section cards of the spec's table, in order; `editable`
    false hides Edit and Add)
  - `<SourceNote source kind />`

English copy (spec, "The panel"): section titles "Your business", "Where and
when", "How people reach you", "Your look", "Your feeling"; "from {path}",
"from your home page", "from your website", "our guess from your photos",
"our suggestion", "added by you"; "Not found on your site", "Add"; "Add your
WhatsApp number: every post ends with it."; "Add your town: posts and
hashtags use it."; "We couldn't read much from your website. Fill in what's
missing so your posts are right."; "Edit" with the accessible name "Edit
{section}". Field labels are the builder's, short, in the three languages.

Images (logo, photos) are plain `<img>` with `referrerPolicy="no-referrer"`
and `loading="lazy"`, because they are hot-linked from the owner's site (a
`biome-ignore` comment saying so if Biome flags it).

- [ ] **Step 1: Write the failing tests**

```ts
// brand-display.test.ts
test('a page source shows its path and links to it', () =>
  expect(sourceOf('https://sendanangmassage.com/contact', 'fact')).toEqual({ kind: 'page', path: '/contact', href: 'https://sendanangmassage.com/contact' }));
test('the home page is named', …);           // 'https://x.com/' → { kind: 'home', … }
test('a colour source that is not a URL is "from your website"', () =>
  expect(sourceOf('css:--color-bg', 'fact')).toEqual({ kind: 'site' }));
test('model and owner sources', …);           // 'model' + 'guess', 'model' + 'suggestion', 'owner'
test('last read in days, in Vietnamese too', () => {
  expect(lastReadLabel('2026-10-21T10:00:00Z', new Date('2026-10-24T10:00:00Z'), 'en')).toBe('3 days ago');
  expect(lastReadLabel('2026-10-24T09:30:00Z', new Date('2026-10-24T10:00:00Z'), 'vi')).toBe(new Intl.RelativeTimeFormat('vi', { numeric: 'auto' }).format(-30, 'minute'));
});
// brand-panel.test.tsx (jsdom, NextIntlClientProvider with en.json)
test('shows the WhatsApp number with "from /contact"', …);
test('shows the visual style as our guess from your photos', …);
test('warns when WhatsApp is missing, with an Add link', …);
test('warns when the town is missing', …);
test('shows the thin notice', …);
test('renders a half-filled partial without crashing', () => {
  renderPanel({ name: { value: 'Se' }, location: { town: { value: 'Da' } }, offerings: [{ price: '300k' }] }, false);
  expect(screen.getByText('Se')).toBeTruthy();
  expect(screen.queryByRole('button', { name: /Edit/ })).toBeNull();
});
test('each Edit button names its section and reports it', …); // 'Edit How people reach you' → onEdit('contact')
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-display.test.ts tests/unit/brand-panel.test.tsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** `lib/brand/display.ts`, the two components, and
  the messages in all three files.

- [ ] **Step 4: Run them, and the message-file test, to see them pass**

Run: `pnpm vitest run tests/unit/brand-display.test.ts tests/unit/brand-panel.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/brand/display.ts components/brand/source-note.tsx components/brand/panel.tsx messages/en.json messages/id.json messages/vi.json tests/unit/brand-display.test.ts tests/unit/brand-panel.test.tsx
git commit -m "feat(brand): show the brand profile with where each fact came from"
```

### Task 6: The section forms

**Files:**
- Create: `components/ui/sheet.tsx` (shadcn sheet on radix `Dialog`,
  bottom side only), `components/ui/alert-dialog.tsx` (shadcn, on radix
  `AlertDialog`, with a `destructive` action variant), `components/ui/textarea.tsx`
- Create: `components/brand/section-sheet.tsx`,
  `components/brand/list-field.tsx` (add, remove, up, down),
  `components/brand/chips-field.tsx`
- Modify: the three message files (`brand.edit.*`)
- Test: `tests/unit/brand-section-sheet.test.tsx`

**Interfaces:**
- Consumes: `sectionValues`, `applySection`, `FieldError`, `SectionId`
  (Task 3).
- Produces: `<SectionSheet profile={Profile} section={SectionId | null} onSave={(p: Profile) => Promise<void>} onClose={() => void} />`
  (open when `section` isn't null)

English copy (spec, "Editing"): "Save", "Cancel", "Discard your changes?"
with "Discard" and "Keep editing", "Write in English: your posts are in
English.", limit hints like "Up to {count} words" and "Up to {count}",
and one message per `FieldError` (for example `needCountryCode`: "Start with
your country code, like +84 or +62.").

- [ ] **Step 1: Write the failing tests** (jsdom)

```ts
test('saving a valid change calls onSave with the applied profile', …); // hours → source 'owner'
test('a 30-word summary keeps the sheet open with the message', async () => {
  // type 30 words, click Save
  expect(screen.getByText('Up to 25 words')).toBeTruthy();   // hint, and the error text under the field
  expect(onSave).not.toHaveBeenCalled();
});
test('the field with an error is aria-invalid and described by its message', …);
test('cancel with no change closes at once', …);
test('cancel after a change asks to discard', …);
test('an offering can be added, moved up and removed', …);
test('a tone word can be added as a chip and removed', …);
test('the English hint is shown', …);
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-section-sheet.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement** the UI pieces and the five forms in
  `section-sheet.tsx`. Colours use `<input type="color">` next to a hex
  text field and a role `<select>`; logo and photos show a "Remove" button
  each.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/brand-section-sheet.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/ui/sheet.tsx components/ui/alert-dialog.tsx components/ui/textarea.tsx components/brand/section-sheet.tsx components/brand/list-field.tsx components/brand/chips-field.tsx messages/en.json messages/id.json messages/vi.json tests/unit/brand-section-sheet.test.tsx
git commit -m "feat(brand): edit each section of the brand panel"
```

### Task 7: The home screen

**Files:**
- Create: `components/brand/brand-home.tsx` (client), `components/brand/reading.tsx`,
  `lib/brand/wake-lock.ts`
- Modify: `app/page.tsx` (render `<BrandHome ownerId={ownerId} />` in place
  of the read-only field and "Coming soon"; keep the header, welcome line,
  language switch and "Signed in" line)
- Modify: the three message files (`brand.home.*`, `brand.errors.*`,
  `brand.reread.*`, `brand.forget.*`); remove `home.soon`,
  `home.websiteExample` and `home.comingSoon` if no longer used
- Test: `tests/unit/brand-home.test.tsx`, `tests/unit/brand-errors.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 6.
- Produces: `<BrandHome ownerId={string} />`, and
  `holdWakeLock(): { release(): void }` (requests `navigator.wakeLock` now
  and on each `visibilitychange` to visible until released; ignores refusal
  and absence).

States and transitions (spec, "The home screen"):
- On mount: `loadBrand` → `saved` shows the panel, `invalid` shows state 1
  with "We couldn't open your saved business. Read your website again.",
  `unavailable` shows state 1 and, after a read, the "won't keep your
  business" notice. Then `resumeRead`; on `visibilitychange` to visible and
  on `online`, `resumeRead` again.
- "Read my website": empty field → focus it; else `startRead`, hold the
  wake lock, show the reading state with the panel filling from `partial`
  events (`editable` false). The lock is released when the read ends.
- `final` → panel, editable; `requestPersistence()`; live region "Done:
  check what we understood". `error` → message from `brand.errors.<code>`,
  above the field (first read) or above the restored saved panel
  (re-read). `offline` → "You're offline. We'll carry on when you're back."
  and stay in the reading state. `signedOut` → `window.location.assign('/enter')`.
- "Stop" → `stop()`, back to state 1, or to the saved panel on a re-read.
- Re-read: `countOwnerEdits > 0` → alert dialog with "Read your website
  again? Your {count} changes will be replaced by what your site says now.",
  "Read again", "Cancel"; else start at once. Uses the saved `siteUrl`.
- Forget: alert dialog "Forget {name}? This deletes everything Shopfront
  keeps on this phone for your business. You can read your website again
  any time.", "Forget" (destructive), "Cancel" → `forgetBrand`, state 1 with
  an empty field.
- Save in a section sheet → `saveBrand`, then the panel shows the new
  profile.

All English copy is the spec's, word for word ("Read my website", "We read
a few pages and your photos. It takes about 20 seconds.", "Reading your
website…", "Keep this page open for about 20 seconds.", "Stop", "This is
what we understood about {name}. Fix anything that's wrong: your posts are
written from it.", "Your posts are coming soon.", "Last read {when}",
"Re-read my website", "Forget this business", the error table, the two
store notices).

- [ ] **Step 1: Write the failing tests** (jsdom, fake-indexeddb, `fetch`
  stubbed with NDJSON responses, `NextIntlClientProvider` with en.json)

```ts
// brand-errors.test.ts
test('each error code has a message in every language', () => {
  for (const locale of LOCALES) for (const code of [...ERROR_CODES, 'offline'])
    expect(messagesFor(locale).brand.errors[code]).toMatch(/\S/);
});
// brand-home.test.tsx
test('a first read shows the reading state, then the editable panel, and saves it', …);
test('a saved profile opens on the panel with no request', …);
test('an empty field only focuses it', …);
test('an invalid saved record shows the notice and the empty field', …);
test('without IndexedDB the read still shows the panel, with the notice', …);
test('re-read with 2 edits asks, and cancel makes no request', …);
test('a failed re-read keeps the saved profile and shows the message', …); // model_busy
test('forget deletes and shows the empty field', …);
test('stop goes back to the field', …);
test('a stored running run is resumed on mount', …);
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/brand-home.test.tsx tests/unit/brand-errors.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement** `brand-home.tsx`, `reading.tsx`,
  `wake-lock.ts`, the messages, and the change to `app/page.tsx`.

- [ ] **Step 4: Run `pnpm check`**

Expected: `ok` from the docs and repo checks, `biome ci` clean, typecheck
clean, all Vitest files pass.

- [ ] **Step 5: Commit**

```bash
git add components/brand/brand-home.tsx components/brand/reading.tsx lib/brand/wake-lock.ts app/page.tsx messages/en.json messages/id.json messages/vi.json tests/unit/brand-home.test.tsx tests/unit/brand-errors.test.ts
git commit -m "feat(brand): read the website from the home screen into the brand panel"
```

### Task 8: Phone tests, docs and the roadmap

**Files:**
- Create: `tests/e2e/brand-panel.spec.ts`, `tests/e2e/helpers/brand-stream.ts`
- Modify: `tests/unit/helpers/brand.ts` (add `senProfile()`, built from
  `tests/fixtures/sites/sen/expected.json`: name "Sen", town "Da Nang",
  WhatsApp "+84898661224" with source `https://sendanangmassage.com/contact`,
  colour `#4a6b53`)
- Modify: `tests/e2e/i18n.spec.ts` if it asserts the removed "Coming soon"
  strings
- Modify: `AGENTS.md` (Map: `lib/runs/`, `components/brand/`; `lib/brand/`
  row mentions the store and the edit rules)
- Modify: `docs/roadmap.md` (1.2 → `done`)
- Modify: `docs/specs/brand/brand-panel/journal.md` (started in Task 1)

**Interfaces:**
- Consumes: everything above.
- Produces: `streamBody(profile: Profile, opts?: { partials?: number; end?: 'final' | { error: BrandErrorCode } | 'drop' }): string`
  (NDJSON from `encodeLine`), and `fulfilRead(page, body, { delayMs? })`
  wrapping `page.route('**/api/brand/read', …)` and counting requests.

- [ ] **Step 1: Write the Playwright tests** (signed in as Sen, phone
  project)

```ts
test('first read, edit, and reload keeps it', …);
  // fill 'sendanangmassage.com', tap Read my website, see "Reading your website…",
  // see "Sen", "Da Nang", "+84898661224" and "from /contact";
  // Edit "Where and when", set hours, Save, see "added by you"; reload: still there, 1 request in all
test('re-read with an edit asks first', …);
test('forget empties the phone', …);       // then reload shows the empty field
test('a reload mid-read resumes once', …); // first body ends 'drop'; after reload the read is requested exactly once more and the panel fills
test('a busy model shows its message', …); // error line model_busy
```

- [ ] **Step 2: Run them**

Run: `pnpm test:e2e tests/e2e/brand-panel.spec.ts`
Expected: 5 passed. Then `pnpm test:e2e` for the whole suite: all passed.

- [ ] **Step 3: Update `AGENTS.md`, the roadmap and the journal.** The
  journal records the calls made along the way and the RED and GREEN
  summary lines as Vitest and Playwright print them.

- [ ] **Step 4: Run `pnpm check`**

Expected: everything passes, `ok: checked 4 spec(s) and 6 decision(s)`.

- [ ] **Step 5: Commit**

```bash
git add tests/e2e/brand-panel.spec.ts tests/e2e/helpers/brand-stream.ts tests/unit/helpers/brand.ts AGENTS.md docs/roadmap.md docs/specs/brand/brand-panel/journal.md
# and tests/e2e/i18n.spec.ts if it changed
git commit -m "test(brand): cover the brand panel on a phone, and mark roadmap 1.2 done"
```

Then push the branch and open a PR to `develop` on github.com (no `gh`).
