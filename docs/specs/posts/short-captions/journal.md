# Short captions: journal

## Calls made along the way

- 2026-11-10: the maintainer skipped the questions ("Just start"). The spec's
  calls are the developer's, each marked in the spec, and the maintainer
  approved it as written.
- 2026-11-10: code's cut moved after the paragraph limit, so a caption of
  five paragraphs keeps its last one, the one that answers a doubt. A spa's
  caption that loses its only flower to the limit or the cut gets one back
  at its end, which can take it 2 characters past 400.
- 2026-11-10: four 2.15 tests of code's records had "calm" or "quiet" in
  their captions, which the setting record now catches. Their words changed
  (loose, firm, nights, busy), so each still tests its own record.
- 2026-11-10: replayed through today's checks, with no request, the
  `posts-14` recordings keep three paragraphs at most. Svarga's moment
  caption, 428 characters, is cut at 400 to two paragraphs. No older test
  needed a change.
- 2026-11-10: first `posts-15` run, with the maintainer's yes for 4 requests.
  Svarga's plan and both offer plans came back; Sen's plan without an offer
  failed with `model_busy` (Google's 503, "high demand"). The model wrote four
  paragraphs on 4 of the 6 captions, and code dropped the third, once the
  one that named Canggu. Svarga's first offer caption ran to 326 characters.
  The maintainer chose to fix the prompt and record all 4 again: the plan's
  shapes now say the exact paragraphs, each caption names its place in its
  hook or the paragraph after it, and the length counts the hook.
- 2026-11-10: second run. Nothing was dropped: every caption had its exact
  paragraphs, 136 to 285 characters, a real place in all 8, and no setting.
  But only 4 of 8 kept every sentence to 15 words (up to 23), only 4 of 8
  ended on a guest's doubt (all four post 2s, a single sentence after the
  hook), and Sen's post 1 lost its story text: "Book sixty minutes of deep
  tissue tension release on WhatsApp." went whole, as 2.13 removes a story
  sentence that asks to book. Sen's plan without an offer failed once more,
  with `model_failed` (a `SyntaxError`), before a retry recorded it. The
  maintainer chose to tighten once more: post 2's paragraph holds two short
  sentences, what the massage does and its ending, and each sentence holds
  one idea.
- 2026-11-10: third run. Both plans without an offer came back. With the
  offer, Sen's failed with `model_failed` (a `SyntaxError`) twice and
  Svarga's once with `model_busy`, before a retry recorded Svarga's. The run's
  error line now says why an answer that isn't the JSON asked for stopped, and
  its length in tokens (never its words). One more call, to read it, recorded
  Sen's offer plan in 3 seconds. Over the three runs, Sen's plan failed with a
  `SyntaxError` on 3 of its 9 calls and Svarga's on none of its 7: 16 calls in
  all, 2 of them `model_busy`. The cause of the `SyntaxError` is still
  unknown.
- 2026-11-10: Svarga's plan without an offer lost post 1's story text: "Book a
  traditional 60 min massage in your villa today 🌸" went whole, as 2.13 asks.
  The replay test now accepts a post without a story text only when code
  recorded removing it.
- 2026-11-10: the prompt stays `posts-15` through the three runs: no
  recording of an earlier draft was kept, and the spec names `posts-15`.
- 2026-11-10: the eval reads the AI key from `.env.local`, copied from the
  worktree the `posts-14` recordings used. It stays out of git.

## Evaluation

`posts-15`, replayed with `pnpm eval:posts sen svarga --replay` and
`--replay --offer`, no request: each caption as code leaves it, its
paragraphs split by " / ".

**Sen, without an offer**

1. offer, `promise`: "Your shoulders and lower back drop all their weight
   into the table 🌺" / "Trained local therapists bring professional relief
   straight to your room in Da Nang for sixty calming minutes." / "Linens,
   towels and warm oils are all included for your ease." 3 paragraphs, 243
   characters, longest sentence 17 words.
2. moment, `scene`: "Salt on your skin and tired shoulders after a long
   surf at My Khe 🌸" / "Slow pressure loosens heavy legs and paddling arms
   right where you stay." 2, 142, 14.

**Svarga, without an offer**

