# Reasons to book: journal

## Calls made along the way

- 2026-11-23: the builder's check on the spec asked two questions, both
  settled by the developer in the spec: a copied sample is caught by the
  samples' own listed phrases and Maré's places, never by whole sentences or
  runs of words, since "Just landed?" and "we come to you tonight" are what
  the reasons ask for; and the eval sends made-up recent posts to steer the
  deal, so the recordings show every reason and the hours at least once.
- 2026-11-23: the maintainer asked, while approving the plan, to keep the
  images, posts and stories on the phone for two days instead of clearing
  them every day, on this branch too. It needs its own spec before any code
  (AGENTS.md, hard rule 1), written once this plan's code is in.
- 2026-11-23: the eval and the replay steer the deal with made-up recent
  posts (`fixtureRecent`): Sen's plan after a laptop post (two of you, the
  first night with the hours), Svarga's plan unsteered (a day out, laptop
  days), Sen's offer plan after a staying-in post (laptop days, a day out),
  Svarga's after a laptop post (staying in, the first night). New texts take
  a seeded fact, the same on a replay.
- 2026-11-23: replayed through `posts-19`'s deal and checks, the `posts-18`
  recordings get the new records the maintainer's complaint describes:
  "question in the first person" on Sen's "Can a therapist come to my hotel
  room tonight?" and Svarga's "Can someone come to my villa tonight…",
  and `"professional therapeutic massage only"` on Sen's post 2.
- 2026-11-23: the first-person record treats a capitalised name after
  "My" ("My Khe", "Mỹ Khê", "My Son") and "US" in capitals as names: Sen's
  own beach made the record fire on "Sore shoulders after a surf at My Khe?".
- 2026-11-23: for a business that comes to its guests, code sets each post's
  type before the checks (post 1 offer, post 2 moment, both offer with an
  offer), so a type the model invents no longer drops a post on that path.
- 2026-11-23: the review of the whole branch (fresh reviewer): ready with
  fixes, none critical. Fixed: a post saved before this spec reached the
  posts-19 caption update and new texts with its posts-18 type, topic and
  kind of question ("tip", "Drink water after your massage", "ask"); it now
  goes with its reason only, its kind of question dropped, and the posts-19
  prompts no longer ask to keep a type or a topic. Fixed: new texts never
  take the other post's fact, as the plan says. Ten minor findings are
  deferred and listed in the PR.
- 2026-11-23, after the branch was pushed: the maintainer's verdict on the
  second recordings (below). The spec is amended ("Amended after the second
  recordings") and back to draft, for approval; `posts-19` keeps its name,
  as with the first amendment, since it never shipped.
- 2026-11-23, the merge with develop, after the approval: develop's roadmap
  2.23 is `posts/normal-bodies` (#65), so reasons to book becomes 2.24 and
  two days 2.25. Normal bodies named its set-ups' change `posts-19`, so this
  spec's prompt ships as `posts-20` (the version names only: no word of
  either prompt changed at the merge). The second recordings stay
  `posts-19` until recorded again. Thai now fixes two parts, the legs and
  the back, where it fixed the whole body: Task 14 makes them follow the
  reason.

## RED

Task 1: `Tests  4 failed | 95 passed (99)` (`Test Files  4 failed (4)`: no
`lib/posts/reasons.ts`, no reason in the set-up or the recent posts)

Task 14 (Thai's two parts): `Tests  1 failed | 21 passed (22)` (a laptop
set-up with `legs`)

Task 15 (the hours in words): `posts-hours.test.ts` failed to load (no
`lib/posts/hours.ts`); `posts-facts.test.ts`, 3 failed (the fact still
`Hours: …`)

Task 16 (guests and therapists): `Tests  3 failed | 13 passed (16)`

Task 17 (the new rules): `Tests  4 failed | 16 passed (20)`

Task 18 (record 6): `Tests  1 failed | 15 passed (16)`

The review's fixes (hours that skip a day, times with seconds, the
facts-only rule): `Tests  13 failed | 44 passed (57)`

After the first `posts-20` runs (twoOfYou's question, the set-up's treatment
and part): `Tests  5 failed | 15 passed (20)`

## GREEN

Task 9, `pnpm check`: `Test Files  134 passed (134)`, `Tests  2247 passed (2247)`

Task 9, `pnpm test:e2e` (on port 3101 with a scratch config: another
project held 3000; the first build stopped on Next.js's security notice and
the second ran): `73 passed (21.7s)`, `1 skipped`

Tasks 14 to 18: `Tests  22 passed (22)`, `Tests  57 passed (57)`, then the
whole suite after each: `Tests  2323 passed (2323)`, `2326`, `2330`,
`2332`

