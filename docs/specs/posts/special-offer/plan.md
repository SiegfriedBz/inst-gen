# Special Offer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, as AGENTS.md says) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** On "Create Posts", the owner sets today's offer in a few taps (a
percentage off, or a free treatment with a 90-minute session, until a set
day); the next plan's two `offer` posts carry it in their text, with a badge
on their tiles, and code checks the captions keep to it.

**Architecture:** One pure module, `lib/posts/offer.ts`, holds the offer's
schema, its dates and the caption rules code checks. The plan and rewrite
bodies gain an optional `offer`; the prompt adds the offer's rules only when
there is one; `findFlags` learns the offer through an optional context;
posts gain `offer: true` and batches the offer they were made with. In the
browser the offer is kept in a new IndexedDB store, `offers` (database
version 6), cleared at the daily reset like the review draft. The sheet,
the line and the badge are three small components.

**Tech Stack:** Next.js 16, React 19, next-intl, Zod, Tailwind v4, shadcn/ui
(`Sheet`, `RadioGroup`, `Checkbox` if present, else native inputs styled as
today), Phosphor icons, `idb`, Vitest + Testing Library + fake-indexeddb,
Playwright. No new dependency.

**Spec:** `docs/specs/posts/special-offer/spec.md` (approved 2026-10-27).

## Global Constraints

- Percent: an integer from 1 to 90. No money amount and no free text anywhere in the sheet; "Other %" accepts digits only.
- The 90-minute minimum is fixed: the sheet line reads "The offer is on 90-minute sessions or longer." and the prompt says "90-minute".
- The sheet never reads or writes the profile's durations.
- No extra model call: the offer rides in the same plan or rewrite request.
- Images never see the offer: `image-prompt.ts` and the image route are untouched.
- Without an offer, the plan body, the prompt's rules, the flags and the screen are exactly as today (except `POSTS_PROMPT_VERSION`).
- Last day in English for the model: `en-GB` long form, "Tuesday 27 October". On screen: the screen's language, short form ("Tue 27 Oct").
- The badge uses `accent-tint` / `accent-tint-ink` (solid `accent` stays for the main button and the tile check, `platform/friendlier-home`); `rounded-control`; every control at least 44px tall; no sideways scroll at 320px.
- Every visible string in `messages/en.json`, `id.json` and `vi.json` in the same commit.
- Commits: Conventional Commits, scopes `posts`, `web`, `docs`; stage files by path.
- Record calls made and each task's RED and GREEN summary lines, as Vitest prints them, in `docs/specs/posts/special-offer/journal.md` (from `docs/templates/journal.md`).
- `pnpm eval:posts` spends Gemini quota: ask the person before Task 9's run, never on a pilot day.

## Review Focus

- A ticked treatment renamed or removed in "Your business" after the offer is set: the stored offer would name a treatment the profile no longer has, and the route answers 400. Expected: names that left are dropped when the offer loads; with none left, the offer clears (Task 4).
- The page closes mid-plan and the plan resumes: the resumed request carries the stored offer, not none (Task 4).
- The gift is also a ticked treatment ("free Foot Reflexology with a 90-minute Foot Reflexology"): picking a gift unticks it and greys it in the list (Task 5).
- Captions write the day as "October 27th", "27th October" or "Tue, 27 Oct": all match; "27 November" doesn't (Task 1).
- "100% natural oils", "24/7" and "open 9-10" in an offer batch: never flagged (Task 2).

---

### Task 1: The offer module

Before the first step, create `docs/specs/posts/special-offer/journal.md`
from `docs/templates/journal.md`; every task appends its RED and GREEN lines.

**Files:**
- Create: `lib/posts/offer.ts`
- Test: `tests/unit/posts-offer.test.ts`

