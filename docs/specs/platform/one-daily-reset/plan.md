# One daily reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline, per `AGENTS.md`) to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The day's suggestions and review draft leave the screen at Google's reset (midnight `America/Los_Angeles`), the moment the usage limits come back, instead of at 3am on the phone's clock.

**Architecture:** `lib/usage/day.ts` gains `lastReset(now)`, the twin of `nextReset`. `lib/posts/day.ts` keeps its exports (`dayStart`, `dayOf`, `isToday`, `attemptNumbers`) so no caller changes; `dayStart` returns `lastReset(now)` and `DAY_STARTS_AT_HOUR` goes. Tests move from the 3am boundary to the reset.

**Tech Stack:** TypeScript, `Intl.DateTimeFormat`, Vitest, Playwright (`page.clock`).

**Spec:** `docs/specs/platform/one-daily-reset/spec.md`

## Global Constraints

- The reset is 00:00 in `America/Los_Angeles` (`USAGE_ZONE`); no date or offset is hard-coded.
- In Da Nang (UTC+7): 14:00 until 1 November 2026 (US summer time), 15:00 after.
- Image file names carry the phone's local date of the reset that opened the attempt's day.
- No string is added or changed (`messages/*.json` untouched).
- Clearing happens on load of the posts section / opening of the Reviews tab, never mid-use (existing behaviour, untouched).

## Review Focus

- The US time change (1 November 2026, 02:00 Pacific): `lastReset` just after it must be that day's midnight PDT, not off by an hour. Pinned in Task 1 (`lastReset` at 3 November, and at 1 November 08:30Z).
- An instant exactly at the reset belongs to the new day (`isToday` true at `lastReset`). Pinned in Task 1.
- A phone zone east of UTC+7 (Bali, UTC+8): the reset is one hour later on the phone's clock. Pinned in Task 1.
- A phone zone west of Pacific is out of the pilot; no test.
- Overnight (20:00 → 08:00 next morning) stays one day. Pinned in Task 1 (`isToday`) and the e2e in Task 2.

---

### Task 1: The day starts at Google's reset

**Files:**
- Modify: `lib/usage/day.ts` (add `lastReset` beside `nextReset`)
- Modify: `lib/posts/day.ts` (whole file: header comment, `dayStart`, `dayOf` comment; drop `DAY_STARTS_AT_HOUR`)
- Modify: `lib/reviews/store.ts:8,36`, `components/posts/posts-section.tsx:36`, `components/reviews/reviews-section.tsx:38,53` (comments only: "3am" → "the reset")
- Test: `tests/unit/posts-day.test.ts` (rewritten), `tests/unit/posts-take-away.test.ts:28-44`, `tests/unit/reviews-store.test.ts:7-9,64-70`, `tests/unit/usage-day.test.ts` if it exists, else add `lastReset` cases to `posts-day.test.ts`

**Interfaces:**
- Produces: `lastReset(now: Date): Date` in `lib/usage/day.ts`: the most recent midnight in `USAGE_ZONE` at or before `now`.
- Unchanged signatures: `dayStart(now: Date): Date`, `dayOf(iso: string): string`, `isToday(iso: string, now: Date): boolean`.

- [ ] **Step 1: Write the failing tests.** `tests/unit/posts-day.test.ts`, phone in `Asia/Ho_Chi_Minh`, `local(d, h, m?, s?)` as today (month 9 = October; use `new Date(2026, 10, d, h)` for November):

```ts
describe("the day starts at Google's reset", () => {
  test('dayStart is the latest midnight Pacific: 14:00 in Da Nang in US summer time', () => {
    expect(dayStart(local(26, 13, 59))).toEqual(local(25, 14));
    expect(dayStart(local(26, 14))).toEqual(local(26, 14));
    expect(dayStart(local(27, 8))).toEqual(local(26, 14));
  });
  test('15:00 after the US time change', () => {
    expect(dayStart(new Date(2026, 10, 3, 14, 59))).toEqual(new Date(2026, 10, 2, 15));
    expect(dayStart(new Date(2026, 10, 3, 15))).toEqual(new Date(2026, 10, 3, 15));
  });
  test('the day of the change itself starts at midnight PDT', () => {
    expect(dayStart(new Date('2026-11-01T08:30:00.000Z'))).toEqual(new Date('2026-11-01T07:00:00.000Z'));
  });
  test('dayOf is the date the day started on the phone', () => {
    expect(dayOf(local(27, 10).toISOString())).toBe('2026-10-26');
    expect(dayOf(local(27, 16).toISOString())).toBe('2026-10-27');
  });
  test('isToday from the reset exactly, and overnight is the same day', () => {
    const now = local(27, 8);
    expect(isToday(local(26, 14).toISOString(), now)).toBe(true);
    expect(isToday(local(26, 13, 59, 59).toISOString(), now)).toBe(false);
    expect(isToday(local(26, 20).toISOString(), now)).toBe(true);
  });
});
```

