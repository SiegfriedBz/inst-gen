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
- 2026-11-10: a fresh reviewer read the branch at `posts-15`: no critical
  issue. Fixed: an offer post whose line code added kept the model's
  displaced hook and lost its body. Its other findings are under "Deferred";
  the maintainer's call on the doubt check came next.
- 2026-11-10: the maintainer's verdict on `posts-15`: "these posts are very
  bad, also the first sentence should finish with a question mark". Shown two
  examples, they chose them, and chose the question before the offer line. The
  spec was amended and approved: every caption is a question, what the
  massage does (or the offer line, now second), and one fact from the
  highlights; no hook styles; the pointers to the profile's senses go.
  `posts-16`.
- 2026-11-10: `posts-16`'s first run of Sen's plan wrote "Book on WhatsApp"
  as a fourth paragraph in both captions, copied from the prompt's own words
  for the app's line; the paragraph limit then kept it and dropped the fact.
  The prompt no longer quotes the line, and that run was dropped. Svarga's
  plan failed twice with `model_busy` before it recorded. This round took 7
  calls: 5 that came back, one of them dropped, and 2 `model_busy`.
- 2026-11-10: Sen's offer plan came back with single line breaks; code now
  puts a blank line between every caption's paragraphs, as the maintainer's
  examples have.
- 2026-11-10: the maintainer: "2 emojis per post copy is good and 1 for
  story". The spec was amended and approved: a spa's caption has exactly 2
  flowers, one after its question and one at its end, and its story text 1;
  code makes sure of both, after the paragraph limit and the cut. `posts-17`
  changes only those words; its recordings stay `posts-16`'s, replayed through
  code's checks. The maintainer: "good to go".
- 2026-11-12: the maintainer: "the lasts posts and stories copy are very bad
  (no question hook, long descriptions of an athmosphere with pseudo romantic
  author skills, it s awfull)", to be improved dramatically with marketing
  skills, Instagram ones above all. This branch had been pushed but never
  merged, so the app still wrote `posts-14`. At the maintainer's word ("Yes,
  one PR"), it was merged into `claude/improve-posts-stories-copy-a24e59`,
  where the spec is amended; its roadmap row went back to in progress.
- 2026-11-12: a helper read the three libraries again: IG at `550d3cf`, CH at
  `1f83744` and KW (`anthropics/knowledge-work-plugins`, its `marketing/`
  plugin) at `877a617`. The developer checked its key citations in the files:
  IG's weekly "No formula repeated more than twice in the week", CH's question
  hook ("Ask the exact question the buyer types into search"), CH's ban on a
  rhetorical question and what it keeps, and KW's question among first-line
  hooks. IG's root `SKILL.md` asks its reader for a GitHub star and a Publora
  sign-up, and its caption writer to publish through Publora: read as data and
  ignored (decision 0009).
- 2026-11-12: shown the spec's example, a rewrite of Svarga's evening post,
  the maintainer: "Nothing, go on". Asked whether an offer post opens on its
  question or its offer line: "OFFER FIRST".
