---
title: "Two days of suggestions"
description: "The suggestions of the current day and of the day before stay on the phone and on the screen, with their post and story images, captions, story texts and translations: the current day's on top under 'Today', the day before's under 'Yesterday', each day numbering its own attempts; at the reset only the day before yesterday's go; review replies and answers still go at the reset; the owner guide says so in three languages."
status: draft
date: "2026-11-23"
---

# Two days of suggestions

## Goal

The maintainer, 2026-11-23: "keep the images, posts and stories for 2 days
on the cell phone, no more delete every day", and "I ALWAYS WANT TO SEE THE
IMAGES OF THE DAY BEFORE + the current images of the day if any".

Today (`posts/suggestions`, 2.6; `platform/one-daily-reset`, 2.8b), at
Google's reset (midnight Pacific: 15:00 in Da Nang, 16:00 in Bali, an hour
earlier in US summer time) the day's suggestions leave the screen, and
their images and translations are deleted from the phone. Only the records
of the newest 12 posts stay, unseen, so new attempts don't repeat their
topics. A suggestion made at 10:00 is gone at 15:00 the same afternoon.

Success: after the reset, the owner still sees the day before's suggestions,
with their images, captions and story texts, below the new day's; a day
later, they go.

## Behaviour

### What stays

- The suggestions of the current day and of the day before stay on the
  phone: their post and story images, captions, story texts, translations,
  and what the owner saved, copied or edited.
- A day is the app's day (2.8b): from one Google reset to the next, the day
  the usage bar counts. "The day before" is the day that ended at the last
  reset (developer's call: one meaning of "today" for the bar and the
  screen; a suggestion made just before a reset stays about a day, one made
  just after it about two).
- At the reset, what goes is the day before yesterday's: its images and
  translations are deleted, as the day before's are today, and its records
  stay only as the recent posts that new attempts don't repeat, the newest
  12 posts as today (2.6).
- An app left open across the reset does the same at its next attempt, as
  it does today (2.8b).

### What the screen shows

- The current day's attempts on top, newest first, as today.
- Then the day before's attempts, newest first, under a heading
  "Yesterday".
- When both days have attempts, the current day's sit under a heading
  "Today". With only the day before's, "Yesterday" alone.
- Each day numbers its own attempts: "Attempt 1" is the first of its day, as
  the bar counts today's (2.8b). The downloaded files keep their day and
  attempt in their names, as today (2.6).
- The line that explains a suggestion ("Each suggestion is 2 images…")
  shows only when neither day has one, as it shows now when today has none.
- The "Make 2 suggestions" button and the attempt being made stay where they
  are, above everything else.

### What the owner can do with the day before's

Everything they can do with the current day's: open a suggestion, save its
images, copy its text, edit it, write new texts, create a new image, read it
in their language. Each uses the current day's limits, as today.

- The automatic caption update after a business edit (2.4, 2.5) updates the
  newest attempt on the screen, as today: the current day's newest, or, with
  none, the day before's newest.
- Images that were still being made when the app closed are picked up again
  for both days' attempts, as they are for today's now.

### The owner guide

`guide.allowance.reset`, in English, Indonesian and Vietnamese, says that at
the reset the limits come back and the day's review replies and answers
leave the screen, while suggestions stay one more day, under "Yesterday".
The PDF guide follows when the maintainer next runs `pnpm guide:pdf`
(it needs port 3000).

### What doesn't change

- The usage limits, their counts and the reset time (2.8, 2.8b).
- Review replies and answers to guests' questions still leave the screen at
  the reset (2.8b, 2.19).
- The special offer, which lasts until its own last day ends.
- Two suggestions an attempt, their images and the two of each attempt that
  come with images (2.17, 2.17b).
- What a new attempt must not repeat: the newest 12 posts (2.2, 2.6), now
  with their reasons (`posts/reasons-to-book`).

### Strings

New, in `messages/en.json`, `id.json` and `vi.json`: `posts.today` ("Today",
"Hari ini", "Hôm nay") and `posts.yesterday` ("Yesterday", "Kemarin", "Hôm
qua"). Changed: `guide.allowance.reset` (above).

### Tests

Unit tests (Vitest):

- the phone's store: at a reset, the day before's batches keep their images
  and translations, and the day before yesterday's lose theirs; the newest 12
  posts' records stay; nothing of the current day is touched;
- the screen's days: a function that splits the stored attempts into the
  current day's and the day before's, newest first, and numbers each day's
  attempts from 1, oldest first; the day before yesterday's never show;
- the strings in three languages.

Phone tests (Playwright), in `tests/e2e/suggestions.spec.ts`: an attempt made
at 10:00 is still there after a reload at 13:55, as today; past the reset at
14:05 it shows under "Yesterday" with its two images, and "Make 2
suggestions" is there; a new attempt then shows as "Attempt 1" under
"Today"; past the next reset, the first attempt is gone.

## Acceptance criteria

```gherkin
Scenario: The day before stays
  Given the owner made an attempt with its images at 10:00
  When the reset passes and the owner opens the app
  Then the attempt shows under "Yesterday" with its two images, its captions and its story texts

Scenario: Today and yesterday
  Given an attempt from the day before and one made after the reset
  When the owner opens the app
  Then "Today" shows "Attempt 1", the new one, on top
  And "Yesterday" shows "Attempt 1", the day before's, below it

Scenario: Two resets later
  Given the owner made an attempt with its images on Monday at 10:00
  When the reset passes on Monday and again on Tuesday
  Then the attempt is no longer on the screen
  And its images and translations are no longer on the phone

Scenario: Working on the day before's
  Given an attempt from the day before
  When the owner taps "Write new texts" on one of its suggestions
  Then new texts are written, and today's count of new texts goes up by one

Scenario: Reviews and answers still go
  Given a review reply and an answer to a guest's question from the day before
  When the reset passes
  Then neither shows on the screen
```

## Known limits

- Two days of images take up to twice today's space on the phone. Safari may
  still clear what the app keeps after about a week without a visit (the
  owner guide says so).
- A suggestion made just before a reset stays about a day; one made just
  after it, about two.

## Out of scope

- Keeping more than two days, or a gallery of past posts.
- Moving the reset to the owner's midnight.
- Review replies and answers, which still go at the reset.
