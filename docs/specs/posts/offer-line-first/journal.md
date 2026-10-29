# Offer line first: journal

## Calls made along the way

- 2026-10-29: the cause, from `docs/specs/posts/day-and-night-images/journal.md`
  (28 Oct): Svarga's offer plan failed the replay 3 times in 4 on `posts-6`
  and `posts-7`. Once both offer captions left the offer out; twice they
  opened "Long flight? 🌸 10% off our …". 2.13's spec already made the offer
  line the hook, but the prompt asks for "a question or a promise" first and
  states the offer line's rule in another paragraph.
- 2026-10-29: the maintainer chose that code makes sure (rather than the
  prompt alone, with code only recording a miss), then "go ahead" without
  more questions. The spec was written as roadmap 2.13b, in its own folder
  (developer's call, as 2.8b).
- 2026-10-29: the reviewer's read of the draft raised three questions, all
  settled by the developer and written in the spec: rewrites get the exact
  lines too; a story text with any of the five flowers is kept; the offer
  line is never cut. The longest line Sen's or Svarga's treatments allow, a
  free extra, is 116 characters with its flower.
- 2026-10-29: the spec approved by the maintainer. Writing the plan showed
  that the batch's schema (`lib/posts/batch.ts`) refuses a story text over
  120, so "a longer line goes over 120" couldn't hold. Amended: no story
  text then, recorded. The maintainer approved the amendment.
- 2026-10-29: the branch starts from `claude/svarga-sen-light-levels-fa82e3`
  (roadmap 2.14), not yet merged into `develop`.

## RED

Task 1, the offer line (`tests/unit/posts-offer-line.test.ts`):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, code's checks (`tests/unit/posts-checks.test.ts`):

```
 Test Files  1 failed (1)
      Tests  4 failed | 51 passed (55)
```

## GREEN

Task 1 (`posts-offer-line.test.ts`, `posts-story.test.ts`):

```
 Test Files  2 passed (2)
      Tests  32 passed (32)
```

Task 2 (`posts-checks`, `posts-run`, `posts-edit`):

```
 Test Files  3 passed (3)
      Tests  106 passed (106)
```