**Interfaces:**
- Produces:
  - `OFFER_LIMITS = { percentMin: 1, percentMax: 90, minutes: 90 }`
  - `type OfferLength = 'today' | '3days' | '1week'`
  - `offerSchema`: `{ kind: 'discount', percent: int 1–90 } | { kind: 'freeExtra', gift: string }`, each with `treatments: string[]` (1 to `LIMITS.offerings`), `until: 'YYYY-MM-DD'`, `lastDay: string`; refined so `lastDay === englishDay(until)`. `type Offer = z.infer<typeof offerSchema>`.
  - `type OfferAnswers = { kind: 'discount' | 'freeExtra'; percent: number; gift: string | null; treatments: string[]; length: OfferLength }`
  - `DEFAULT_ANSWERS: OfferAnswers` (discount, 10, null, [], 'today')
  - `offerUntil(today: Date, length: OfferLength): string` — the phone's local date plus 0, 2 or 6 days, as `YYYY-MM-DD`.
  - `englishDay(until: string): string` — "Tuesday 27 October".
  - `toOffer(answers: OfferAnswers, today: Date): Offer | null` — null when the answers can't make an offer (no treatment ticked; percent out of range; free extra with no gift).
  - `offerFits(offer: Offer, profile: Profile): boolean` — every treatment (and the gift) is a profile offering's name.
  - `pruneOffer(offer: Offer, profile: Profile): Offer | null` — drops names that left; null when no treatment is left, or the gift left.
  - `mentionsDay(caption: string, until: string): boolean`
  - `PERCENT = /(\d{1,3})\s?%/g`

- [ ] **Step 1: Write the failing tests**

```ts
describe('offerUntil', () => {
  const sunday = new Date(2026, 9, 25, 16, 0); // phone time
  test.each([
    ['today', '2026-10-25'],
    ['3days', '2026-10-27'],
    ['1week', '2026-10-31'],
  ] as const)('%s ends %s', (length, until) => {
    expect(offerUntil(sunday, length)).toBe(until);
  });
});

test('englishDay writes the long English day', () => {
  expect(englishDay('2026-10-27')).toBe('Tuesday 27 October');
});

describe('toOffer', () => {
  const today = new Date(2026, 9, 26);
  test('the default answers with one ticked treatment make a 10% offer until today', () => {
    expect(toOffer({ ...DEFAULT_ANSWERS, treatments: ['Thai Massage'] }, today)).toEqual({
      kind: 'discount', percent: 10, treatments: ['Thai Massage'],
      until: '2026-10-26', lastDay: 'Monday 26 October',
    });
  });
  test('no treatment ticked, no offer', () => {
    expect(toOffer(DEFAULT_ANSWERS, today)).toBeNull();
  });
  test.each([0, 91, 1.5])('percent %s, no offer', (percent) => {
    expect(toOffer({ ...DEFAULT_ANSWERS, percent, treatments: ['Thai Massage'] }, today)).toBeNull();
  });
  test('a free extra needs its gift', () => {
    const answers = { ...DEFAULT_ANSWERS, kind: 'freeExtra' as const, treatments: ['Thai Massage'] };
    expect(toOffer(answers, today)).toBeNull();
    expect(toOffer({ ...answers, gift: 'Foot Reflexology' }, today)).toMatchObject({
      kind: 'freeExtra', gift: 'Foot Reflexology',
    });
  });
});

test('offerSchema refuses a lastDay that is not the until date', () => {
  const offer = { kind: 'discount', percent: 10, treatments: ['A'], until: '2026-10-27', lastDay: 'Monday 27 October' };
  expect(offerSchema.safeParse(offer).success).toBe(false);
});

describe('offerFits and pruneOffer', () => {
  // A profile with "Thai Massage" and "Foot Reflexology" (svargaProfile() or a
  // small builder in the test file).
  test('names among the offerings fit', () => { /* offerFits → true */ });
  test('an unknown treatment does not fit', () => { /* offerFits → false */ });
  test('a treatment that left is dropped; none left, no offer', () => {
    /* pruneOffer keeps the remaining names; with all gone → null */
  });
  test('a gift that left clears the offer', () => { /* → null */ });
});

describe('mentionsDay', () => {
  test.each([
    'until Tuesday 27 October',
    'until 27 Oct.',
    'Book before Tue, 27 Oct',
    'until October 27th',
    'until the 27th of October',
    'UNTIL 27 OCTOBER',
  ])('"%s" names the 27th', (caption) => {
    expect(mentionsDay(caption, '2026-10-27')).toBe(true);
  });
  test.each(['until 27 November', 'until Tuesday', 'only 7 Oct', 'until 127 Oct'])(
    '"%s" does not',
    (caption) => expect(mentionsDay(caption, '2026-10-27')).toBe(false),
  );
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-offer.test.ts`
Expected: FAIL, `Failed to resolve import "@/lib/posts/offer"`.