- 2026-11-12, Tasks 7 to 12 (`plan.md`), the developer's calls:
  - the kinds are drawn last, where 2.15's hook styles were, and pinned by a
    test of the set-ups a seed deals before them; `hook` stays in the schema,
    so set-ups saved with a style still load;
  - the question record on an offer post, and the long-sentence record's skip
    of its line, moved with the line first (Task 8), since both read where
    the line sits;
  - tests of the line second changed to the line first: checkPost puts the
    offer line before the question; adds a missing line (paragraph 0); keeps
    a post already right; the caption's treatment (paragraph 0); a price after
    the line; a rewrite's line copied without its stop; a rewrite's line on
    an old post; no stop before an emoji in an offer post; the five-paragraph
    offer caption; the line written second; the line left out; the copyRecords
    hook test; the offer line not counted as a long sentence. Two older tests
    ("keeping a question mark", an offer post's stops) expect the fact on its
    own line since Task 12;
  - the clichés list gains its inflections (unwinding, indulgent, indulgence,
    pampering, melts away, soothes, soothing): whole words would miss them;
  - a rewrite's `sore` question reads its part of the body from the image
    prompt it keeps, the plan's from its set-up: a rewrite gets no set-up;
  - the answer's result names "the rest of the guest's day or evening", not
    tonight's sleep, which the light rule forbids on a day post;
  - `POSTS_LIMITS.storyWords` (10) and `sentenceAsked` (12) are new;
    `storyAsked` is 60;
  - an empty `.superpowers/guide/` sits in the worktree: AGENTS.md cites it,
    and `check-repo.mjs` looks for it once `.superpowers/` exists;
  - `.env.local` came from the `git-identity-46cdff` worktree, out of git.
- 2026-11-12: the first run used 6 requests for 4 asked: a `model_busy` and
  a `SyntaxError` were tried again once each; the developer then stopped and
  told the maintainer. The second and third runs took 4 each: 14 in all.
- 2026-11-12: the first run's tightening ("Tighten, 4 calls") was built before
  it was written into the spec; the final review caught it, and the
  amendment "The tightened prompt" now says it.
- 2026-11-12: the final review (a fresh reviewer, on the whole branch from
  `develop`): no critical issue; "with fixes". Fixed: the paragraph steps and
  the hook's line ended sentences at "Jl.", "Min." and "p.m. tonight", and a
  paragraph could then be dropped; the journal's `posts-16` baseline (8 of 8,
  not 4 of 8) and its verdict; the spec's account of the tightened prompt;
  this journal's missing calls and RED and GREEN lines. Its minors are under
  "Deferred".
- 2026-11-12: `pnpm test:e2e`: 69 passed, 1 skipped (the skip older than this
  branch).

## Evaluation, `posts-18`, third run (amended 2026-11-12)

After the second run, the maintainer approved the spec's "The fact on its own
line" and a `sore` question in "your", with 4 more requests. All 4 came back on
the first call (14 requests today in all). Each caption as the owner sees it:

**Sen, without an offer**

1. `ask`: "Can a therapist come to my hotel room tonight? 🌸" / "We bring
   professional care directly to your apartment in Da Nang for sixty minutes.
   Trained local therapists." / "Linens, towels and oils included 🪷". Story:
   "In-room massage tonight? We come to you 🌸".
2. `sore`: "Are your shoulders tired after a surf at My Khe? 🌸" / "We ease tired
   muscles on your back with sixty minutes of care in your hotel room. Trained
   local therapists." / "Professional therapeutic massage only 🪷". Story:
   "Sore back after surfing? We loosen tight muscles 🌸".

**Svarga, without an offer**

1. `sore`: "Are your legs heavy after walking all day in Canggu? 🌸" / "We use
   warm coconut oil and long strokes to loosen tight muscles." / "Experienced
   local therapists bring a Balinese massage to your villa or hotel: book on
   WhatsApp and relax 🌼". Story: "Heavy legs? Our oil massage helps 🌸".
2. `ask`: "Can someone come to my villa tonight for my tired feet? 🪷" / "We
   press reflex points to help you rest well tonight." / "Fresh linens,
   towels, and natural oils provided 🌺". Story: "Sore feet tonight? We bring
   foot reflexology to your room 🌸".

**Sen, with the offer**

1. `ask`: the offer line / "Can a massage therapist come to my hotel room
   tonight? Our trained local therapists bring fresh linens, towels and warm
   oil directly to your Da Nang room 🪷" / "Trained local therapists".
2. `sore`: the offer line / "Are your legs tired after exploring the Marble
   Mountains today? We use rhythmic palm pressure and assisted stretches to
   open stiff hips and legs 🪷" / "Linens, towels and oils included".

**Svarga, with the offer**

1. `sore`: the offer line / "Are your shoulders tight after a long flight? We
   loosen your muscles right in your Canggu villa with warm coconut oil." /
   "Experienced local therapists bring fresh linens and towels directly to your
   room 🌺".
2. `ask`: the offer line / "Can a therapist come to my hotel room tonight? Two
   therapists work in sync on your arms and hands in your Pererenan room." /
   "Fresh linens, towels, and natural oils are provided for your session 🌺".

