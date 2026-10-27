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
      Tests  4 failed | … (posts-taken: Cannot find package '@/lib/posts/taken')
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
