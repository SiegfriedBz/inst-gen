# Two days of suggestions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task, inline (AGENTS.md). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The current day's and the day before's suggestions stay on the phone and the screen, under "Today" and "Yesterday"; only older ones go at the reset.

**Architecture:** The phone's store already deletes what came before a given moment (`clearBefore`); the screen now passes the start of the day before instead of today's. A pure helper in `lib/posts/day.ts` splits the stored attempts into the two days; `PostsSection` draws each day with its heading and its own attempt numbers.

**Tech Stack:** Next.js, React, next-intl, IndexedDB (idb), Vitest with Testing Library, Playwright.

**Spec:** `docs/specs/posts/two-days/spec.md` (approved 2026-11-23).

## Global Constraints

- A day is the app's day: from one Google reset (`lastReset`, `lib/usage/day.ts`) to the next.
- New strings `posts.today` ("Today", "Hari ini", "Hôm nay") and `posts.yesterday` ("Yesterday", "Kemarin", "Hôm qua"); `guide.allowance.reset` rewritten in the three languages (Task 2). Every visible string in `messages/en.json`, `id.json`, `vi.json`.
- Review replies, answers, the usage limits and the special offer don't change.
- Commits: scope `posts` (or `web` for the screen), files staged by path, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

- The app left open across a reset: the next attempt moves today's to "Yesterday" and drops the day before yesterday's, without a reload. Test in Task 2.
- No attempt today, some yesterday: "Yesterday" alone, no "Today" heading, the empty-state line hidden, the button reads "Make 2 new suggestions". Test in Task 2.
- An attempt being made while yesterday's show: it is numbered after today's only. Test in Task 2.
- An image still being made for yesterday's attempt when the app closed: picked up again. Test in Task 2.
- A batch made exactly at the reset belongs to the new day. Test in Task 1.

---

### Task 1: The two days

**Files:**
- Modify: `lib/posts/day.ts`
- Test: `tests/unit/posts-day.test.ts`

**Interfaces:**
- Produces: `yesterdayStart(now: Date): Date` (the reset before `dayStart(now)`), and `splitDays<T extends { createdAt: string }>(batches: readonly T[], now: Date): { today: T[]; yesterday: T[] }` (each newest first; anything before `yesterdayStart(now)` in neither).