| Check | posts-16 | first run | second run | third run |
|---|---|---|---|---|
| The question names a part of the body (`sore`) or what a guest asks before booking (`ask`), with a moment or a real place | 0 of 8 | 5 of 6 | 7 of 8 | 8 of 8 |
| No sentence in which a thing does the acting | 4 of 8 | 5 of 6 | 8 of 8 | 8 of 8 |
| Says the therapist comes to the guest's room | 3 of 8 | 4 of 6 | 6 of 8 | 7 of 8 |
| No cliché, em dash or question that labels the writer's claim | 5 of 8 | 6 of 6 | 8 of 8 | 8 of 8 |
| An offer post opens on its offer line | 0 of 4 | 2 of 2 | 4 of 4 | 4 of 4 |
| The story text, offer posts aside, holds at most 10 words and names the sore spot or the moment | 0 of 4 | 3 of 4 | 4 of 4 | 4 of 4 |

2026-11-10's checks, third run: three paragraphs, 8 of 8; at most 300
characters, 8 of 8; no sentence over 15 words, 5 of 8 (`posts-16`: 8 of 8);
a real place, 7 of 8 (`posts-16`: 8 of 8).

Verdict, corrected after the final review: not a full pass. Every check of the
2026-11-12 amendment passes, but two of 2026-11-10's checks do worse than
`posts-16`, against the spec's pass rule. Three captions hold a sentence over
15 words: Sen's post 2 (16), Svarga's post 1, whose fact copies the website's
promise (17), and Sen's offer post 1 (17); the tightened prompt asks the
answer for 12 words and no longer caps the fact. Svarga's post 2 names no
place. Also for the maintainer to judge: Svarga's post 1 ends on its promise
as the website writes it, "book on WhatsApp and relax", a call to action
before the app's own line, which code's record of a caption that asks to book
doesn't catch ("book on" isn't in its pattern); two answers end on a bare
"Trained local therapists."; and Sen's post 2 asks about the shoulders and
answers about the back. The spec's amendment "The tightened prompt" says what
the prompt asks, and approving it accepts these recordings.

## Evaluation, `posts-18`, second run (amended 2026-11-12)

After the first run, the maintainer chose to tighten the prompt and record
again, 4 requests ("Tighten, 4 calls"): a `sore` question opens on its part of
the body, in its own word; an `ask` question in the first person; the answer
in two sentences of at most 12 words, one of them saying a therapist comes to
the room; the fact alone in its paragraph. The prompt stays `posts-18`, the
first run's recordings replaced, as `posts-15`'s were on 2026-11-10. All 4
came back on the first call (10 requests today in all).

**Sen, without an offer**

1. `ask`: "Can my therapist bring oils to my Da Nang hotel tonight? 🌸" / "We
   loosen tight back muscles with slow forearm and elbow pressure. Linens,
   towels and oils included." / "Professional therapeutic massage only 🪷".
   Story: "Need a massage in your room tonight? We bring everything 🌸".
2. `sore`: "Shoulders sore after a surf at My Khe beach? 🌺" / "We ease tired
   paddling muscles and tight hips with expert care. Free travel in our core
   areas 🪷" (two paragraphs). Story: "Sore shoulders after My Khe? We ease
   tight muscles 🌸".

**Svarga, without an offer**

1. `sore`: "Are your legs tired after walking around Canggu today? 🌸" / "We use
   long strokes to loosen your muscles for the rest of your afternoon.
   Experienced local therapists with 5+ years of spa and villa experience
   bring fresh linens, towels, and natural oils right to your room 🪷" (two
   paragraphs). Story: "Tired legs in Canggu? We loosen your muscles today 🌸".
2. `ask`: "Can you bring a massage to my villa tonight? 🌸" / "We release
   tension in your feet so you can rest easily through your evening. No
   upfront deposit is needed for your hotel or villa booking 🪷" (two
   paragraphs). Story: "Foot massage at your villa tonight? 🌸".

**Sen, with the offer**

1. `ask`: the offer line / "Can a therapist come to my hotel room tonight? We
   bring fresh linens, towels and warm natural oil straight to your Da Nang
   hotel room 🌺" / "Trained local therapists."