1. offer, `question`: "How does your body feel today? 🌸" / "Long strokes
   and gentle stretches loosen tight shoulders in your Canggu villa." /
   "Experienced local therapists bring fresh linens and warm coconut oil."
   3, 184, 12. No story text (above).
2. tip, `scene`: "A long walk through Seminyak leaves tired feet aching." /
   "Firm pressure on reflex points relaxes your calves." / "Drink water after
   your massage to keep your body refreshed 🌺" 3, 170, 10.

**Sen, with the offer**

1. "10% off our 90-minute Vietnamese Traditional Massage, until Sunday 1
   November." / "Erase tight shoulders and sore muscles right here in Da
   Nang without leaving your hotel room." / "Free travel in our core areas
   with trained local therapists 🌸" 3, 237, 16.
2. "10% off our 90-minute Thai Massage, until Sunday 1 November." / "Open
   stiff hips and legs with assisted stretches in your Da Nang room 🌺" 2,
   134, 13.

**Svarga, with the offer**

1. "10% off our 90-minute Traditional Balinese Massage, until Sunday 1
   November." / "Long strokes and warm coconut oil ease tired muscles right
   in your Canggu villa." / "Experienced local therapists bring full care to
   you 🌸" 3, 214, 14.
2. "10% off our 90-minute Four-Hands Massage, until Sunday 1 November." /
   "Two therapists work in step to calm your whole body at once in
   Pererenan. Fresh linens and free travel complete your afternoon 🌺" 2,
   197, 14.

Code's records: no paragraph dropped on any of the 8. Long sentences on Sen's
post 1 (17 words) and its offer post 1 (16). The setting record fired on
"linens" in 3 captions, where it is a highlight of both spas, and on "calm" in
"to calm your whole body": none describes a setting. "Names no place" on both
of Svarga's post 2s, which name Seminyak and Pererenan: 2.15's record doesn't
split the parentheses of Svarga's new service area ("Seminyak (Petitenget, …").

The checks, on the 8 captions (the developer's scores):

| Check | posts-14 | posts-15 |
|---|---|---|
| At most three paragraphs, the hook counted | 3 of 8 | 8 of 8 |
| At most 300 characters before the WhatsApp line | 2 of 8 | 8 of 8: 134 to 243 |
| No sentence over 15 words | 1 of 8 | 6 of 8 |
| Doesn't describe the setting | 4 of 8 | 8 of 8 |
| Names a real place of the business | 6 of 8 | 8 of 8 |
| Ends by answering a guest's doubt | 7 of 8 | 5 of 8; 6 with Svarga's tip, which ends on its tip as 2.15 asks |

Verdict: the first four checks pass, the third at its mark of 6, and so does
the place check. The doubt check does worse than `posts-14`: Sen's two post 2s
keep one sentence after their hook, where the prompt asks for two, the second
its ending. Not a full pass: the maintainer decides.

## RED

Task 1, the paragraph limit:

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, every caption held to three:

```
 Test Files  1 failed | 1 passed (2)
      Tests  7 failed | 91 passed (98)
```

Task 3, the records:

```
 Test Files  1 failed (1)
      Tests  4 failed | 20 passed (24)
```

Task 4, the prompt:

```
 Test Files  1 failed (1)
      Tests  19 failed | 42 passed (61)
```

Task 5, the exact paragraphs, then the tighter post 2:

```
 Test Files  1 failed (1)
      Tests  5 failed | 56 passed (61)
```

```
 Test Files  1 failed (1)
      Tests  5 failed | 56 passed (61)
```

## GREEN

Task 1: `Tests  4 passed (4)`. Task 2: `Tests  98 passed (98)`. Task 3:
`Tests  24 passed (24)`. Task 4 and both prompt changes of Task 5:
`Tests  61 passed (61)`.

`pnpm check`, after Task 4:

```
 Test Files  113 passed (113)
      Tests  1812 passed (1812)
```

`pnpm check`, with the `posts-15` recordings:

```
 Test Files  113 passed (113)
      Tests  1814 passed (1814)
```

## Deferred

- 2.15's places record doesn't split the parentheses in Svarga's new service
  area, so "Seminyak" and "Pererenan" count as no place. Records only.
- The setting list's "linen" and "linens" fire on a highlight both spas give.
  Records only.
- A story text that opens on "Book" still goes whole (2.13), leaving the post
  with none: 1 of 8 here, as in `posts-13`.
