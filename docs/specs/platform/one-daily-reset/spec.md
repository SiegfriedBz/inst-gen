---
title: "One daily reset"
description: "The day's suggestions and review drafts leave the screen at the same moment the daily limits come back, Google's reset at midnight Pacific, instead of at 3am on the phone's clock; the usage bar's 'Resets at {time}' is then the only time the owner needs."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-26T09:18:17Z }
date: "2026-10-26"
---

# One daily reset

## Goal

The app has two daily clocks today. The usage bar's limits come back at
midnight Pacific, when Gemini's free quotas reset (`platform/usage-counters`,
"The owner's day: midnight Pacific"): 15:00 in Da Nang, 16:00 in Bali in
winter. The day's attempts and review drafts leave the screen at 3am on the
phone's clock (`posts/suggestions`, "Suggestions last until 3am";
`reviews/reply-drafts`, "Kept until a new review or 3am"). Each day has its
own reason, but the owner sees one time on the bar ("Resets at 15:00") and a
screen that follows the other. After 15:00 they can read "Attempt 4" while the
bar says 3 attempts are left.

The owner wants the app easy to use and what it shows easy to understand.
**One reset**: when Google resets, the app resets, and the bar's time is that
moment. Asked whether drafts clearing mid-afternoon was acceptable, the owner
said yes (2026-10-26).

## Behaviour

### The day is the usage day

The owner's day, for everything, is the usage day: from one midnight in
`America/Los_Angeles` to the next (`lib/usage/day.ts`, `USAGE_ZONE`). On the
phone it starts at whatever time that is locally, and the IANA zone handles
both sides' summer time, as the usage counters do.

What changes:

- **Suggestions** (`posts/suggestions`): "Create your posts" shows only the
  attempts made since the most recent reset. Older ones go exactly as they go
  at 3am today: their images and translations are deleted, their topics are
  kept for `recent`, 2.5's automatic update leaves them alone.
- **Attempt numbers** count from that reset: the first attempt after it is
  "Attempt 1". They always match the bar: three attempts on screen means
  none left.
- **The review draft** (`reviews/reply-drafts`): on opening the Reviews tab,
  a review made before the most recent reset is deleted and the tab is empty.
- **Image file names** (`posts/suggestions`, "Image file names") carry the
  date the attempt's day started on the phone's clock: the date of the reset
  that opened it. In Da Nang an attempt made at 10:00 on 27 October belongs to
  the day that opened at 15:00 on 26 October, so its files read
  `2026-10-26`, like every attempt of that day. (Builder's call: the calendar
  date of the attempt would give two files the same name, "attempt 2" at
  10:00 and "attempt 2" at 16:00 on the same date.)

What doesn't change:

- **Not mid-use.** The check still runs when the posts section loads and when
  the Reviews tab opens. An app left open across the reset keeps what it shows
  until the next load or the next opening of the tab, as it does across 3am
  today. The bar shows the new counts as soon as it rereads (`platform/usage-
  counters`, "The usage bar").
- **The bar** and its strings: "Resets at {time}" now covers the limits and
  the screen at once. No string is added or changed.
- Monthly counts (images, searches) still follow the UTC calendar.
- Everything stays on the phone between resets: a reload or a trip to
  Instagram or Google Maps loses nothing.

### In code

One day helper, not two. `lib/posts/day.ts`'s `dayStart` becomes the most
recent midnight Pacific at or before now, from `lib/usage/day.ts` (which
gains the matching "last reset" beside `nextReset`); `dayOf` gives the local
date of that instant. Its callers (`posts-section`, `reviews-section`,
`reviews/store`, `take-away`) are unchanged. `DAY_STARTS_AT_HOUR` and the
3am comments go. (Builder's call: where the helper lives, and whether
`lib/posts/day.ts` stays as a thin re-export.)

### Other documents

This spec overrides the 3am rule in `posts/suggestions` and
`reviews/reply-drafts`, and the "Two clocks" limit and the "This is not the
3am day" paragraph in `platform/usage-counters`. Each gets a one-line note at
the passage pointing here; their status and approval stay as they are. The
roadmap gains this item before 2.9; the PR that ships it marks it `done`.

### Tests

- Vitest (`tests/unit/posts-day.test.ts`, rewritten), with the phone's zone
  set to `Asia/Ho_Chi_Minh`:
  - `dayStart` at 14:59 and 15:00 on 26 October (US summer time) and at 15:59
    and 16:00 on 3 November (US winter time);
  - `dayOf` for 10:00 on 27 October is `2026-10-26`, for 16:00 is
    `2026-10-27`;
  - `isToday` from the reset exactly;
  - the same `dayStart` in `Asia/Makassar` (Bali), one hour later.
- The existing posts and reviews tests that move the clock past 3am move it
  past the reset instead.
- Playwright at the phone viewport, routes mocked, as today with the new
  boundary: move the clock past 15:00 Da Nang and see the empty posts tab and
  the empty Reviews tab.

## Acceptance criteria

```gherkin
Scenario: Suggestions clear when the limits come back
  Given a phone in Da Nang, in winter
  And two attempts made today at 10:00
  When the owner opens "Create your posts" at 15:05
  Then no suggestion is shown
  And the usage bar reads "Left today: 3 attempts" and "Resets at 15:00"

Scenario: Attempt numbers match the bar
  Given the reset happened at 15:00
  When the owner makes six suggestions at 16:00
  Then they show as "Attempt 1"
  And the bar shows 2 attempts left

Scenario: Overnight is the same day
  Given an attempt made at 20:00
  When the owner opens "Create your posts" the next morning at 08:00
  Then that attempt is still on screen

Scenario: The review draft goes at the reset
  Given a review with its two replies made at 11:00
  When the owner opens the Reviews tab at 15:30
  Then the tab is empty

Scenario: Not mid-use
  Given "Create your posts" is open at 14:58 with today's attempts
  When 15:00 passes without a reload
  Then the attempts stay on screen until the next load
```

## Known limits

- **Drafts go mid-afternoon.** An owner working at 14:50 in Da Nang loses
  unsaved suggestions at the next load after 15:00. Accepted for one clock:
  saved images are in the phone's photos, copied text is in Instagram.
- **The reset moves with US summer time**: an hour earlier from March to
  November, on a date that isn't the owner's. The bar always shows the right
  local time.
- An app left open across the reset shows yesterday's attempts beside a bar
  with full counts until it reloads.

## Out of scope

- Telling the owner in the app that suggestions will clear at the reset: the
  owner guide (2.9) says it.
- Keeping suggestions across days, or a history (as in `posts/suggestions`).
