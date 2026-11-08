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
- 2026-11-08: a fresh reviewer read the whole branch: no critical issue.
  Fixed: a duration a highlight or the promise gives no longer gets the
  owner's duration warning (the spec amended, approved; 2.2's rule gets a
  dated note); a stop a lower-case word follows no longer ends the hook
  ("Open until 11 p.m. tonight"); the test Task 5 carried (a price in the
  first sentence, so the next one is the hook) is back. The smaller findings
  are under "Deferred minors".

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

The final review's fixes, `pnpm exec vitest run tests/unit/posts-hook-line.test.ts tests/unit/posts-checks.test.ts`, then `tests/unit/posts-checks.test.ts`:

```
      Tests  1 failed | 91 passed (92)
      Tests  2 failed | 84 passed (86)
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

After the final review's fixes, `pnpm check`, then `pnpm test:e2e`:

```
      Tests  1711 passed (1711)
  1 skipped
  64 passed (25.5s)
```

## Rulings

Calls the developer made without asking, each with its cost if wrong.

- Task 1: three new tests (same seed, lights as before, the image never sees the hook) are regression guards that pass before the change — they pin what the change must keep — cost if wrong: none
- Task 2: the plan's list of stale tests missed two pinned to posts-11 ("the user text lists the set-ups in order, before the offer" expected the set-ups to end the text; posts-run expected promptVersion posts-11) — updated both to the spec (### Hooks after the set-ups; posts-12) — cost if wrong: none, the tests follow the spec
- Task 2: the story guard "Replies in about 5 minutes 🌸" passes before the change by design — it pins 2.13's cleanup keeping a highlight said without its words — cost if wrong: none
- Task 3: run Tasks 4, 6, 7 and 8 before Tasks 3 and 5 — the maintainer said not yet to recording (2026-11-07: they are rebuilding the Sen and Svarga sites, and want the therapists' look and clothes in the next posts) — cost if wrong: none, the four tasks share nothing with the recordings
- Task 4: an emoji ends the hook only when a new sentence starts after it (a capital letter or a digit) — the brief's "first emoji after a letter" would split "Frangipani 🌸 petals on the tray." mid-sentence, and the spec speaks of the first sentence — cost if wrong: a hook whose next sentence starts in lower case stays on its line with it
- Task 4: ten tests asserted one-block captions (four under "no stop before an emoji", six under "the special offer") — updated to the spec's blank line after the hook; "flags quote the text without it" now builds one long sentence so the firstLine flag still fires — cost if wrong: none, they follow the spec
- Task 4: hookOnItsLine runs on the shown caption, after offerStory, so the offer story's flower lookup reads the caption as before; still after spaCaption and before dropStopsBeforeEmoji — cost if wrong: none
- Task 4: the applyEdit guard passes before the change by design (owner edits never go through checkedWords) — cost if wrong: none
- Task 6: the brief lists Nusa Dua with Indonesia's extra places, but BALI_PLACES already holds it — listed once — cost if wrong: none
- Task 7: applyCta leaves a post as it is when the profile has no WhatsApp (postCta null), and keep and saveEdit still skip it then — as before, removing the number never blanks the saved lines — cost if wrong: none, it keeps 2.5's behaviour
- Task 7: the posts screen's stale effect now depends on the profile too (each post's line comes from it); it only sets state when a copied post's line differs, so it can't loop — cost if wrong: an extra effect run per profile change
- Task 8: a place symbol also goes by its leading capitalised words when there are two or more ("My Khe" for "My Khe beach at dusk"), not by the brief's "without its last word" — that rule gives "My Khe beach at" for the helper's symbol and "Marble" or "Lady" alone for Sen's real ones — cost if wrong: a caption naming part of a symbol gets a record (records only)
- Task 8: "coconut oil counts" holds as a place symbol, as Svarga's read profile lists it; the test profile sets it so — cost if wrong: none
- Task 8: a profile with no place at all gets no "names no place" record: nothing to name — cost if wrong: none
- Task 8: the replay check "no question hooks" moves to Task 3 — posts-11's recordings asked for "a question or a promise" and fail it (sen, svarga, svarga with offer); it can only hold on posts-12 recordings — cost if wrong: none if Task 3 adds it (TODO in Task 3)
- Merge: develop (2.17, 2.17b) merged in on 2026-11-08 at the user's request — the prompt keeps 2.15's rules and takes 2.17b's two posts (post 1 an offer post, post 2 another type; both offer posts with an offer) and its "- Never a price, in a caption or a story text." line, which replaces 2.15's "Never a price, anywhere."; "each highlight once at most in the six" became "never the same highlight twice"; the version is posts-13, since posts-12 is 2.17b's prompt in production — cost if wrong: a prompt wording, before any posts-13 recording
- Merge: hook styles for two set-ups — none with an offer (both posts open on its line), otherwise two different styles; the hook tests now count two; the merged deal equals develop's apart from hooks (10 seeds, both spas, with and without an offer) — cost if wrong: a test's wording
- Merge: develop's "an offer post and another: nothing recorded on the mix" test had both captions open on a question, which 2.15 records under mix; its second caption now opens otherwise — cost if wrong: a test's wording
- Merge: Task 5 (priced sentences) is superseded by 2.17b's withoutPrices on every caption and story text, and won't be built — cost if wrong: a price 2.17b misses, to add later
- Final: the duration flag on a highlight's "5 minutes" is Important (the owner is told to doubt their own site's fact) but 2.2's spec says a duration must match an offering's — fixed only after a spec amendment the maintainer approves — cost if wrong: one more approval round
- Final: 6f79c32 (eval --replay, AGENTS.md row) landed while the spec was draft for an unrelated line; the work was Task 9 of the plan approved before — cost if wrong: none, noted to the maintainer
- Final: pasted blank lines on Instagram — Instagram keeps a caption's line breaks; nothing to change — cost if wrong: the hook break doesn't show
- Final: an offer post shows its end date until the Pacific-day reset after the offer ends — 2.13b's, unchanged here — cost if wrong: an ended date on a post the owner copies late
- Final: a rewrite with a pruned offer computes its line from the batch's offer until applyCta runs — display and copy agree; 2.11's semantics — cost if wrong: none seen
- Final: translations may drop the hook's blank line — the owner reads them, never posts them — cost if wrong: a translation without the break
- Final: "Rest easy knowing experienced local therapists…" across attempts — repeats across attempts are a stated Known limit — cost if wrong: a repeated ending across a day
- Final: endings copy highlights word for word — the spec asks for them as the profile gives them — cost if wrong: none
- Final: e2e not run — no e2e asserts the cta or copy texts, and the unit suite covers the screen change — cost if wrong: a phone-test failure caught on the PR (since run before the push: 64 passed, 1 skipped, the skip older than this branch)
- Final: firstLine flags never reach the owner — by design since 2.2 — cost if wrong: none
- Final: the ASKS pattern misses "Book tonight", "Reserve your spot" — records only, the developer's call — cost if wrong: an unrecorded ask
- Final: a caption cut to 700 can end at 701 after the hook's break — Instagram allows 2,200 — cost if wrong: none

## Deferred minors

From the final review, left for later:

- foreign-tag matching drops honest tags holding a short place name ("herbalist", "steamedtowels")
- three slightly different "an emoji ends a sentence" rules (story.ts, withoutPrices, hook-line); none handles a skin-tone modifier
- "Danang" written as one word doesn't count as "Da Nang" in the places record
- "Bali" alone counts as a place (by the spec's town-or-area rule), though any Bali spa can write it
- spec line on the firstLine flag "fires on every caption" is stale; eval --replay prints today's prompt version and model, not the recording's
