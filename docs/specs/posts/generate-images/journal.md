# Generate images: journal

## Calls made along the way

- 2026-10-25: Task 1. Missing `GOOGLE_IMAGE_API_KEY` is logged once per server
  process with `console.error`, as the pilot config logs its problems.

- 2026-10-25: Task 2. `sharp` pinned at 0.35.5 (already in the lockfile through
  Next.js). The post is cut from the resized pixels, not from the story JPEG,
  so it is encoded once. JPEG sizes on the banded test image say nothing about
  real photos; Task 9 records real sizes.

- 2026-10-25: Task 3. A spent prepaid balance is guessed as a 429, or a 400 or
  403 whose message says billing, prepay, credit or balance. To check the first
  time the balance runs out.

- 2026-10-25: Task 4. The route answers 401 when no owner can be read from the
  session (proxy.ts already turns those away), and 499 with no body when the
  request was closed: nobody reads it.

- 2026-10-25: Task 6. The images get a run of their own, kind `images`, started
  once the plan's run has ended, rather than six steps added to the plan's run
  as the spec words it. Same resume rule; the plan client stays as it is.
- 2026-10-25: Task 6. A first GREEN run failed `resume skips posts that already
  have an image`: the resumed request saved its stale copy of the run over the
  step just marked done. Resume now marks those steps done in the copy it
  saves.

- 2026-10-25: Task 7. The story sheet closes with its Close button or Escape;
  the image itself isn't a tap target (biome's a11y rules).
- 2026-10-25: Task 7. "Try again" stays available on a failed card while the
  other images are still being made: each retry is its own run.
- 2026-10-25: Task 7. `pnpm add sharp` rewrote `pnpm-lock.yaml` in pnpm's style;
  biome put it back in the repo's (double quotes), leaving only sharp's lines
  changed from develop.

- 2026-10-25: Task 8. Ports 3000 and 3100 were held by another project's dev
  servers, so the e2e suite ran through a scratch config (`.superpowers/`,
  outside git) that only moves the server to port 3217. The repo's config is
  unchanged.

- 2026-10-25: Final review (a fresh reviewer). Fixed three ways to pay for an
  image twice: a "Try again" tapped while offline left runs that a resume then
  asked for again (a new request now replaces any older run's step for that
  post, a resume asks for each post once, and an offline card has no "Try
  again"); "Make the images" was enabled while lost images were still being
  looked up; an image dropped with the phone online waited for a visibility or
  online event (it is now asked for again once its run ends, as posts are).
  Deferred minors: wake locks kept after a dev remount, two resumes at once
  acting on stale run records, Forget's no-late-save rests on React's unmount
  order, an abort listener left on success.

- 2026-10-25: Eval with `images-1`, Sen and Svarga: 12 of 12 images made,
  $0.60, 20 to 28 s each (26 to 28 s for a batch of six), every input
  1536×2752; stories 181 to 419 KB, posts 126 to 301 KB. No post crop cuts its
  subject. Sen 1 came out in daylight: the recorded post plan wrote "sunlit"
  although 2.2's prompt forbids bright sun. The recording stays as the model
  answered.
- 2026-10-25: `images-2`. The image step now swaps daylight and bad-weather
  words in the post's prompt for dusk and lamp light (`cleanLight`, whole words
  only), and the style line adds "Whatever the scene says, the light is dusk,
  lamps, lanterns or candles." The spec names `images-1`; the version is bumped
  with the change, as the spec asks.

- 2026-10-25: Maintainer's verdicts on the `images-1` post crops, "a tourist
  would book this": Sen 2 and 4 (2 of 6); Svarga 1, 5 and 6 (3 of 6). Below the
  spec's pass mark of 4 of 6 for each. No crop was said to cut its subject.

- 2026-10-25: Specs amended and approved with the maintainer's image rules:
  `posts-2` (every scene shows the massage, only what the business offers,
  tidy, warm, still air, golden oil in clear glass) and `images-3` (the same
  rules in the style line). Sen's and Svarga's plans re-recorded with
  `posts-2` (2 Gemini requests, about 4 s each): 11 of 12 image prompts show
  a therapist at work; Sen 6 is towels on their own, and Sen 3 said "bright",
  now swapped for "warm" by `cleanLight`. The other three fixtures keep their
  `posts-1` recordings.

## RED

Task 1:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 3:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 4:

```
 Test Files  2 failed (2)
      Tests  no tests
```

Task 5:

```
 Test Files  3 failed (3)
      Tests  5 failed | 3 passed (8)
```

Task 6:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 7:

```
 Test Files  1 failed (1)
      Tests  no tests
```

```
 Test Files  1 failed (1)
      Tests  6 failed (6)
```

Final review fixes:

```
 Test Files  3 failed (3)
      Tests  5 failed | 27 passed (32)
```

Light cleaning (`images-2`):

```
 Test Files  2 failed (2)
      Tests  11 failed | 18 passed (29)
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  12 passed (12)
```

Task 2:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Task 3:

```
 Test Files  1 passed (1)
      Tests  5 passed (5)
```

Task 4:

```
 Test Files  2 passed (2)
      Tests  15 passed (15)
```

Task 5:

```
 Test Files  3 passed (3)
      Tests  24 passed (24)
```

Task 6:

```
 Test Files  1 passed (1)
      Tests  14 passed (14)
```

Task 7 (`pnpm check`):

```
 Test Files  65 passed (65)
      Tests  772 passed (772)
```

Task 8 (`playwright test`, all of tests/e2e):

```
  29 passed (11.8s)
```

Final review fixes (`pnpm check`, then all of tests/e2e):

```
 Test Files  65 passed (65)
      Tests  777 passed (777)
```

```
  29 passed (12.4s)
```

Light cleaning (`images-2`), then `pnpm check`:

```
 Test Files  2 passed (2)
      Tests  29 passed (29)
```
