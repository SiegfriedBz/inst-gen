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