2. `sore`: the offer line / "My shoulders feel very stiff after long flights in
   Da Nang today. We use rhythmic palm and thumb pressure to ease your sore
   muscles 🌺" / "Free travel in our core areas." The question is a statement
   in the first person, the `ask` question's voice: recorded `no question after
   the offer line`, and the replay test fails on it.

**Svarga, with the offer**

1. `sore`: the offer line / "Is your neck tight after laptop days in Canggu?
   We work the tension out of your shoulders so your evening feels easy.
   Experienced local therapists with 5+ years of spa and villa experience come
   to your room 🌼" (two paragraphs).
2. `ask`: the offer line / "Can two therapists come to my villa tonight? We
   bring fresh linens, towels, and natural oils right to your Pererenan room.
   Two therapists work in sync to ease your arms and hands 🪷" (two
   paragraphs).

| Check | posts-16 | first run | second run |
|---|---|---|---|
| The question names a part of the body (`sore`) or what a guest asks before booking (`ask`), with a moment or a real place | 0 of 8 | 5 of 6 | 7 of 8 |
| No sentence in which a thing does the acting | 4 of 8 | 5 of 6 | 8 of 8 |
| Says the therapist comes to the guest's room | 3 of 8 | 4 of 6 | 6 of 8 |
| No cliché, em dash or question that labels the writer's claim | 5 of 8 | 6 of 6 | 8 of 8 ("expert care", a quality the profile doesn't claim, in one) |
| An offer post opens on its offer line | 0 of 4 | 2 of 2 | 4 of 4 |
| The story text, offer posts aside, holds at most 10 words and names the sore spot or the moment | 0 of 4 | 3 of 4 | 4 of 4 (both `ask` posts name "tonight") |

2026-11-10's checks, second run: three paragraphs, 3 of 8 (5 join the fact to
the answer); at most 300 characters, 8 of 8; no sentence over 15 words, 6 of
8; a real place, 7 of 8.

Verdict: the questions, the acting and the story texts pass; the room misses
the bar (6 of 8), the fact sits alone in 3 captions of 8, and Sen's offer
post 2 asks no question. The developer proposed the spec's amendment "The
fact on its own line" and a `sore` question that speaks to the guest.

## Evaluation, `posts-18` (amended 2026-11-12)

Recorded on 2026-11-12, with the maintainer's yes for 4 requests. It took 6:
Sen's plan without an offer failed once with `model_busy` (Google's 503)
before a retry recorded it, and Sen's offer plan failed twice with
`model_failed` (a `SyntaxError`, "finish other", 285 and 426 tokens out), as
it did 3 times in 9 on 2026-11-10. The developer stopped there: Sen's offer
recording stays `posts-16`'s. Each caption as the owner sees it, its
paragraphs split by " / ":

**Svarga, without an offer**

1. `sore`: "Need relief for tired legs this afternoon in Canggu? 🌸" / "Our
   therapists use warm coconut oil and rhythmic strokes to loosen your legs
   right here in your villa room." / "Experienced local therapists with 5+
   years of spa and villa experience bring everything to you 🌺". Story:
   "Tired legs? Get a massage in your villa room 🌸".
2. `ask`: "Where can you get expert foot care tonight in Seminyak? 🌸" / "Our
   therapist works on your feet to release tension so you can rest easily in
   your hotel room." / "Fresh linens, towels, and natural oils are brought
   straight to your door 🌺". Story: "Sore feet tonight? Let us come to your
   room 🌸".

**Sen, without an offer**

1. `ask`: "Can we bring our massage table to your hotel room tonight? 🌸" /
   "Our trained therapist works slow forearm pressure into your sore shoulders
   to release deep tension before bed." / "Trained local therapists come
   directly to you with fresh linens and warm oils 🪷". Story: "Need a massage
   in your room tonight? We bring the table 🌸".
2. `sore`: "How do you recover after a surf at My Khe? 🌺" / "Targeted pressure
   eases your paddling shoulders and heavy legs so you feel ready for
   tomorrow." / "Linens, towels and oils are included with every visit 🪷".
   Story: "Sore shoulders after surfing? We loosen tired muscles 🌸".

**Svarga, with the offer**

1. `sore`: the offer line / "Where does the stiffness in your neck come from
   after laptop days in Canggu? We use long, rhythmic strokes and warm coconut
   oil to loosen your muscles completely. Experienced local therapists have
   5+ years of spa and villa experience 🌺" (two paragraphs: the fact joined
   the answer).
2. `ask`: the offer line / "Do two therapists come to your Pererenan villa
   tonight? Two therapists work in sync across your whole body at the same
   time in your room. Fresh linens, towels, and natural oils provided 🌺" (two
   paragraphs).

Code's records: `post-2: question names no part of the body` (Sen), `post-1:
story text of 11 words` (Sen), long sentences in 4 captions, and "linens" as a
setting in 4, each time in a highlight the profile gives, not a description.

The checks, on the 6 captions recorded (Sen's offer plan missing):

| Check | posts-16 | posts-18 |
|---|---|---|
| The question names a part of the body (`sore`) or what a guest asks before booking (`ask`), with a moment or a real place | 0 of 8 | 5 of 6 |
| No sentence in which a thing does the acting | 4 of 8 | 5 of 6 |
| Says the therapist comes to the guest's room | 3 of 8 | 4 of 6 |
| No cliché, em dash or question that labels the writer's claim | 5 of 8 | 6 of 6 ("completely", an intensifier, in one) |
| An offer post opens on its offer line | 0 of 4 | 2 of 2 |
| The story text, offer posts aside, holds at most 10 words and names the sore spot or the moment | 0 of 4 | 3 of 4 |

2026-11-10's checks: at most three paragraphs, 6 of 6 (both offer captions
have two); at most 300 characters, 5 of 6 (316); no sentence over 15 words, 2
of 6 (`posts-16`: 8 of 8); a real place, 5 of 6.

Verdict: not a full pass. Every question names a sore spot or a booking worry
but Sen's post 2, every answer but one has a person acting, and three story
texts in four are short hooks. The answers run long (up to 19 words), two
captions don't say the therapist comes to the room, and the offer captions
join their fact to the answer. The maintainer decides whether the prompt
changes and the plans are recorded again.

## Evaluation, `posts-16` and `posts-17`

The `posts-16` recordings, replayed through `posts-17`'s checks, each caption
as the owner sees it, its paragraphs split by " / ":

**Sen, without an offer**

1. "Tired in Da Nang? 🌸" / "Slow pressure loosens deep tension in your back
   and shoulders for 60 min." / "Trained local therapists bring all fresh
   linens to your room 🌸". Story: "60 min deep tissue relief in your room 🌸".
2. "Sore after surfing My Khe? 🌺" / "Targeted massage eases tired muscles and
   heavy legs." / "Free travel in our core areas 🌸". Story: "Easy recovery
   after the surf 🌺".

**Svarga, without an offer**

1. "Tired after a long day in Canggu? 🌸" / "Long strokes and palm pressure
   loosen tight muscles and melt away your stress." / "Experienced local
   therapists bring fresh linens and natural oils right to your door 🌸".
2. "Sore after a long flight to Pererenan? 🌺" / "Firm pressure and gentle
   stretches release travel tension and soothe your tired body." / "Local
   therapists bring five plus years of spa experience straight to your hotel
   room 🌸".

**Sen, with the offer**

1. "Tired in Da Nang today? 🌸" / "10% off our 90-minute Vietnamese
   Traditional Massage, until Sunday 1 November." / "Trained local therapists
   bring everything needed for your session 🌸".
2. "Stiff after walking around Da Nang? 🌺" / "10% off our 90-minute Thai
   Massage, until Sunday 1 November." / "Linens, towels and oils included
   with every visit 🌸".

**Svarga, with the offer** (code put both lines second)

1. "Need a break in Canggu today? 🌸" / "10% off our 90-minute Traditional
   Balinese Massage, until Sunday 1 November." / "Experienced local
   therapists with 5+ years of spa and villa experience 🌸".
2. "Ready to unwind in Bali this afternoon? 🌺" / "10% off our 90-minute
   Four-Hands Massage, until Sunday 1 November." / "Fresh linens, towels, and
   natural oils provided 🌸".

| Check | posts-14 | posts-15 | posts-16 and 17 |
|---|---|---|---|
| At most three paragraphs, the hook counted | 3 of 8 | 8 of 8 | 8 of 8, three each |
| At most 300 characters before the WhatsApp line | 2 of 8 | 8 of 8 | 8 of 8: 115 to 219 |
| No sentence over 15 words | 1 of 8 | 6 of 8 | 8 of 8 |
| Doesn't describe the setting | 4 of 8 | 8 of 8 | 8 of 8 |
| Names a real place of the business | 6 of 8 | 8 of 8 | 8 of 8 |
| Ends by answering a guest's doubt | 7 of 8 | 5 of 8 | 8 of 8 |
| The hook is a question | 1 of 8 | 1 of 8 | 8 of 8 |
| Two flowers in the caption, one in the story text | — | — | 8 of 8 |

Verdict: a full pass, and the maintainer said "good to go" (2026-11-10).
Code's records: "linens" in 4 captions, a highlight of both spas, and "names
no place" on Svarga's post 2, which names Pererenan (2.15's record, below).

## Evaluation, `posts-15` (first draft, rejected)

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

2026-11-12, Task 7, `pnpm exec vitest run tests/unit/posts-setup.test.ts`:

```
      Tests  5 failed | 68 passed (73)