- [ ] **Step 3: Implement `lib/posts/offer.ts`**

Dates from the phone's local calendar (`getFullYear`, `getMonth`, `getDate`, adding days with `new Date(y, m, d + n)`). `englishDay` parses `until` as UTC
(`Date.UTC`) and formats with `Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })`. `mentionsDay` builds,
from `until`, the day number (with an optional `st|nd|rd|th`) and the month's
full and three-letter English names, and matches either order ("27 Oct",
"October 27th", "27th of October"), case-insensitive, with `\b` around the
day so "127" doesn't count. `offerFits` compares names exactly, as the profile
writes them.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-offer.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/offer.ts tests/unit/posts-offer.test.ts docs/specs/posts/special-offer/journal.md
git commit -m "feat(posts): the special offer, its dates and its caption rules"
```

---

### Task 2: Code's checks learn the offer

**Files:**
- Modify: `lib/posts/batch.ts` (`FLAG_KINDS` gains `'offer'`; `postSchema` gains `offer: z.literal(true).optional()`; `planResultSchema` gains `offer: offerSchema.optional()`)
- Modify: `lib/posts/checks.ts` (`findFlags`, `checkedWords`, `checkPost`, `checkPlan`, `checkRewrite`)
- Modify: `lib/posts/edit.ts` (`applyEdit`, `flagsFor`)
- Modify: `components/posts/posts-section.tsx` (the `applyEdit` call passes the batch's offer)
- Test: `tests/unit/posts-checks.test.ts`, `tests/unit/posts-edit.test.ts`

**Interfaces:**
- Consumes: `Offer`, `PERCENT`, `mentionsDay`, `OFFER_LIMITS` (Task 1).
- Produces:
  - `type OfferContext = { offer: Offer; carries: boolean }` (exported from `checks.ts`)
  - `findFlags(caption: string, profile: Profile, context?: OfferContext): Flag[]`
  - `checkPost(raw: ModelPost, profile: Profile, id: string, context?: OfferContext): { post; dropped }` — sets `offer: true` when `context?.carries`.
  - `carries(type: PostType, offerPostsBefore: number): boolean` — `type === 'offer' && offerPostsBefore < 2`.
  - `checkPlan(posts, dropped, profile, offer?: Offer)` — returns posts unchanged in shape; mix rules as today.
  - `checkRewrite(raw, original, profile, offer?: Offer)` — each post keeps its `offer` and is checked with `{ offer, carries: post.offer === true }`.
  - `applyEdit(post: Post, edit: PostEdit, profile: Profile, offer?: Offer): Post`
  - `flagsFor(post, batch, profile, newest?)` — unchanged signature; reads `batch.offer`.

- [ ] **Step 1: Write the failing tests** (in `posts-checks.test.ts`)

```ts
const offer: Offer = { kind: 'discount', percent: 10, treatments: ['Thai Massage'],
  until: '2026-10-27', lastDay: 'Tuesday 27 October' };
const kinds = (flags: Flag[]) => flags.filter((f) => f.kind === 'offer').map((f) => f.text);

test('without an offer, percentages are not looked at', () => {
  expect(kinds(findFlags('15% off this week', profile))).toEqual([]);
});
test('the offer post states its own offer: nothing flagged', () => {
  const caption = '10% off a 90-minute Thai Massage, until 27 Oct. Our 90 minutes of calm.';
  expect(findFlags(caption, profile, { offer, carries: true })).toEqual([]);
});
test('another percentage is flagged', () => {
  expect(kinds(findFlags('15% off until 27 Oct', profile, { offer, carries: true }))).toEqual(['15%']);
});
test('the offer in a post that does not carry it is flagged', () => {
  expect(kinds(findFlags('Now 10% off!', profile, { offer, carries: false }))).toEqual(['10%']);
});
test('100%, 24/7 and ranges are never flagged', () => {
  const caption = '100% natural oils, open 24/7, 9-10pm. 10% off until 27 Oct.';
  expect(kinds(findFlags(caption, profile, { offer, carries: true }))).toEqual([]);
});
test('an offer post without the last day is flagged', () => {
  expect(kinds(findFlags('10% off a 90-minute Thai Massage', profile, { offer, carries: true })))
    .toEqual(['Tuesday 27 October']);
});
test('90 minutes is a known duration only in a post that carries the offer', () => {
  // profile durations are "60 min"
  expect(findFlags('A 90 minutes ritual', profile, { offer, carries: true }).map((f) => f.kind)).not.toContain('duration');
  expect(findFlags('A 90 minutes ritual', profile, { offer, carries: false }).map((f) => f.kind)).toContain('duration');
});
test('a free extra names its gift as a known fact', () => {
  const free: Offer = { kind: 'freeExtra', gift: 'Foot Reflexology', treatments: ['Thai Massage'],
    until: '2026-10-27', lastDay: 'Tuesday 27 October' };
  expect(findFlags('Free Foot Reflexology with a 90-minute Thai Massage, until 27 Oct', profile,
    { offer: free, carries: true })).toEqual([]);
});
test('only the first two offer posts carry it', () => {
  expect([carries('offer', 0), carries('offer', 1), carries('offer', 2), carries('tip', 0)])
    .toEqual([true, true, false, false]);
});
test('checkRewrite keeps the badge and checks with the offer', () => { /* a post with offer: true,
  rewritten caption "15% off" → offer kept, flag 'offer' "15%" */ });
