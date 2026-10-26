# One daily reset: journal

## Calls made along the way

- 2026-10-26: The owner saw "Resets at 08:00" on the bar (a computer on French
  time) and asked why the screen kept a 3am day. They chose one clock: the
  screen resets when Google does, accepting drafts that clear mid-afternoon.
- 2026-10-26: Spec approved by the owner; plan written and executed inline
  with executing-plans in the session's worktree, on `claude/one-daily-reset`,
  cut from `develop`.
- 2026-10-26: The plan's e2e clocks (start 20:00, then 13:55 and 14:05 the
  next day) would pass on the old 3am code too. Both e2e tests now start at
  10:00 and move to 13:55 and 14:05 the same day: only the reset at 14:00 can
  clear them. Checked by running them on the old `lib/posts/day.ts` (2 failed)
  and on the new one (4 passed).
- 2026-10-26: In `platform/usage-counters`, the notes sit inside the two list
  items they change, as a parenthesis, so the lists don't break; the other two
  specs get a quoted line under the section heading.
- 2026-10-26: Image file names use the phone's date of the reset that opened
  the day (the spec's builder's call); `dayOf` already read `dayStart`'s local
  date, so only `dayStart` changed.

## RED

```
 Test Files  4 failed | 1 passed (5)
      Tests  10 failed | 23 passed (33)
```

e2e, on the old `lib/posts/day.ts`:

```
  2 failed
  2 passed (16.9s)
```

## GREEN

```
 Test Files  96 passed (96)
      Tests  1101 passed (1101)
```

```
  4 passed (11.0s)
```
