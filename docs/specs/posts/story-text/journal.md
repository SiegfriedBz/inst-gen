# Story text: journal

## Calls made along the way

- 2026-10-27: the branch was moved onto `develop` after 2.12 was squash-merged
  there (#35): same files, so the 2.13 PR shows only its own commits.
- 2026-10-27: an emoji is a grapheme matching `\p{Extended_Pictographic}`, so
  "©" or "™" in a spa's text would count as emoji and go; a flower is
  compared without its variation selector.
- 2026-10-27: `storyText` in `postSchema` checks `.length` with a refine:
  zod 4's `.max()` counts code points (an emoji as 1), so it let a
  121-unit story text through.
- 2026-10-27: when a spa's story text has no flower, code cuts it to 117
  before adding " 🌸", so the flower always fits; the cut is recorded once,
  from the length before to the length after.

## RED

Task 1, `pnpm exec vitest run tests/unit/posts-emoji.test.ts` (no
`lib/posts/emoji` yet):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, `pnpm exec vitest run tests/unit/posts-story.test.ts tests/unit/posts-batch.test.ts`:

```
 Test Files  2 failed (2)
      Tests  1 failed | 5 passed (6)
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  21 passed (21)
```

Task 2:

```
 Test Files  2 passed (2)
      Tests  19 passed (19)
```