```

In `posts-edit.test.ts`: `applyEdit` with `offer` flags "15%" on a post with
`offer: true`; `flagsFor` on a stale post of a batch with `offer` uses it.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-checks.test.ts tests/unit/posts-edit.test.ts`
Expected: FAIL on the new tests (`carries` is not exported; no `offer` flags).

- [ ] **Step 3: Implement**

`findFlags` runs today's checks, then, only with a context:
- durations: in a carrying post, add 90 to the known durations;
- each `PERCENT` match: skip 100 and anything above 90 (`> OFFER_LIMITS.percentMax`); flag `{ kind: 'offer', text: '<n>%' }` when the post doesn't carry, the offer is a free extra, or `n !== offer.percent`;
- in a carrying post, flag `{ kind: 'offer', text: offer.lastDay }` when `!mentionsDay(caption, offer.until)`.
The gift's name needs no rule: names aren't flagged today. `checkedWords`
takes the context through. In `checkRewrite`, the post's own `offer` decides
`carries`.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-checks.test.ts tests/unit/posts-edit.test.ts tests/unit/posts-batch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/batch.ts lib/posts/checks.ts lib/posts/edit.ts components/posts/posts-section.tsx tests/unit/posts-checks.test.ts tests/unit/posts-edit.test.ts
git commit -m "feat(posts): code's checks keep captions to the special offer"
```

---

### Task 3: The prompt, the request and the run

**Files:**
- Modify: `lib/posts/batch.ts` (`planBodySchema` and `rewriteBodySchema` gain `offer: offerSchema.optional()`, refined with `offerFits` against `profile`)
- Modify: `lib/posts/prompt.ts` (`POSTS_PROMPT_VERSION = 'posts-3'`; `planPrompt`, `planUserText`, `rewritePrompt`, `rewriteUserText`)
- Modify: `lib/posts/run.ts` (`run` takes the offer; `emit` counts offer posts; `streamPlan`, `streamRewrite`; the final result carries `offer`)
- Test: `tests/unit/posts-prompt.test.ts`, `tests/unit/posts-run.test.ts`, `tests/unit/posts-route.test.ts`

**Interfaces:**
- Consumes: `offerSchema`, `offerFits` (Task 1); `checkPost` with context, `carries`, `checkPlan`/`checkRewrite` with offer (Task 2).
- Produces:
  - `planPrompt(withOffer = false): string`, `rewritePrompt(withOffer = false): string` — today's text when false.
  - `planUserText(input, recent, offer?: Offer)`, `rewriteUserText(input, posts, offer?: Offer)` — with an offer, a final `### Special offer` section (below).
  - `PlanBody['offer']`, `RewriteBody['offer']`: `Offer | undefined`; `PlanResult['offer']`.

- [ ] **Step 1: Write the failing tests**

`posts-prompt.test.ts`:
- `planPrompt()` contains no "Special offer"; `planPrompt(true)` contains "exactly 2 offer posts carry the special offer", "never mention a discount, a free treatment or a deadline", "90-minute", "until" and "never a price".
- `planUserText(input, [], offer)` ends with the section:

