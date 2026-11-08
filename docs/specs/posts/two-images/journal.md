# Two images an attempt: journal

## Calls made along the way

- 2026-11-08: the maintainer asked for two images a round instead of six,
  to cut the image spend, and for the guide to follow, then skipped the
  questions. The spec's calls are the developer's, listed when it was handed
  over: the same count everywhere the app runs, `pnpm eval:images` still
  six; the offer posts, otherwise a day and a night; the other four as text
  with "Create new image" from the day's 10; limits, the $8 month and
  decision 0004 unchanged; roadmap number 2.17 (2.15 in progress, 2.16
  pencilled in for the therapists' look). The maintainer approved it.
- 2026-11-08: the image client's test read request bodies by call order;
  the calls interleave (each waits for the phone's store first), so it finds
  each body by its post.
- 2026-11-08: a suggestion that isn't one of the two stays `skipped` when the
  image month is full, with the month line and no "Create new image", so its
  tile stays a text tile (the plan had it turn `month`, which its tile would
  draw as an image block).
- 2026-11-08: the day's-limit and month tests for a suggestion without an
  image live in `usage-limits-ui.test.tsx`, which has the usage provider.
- 2026-11-08: `special-offer.spec.ts` didn't answer image requests; it now
  does, and checks that the two badged tiles are the two with images.
- 2026-11-08: the note in `guide/owner-guide` sits inside its numbered list,
  indented, so the list stays one list.

## RED

Task 1, the pick:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, first images:

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 7 ⎯⎯⎯⎯⎯⎯⎯
```

Task 3, the screens:

```
 Test Files  2 failed (2)
      Tests  8 failed | 25 passed (33)
```

## GREEN

`pnpm check`, at the end of the branch:

```
 Test Files  109 passed (109)
      Tests  1632 passed (1632)
```

`pnpm test:e2e`, after the phone tests were updated:

```
  1 skipped
  64 passed (20.6s)
```

`pnpm guide:pdf` wrote the three PDFs (4 pages each), read back in each
language. No `.env.local` here, so they have no contact line: rebuild them
where `GUIDE_CONTACT` is set before handing them over.
