# Two suggestions an attempt: journal

## Calls made along the way

- 2026-11-08: 2.17 had read "lower the number of images generated from 6 to
  2 per round" as six suggestions with two images. The maintainer meant two
  suggestions a round. This item makes an attempt two posts, both with their
  images; 2.17's pick and text tiles stay for attempts saved with six.
- 2026-11-08: mid-way, the maintainer added "THERE SHOULD NEVER BE PRICES IN
  THE POSTS OR STORIES TEXT". The rule was only on the 2.15 branch's prompt,
  not merged. The spec was amended (prompt rule, and code removing any
  sentence with a price from every caption and story text) and approved.
- 2026-11-08: the developer's calls, listed at hand-over: with an offer both
  posts carry it; without, an offer post and one of another type; one day
  and one night; the limits unchanged (3 attempts, 6 suggestions a day);
  two tiles to a row.
- 2026-11-08: saved attempts and caption updates keep accepting six posts
  (`POSTS_LIMITS.savedPosts`): today's six-post attempts on the owners'
  phones must still load and update after the deploy.
- 2026-11-08: Svarga's recorded story texts read "…in your villa 🌸 IDR 250k
  for 60 min…": the sentence splitter doesn't end at an emoji, so removing
  the price sentence left no story text. A price is now cut at an emoji
  too, and "…in your villa 🌸" stays.
- 2026-11-08: the deal pin "the lights come last: the rest of the deal is as
  before" went: two set-ups change every deal, under `posts-12`.
- 2026-11-08: the two commits planned for Tasks 2 and 2b became one: both
  change the same prompt and checks.
- 2026-11-08: no new recordings. The `posts-11` recordings (six posts)
  replay to checked batches of two. `pnpm eval:posts` on Sen and Svarga
  (4 Flash-Lite requests) waits for the maintainer's yes.

## RED

Task 1, two set-ups:

```
      Tests  11 failed | 52 passed (63)
```

Task 2, a plan of two posts and never a price:

```
      Tests  16 failed | 94 passed (110)
      Tests  9 failed | 22 passed (31)
      Tests  2 failed | 5 passed (7)
      Tests  1 failed | 70 passed (71)
```

Task 3, the screen:

```
      Tests  8 failed | 14 passed (22)
```

## GREEN

`pnpm check`, at the end of the branch:

```
 Test Files  109 passed (109)
      Tests  1648 passed (1648)
```

`pnpm test:e2e`:

```
  1 skipped
  64 passed (23.3s)
```

`pnpm guide:pdf`: the three PDFs say 2 suggestions, read back in each
language; no contact line, since there is no `.env.local` here.
