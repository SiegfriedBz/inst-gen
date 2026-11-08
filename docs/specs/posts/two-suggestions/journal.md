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
- 2026-11-08: `posts-12` recorded with the maintainer's yes, 4 Flash-Lite
  requests: `pnpm eval:posts sen svarga --record`, then with `--offer`. One
  run each, no re-record. Without an offer, each spa got an offer post and a
  moment post, one day and one night, no price. With the offer, both posts
  carried it, on its two treatments, one day and one night, no price.
  Seen, not this item's: Svarga's offer plan tagged `#massagedanang` (2.15
  drops a tag naming another country's town), Sen's `#deaptissue`, and every
  caption runs as one paragraph, so the first-line check (not shown to the
  owner) flags all four plain posts. The other fixtures keep their `posts-11`
  recordings, which replay to two posts.

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

## Final review

A fresh reviewer read the whole branch: ready with fixes. It replayed the
seven `posts-11` recordings (two posts each, one day and one night, no price
left) and dealt couples, pregnancies and offers 300 times each, with no
broken rule.

- Fixed: removing prices could leave a caption with no words (lines with no
  stop were one "sentence"). Lines now split too; a caption left with no
  word drops the post, and a caption update left with none keeps the old
  post.
- Fixed: a paragraph lost its break when its first sentence went.
- Fixed: an emoji splits a sentence only before a new capital, so "…IDR
  250k 🌸 is waiting for you." goes whole.
- Fixed: "After 10k steps" and "a 5K run" are no longer prices.
- Fixed: ₫, VNĐ, vnd, rb and jt (the pilot), and Baht, ฿, RM, € and £ (the
  fixtures) are prices.
- Added: the recorded plans' replay checks that no caption or story text
  keeps a price.
- Left as minor: `checkPlan` doesn't record two offer posts without an
  offer; an offer post's story-text price is counted as `price_fixes`; a
  third model post can be kept without a set-up when post 1 or 2 is
  dropped; the run reads every post the model writes before ending.

After the fixes, `pnpm check`:

```
 Test Files  109 passed (109)
      Tests  1655 passed (1655)
```

