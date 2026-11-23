# Two days of suggestions: journal

## Calls made along the way

- 2026-11-23: the maintainer asked for it while approving `posts/reasons-to-book`'s
  plan ("keep the images, posts and stories for 2 days on the cell phone, no
  more delete every day"), on the same branch. Asked what they want to do
  with the day before's posts, they answered: "I ALWAYS WANT TO SEE THE
  IMAGES OF THE DAY BEFORE + the current images of the day if any". The
  developer wrote the rest as calls in the spec, which they approved.
- 2026-11-23: the phone's store didn't change: `clearBefore` already deletes
  what came before a given moment; the screen now passes the start of the
  day before (`yesterdayStart`) at load and when an app left open passes the
  reset.
- 2026-11-23: three tests written for the old day were turned to the new
  one, as the spec asks: an attempt made after the reset in an app left open
  is the new day's "Attempt 1" with the day before's below it; and, with no
  attempt today, the automatic caption update follows the day before's
  newest attempt, while it leaves it alone when today has one.
- 2026-11-23: "Today" and "Yesterday" are small headings above the attempts'
  own, in the secondary ink, so "Attempt 1" stays the line a test or the
  owner looks for.
- 2026-11-23: the phone tests ran on port 3117 with a scratch config: other
  projects' servers held 3000 and 3101.

## RED

Task 1: `TypeError: yesterdayStart is not a function`, `TypeError: splitDays is not a function`

Task 2: `Tests  6 failed | 87 passed (93)`

## GREEN

Task 1: `Tests  8 passed (8)`

Task 2: `Tests  102 passed (102)` (the screen's tests); `pnpm check`: `Test Files  134 passed (134)`, `Tests  2268 passed (2268)`; `pnpm test:e2e` on port 3117: `73 passed (52.3s)`, `1 skipped`
