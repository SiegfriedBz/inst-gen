# Day and night copy: journal

## Calls made along the way

- 2026-11-01: the cause. 2.13's caption rules quote "Wake up light
  tomorrow." as the positive ending, and Flash-Lite copies it: 3 and 2 of 6
  captions on Sen's and Svarga's `posts-8` plans, 5 and 6 of 6 on their
  `posts-10` offer plans. The `posts-1` recordings, made before the example,
  never use it. "Long flight?" opened a post in three of the four plans.
- 2026-11-01: the maintainer asked for half the copy for the day and half
  for the night, and variety, then skipped the questions. The spec was
  written as roadmap 2.14b; its calls (records only, no rewrite; no `bed` in
  the day words) are the developer's, listed when it was handed over, and
  the maintainer approved it.
- 2026-11-01: `posts-run.test.ts` pinned `posts-10` in a result; updated to
  `posts-11` with the prompt.
- 2026-11-01: `brand-fixtures-replay.test.ts` (karsa-spa) times out at 5 s
  in the full run, before and after this branch; it passes alone (22/22).
  Not this item's.
- 2026-11-01: `posts-11` recorded with the maintainer's go-ahead, 4
  Flash-Lite requests: `pnpm eval:posts sen svarga --record`, then with
  `--offer`. One run each, no re-record.
- 2026-11-01: the final review found one important point: two offer posts
  on one treatment open on the same offer line, so every one-treatment
  offer batch recorded a first-sentence repeat. Offer posts are left out of
  that check. The spec was amended and the maintainer approved it.
- 2026-11-01: the maintainer found the "." before an emoji needless
  ("tomorrow. 🌺"), and chose to fold it into 2.14b rather than a later
  item. Spec amended ("No stop before an emoji") and approved. Code removes
  it last, after the steps that find sentences by their stop; the records
  read an emoji as a sentence end, which also settles the review's point
  that "…tomorrow." and "…tomorrow 🌺" weren't one repeat. Twelve older
  tests expected ". 🌸" and now expect " 🌸".
- 2026-11-01: building it showed a rewrite risk: the model now sees an offer
  caption whose line has no stop before its flower, and may copy it so; code
  then took the line for missing and dropped the hook after it ("Long
  flight?"). Code puts the stop back on the line for the offer steps, in the
  caption and the story text, and removes it again at the end (developer's
  call; test "checkRewrite keeps a line the model copied without its stop").
  No new recording: the prompt is unchanged.

### What the recordings show

No caption or story text holds "Wake up light tomorrow." or opens on "Long
flight?". Code recorded no repeated sentence and no word of the other time
of day in any of the four plans (`repeats=0`, `light_misses=0`).

Every kept post's copy matches its light (23 of 23). The last sentences:

| Plan | Post | Light | Last sentence |
|---|---|---|---|
| Sen | 1 | day | Enjoy the peaceful calm of your afternoon with an easy evening ahead. |
| Sen | 2 | day | Get ready for a relaxed sunset and a wonderful dinner tonight. |
| Sen | 3 | night | Enjoy a quiet, restful night ahead in your room. |
| Sen | 4 | night | Drift into a calm evening and sleep deeply tonight. |
| Sen | 5 | night | Wake up tomorrow feeling fully renewed and light. |
| Sen | 6 | day | Step into the lovely evening feeling completely at peace. |
| Svarga | 1 | day | Let a sense of deep peace settle into your body as the afternoon slowly turns toward a quiet evening. |
| Svarga | 2 | night | Drift into a calm evening with light resting softly in the room. |
| Svarga | 3 | night | Drift into a restful night with your body completely at ease. |
| Svarga | 4 | day | Step out onto your terrace as the sun dips low, feeling completely restored. |
| Svarga | 5 | day | Relax completely while the afternoon breeze cools the garden outside. |
| Svarga | 6 | night | Rest easy tonight knowing your body is ready for tomorrow's swell. |
| Sen offer | 1 | day | Unwind completely as the afternoon slips into a peaceful evening |
| Sen offer | 2 | day | Step out onto your balcony as the afternoon fades into a calm sunset |
| Sen offer | 3 | night | Enjoy quiet relaxation while the city lights twinkle outside your window tonight |
| Sen offer | 4 | night | Drift into deep relaxation as the night settles over the city |
| Sen offer | 5 | night | Enjoy a calm evening together as the day comes to a gentle close |
| Svarga offer | 1 | night | Step into a peaceful evening of absolute calm. |
| Svarga offer | 2 | night | Drift into a restful night ahead. |
| Svarga offer | 3 | night | Welcome a peaceful night of deep rest. |
| Svarga offer | 4 | day | Enjoy the rest of your relaxing evening in the tropics. |
| Svarga offer | 5 | day | Step into a glowing afternoon of pure comfort. |
| Svarga offer | 6 | day | Enjoy a peaceful, tension-free afternoon ahead. |

Seen along the way, not this item's:

- "Drift into …" ends 5 of the 23 posts, and "Step into / out onto …" 5:
  different sentences, so not recorded, but a family the eye notices.
- Sen's offer plan kept 5 posts: the model gave one post the type "surf",
  which code drops, and made 3 offer posts (`type offer used 3 times`).
- Svarga's post 3 says IDR 300k in its caption and IDR 280k in its story
  text.
- Most captions are one paragraph, so 2.13's first-line warning still fires
  on them.

## RED

```
 Tests  8 failed | 29 passed (37)
```

(`posts-prompt.test.ts`, before the prompt change.) The replay check, run on
Svarga's old `posts-10` offer recording, failed with `last sentence "Wake up
light tomorrow." in post-1, post-2, post-3, post-4, post-5, post-6`.

The stop before an emoji, before the code: 14 new tests failed
(`posts-emoji`, `posts-checks`, `posts-variety`), and with the rule turned
off, the replay failed on `sen (offer: false)`, `sen (offer: true)` and
`svarga (offer: true)`, the three recordings that hold ". 🌸".

```
 Tests  1 failed | 63 passed (64)
```

(`posts-checks.test.ts`, the stopless offer line in a rewrite: the hook
was lost.)

## GREEN

```
 Tests  13 passed (13)
```

(`posts-fixtures-replay.test.ts`, on the four `posts-11` recordings.)

```
 Tests  1 failed | 1614 passed (1615)
```

(`pnpm test`, after the stop before an emoji; the one failure is the
karsa-spa brand-replay timeout above.)
