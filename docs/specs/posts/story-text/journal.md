# Story text: journal

## Calls made along the way

- 2026-10-27: the branch was moved onto `develop` after 2.12 was squash-merged
  there (#35): same files, so the 2.13 PR shows only its own commits.
- 2026-10-27: an emoji is a grapheme matching `\p{Extended_Pictographic}`, so
  "©" or "™" in a spa's text would count as emoji and go; a flower is
  compared without its variation selector.

## RED

Task 1, `pnpm exec vitest run tests/unit/posts-emoji.test.ts` (no
`lib/posts/emoji` yet):

```
 Test Files  1 failed (1)
      Tests  no tests
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  21 passed (21)
```