```
### Special offer
- 10% off
- On: Thai Massage
- Sessions: 90 minutes or longer
- Until: Tuesday 27 October
```

  (a free extra's second line reads `- Free: Foot Reflexology, with a paid session`)
- `rewritePrompt(true)` says to keep the offer in posts marked as carrying it; `rewriteUserText(input, posts, offer)` sends each post's `offer` and the same section.
- `POSTS_PROMPT_VERSION` is `posts-3`.

`posts-run.test.ts` (with the fake model the file already uses):
- a plan with an offer and a model answer holding three `offer` posts → the first two have `offer: true`, the third doesn't and is flagged `offer` when it says "10%"; the final result's `offer` is the body's;
- without an offer, no post has `offer` and `result.offer` is undefined.

`posts-route.test.ts`:
- a plan body whose offer names a treatment the profile doesn't have → 400;
- `percent: 95` → 400; a good offer → 200.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts tests/unit/posts-route.test.ts`
Expected: FAIL on the new tests.

- [ ] **Step 3: Implement**

The offer rules in `planPrompt(true)`, after "The mix:" (exact text):

```
A special offer is given. Exactly 2 offer posts carry the special offer: each leads on one of the offer's treatments, two different ones when the offer has two or more. Each states the offer as given: the same percentage, or the same free treatment; "90-minute" with the treatment; "until" with the last day exactly as given. Never a bigger discount, never other terms, never a price, never "today only" or "this week". The other four posts never mention a discount, a free treatment or a deadline.
```

`rewritePrompt(true)` adds: "A special offer is given. A post marked offer: true keeps the offer, stated as given, with 'until' and the last day; the other posts never mention it." `emit` passes `{ offer, carries: carries(type, offerPostsSoFar) }` to `checkPost` and counts emitted `offer`-type posts. `run`'s final `PlanResult` sets `offer` when the body has one.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts tests/unit/posts-route.test.ts tests/unit/posts-fixtures-replay.test.ts`
Expected: PASS (the recorded plans still replay: without an offer nothing changes).

- [ ] **Step 5: Commit**

```bash
git add lib/posts/batch.ts lib/posts/prompt.ts lib/posts/run.ts tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts tests/unit/posts-route.test.ts
git commit -m "feat(posts): plans and rewrites carry the special offer"
```

---

### Task 4: The offer on the phone, and in requests

**Files:**
- Create: `lib/posts/offer-store.ts`
- Modify: `lib/brand/store.ts` (`DB_VERSION = 6`; `offers: { key: string; value: OfferRecord }`, `keyPath: 'ownerId'`, created when `oldVersion < 6`)
- Modify: `lib/posts/client.ts` (`Input` plan step gains `offer?: Offer`; the bodies send `offer`; `startPlan` takes `offer`; `startRewrite` sends `input.batch.offer`; `resumePosts` loads the stored offer for a plan)
- Test: `tests/unit/posts-offer-store.test.ts`, `tests/unit/posts-client.test.ts`

**Interfaces:**
- Consumes: `Offer`, `OfferAnswers`, `pruneOffer` (Task 1); `PlanBody['offer']` (Task 3).
- Produces:
  - `type OfferRecord = { ownerId: string; answers: OfferAnswers; offer: Offer; createdAt: string }` (Zod `offerRecordSchema`)
  - `saveOffer(record: OfferRecord): Promise<void>`
  - `clearOffer(ownerId: string): Promise<void>`
  - `loadOffer(ownerId: string, profile: Profile, now: Date): Promise<OfferRecord | null>` — deletes a record from before `dayStart(now)` or that no longer parses; prunes with `pruneOffer` (and the answers' treatments and gift to match), saving the pruned record or deleting it when null.
  - `startPlan(input: { ownerId; profile; recent; offer?: Offer }, onEvent, deps?)`

- [ ] **Step 1: Write the failing tests**

`posts-offer-store.test.ts` (fake-indexeddb, as `reviews-store` tests do):
- saved today → loaded as saved;
- saved before today's reset → `null`, and the record is gone;
- a ticked treatment removed from the profile → loaded without it; all removed → `null`;
- `clearOffer` removes it.

`posts-client.test.ts`:
- `startPlan` with an offer posts `{ profile, recent, offer }`; without, the body has no `offer` key;
- `startRewrite` on a batch with `offer` posts it;
- a resumed plan posts the stored offer.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-offer-store.test.ts tests/unit/posts-client.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement** the store after `lib/reviews/store.ts`'s pattern; the upgrade adds only the new store.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-offer-store.test.ts tests/unit/posts-client.test.ts tests/unit/brand-store.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/posts/offer-store.ts lib/brand/store.ts lib/posts/client.ts tests/unit/posts-offer-store.test.ts tests/unit/posts-client.test.ts
git commit -m "feat(posts): keep today's offer on the phone and send it with plans"
```

---

### Task 5: The offer sheet

**Files:**
- Create: `components/posts/offer-sheet.tsx`
- Modify: `messages/en.json`, `id.json`, `vi.json` (`posts.offer.*`)
- Test: `tests/unit/posts-offer-sheet.test.tsx`

**Interfaces:**
- Consumes: `OfferAnswers`, `DEFAULT_ANSWERS`, `offerUntil`, `toOffer`, `OFFER_LIMITS` (Task 1).
- Produces: `OfferSheet({ open, onOpenChange, treatments, answers, onDone, onAddTreatments }: { open: boolean; onOpenChange: (open: boolean) => void; treatments: string[]; answers: OfferAnswers; onDone: (answers: OfferAnswers) => void; onAddTreatments: () => void })`

English strings (`posts.offer`):

| Key | en |
|---|---|
| `add` | + Special offer |
| `title` | Special offer |
| `kind` | What kind of offer? |
| `discount` | A discount |
| `freeExtra` | A free extra |
| `other` | Other % |
| `giftLine` | Free {gift} with a 90-minute session |
| `giftPick` | Pick the free treatment |
| `treatments` | On which treatments? |
| `rule` | The offer is on 90-minute sessions or longer. |
| `until` | Until when? |
| `today` / `days3` / `week1` | Today / 3 days / 1 week |
| `untilDate` | until {date} |
| `done` | Done |
| `noTreatments` | Add your treatments on Your business first. |
| `addTreatments` | Add treatments |

Indonesian and Vietnamese in the same commit, in the tone of the other `posts` strings.

- [ ] **Step 1: Write the failing tests**

```tsx
// render with NextIntlClientProvider (en), treatments ['Thai Massage', 'Foot Reflexology'],
// answers DEFAULT_ANSWERS, phone date mocked to Sunday 25 Oct 2026.
test('opens on a 10% discount, nothing ticked, until today', ...);   // 10% pressed; Done disabled; "until Sun 25 Oct"
test('ticking a treatment enables Done and hands back the answers', ...);
test('"Other %" keeps digits only and allows 1 to 90', ...);         // type "100k" → "100", Done disabled; "15" → enabled
test('3 days shows the date two days on', ...);                      // "until Tue 27 Oct"
test('a free extra asks for its gift among the treatments', ...);   // pick Foot Reflexology → line "Free Foot Reflexology with a 90-minute session"
test('the gift is greyed and unticked in the list', ...);
test('no treatments: one line, a button, no Done', ...);             // onAddTreatments called
test('the rule line is always there', ...);
```

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-offer-sheet.test.tsx`
Expected: FAIL, the module doesn't exist.

- [ ] **Step 3: Implement** with `Sheet` (`side="bottom"`, as `suggestion-sheet.tsx`); chips as `aria-pressed` buttons; the "Other %" input `inputMode="numeric"`, value filtered to digits, at most 2 digits shown valid; treatments as checkbox rows (44px); the date with `useFormatter().dateTime(date, { weekday: 'short', day: 'numeric', month: 'short' })`.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-offer-sheet.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/posts/offer-sheet.tsx messages/en.json messages/id.json messages/vi.json tests/unit/posts-offer-sheet.test.tsx
git commit -m "feat(posts): the special offer sheet"
```

---

### Task 6: The offer on "Create Posts"

**Files:**
- Create: `components/posts/offer-line.tsx`
- Modify: `components/posts/posts-section.tsx` (offer state, load at mount and at the reset, the line above "Make 6 suggestions", `make()` and the resume send it)
- Modify: `components/brand/brand-home.tsx` (`PostsSection` gets `onAddTreatments`, which sets `focusField('offerings')` and opens the `business` section)
- Modify: `messages/*.json` (`posts.offer.line`, `posts.offer.remove`, `posts.offer.count`)
- Test: `tests/unit/posts-section.test.tsx`, `tests/unit/brand-home.test.tsx`

**Interfaces:**
- Consumes: `OfferSheet` (Task 5); `saveOffer`, `loadOffer`, `clearOffer` (Task 4); `startPlan` with offer (Task 4); `toOffer` (Task 1).
- Produces: `OfferLine({ offer, onOpen, onRemove }: { offer: Offer; onOpen: () => void; onRemove: () => void })`; `PostsSection` gains `onAddTreatments?: () => void`.

Strings: `line` "{what} · {count} · until {date}", `count` "{n, plural, one {# treatment} other {# treatments}}", `discountShort` "{percent}% off", `freeShort` "Free {gift}", `remove` "Remove the offer".

- [ ] **Step 1: Write the failing tests**

`posts-section.test.tsx`:
- no offer: "+ Special offer" above "Make 6 suggestions"; the plan request has no `offer`;
- tick "Thai Massage", Done → the line reads "10% off · 1 treatment · until Mon 26 Oct" (phone date mocked to Monday 26 Oct 2026); the next plan request carries the offer; the record is saved;
- tapping the line reopens the sheet with those answers;
- "Remove the offer" → "+ Special offer" again, record cleared, suggestions on screen unchanged;
- an offer saved before the reset → "+ Special offer" on load;
- the language switched to vi → the line's date in Vietnamese.

`brand-home.test.tsx`: no treatments, "+ Special offer", "Add treatments" → the Your business form opens with the treatments field focused.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/brand-home.test.tsx`
Expected: FAIL on the new tests.

- [ ] **Step 3: Implement.** The line is a 44px row: the text button opens the sheet, an `X` icon button removes it. `make()` passes `offer` to `startPlan`; the offer is read from state, loaded with `loadOffer(ownerId, profile, new Date())` at mount, and again where `make()` starts a new day.

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/brand-home.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/posts/offer-line.tsx components/posts/posts-section.tsx components/brand/brand-home.tsx messages/en.json messages/id.json messages/vi.json tests/unit/posts-section.test.tsx tests/unit/brand-home.test.tsx
git commit -m "feat(posts): set today's special offer on Create Posts"
```

---

### Task 7: The badge

**Files:**
- Create: `components/posts/offer-badge.tsx`
- Modify: `components/posts/suggestion-tile.tsx` (top corner badge when `post.offer`), `components/posts/suggestion-sheet.tsx` or `post-card.tsx` (badge and "until {date}" above the caption), `components/posts/posts-section.tsx` (passes `batch.offer`)
- Modify: `messages/*.json` (`posts.offer.badgeDiscount` "{percent}% off", `posts.offer.badgeFree` "Free extra")
- Test: `tests/unit/posts-section.test.tsx` (or the tile/card test files the components already have)

**Interfaces:**
- Consumes: `Post['offer']`, `PostBatch['offer']` (Task 2).
- Produces: `OfferBadge({ offer, until = false }: { offer: Offer; until?: boolean })`.

- [ ] **Step 1: Write the failing tests**
- a batch with `offer` (10%) and two posts with `offer: true`: exactly 2 tiles show "10% off"; the tile's accessible name includes "10% off";
- opening one shows "10% off" and "until Tue 27 Oct" above the caption;
- a free extra shows "Free extra";
- "Copy the text" copies no badge text;
- a batch without `offer`: no badge.

- [ ] **Step 2: Run them to see them fail**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx`
Expected: FAIL on the new tests.

- [ ] **Step 3: Implement**: a `rounded-control bg-accent-tint px-2 py-0.5 text-[12px] font-medium text-accent-tint-ink` label, absolutely placed in the tile's top-left corner over the image (the check stays top-right).

- [ ] **Step 4: Run them to see them pass**

Run: `pnpm vitest run tests/unit/posts-section.test.tsx tests/unit/posts-take-away.test.tsx tests/unit/i18n-messages.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add components/posts/offer-badge.tsx components/posts/suggestion-tile.tsx components/posts/suggestion-sheet.tsx components/posts/post-card.tsx components/posts/posts-section.tsx messages/en.json messages/id.json messages/vi.json tests/unit/posts-section.test.tsx
git commit -m "feat(posts): a badge on the suggestions that carry the offer"
```

---

### Task 8: The owner guide

**Files:**
- Modify: `components/guide/owner-guide.tsx` (`posts` steps gain `'offer'` after `'make'`, with `{ button: t('posts.offer.add') }`)
- Modify: `messages/*.json` (`guide.posts.offer`: "Before that, tap <b>{button}</b> to add today's offer: two of the 6 suggestions will tell it.")
- Test: `tests/unit/guide.test.tsx`

- [ ] **Step 1: Write the failing test**: the guide's posts section names "+ Special offer", in en, id and vi.
- [ ] **Step 2: Run it to see it fail** — `pnpm vitest run tests/unit/guide.test.tsx`, Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run it to see it pass** — same command, plus `tests/unit/i18n-messages.test.ts`. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add components/guide/owner-guide.tsx messages/en.json messages/id.json messages/vi.json tests/unit/guide.test.tsx
git commit -m "feat(web): the owner guide shows the special offer"
```

---

### Task 9: Checked with the real model

**Files:**
- Modify: `scripts/eval-posts.ts` (`--offer`: a 10% offer on the fixture's first two treatments, until a fixed day, `2026-11-01`; with `--record`, saved as `posts-offer.json`)
- Modify: `lib/brand/fixtures.ts` (`Fixture.postsOffer: PostsFixture | null`, from `posts-offer.json`)
- Create: `tests/fixtures/sites/sen/posts-offer.json`, `tests/fixtures/sites/svarga/posts-offer.json` (recorded)
- Modify: `tests/unit/posts-fixtures-replay.test.ts`
- Modify: `AGENTS.md` (the `eval:posts` row names `--offer`)

- [ ] **Step 1: Write the failing test** in `posts-fixtures-replay.test.ts`: for `sen` and `svarga`, `posts-offer.json` exists; replayed with the same offer through `streamPlan`, the result has `offer`, 1 or 2 posts with `offer: true`, and print the flags (no assertion on their count: the eval reads them).
- [ ] **Step 2: Run it to see it fail** — `pnpm vitest run tests/unit/posts-fixtures-replay.test.ts`, Expected: FAIL, no `posts-offer.json`.
- [ ] **Step 3: Implement `--offer`, then ask the person** before `pnpm eval:posts sen svarga --offer --record` (2 Gemini requests). Read both batches back: two offer posts each, the offer as given, the day named, the other four quiet. Paste the summary lines into the journal. A prompt fix means a new `posts-3` text and a new recording: ask again.
- [ ] **Step 4: Run it to see it pass** — same command. Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add scripts/eval-posts.ts lib/brand/fixtures.ts tests/fixtures/sites/sen/posts-offer.json tests/fixtures/sites/svarga/posts-offer.json tests/unit/posts-fixtures-replay.test.ts AGENTS.md docs/specs/posts/special-offer/journal.md
git commit -m "test(posts): recorded offer plans for sen and svarga"
```

---

### Task 10: End to end, and the item's status

**Files:**
- Create: `tests/e2e/special-offer.spec.ts`
- Modify: `tests/e2e/helpers/posts-stream.ts` (if `postsBody` needs `offer` on posts and the result)
- Modify: `docs/roadmap.md` (2.11 `done`), `AGENTS.md` (Map: `lib/posts/` mentions the offer), `docs/specs/posts/special-offer/journal.md`

- [ ] **Step 1: Write the e2e test** at the phone viewport, with the plan route fulfilled by `fulfilPosts`: tap "+ Special offer", tick a treatment, "Done"; the line shows; "Make 6 suggestions" sends a body with `offer.percent === 10`; the answer's two `offer: true` posts show "10% off"; no sideways scroll at 320px in vi with the sheet open.
- [ ] **Step 2: Run it to see it fail, then pass** — `pnpm test:e2e tests/e2e/special-offer.spec.ts` (port 3000 must be free; otherwise the scratch config on 3100). Expected: first run FAIL only if something above is missing; then PASS.
- [ ] **Step 3: Run everything** — `pnpm check` and `pnpm test:e2e`. Expected: all pass; paste the summary lines in the journal.
- [ ] **Step 4: Commit**

```bash
git add tests/e2e/special-offer.spec.ts tests/e2e/helpers/posts-stream.ts docs/roadmap.md AGENTS.md docs/specs/posts/special-offer/journal.md
git commit -m "test(web): end-to-end special offer; roadmap 2.11 done"
```