Plus a Bali case (set `process.env.TZ = 'Asia/Makassar'` inside a try/finally, as `posts-take-away.test.ts` does): `dayStart(new Date('2026-10-26T08:00:00.000Z'))` equals `new Date('2026-10-26T07:00:00.000Z')`, and `dayOf` of that instant is `'2026-10-26'` (15:00 local). Keep the existing `attemptNumbers` tests.

`tests/unit/posts-take-away.test.ts`: rename to `"the date is the day the attempt's reset opened, on the phone"`; `'2026-10-25T17:10:00.000Z'` (00:10 on the 26th) → `sen-2026-10-25-…`; `'2026-10-25T23:30:00.000Z'` (06:30 on the 26th) → `sen-2026-10-25-attempt-1-suggestion-1-story.jpg`; add `'2026-10-26T07:30:00.000Z'` (14:30 on the 26th) → `sen-2026-10-26-attempt-1-suggestion-1-post.jpg`.

`tests/unit/reviews-store.test.ts`: `'stays until the reset, then is gone for good'`: not null at `local(27, 13, 59)`, null at `local(27, 14)`; the record's `createdAt` must fall after 14:00 on the 26th (check the `record()` helper; the other tests load at `local(26, 23)`).

- [ ] **Step 2: Run them, expect RED.** `pnpm exec vitest run tests/unit/posts-day.test.ts tests/unit/posts-take-away.test.ts tests/unit/reviews-store.test.ts`. Expected: the new cases fail (dayStart still returns 03:00). Copy the summary line into the journal.

- [ ] **Step 3: Implement.** `lastReset(now)` in `lib/usage/day.ts`: `zonedMidnight` of `wallClock(now)`'s year, month, day (the comment on `zonedMidnight` already covers the time change). In `lib/posts/day.ts`: `dayStart = (now) => lastReset(now)`; `dayOf` unchanged (reads local getters of `dayStart`); new header comment pointing at `docs/specs/platform/one-daily-reset`. Update the 3am comments in the files listed above.

- [ ] **Step 4: Run all unit tests, expect GREEN.** `pnpm test`. Expected: all pass (`posts-section` and `usage-limits-ui` at `2026-10-25T12:00Z` keep their 08:00Z/09:00Z attempts as today's). Copy the summary line into the journal.

- [ ] **Step 5: Commit.** `git add` the files above by path; `fix(posts): one daily reset at Google's midnight Pacific` (check the scope against `commitlint.config.mjs`).

### Task 2: End-to-end and documents

**Files:**
- Modify: `tests/e2e/suggestions.spec.ts:7,24-50`, `tests/e2e/reviews.spec.ts:51-95`
- Modify: `docs/specs/posts/suggestions/spec.md` (at "Image file names" and "Suggestions last until 3am"), `docs/specs/reviews/reply-drafts/spec.md` (at "Kept until a new review or 3am"), `docs/specs/platform/usage-counters/spec.md` (at "This is not the 3am day…" and "Two clocks")
- Modify: `docs/roadmap.md` (2.8b → `done`)
- Create: `docs/specs/platform/one-daily-reset/journal.md` (from `docs/templates/`)

- [ ] **Step 1: Move the e2e clocks.** Both tests start at `2026-10-26T20:00:00+07:00`. "Still today's" becomes `2026-10-27T13:55:00+07:00`; "a new day" becomes `2026-10-27T14:05:00+07:00`. Rename: suggestions `"today's suggestions stay through a reload, and Google's reset clears them"`; reviews `'…, lose them at the reset'`. Update their comments.
- [ ] **Step 2: Notes in the older specs.** One line at each passage, e.g. `> Changed by platform/one-daily-reset (2026-10-26): the day starts at Google's reset, midnight Pacific, not 3am.` Status and approval untouched.
- [ ] **Step 3: Verify.** `pnpm check` (all green) and `pnpm test:e2e tests/e2e/suggestions.spec.ts tests/e2e/reviews.spec.ts` (pass). Copy the summary lines into the journal.
- [ ] **Step 4: Commit.** Roadmap 2.8b `done`, the specs, journal, e2e; `docs(specs): …` or one commit with the e2e under the Task 1 scope.