The review's fixes: `Tests  57 passed (57)`; the suite `Tests  2347 passed
(2347)`

After the first `posts-20` runs: `Tests  99 passed (99)`; the suite `Test
Files  135 passed (135)`, `Tests  2347 passed (2347)`

`pnpm test:e2e` on port 3117, after the merge, the fixes and the flag:
`73 passed (26.2s)`, `1 skipped`

## Evaluation

### First `posts-19` recordings (2026-11-23)

Recorded with the maintainer's go-ahead: `pnpm eval:posts sen svarga
--record`, `--offer --record` and `--new-texts --record`, 6 Flash-Lite
requests, each `posts eval: 2/2 made · prompt posts-19 · model
gemini-3.5-flash-lite`. Paragraphs split by " / ":

**Sen, without an offer**

1. `twoOfYou`, day, Couple Massage: "Massage for two, side by side, in your
   My Khe hotel room? 🌸" / "Two therapists come to you, one for each of
   you. You are both done at the same time, with the afternoon still
   ahead." / "Trained local Vietnamese therapists 🌺". Story: "Two of you,
   two therapists, one room 🌸" (the sample's).
2. `firstNight`, night, Thai Massage: "Legs heavy from the long flight into
   Da Nang? 🪷" / "Your therapist comes to your room tonight and stretches
   your tight muscles. Then a shower, and you are in bed." / "Hours: Mo-Su
   08:30-23:00 🌺" (the model copied the line, it didn't say it in words).
   Story: "Just landed? We bring the massage to your hotel 🪷" (the
   sample's).

**Svarga, without an offer**

1. `dayOut`, day, Surf & Sport Recovery: "Legs heavy from the long surf
   session at Echo Beach? 🌸" / "A therapist comes to your Canggu villa to
   work your calves and feet. You stay right where you are for the rest of
   the afternoon." / "No upfront deposit for villas and hotels 🌺". Story:
   "Echo Beach surf in your legs? We come to you today 🌸" (11 words).
2. `laptop`, night, Balinese Lulur Scrub: "A week of laptop work, and now your
   neck won't turn? 🌺" (the sample's, one word changed) / "A therapist
   brings a full scrub and massage to your Seminyak apartment tonight. You
   rest your arms while the turmeric and rice powder work." / "Fresh linens,
   towels, and natural oils brought to you 🪷".

**Sen, with the offer**: the offer line / "A week of laptop calls, and now
your neck won't turn? Your therapist comes to your An Thuong hotel room to
work your neck and shoulders loose." (the sample's question, word for word)
/ "Free travel in our core areas"; the offer line / "Legs heavy from
climbing the Marble Mountains today? A therapist comes to your Da Nang villa
with assisted stretches to open your stiff legs." / "Linens, towels and oils
included".

**Svarga, with the offer**: the offer line / "Rain outside your Canggu
villa and neither of you wants to go out? A therapist comes straight to your
room with warm coconut oil and fresh linens." / "No upfront deposit for
villas and hotels"; the offer line / "Back stiff from the long flight into
Bali? Two therapists come to your Seminyak hotel tonight to work in step
across your legs before you sleep." (the sample's shape) / "WhatsApp replies
in ~5 mins".

**New texts**: Sen's two-of-you post became "Side by side with your friend
in your An Thuong villa this afternoon? 🌸" with "No upfront deposit
required"; Svarga's day out, "Calves tired from the hike up the Pererenan
rice fields? 🌸" with its experience as the fact.

| Check | posts-18 | posts-19, first run |
|---|---|---|
| The question speaks to the guest about its reason, never in the first person | 4 of 8 | 8 of 8 |
| The answer says what the guest gets and how easy it is | to judge | 8 of 8 |
| The fact removes a doubt; none turns a request away | 7 of 8 | 8 of 8 |
| No advice, no tip | 8 of 8 | 8 of 8 |
| No sample copied | none to copy | 4 of 8 (code's record); 7 of 8 by eye |
| The story text names the moment and says the business comes, offer posts aside | to judge | 4 of 4 (2 copied, 1 of 11 words) |

Not a pass: the copy check fails. The model lifts the sample of its own
reason, its question above all. The developer proposed (the spec's
amendment of 2026-11-23) to show only the samples of the other reasons, and
to record again.

### Second `posts-19` recordings (2026-11-23), after the amendment

The samples amendment changed `posts-19`'s prompt after the first run, which
never shipped: the shipped `posts-19` is this one. Recorded with the
amendment's go-ahead, the same three commands; Sen's offer plan hit a 503 and
Svarga's new texts a cut answer (finish "other"), each run again once: 8
Flash-Lite requests in all.

**Sen, without an offer**: `twoOfYou`, "Both ready to rest together after
exploring My Khe beach? 🌸" / "We send two therapists to your hotel room for
a Couple Massage. You lie side by side, and your shoulders and neck are
worked loose." / "Trained local Vietnamese therapists"; story "Ready to rest
together? A Couple Massage in your room". `firstNight`, "A stiff back and
legs after your long flight? 🌷" / "Tonight a therapist comes to your Da
Nang villa for a Thai Massage. You wear comfortable clothes while she
stretches your body." / "Hours: Mo-Su 08:30-23:00" (the line copied, not
said in words); story "Flight in your back and legs? We come to you
tonight" (11 words).

**Svarga, without an offer**: `dayOut`, "Sore legs after your surf session
at Echo Beach? 🌺" / "Our therapist comes to your Canggu villa with a Surf and
Sport Recovery Massage. You rest on your bed while we work out the tightness
so your afternoon stays easy." / "No upfront deposit for villas and hotels";
story "Sore legs from surfing? Recovery massage in your room". `laptop`,
"Stiff arms and hands after days of work on your laptop in Seminyak? 🌸" /
"Our therapist brings a Balinese Lulur Scrub and Massage directly to your
room. You stay right where you are while the warm scrub and oils loosen the
screen tension." / "Fresh linens, towels, and natural oils brought to you";
story "Laptop days? Lulur scrub and massage in your room".

**Sen, with the offer**: `laptop`, the line / "Stiff neck and shoulders from
laptop days in your An Thuong apartment? Two therapists come to your room
for a traditional massage, and you relax while the tension fades away." (two
therapists, though its set-up has one) / "Free travel in our core areas".
`dayOut`, the line / "Aching legs after climbing the Marble Mountains today?
A therapist brings comfortable mats to your My Khe hotel room, and you
stretch out with the afternoon still ahead." / "Linens, towels and oils
included".

**Svarga, with the offer**: `stayIn`, the line / "It is pouring outside and
you'd rather stay in your Canggu villa tonight? A therapist comes right to
your door and works your sore muscles while you rest." / "No upfront deposit
for villas and hotels". `firstNight`, the line / "Stiff legs and a tired back
from your long flight to Bali? Two therapists come to your Seminyak hotel
tonight to work your whole body at once." (four hands) / "WhatsApp replies in
~5 mins".

**New texts**: Sen's two-of-you post, "Both tired of resting alone when you
could share this afternoon? 🌸" (awkward) with "No upfront deposit
required"; Svarga's day out, "Tired feet from walking the rice terraces in
Pererenan today? 🌸" (its image works on the legs) with Foot Reflexology
named in place of its set-up's treatment.

| Check | posts-18 | first run | second run |
|---|---|---|---|
| The question speaks to the guest about its reason, never in the first person | 4 of 8 | 8 of 8 | 8 of 8 |
| The answer says what the guest gets and how easy it is | to judge | 8 of 8 | 8 of 8 |
| The fact removes a doubt; none turns a request away | 7 of 8 | 8 of 8 | 8 of 8 |
| No advice, no tip | 8 of 8 | 8 of 8 | 8 of 8 |
| No sample copied (code's record) | none to copy | 4 of 8 copy | 1 of 8 copies ("you lie side by side", from the staying-in sample, on a couple massage) |
| The story text names the moment and says the business comes, offer posts aside | to judge | 4 of 4 | 4 of 4 (one of 11 words) |

The copy check still fails on one phrase, so the replay test leaves the copy
assertion out, for the maintainer to decide. Seen besides: one post names two
therapists where its image has one, the hours fact is the raw line, four
answers have a sentence of 16 to 20 words, and one new-texts hook reads
awkwardly. The maintainer's verdict follows.

**The maintainer's verdict** (2026-11-23), on the three faults listed with
the second run (two therapists on an image of one, the raw hours line, the
awkward new-texts hook): "Did you fix this ?". Not as they are: the
second amendment answers them, and the plans and new texts are recorded
again.


### Third recordings, `posts-20` (2026-11-23), after the second amendment

Google's Flash-Lite was overloaded all evening: most calls came back with a
503 ("high demand") or a stream cut before its end, which the app reads as
finish "other" (6 to 520 tokens out). A diagnostic call with Google's raw
chunks showed the cut streams carry no finish reason and no token count, and
a café's plan (`phin-coffee`, `posts-19`) was cut the same way in 2 of 3
calls: Google's side, not the prompt. The recordings retried in a loop, at
most 5 tries each, 2½ minutes apart: about 60 Flash-Lite requests in all, a
few cents on the prepaid key.

**The first `posts-20` runs** (3 of 6 made, not kept): Sen's two-of-you new
texts opened on "Another moment the two of you share after exploring Dragon
Bridge together? 🌸", the prompt's own words ("ask after another moment the
two share"); the plan's on "Both sharing a day at My Khe Beach, and now you
want to rest together? 🌸" (15 words); Svarga's new texts named Deep Tissue
Tension Release and tight shoulders on its Surf & Sport Recovery image of the
back. Fixed (08e3309): twoOfYou's question is built like dayOut's, for both
of them; no "another moment"; caption updates and new texts get the set-up's
treatment and part of the body. Recorded again.

**Sen, without an offer**: `twoOfYou`, "Both of you tired after walking the
Marble Mountains today? 🌸" / "Two therapists come to your An Thuong hotel
room for a Couple Massage. You lie side by side, and your shoulders and backs
relax together." / "Trained local Vietnamese therapists"; story "Marble
Mountains in your legs? A Couple Massage for both of you today" (13 words).
`firstNight`, "A stiff back from your long flight into Da Nang? 🌸" / "A
therapist comes to your hotel room tonight for a traditional Thai massage.
You lie on a mattress in loose clothes, and she stretches your stiff back." /
"Open every day until 11 pm"; story "Flight stiffness in your back? A
therapist comes to you tonight" (11 words).

**Svarga, without an offer**: `dayOut`, "Tired legs after surfing the waves at
Echo Beach? 🌺" / "A therapist comes to your Canggu villa for a Surf & Sport
Recovery Massage. Your muscles loosen while you relax in your own room with
the afternoon ahead." / "No upfront deposit for villas and hotels" (the
legs, where its image works on the back); story "Tired legs after surfing?
Massage in your room". `laptop`, "Stiff arms and hands from days of work on
your laptop in Seminyak? 🪷" / "A therapist brings a Balinese Lulur Scrub &
Massage straight to your hotel room tonight. You rest easy as the scrub
smooths your skin." / "Fresh linens, towels, and natural oils brought to
you"; story "Laptop days? A scrub and massage in your room".

**Svarga, with the offer**: `stayIn`, the line / "Rain outside your Seminyak
villa and you prefer to stay in? A therapist comes to your room and works your
arms and hands." / "No upfront deposit for villas and hotels". `firstNight`,
on the Four-Hands Massage, the line / "Is a long flight still sitting stiff
in your legs? Two therapists come to your Canggu room and work your legs in
sync." / "WhatsApp replies in ~5 mins".

**Sen, with the offer**: `laptop`, the line / "Stiff neck after days of work
on your laptop in your An Thuong apartment? A therapist comes to your room,
and the tension in your shoulders eases for the rest of your evening." /
"Free travel in our core areas": one therapist now, where the second run said
"Two therapists", but the neck and shoulders where its image works on the
arms and hands. `dayOut`, on the Thai Massage's leg stretch, the line /
"Tired legs after climbing the Marble Mountains today? A therapist comes to
your Non Nuoc villa, and your legs feel light for the rest of your
afternoon." / "Linens, towels and oils included".

**New texts**: Sen's two-of-you post, "Both of you stiff after climbing the
Marble Mountains today? 🌸" / "Two therapists arrive at your An Thuong hotel
room for a Couple Massage. You lie side by side while they work your
shoulders and neck loose." / "No upfront deposit required". Svarga's day out,
"Sore back after catching waves at Echo Beach this afternoon? 🌺", now the
part its image shows, with its own Surf & Sport Recovery Massage; its second
sentence is the plan's, one word changed.

| Check | second run | third run |
|---|---|---|
| The question speaks to the guest about its reason, never in the first person | 8 of 8 | 8 of 8 |
| "Two therapists" only on an image of two (record 6) | 7 of 8 | 8 of 8 |
| The hours fact in words, never the raw line | 0 of 1 | 1 of 1 |
| The two-of-you question names both of them and their day out, in plain words | 0 of 2 (plan and new texts) | 2 of 2 |
| The caption names its image's treatment and part of the body | 7 of 8, new texts 1 of 2 | 6 of 8 (the surf day's legs on a back, the laptop offer's neck on arms and hands), new texts 2 of 2 |
| No sample copied (code's record) | 1 of 8 | 1 of 8 ("you lie side by side", on the couple massage; the new texts too) |
| Story texts of 10 words at most, offer posts aside | 3 of 4 | 2 of 4 (13 and 11 words) |

The maintainer's three faults are gone from these recordings. Seen besides:
two posts name another part of the body than their image, four answers
still have a sentence of 19 or 20 words, and two story texts run past 10
words. The maintainer's verdict follows.
