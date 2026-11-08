# Marketing copy: journal

## Calls made along the way

- 2026-11-07: the maintainer paused the recordings while rebuilding Sen's and
  Svarga's sites, so Tasks 4, 6, 7 and 8 ran before Task 3.
- 2026-11-07: a hook ends at an emoji only when a new sentence starts after
  it: "Frangipani 🌸 petals on the tray." stays one sentence.
- 2026-11-07: the rewrite prompt gets the type jobs too, and a story text
  that says a highlight without 2.13's words ("Replies in about 5 minutes
  🌸") keeps it.
- 2026-11-07: the check that no plan has two question hooks waited for new
  recordings: `posts-11` asked for "a question or a promise", and its
  recordings fail it.
- 2026-11-08: `develop` merged in at the maintainer's request, with 2.17 (two
  images an attempt) and 2.17b (two suggestions an attempt, never a price).
  The prompt keeps this item's rules for two posts and became `posts-13`,
  since 2.17b's prompt is `posts-12`. 2.17b's removal of every price replaces
  this item's own (Task 5, not built). The spec was amended for two posts and
  approved.
- 2026-11-08: the recordings use the saved copies of the old sites, as
  `posts-11`'s did, so the comparison is fair. The app reads each spa's live
  site; these plans only test the prompt.
- 2026-11-08: `posts-13` recorded with the maintainer's yes. Sen's first call
  without an offer failed with `model_failed`, its cause unknown: the eval
  printed none, and now prints the run's logged error. One more call, with
  the maintainer's yes, recorded it.
- 2026-11-08: `posts-13` named a real place in 1 caption of 8, gave both
  captions of each plan one shape, and lost a story text: "Rest your feet
  this evening 🌺 Book in your villa." went whole, as one sentence holding
  "Book". The maintainer asked for fixes. The spec was amended: each caption
  names a real place, its town or area, a place it serves or a landmark; a
  flower, a plant, an oil or an object is never a place (the maintainer);
  post 1 gets two paragraphs after its hook and post 2 three; a story
  sentence also ends at an emoji a new one follows. Approved, built,
  `posts-14`.
- 2026-11-08: `posts-14` recorded with the maintainer's yes, 4 requests, one
  run each. Sen's plan without an offer names no place, Svarga's two captions
  share a shape, and one of its hooks runs to 136 characters. The maintainer
  accepted the recordings; the replay check now wants a hook over 125
  characters flagged, and the spec says so.

## Evaluation

`posts-14`, replayed with `pnpm eval:posts sen svarga --replay` and
`--replay --offer`, no request. Each post: its dealt hook style, its first
line, its last sentence, its story text, its hashtags; then code's records.

**Sen, without an offer**

1. offer, `promise`: "Your body will feel light and free from knots after a
   sixty minute session right in your room 🌸". Ends: "Enjoy the convenience
   of professional care delivered directly to your door with no upfront
   deposit needed." Story: "Sixty minutes of deep tissue relief delivered
   straight to your room 🌸". #danang #deeptissue #massageindanang #wellness
2. moment, `scene`: "Paddling hard against the waves leaves your arms tired
   and your legs heavy 🌺". Ends: "Free travel in our core areas brings this
   care straight to your hotel or villa." Story: "Ease tired muscles after a
   surf at My Khe 🌺". #danang #mykhebeach #surfrecovery #spadanang

Records: post-1 names no place; post-2 names no place.

**Svarga, without an offer**

1. offer, `question`: "How does your body feel after a long day under the
   warm Bali sun? 🌸". Ends: "Familiar hands work through tension with
   smooth strokes while warm coconut oil softens the skin and eases every
   knot away." Story: "Sixty minutes of traditional relief right in your
   Canggu room 🌸". #canggu #balinesemassage #massagetcanggu
2. moment, `scene`: "Evening falls softly over the tropical garden while
   you lean back and let the quiet settle in after hours exploring the local
   streets 🌺", 136 characters, flagged `firstLine`. Ends: "Rest easy knowing
   experienced local therapists travel directly to your space with free
   transport across Canggu, Pererenan, Seminyak and Kerobokan." Story:
   "Quiet evening comfort waiting in your room 🌺". #canggu #balitravel
   #spainbali

Records: none.

**Sen, with the offer**: both posts open on their offer lines; post 1 names
Da Nang, post 2 My Khe beach. Ends: "No massage table needed 🌸"; "No upfront
deposit needed." Records: endings start with "No" in post-1, post-2.

**Svarga, with the offer**: both posts open on their offer lines; post 1
names Canggu and its service area, post 2 Seminyak. Ends: "Travel within
Canggu, Pererenan, Seminyak, and Kerobokan is free 🌸"; "WhatsApp replies in
about 5 minutes to set your time 🌸". Records: a flower added to each
caption.

The checks, on the posts without an offer (the developer's scores; `posts-11`
from the 2026-11-07 audit):

| Check | posts-11 | posts-13 | posts-14 |
|---|---|---|---|
| The hook lands a payoff, a tension or a number on its own | 6 of 12 | 3 of 4 | 3 of 4 |
| Short paragraphs, not a wall of text | 0 of 12 | 4 of 4 | 4 of 4 |
| Names a real place of the business | 1 of 12 | 0 of 4 | 2 of 4 |
| Answers a guest's doubt | 1 of 12 | 4 of 4 | 3 of 4 |
| No empty intensifier | 4 of 12 | 3 of 4 | 4 of 4 |
| No neat closing line that could close any post | 0 of 12 | 4 of 4 | 3 of 4 |
| The captions differ in shape | no: 12 of 12 one shape | no: both plans | Sen yes, Svarga no |
| The story text is more than a bare title | 6 of 12 | 2 of 4 | 4 of 4 |

With the offer, `posts-14` names a real place in all 4 captions (`posts-13`:
1 of 4).

Verdict: `posts-14` beats `posts-11` on every check but the shape check,
which Svarga's plan fails. Against the spec's success list, Sen's plan
without an offer names no place, and one hook is over 125 characters. Not a
full pass: the maintainer accepted the recordings (2026-11-08).

## RED

Tasks 1 to 8: their RED lines weren't copied at the time.

Task 10, `pnpm exec vitest run tests/unit/posts-variety.test.ts`:

```
      Tests  1 failed | 18 passed (19)
```

Task 11, `pnpm exec vitest run tests/unit/posts-story.test.ts tests/unit/posts-variety.test.ts tests/unit/posts-prompt.test.ts tests/unit/posts-run.test.ts`:

```
      Tests  10 failed | 113 passed (123)
```

## GREEN

Task 10, the posts tests:

```
      Tests  819 passed (819)
```

Task 11, the posts tests:

```
      Tests  821 passed (821)
```

`pnpm check`, with the `posts-14` recordings:

```
      Tests  1707 passed (1707)
```