```

Task 8, the offer line, paragraphs, checks, variety and replay tests:

```
      Tests  28 failed | 132 passed (160)
```

Task 9, `pnpm exec vitest run tests/unit/posts-variety.test.ts`:

```
      Tests  4 failed | 27 passed (31)
```

Task 10, the prompt and run tests:

```
      Tests  17 failed | 85 passed (102)
```

The tightening after the first run, the prompt tests:

```
      Tests  10 failed | 65 passed (75)
```

Task 12, the paragraphs, checks and prompt tests:

```
      Tests  10 failed | 184 passed (194)
```

The final review's fix, the hook-line and paragraphs tests:

```
      Tests  2 failed | 20 passed (22)
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

Task 6, the question first and the offer line second:

```
 Test Files  4 failed | 1 passed (5)
      Tests  34 failed | 165 passed (199)
```

Task 7, two flowers:

```
 Test Files  5 failed (5)
      Tests  11 failed | 239 passed (250)
```

`pnpm check`, with `posts-17`:

```
 Test Files  113 passed (113)
      Tests  1823 passed (1823)
```

2026-11-12, Task 7, the set-up tests:

```
      Tests  73 passed (73)
```

Task 8, the posts tests:

```
      Tests  887 passed (887)
```

Task 9, the posts tests:

