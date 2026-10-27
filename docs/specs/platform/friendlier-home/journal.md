# Friendlier home: journal

## Calls made along the way

- 2026-10-27: Plan executed inline with executing-plans, on
  `claude/friendlier-home-2-10`, cut from `origin/develop`.
- 2026-10-27: Tasks 6 and 7 (the grid and the sheet) run as one unit: the
  grid removes the cards whose buttons the existing posts tests click, and
  only the sheet brings them back.
- 2026-10-27: `components/ui/tabs.tsx` is restyled as the bottom bar itself
  rather than overridden from `HomeTabBar`: the home is its only user, and
  overriding the old solid-jade active state class by class was fragile.
- 2026-10-27: The sheet's close button reuses `posts.images.close` ("Close")
  rather than adding the spec's `posts.close`: same words, one key.
- 2026-10-27: A tile in the image-month-full state shows the month line
  ("No new images until …"), as the spec's "before images are made" block.
- 2026-10-27: "Show in Tiếng Việt / Bahasa Indonesia" stays under the caption,
  where `CaptionTranslation` puts it, not on the row with "Edit the text".
- 2026-10-27: The guard that closes the sheet when its suggestion leaves the
  screen has no test: while the sheet is open nothing on the page can remove
  that suggestion (the reset only runs from "Make 6 new suggestions", behind
  the sheet). It stays for a run resumed in the background.
- 2026-10-27: The open "Your business" section keeps today's label-over-value
  rows, not label beside value: one less layout, the same facts.
- 2026-10-27: A field left empty by a failed or empty essence search keeps
  1.3's line ("We couldn't look this up today…") on the home screen, without
  "Not found · Add": the missing block asks for it.
- 2026-10-27: "+ Phone" focuses its field by the field's label in the form
  (or a list's add field), rather than a key threaded through every form.
- 2026-10-27: "{count} to add" lives at `brand.panel.toAdd`, beside the
  panel's other words, not `brand.missing.inSection`.
- 2026-10-27: `reviews.short` and `reviews.warm` become the switch's words
  ("Short", "Warmer") and also name the edit box; the cards' headings go.
- 2026-10-27: One full run had `brand-fixtures-replay` (karsa-spa) time out
  at 5 s under load; it passes alone and on the next full run (99 files,
  1171 tests). Nothing here touches the brand read.
- 2026-10-27: The owner asked for the passphrase to be always visible. The
  spec gained "The passphrase shows as it is typed" and was approved again
  (11:15 UTC); the field is `type="text"`, nothing else about sign-in moves.
- 2026-10-27: The bottom bar hides while a text field has focus, not when the
  visual viewport is under 75% of the window: the e2e run showed both shrink
  together, as Android Chrome's do when the keyboard opens, so the size rule
  would never fire on the pilot's phones. On a phone, a focused text field is
  the keyboard being up; on a desktop the bar also hides while typing, which
  costs nothing.
- 2026-10-27: The bar comes back 300 ms after focus leaves a field, not at
  once: in the e2e run at 320px, the tap on "Write 2 replies" that took focus
  away was swallowed by the bar reappearing under it. A field getting focus
  still hides it at once.
- 2026-10-27: The e2e tests were updated to the new layout by a subagent
  (tests/e2e only), then run through a scratch Playwright config on port 3100:
  another project's dev server holds 3000, and `reuseExistingServer` would
  have tested that app. "Welcome, Sen" isn't checked without JavaScript any
  more: it now waits for the phone's store.

## RED

Task 1, language button (`tests/unit/language-switch.test.tsx`):

```
      Tests  7 failed | 1 passed (8)
```

Task 2, header (`brand-home`, `guide`):

```
      Tests  2 failed | 43 passed (45)
```

Task 3, bottom bar (`brand-home`):

```
      Tests  3 failed | 34 passed (37)
```

Task 4, saved and copied (`posts-taken`, `posts-edit`, `posts-store`):

```
Error: Cannot find package '@/lib/posts/taken' imported from …/tests/unit/posts-taken.test.ts
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
```

Task 5, the two steps report back (`posts-take-away`):

```
      Tests  4 failed | 6 passed (10)
```

Tasks 6 and 7, the grid and the sheet (`posts-section`, then `posts-section-images`):

```
      Tests  18 failed | 23 passed (41)
      Tests  6 failed | 8 passed (14)
```

Task 8, what's missing (`brand-missing`):

```
Error: Cannot find package '@/lib/brand/missing' imported from …/tests/unit/brand-missing.test.ts
      Tests  no tests
```

Task 9, Your business (`brand-home`, `brand-panel`, `brand-section-sheet`):

```
      Tests  28 failed | 49 passed (77)
```

Task 10, one reply at a time (`reviews-section`, `reviews-section-storage`):

```
      Tests  16 failed | 5 passed (21)
```

Passphrase always visible (`sign-in-form`):

```
      Tests  1 failed | 4 passed (5)
```

Bar hides on focus (`brand-home`, the rewritten test):

```
      Tests  1 failed | 41 skipped (42)
```

Bar back after a pause (`brand-home`):

```
      Tests  1 failed | 41 skipped (42)
```

## GREEN

Task 1 (`language-switch`, `i18n-messages`):

```
      Tests  15 passed (15)
```

Task 2 (`brand-home`, `guide`):

```
      Tests  45 passed (45)
```

Task 3 (`brand-home`):

```
      Tests  37 passed (37)
```

Task 4 (`posts-taken`, `posts-edit`, `posts-store`, `posts-batch`):

```
      Tests  41 passed (41)
```

Task 5 (`posts-take-away`, `reviews-section`):

```
      Tests  27 passed (27)
```

Tasks 6 and 7 (`posts-section`, `posts-section-images`):

```
      Tests  55 passed (55)
```

Task 8 (`brand-missing`, `brand-panel`):

```
      Tests  26 passed (26)
```

Task 9 (`brand-home`, `brand-panel`, `brand-section-sheet`, `brand-missing`, `usage-limits-ui`, `i18n-messages`):

```
      Tests  105 passed (105)
```

Task 10 (`reviews-section`, `reviews-section-storage`), then the full suite:

```
      Tests  21 passed (21)
 Test Files  99 passed (99)
      Tests  1171 passed (1171)
```

Passphrase always visible (`sign-in-form`):

```
      Tests  5 passed (5)
```

Bar hides on focus (`brand-home`):

```
      Tests  42 passed (42)
```

Bar back after a pause (`brand-home`), then every e2e test on port 3100:

```
      Tests  42 passed (42)
  1 skipped
  60 passed (21.2s)
```