- [ ] **Step 1: Write the failing tests** (Da Nang, US summer time, as the file's other tests): at `2026-10-26T10:00+07:00`, `dayStart` is `2026-10-25T14:00+07:00` and `yesterdayStart` is `2026-10-24T14:00+07:00`; `splitDays` puts `2026-10-25T20:00+07:00` and `2026-10-25T14:00+07:00` in `today`, `2026-10-25T10:00+07:00` in `yesterday`, `2026-10-24T10:00+07:00` in neither, each newest first.
- [ ] **Step 2: Run them to see them fail**
  Run: `pnpm exec vitest run tests/unit/posts-day.test.ts`
  Expected: FAIL (not exported).
- [ ] **Step 3: Implement** both in `lib/posts/day.ts`: `yesterdayStart` is `lastReset` of one millisecond before `dayStart(now)`.
- [ ] **Step 4: Run the tests**
  Expected: PASS.
- [ ] **Step 5: Commit**: `feat(posts): the current day and the day before (roadmap 2.24)`.

### Task 2: Keep two days and show them

**Files:**
- Modify: `components/posts/posts-section.tsx`, `components/guide/owner-guide.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`
- Test: `tests/unit/posts-section.test.tsx`, `tests/e2e/suggestions.spec.ts`

**Interfaces:**
- Consumes: Task 1's `yesterdayStart`, `splitDays`.

- [ ] **Step 1: Write the failing tests** in `posts-section.test.tsx` (its clock is `2026-10-25T12:00Z`, so today started at `2026-10-25T07:00Z` and yesterday at `2026-10-24T07:00Z`):
  1. A batch from `2026-10-24T20:00Z` and one from `2026-10-25T09:00Z`: headings "Today" and "Yesterday" show, each day with "Attempt 1", today's first.
  2. Only the one from `2026-10-24T20:00Z`: "Yesterday" shows and "Today" doesn't; the empty-state line doesn't; the button reads "Make 2 new suggestions".
  3. A batch from `2026-10-24T05:00Z` (before yesterday) with a saved image: after the section loads, the batch isn't shown and its image is gone from the store; yesterday's batch keeps its image.
  4. With a batch from yesterday, the attempt being made is headed "Attempt 1".
  5. The app left open across the reset (move the clock past `2026-10-26T07:00Z`, then make an attempt): the batch from `2026-10-25T09:00Z` now shows under "Yesterday", and the one from `2026-10-24T20:00Z` is gone.
  6. A run of images left open for yesterday's batch is picked up again on load.

  In `suggestions.spec.ts`, the reset test becomes: at 14:05 past the reset the first attempt shows under "Yesterday" with its two images and the button reads "Make 2 new suggestions"; a new attempt shows as "Attempt 1" under "Today"; a day later, at 14:05 the next day, the first attempt is gone.
- [ ] **Step 2: Run them to see them fail**
  Run: `pnpm exec vitest run tests/unit/posts-section.test.tsx`
  Expected: FAIL on the new tests.
- [ ] **Step 3: Implement.**
  - The load and `make()` clear with `clearBefore(ownerId, yesterdayStart(now))`; `start` stays today's start.
  - `const { today, yesterday } = splitDays(batches, start)`; `shown = [...today, ...yesterday]` for the open suggestion, the newest batch, the automatic caption update and the button's label; the attempt being made is headed `today.length + 1`; numbers per day (`attemptNumbers` of each, in one map).
  - Headings: `t('today')` above today's attempts when `yesterday` isn't empty; `t('yesterday')` above yesterday's; the same weight as the attempt headings' day label, from the existing heading styles.
  - The empty-state line only when both days are empty.
  - Image runs are resumed for both days' batches.
  - Strings: `posts.today`, `posts.yesterday` (Global Constraints). `guide.allowance.reset`, with `{yesterday}` bound to `t('posts.yesterday')` in `owner-guide.tsx`'s values:
    - en: `At that time, the limits come back, and the day's review replies and answers leave the screen. Suggestions stay one more day, under <b>{yesterday}</b>: save what you want to keep before the next reset. Your special offer stays: it lasts until its own last day ends.`
    - id: `Pada jam itu, batas kembali penuh, dan balasan ulasan serta jawaban hari itu hilang dari layar. Saran tetap ada satu hari lagi, di bawah <b>{yesterday}</b>: simpan yang ingin Anda pakai sebelum reset berikutnya. Promo spesial Anda tetap ada: berlaku sampai hari terakhirnya sendiri berakhir.`
    - vi: `Vào giờ đó, giới hạn được làm mới, còn các câu trả lời đánh giá và câu trả lời cho câu hỏi trong ngày rời khỏi màn hình. Các gợi ý được giữ thêm một ngày, trong mục <b>{yesterday}</b>: hãy lưu những gì bạn muốn giữ trước lần làm mới tiếp theo. Ưu đãi đặc biệt của bạn vẫn giữ nguyên: nó kéo dài đến hết ngày cuối cùng của nó.`
- [ ] **Step 4: Run the unit tests, then the phone tests**
  Run: `pnpm test`, then the phone tests (port 3101 when 3000 is taken).
  Expected: PASS.
- [ ] **Step 5: Commit**: `feat(web): yesterday's suggestions stay, under Today and Yesterday (roadmap 2.24)`, then set 2.24 to `done` in `docs/roadmap.md` with the PR.

---

## Addendum: an offer that has ended

Approved with the spec's amendment (2026-11-23T18:36:15Z). This spec is now
roadmap 2.25, after the merge with develop. Tasks 1 and 2 are done.

Constraints: the strings `posts.offer.badgeEnded` ("Offer ended", "Promo
berakhir", "Ưu đãi đã kết thúc") and `posts.offer.lastDayDate` ("last day
{date}", "hari terakhir {date}", "ngày cuối {date}"); an offer is over as
`isOver(offer, now)` says, on the phone's clock; commits end with
`(roadmap 2.25)`.

Review focus: an offer on its last day still shows its badge (test below);
an app left open across midnight is a known limit, untested.

### Task 3: "Offer ended" on the tile and in the sheet

**Files:** Modify `components/posts/offer-badge.tsx`, `components/posts/suggestion-tile.tsx`, `messages/en.json`, `messages/id.json`, `messages/vi.json`, `docs/roadmap.md`; Test `tests/unit/posts-section.test.tsx`

**Interfaces:** Produces `offerBadgeText(t, offer, now?: Date)`, the ended label when the offer is over; `OfferBadge({ offer, until?, now? })`. `now` defaults to the current time.

- [ ] **Step 1: Write the failing tests**, in "the offer badge", the clock at 2026-10-25T12:00Z:
  1. An offer whose last day was 2026-10-24: its two tiles show "Offer ended" and no "10% off"; the first tile's name starts `Suggestion 1 of 6, Offer ended,`.
  2. Its opened sheet shows "Offer ended" and "last day Sat 24 Oct", and no "until".
  3. An offer whose last day is 2026-10-25 shows "10% off" on its two tiles.
- [ ] **Step 2: Run them**: `pnpm exec vitest run tests/unit/posts-section.test.tsx`. Expected: FAIL on 1 and 2.
- [ ] **Step 3: Implement.** The ended badge: `rounded-control bg-field-muted px-2 py-0.5 text-[12px] font-medium text-ink-secondary`; in the sheet, `lastDayDate` in place of `untilDate`. The strings in the three files. The roadmap row 2.25 gains "a suggestion whose offer has ended says so".
- [ ] **Step 4: Run all unit tests**: `pnpm test`. Expected: PASS, the strings test included.
- [ ] **Step 5: Commit**: `feat(web): a suggestion whose offer has ended says so (roadmap 2.25)`.