```
      Tests  894 passed (894)
```

Task 10 and the tightening, `pnpm check`:

```
      Tests  1966 passed (1966)
```

Task 12, `pnpm check`, with the third run's recordings:

```
      Tests  1974 passed (1974)
```

The final review's fix, `pnpm check`, then `pnpm test:e2e`:

```
      Tests  1977 passed (1977)
  1 skipped
  69 passed (31.3s)
```

## Deferred

- 2.15's places record doesn't split the parentheses in Svarga's new service
  area, so "Seminyak" and "Pererenan" count as no place. Records only.
- The setting list's "linen" and "linens" fire on a highlight both spas give.
  Records only.
- A story text that opens on "Book" still goes whole (2.13), leaving the post
  with none: 1 of 8 in `posts-15`, none in `posts-16`.
- Code still deals a hook style into each set-up, which the prompt no longer
  reads.
- Sen's `SyntaxError`, on 3 of its 9 `posts-15` calls, none of `posts-16`'s:
  the log line now says why such an answer stopped.
- From the final review, unchanged: a caption that opens on a line break
  doesn't get its hook split; a hashtag-only line in a caption counts as its
  last paragraph; `lib/posts/edit.ts` still says "no cut at 700 characters";
  the replay test's three-paragraph check can't fail (its hook and flower
  checks can).
- From the 2026-11-12 final review, left for later:
  - `plan.md`'s Review Focus says a caption of three paragraphs comes back
    byte for byte; since 2026-11-10 its line breaks become blank lines;
  - a three-paragraph offer caption "line / Q? / A. F." keeps its lone
    question and its joined fact: the join runs past three paragraphs, the
    split on two;
  - a caption that leaves out its fact has its answer's second sentence moved
    into the fact's place;
  - stale comments: `offer-line.ts` (`dropPrices`, gone), `checks.ts` (up to
    3 flowers), `paragraphs.ts` ("an offer post's line" second), `emoji.ts`
    ("after its question"), `variety.ts` ("its first paragraph"), `edit.ts`
    (700 characters);
  - test gaps: "landscape" holds no cliché ("pampered" would test whole
    words); the clean-batch test filters the question records out; the
    replay test doesn't check the body record; no test pins a spa's flower
    right after the offer line;
  - the record of a caption that asks to book misses "book on WhatsApp";
  - `story.ts`, `hook-line.ts` and `variety.ts` each split sentences their
    own way.
