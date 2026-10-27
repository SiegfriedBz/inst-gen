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
- 2026-10-27: a rewrite drops the post's old story text before taking the
  answer's, so a rewrite whose answer has none leaves the post with none
  (the spec's "an empty story text … leaves the post with none").
- 2026-10-27: four older tests on Svarga (a spa) expected captions without
  a flower; they now expect the " 🌸" code adds, as the spec says.

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

Task 3, `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/posts-run.test.ts tests/unit/posts-log.test.ts tests/unit/posts-edit.test.ts`:

```
 Test Files  4 failed (4)
      Tests  10 failed | 90 passed (100)
```

Task 4, `pnpm exec vitest run tests/unit/posts-prompt.test.ts`:

```
 Test Files  1 failed (1)
      Tests  6 failed | 15 passed (21)
```

The run test that the spa flag reaches the prompt was written after the
code; it was checked to fail with the flag taken out of `run.ts`:

```
      Tests  1 failed | 21 skipped (22)
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

Task 3, then `pnpm test`:

```
 Test Files  4 passed (4)
      Tests  100 passed (100)
 Test Files  105 passed (105)
      Tests  1413 passed (1413)
```

Task 4, then `pnpm test`:

```
 Test Files  2 passed (2)
      Tests  43 passed (43)
 Test Files  105 passed (105)
      Tests  1419 passed (1419)
```
