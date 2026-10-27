# Special offer: journal

## Calls made along the way

- 2026-10-27: the spec's example "Sunday 26 October" is a Monday in 2026; the
  plan and its tests use Sunday 25 October, "until Tue 27 Oct".
- 2026-10-27: an `offer` flag needs words on the post card, which the plan
  left out: `posts.flags.offer`, "Check the offer in this text before
  posting: {text}.", and `offer` joins the flags shown.
- 2026-10-27: an offer's day is written from a message, `{weekday} {day}
  {month}`, so English reads "Tue 27 Oct" and each language orders it.
- 2026-10-27: "Add treatments" in the offer sheet also switches to "Your
  business", so its form opens over its own tab.
- 2026-10-27: a race found while running everything: the offer stored on
  the phone, loaded when Create Posts opens, could arrive after the owner
  tapped "Done" and wipe the new offer. A load now applies only if the offer
  didn't change since it began, and waits for the last write.
- 2026-10-27: final review fixes. A rewrite sends the batch's offer without
  the treatments that left the business; Forget deletes the offer; the offer
  is looked at again whenever the page shows, so it goes at the reset even
  with the app left open; a free extra's gift is never among its paid
  treatments; the model's last day is written from fixed English names, not
  the device's date formatting.

## RED

Task 1, the offer module (`posts-offer`):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, code's checks (`posts-checks`, `posts-edit`):

```
 Test Files  2 failed (2)
      Tests  11 failed | 46 passed (57)
```

Task 3, the prompt, the request and the run (`posts-prompt`, `posts-run`,
`posts-route`):

```
 Test Files  3 failed (3)
      Tests  8 failed | 25 passed (33)
```

Task 4, the offer on the phone and in requests (`posts-offer-store`,
`posts-client`):

```
 Test Files  2 failed (2)
      Tests  no tests
```

Task 5, the offer sheet (`posts-offer-sheet`):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 6, the offer on Create Posts (`posts-section`, `brand-home`):

```
 Test Files  2 failed (2)
      Tests  8 failed | 88 passed (96)
```

Task 7, the badge (`posts-section`):

```
 Test Files  1 failed (1)
      Tests  3 failed | 51 passed (54)
```

Task 8, the owner guide (`guide`):

```
 Test Files  1 failed (1)
      Tests  3 failed | 13 passed (16)
```

Final review fixes (`posts-offer`, `posts-offer-store`, `posts-client`,
`posts-section`):

```
     × a free extra's gift is never one of its paid treatments
     × englishDay doesn't depend on the device's date formatting
   × Forget deletes the offer too
     × a rewrite after a treatment left sends the batch's offer without it
     × with the app left open across the reset, the line goes when the page shows again
 Test Files  4 failed (4)
      Tests  5 failed | 98 passed (103)
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  25 passed (25)
```

Task 2:

```
 Test Files  3 passed (3)
      Tests  61 passed (61)
```

Task 3, with the recorded plans replayed:

```
 Test Files  4 passed (4)
      Tests  40 passed (40)
```

Task 4, with `brand-store`:

```
 Test Files  3 passed (3)
      Tests  34 passed (34)
```

Task 5:

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

Task 6:

```
 Test Files  2 passed (2)
      Tests  96 passed (96)
```

Task 7, with `posts-take-away` and `i18n-messages`:

```
 Test Files  3 passed (3)
      Tests  71 passed (71)
```

Task 8, with `i18n-messages`:

```
 Test Files  2 passed (2)
      Tests  23 passed (23)
```

Task 10, end to end on port 3100 (`special-offer`, then every e2e test):

```
  2 passed (37.9s)
  1 skipped
  62 passed (48.1s)
```

Final review fixes:

```
 Test Files  4 passed (4)
      Tests  103 passed (103)
```
