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
- 2026-11-23: with only the day before's attempts on the screen, the button
  reads "Make 2 new suggestions", its label whenever attempts show; the
  spec's phone test said "Make 2 suggestions", and the test checks the label
  the screen has.
- 2026-11-23: the review of the branch (fresh reviewer): ready with fixes,
  none critical. Fixed: the phone test could reload while the new attempt
  was still being made; it now waits for the attempt's two images. Fixed:
  comments that still said only today's attempts show. Deferred, in the PR:
  on the day this ships, an owner who already opened the app since the last
  reset sees the day before's attempts come back without their images (the
  old code deleted them), until the next reset; an ended special offer's
  posts now stay on the screen about a day longer, with no flag; an app left
  open across the reset keeps the old labels until the next attempt; the day
  and attempt headings are both level 2; a few boundary tests.
- 2026-11-23, after the branch was pushed: the maintainer chose "Do this
  task here: Flag posts whose special offer has ended", the review's minor
  about an ended offer. The spec is amended ("A suggestion whose offer has
  ended") and back to draft, for approval. Approved; at the merge with
  develop, this spec becomes roadmap 2.25 (2.23 is `posts/normal-bodies`).

## RED

Task 1: `TypeError: yesterdayStart is not a function`, `TypeError: splitDays is not a function`

Task 2: `Tests  6 failed | 87 passed (93)`

Task 3 (an offer that has ended): `Tests  2 failed | 73 passed (75)`

## GREEN

Task 1: `Tests  8 passed (8)`

Task 2: `Tests  102 passed (102)` (the screen's tests); `pnpm check`: `Test Files  134 passed (134)`, `Tests  2268 passed (2268)`; `pnpm test:e2e` on port 3117: `73 passed (52.3s)`, `1 skipped`

After the review's fixes: `pnpm check`: `Tests  2268 passed (2268)`; `pnpm test:e2e` on port 3117, twice: `73 passed (37.1s)`, `1 skipped`, then `73 passed (37.8s)`, `1 skipped`

Task 3: `Tests  75 passed (75)` (the screen's tests); the suite `Tests  2335 passed (2335)`; `pnpm test:e2e` on port 3117: `73 passed (26.2s)`, `1 skipped`
