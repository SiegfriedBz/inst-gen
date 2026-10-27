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

- 2026-10-27: Task 5 keeps `translateCaption` for a caption alone and adds
  `translatePost` for a caption with its story text (structured output),
  rather than replacing the first: fewer stubs to change, and a post saved
  before story texts asks exactly as before.
- 2026-10-27: the browser shares one request between the two "Show in…"
  links while it is on its way; once settled, the phone's store answers.
  Without IndexedDB, a second tap after the answer asks again.
- 2026-10-27: until Task 9 re-records them, the Sen and Svarga translation
  recordings are `translate-1`, so their replay test fails on its version
  check; the rest of the suite passes.
- 2026-10-27: without images, the sheet keeps the line that says why there
  are no pictures ("Images aren't turned on for your account yet."), above
  the parts: the spec drops the Images part, not that line, and the
  friendlier-home test for it still holds.
- 2026-10-27: the three buttons are the app's one `Button` style (filled
  accent), as on mockup v6; "Copy post text" loses the outlined look the
  second step had.
- 2026-10-27: the phone tests (Task 8) were written after Task 6's code, so
  they have no RED run of their own; screenshots of the sheet at the Pixel 7
  viewport matched mockup v6 (three boxed parts, the dashed story part, the
  green buttons). `postsBody` gives story texts only when asked
  (`stories: true`), so the older phone tests keep posts without one.

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

Task 5, the six translation test files:

```
 Test Files  4 failed | 2 passed (6)
      Tests  10 failed | 46 passed (56)
```

Task 6, the five sheet test files:

```
 Test Files  4 failed | 1 passed (5)
      Tests  26 failed | 76 passed (102)
```

Task 7, `pnpm exec vitest run tests/unit/guide.test.tsx`:

```
 Test Files  1 failed (1)
      Tests  3 failed | 23 passed (26)
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

Task 5, then `pnpm test` (the two recordings still `translate-1`):

```
 Test Files  5 passed (5)
      Tests  54 passed (54)
 Test Files  1 failed | 104 passed (105)
      Tests  2 failed | 1427 passed (1429)
```

Task 6, then `pnpm test` (the two recordings still `translate-1`):

```
 Test Files  5 passed (5)
      Tests  102 passed (102)
 Test Files  1 failed | 105 passed (106)
      Tests  2 failed | 1439 passed (1441)
```

Task 7:

```
 Test Files  1 passed (1)
      Tests  26 passed (26)
```

Task 8, `pnpm test:e2e tests/e2e/story-text.spec.ts tests/e2e/friendlier-home.spec.ts tests/e2e/editor.spec.ts`:

```
  16 passed (24.5s)
```
