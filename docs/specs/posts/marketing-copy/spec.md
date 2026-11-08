---
title: "Marketing copy"
description: "Captions and story texts follow rules taken from two marketing skill libraries (decision 0009), on the two posts of an attempt (2.17b): code gives each post a hook style, the hook stands alone on the first line, each post type has its own job and only offer posts sell, each caption uses something only the business has, story texts give a reason to message, an offer post's WhatsApp line gives the offer's end, and code records what still repeats."
status: draft
date: "2026-11-07"
---

# Marketing copy

## Goal

The maintainer finds the posts repetitive and badly structured, and doubts
that prices belong in them: each pilot spa's Instagram profile has a
"Treatment Menu" button with every price (2026-11-07). They asked for posts
and stories that bring more WhatsApp bookings, built with what fits from two
marketing skill libraries they found:

- **IG**: `sergebulaev/instagram-skills` at `550d3cf` (MIT): the caption
  writer and its checklist, hook formulas, voice rules, hashtag strategy, the
  content planner and the humanizer.
- **CH**: `coreyhaines31/marketingskills` at `96798cf` (MIT, © 2025 Corey
  Haines): copywriting and its AI-tells list, copy editing and its checklist,
  social, ad creative, offers, marketing psychology and WhatsApp.

The libraries shape the prompt and are never sent to the model (decision
0009). Each rule below is in the app's own words and names the file it comes
from; paths are under each library's `skills/` folder, or its root
`references/` folder for IG.

What the libraries' checklists find in the `posts-11` recordings, Sen's and
Svarga's plans without an offer (12 posts, `gemini-3.5-flash-lite`):

| Finding | posts-11 | Rule it breaks |
|---|---|---|
| Hooks that are questions | 12 of 12 | One hook formula twice a week at most (IG `ig-content-planner/SKILL.md`) |
| Captions with a line break | 0 of 12: each is one block of four sentences | Line breaks are punctuation (IG `references/voice-rules.md`) |
| Captions with a price; story texts with one | 10 of 12; 10 of 12 | Don't hard-sell (IG `references/voice-rules.md`) |
| Tip posts that give a tip | 0 of 2: both sell a treatment and its price | Promotion in one or two posts a week (IG `ig-content-planner/SKILL.md`) |
| Captions naming a place of the business | 1 of 12: My Khe, Marble Mountains, Mount Batur and coconut oil never appear | If a competitor could write the sentence, it fails (CH `copywriting/SKILL.md`) |
| Captions answering a guest's doubt | 1 of 12: no deposit, replies in about 5 minutes and open until 23:00 never appear | State a real absence once, near the call to action (CH `copywriting/SKILL.md`) |
| Story texts that only name the treatment | 5 of Svarga's 6 | A headline must not caption the image (CH `ad-creative/references/hook-system.md`) |
| Stock words | "feel" in 11, "completely" in 6; three endings start with "Drift" | No empty intensifiers, no neat closing line (CH `copywriting/references/ai-tells.md`) |
| A hashtag naming another town | "massagedanang" on Svarga, in Bali, copied from the prompt's own example | Every tag describes the post (IG `ig-hashtag-strategist/SKILL.md`) |

The prompt also leaks into the copy: "after the beach", "Walked miles around
town" and "a relaxed sunset and a wonderful dinner" come from 2.14b's day and
night lines, and "warm golden oil", in 3 of Svarga's 6 captions, from the
image set-ups. One story text gives Deep Tissue at IDR 280k where its caption
and the profile say 300k.

The causes are in the prompt and in code:

- every caption gets one order (2.13): a hook, "a question or a promise";
  the feeling; "one concrete detail (the treatment, its price or duration
  when the profile gives them, the place)"; a positive ending about the rest
  of the day or night;
- "Each caption sells", whatever its type;
- the story text is "a short version of its own caption";
- every image set-up names a treatment (2.12), so every caption leads on one;
- code records only sentences that are identical (2.14b).

Amended 2026-11-08: 2.17b (`posts/two-suggestions`), released that day, makes
two posts an attempt instead of six and removes every price from captions and
story texts. This item now writes those two posts: its rules stay, counted on
two, and the price removal is 2.17b's.

Success: in each new recording, Sen's and Svarga's, with and without an
offer, at most one hook is a question; every caption's first line is its
hook, alone; no caption or story text holds a price; each tip post gives a
tip; at least one of each plan's two captions names a place of the business;
no story text starts with its treatment's name; no hashtag names a town of
another country; and every checklist score under "Evaluation" beats
`posts-11`'s. The maintainer would post at least one of each plan's two.

## Behaviour

### Hook styles, dealt by code

Code deals each post a hook style before the plan, as it deals the light
(2.14), from six styles. Hooks vary, and none takes over the batch (IG
`references/hook-formulas.md`; CH `ad-creative/references/hook-system.md`):

| Style | The hook |
|---|---|
| `question` | asks about the guest's own day |
| `scene` | drops the guest into a moment they are living, in the present tense, with no question |
| `place` | opens on one of the business's places or place symbols |
| `number` | opens on a number that isn't a price: a duration, a time of day, a count |
| `fact` | opens on a plain fact from the profile: a highlight, or its promise |
| `promise` | opens on what the guest's body will feel after |

- Without an offer, the two posts get two different styles out of the six,
  in a shuffled order: one hook at most is a question (amended 2026-11-08).
- With an offer, posts 1 and 2 carry it and open on its offer line (2.13b):
  they get no style.
- The deal uses the plan's random, as the set-ups do, so the eval's seed
  from the slug (`<slug>`, `<slug>:offer`) deals the same styles on every
  replay. It comes after the set-ups and their light, so a seed still deals
  the set-ups it dealt before.
- A post keeps its style in its set-up, next to its light, so a rewrite
  keeps it. A post saved before has none.

IG's creator hooks (a "steal this" result, a contrarian take, a confession)
don't fit a spa writing to tourists and are left out. IG's cold open is the
`scene` style.

### The hook alone on the first line

The first line of every caption is its hook, at most 125 characters, then
short paragraphs with a blank line between them (IG
`ig-caption-writer/SKILL.md`: the first 125 characters stop the scroll on
their own; IG `references/voice-rules.md` and CH `social/SKILL.md`: break
lines where a reader pauses).

The model is asked for it. When a caption's first line holds more than its
first sentence, code puts a blank line (two line breaks) after that first
sentence and any emoji right after it. On an offer post, the first sentence
is its offer line. A caption whose first line is already one sentence doesn't
change. It comes after 2.17b's price removal and the spa's flowers, so
the hook is the sentence the owner sees first. Nothing is recorded: it is how
every caption is written, as with the stop before an emoji (2.14b). It
applies to what the model writes, in the plan and in rewrites; an owner's
edit keeps their lines.

Code's `firstLine` flag, which the owner doesn't see, then measures the hook:
today it fires on every caption, since none has a line break.

### Each type its job

Only offer posts sell (IG `ig-content-planner/SKILL.md`: promotion in one or
two posts a week; CH `social/references/platforms.md`: only promotional
content doesn't work on Instagram). The other types earn the guest's
attention: they name a treatment once at most, never in the first line. Every
image still shows a treatment (2.12); the caption doesn't have to lead on it.

| Type | Its job |
|---|---|
| offer | makes the guest want one treatment now: the sore spot it answers, how it feels, what changes after |
| moment | puts the guest back in a moment from the essence's moments, then the relief |
| local | the town or area and something it's known for, useful to a visitor, tied back to the business in its last lines |
| ritual | how a treatment unfolds, through the senses, never the staff |
| tip | one piece of care advice a guest can use today, worth saving (IG `references/voice-rules.md`: give a reason to save it) |
| proof | one highlight or the promise, stated plainly; never an invented review, rating or customer |

The mix is 2.17b's (amended 2026-11-08): post 1 is an offer post and post 2
one of the other types; with an offer, both are its offer posts.

### No prices; something only this business has

No caption or story text gives a price, on any post: prices change, and
guests find them in the business's own menu (the maintainer, 2026-11-07; IG
`references/voice-rules.md`: don't hard-sell). Durations stay allowed. The
captions don't point to a menu: a pointer in every caption would repeat, and
not every business has one (developer's call).

In place of the price, each caption uses one thing only this business has:
one of its places or place symbols, a sense or a moment from its essence, or
a highlight (CH `copywriting/SKILL.md`: if a competitor could write the
sentence, it fails; CH `copywriting/references/ai-tells.md`: every claim
needs a number, a name, a mechanism or a concrete action).

The price removal is 2.17b's (amended 2026-11-08): code removes each sentence
or line that holds a price from every caption and story text the model
writes, and records it. This item adds none of its own. An owner's edit keeps
its prices, and their `price` flag (2.2), as today.

### Endings

How a caption ends follows its type (IG `references/voice-rules.md`: end on a
landing; CH `copywriting/references/ai-tells.md`: no neat closing line that
could close any post):

- an offer or a moment post ends by answering one doubt a guest may have,
  with a highlight from the profile, as the profile gives it: free travel, no
  deposit, fast replies, late hours (CH `copywriting/SKILL.md`). The two
  captions never use the same highlight (amended 2026-11-08). With no
  highlight in the profile, it ends on what changes for the guest;
- a tip ends on its tip, a ritual on its last sensation, a proof post on its
  fact, a local post on what ties the place to the business.

Every ending stays warm, as 2.13 asked. No two endings start with the same
word. An ending states its highlight and never asks the guest to book or
message: the app's WhatsApp line does ("Code's records", 6).

### The light, in fewer words

2.14b's day and night stay, without the lists the model copies:

- **Day.** The guest's afternoon, with the evening still ahead. Never sleep,
  bed or waking up.
- **Night.** The guest's evening, the day done. Never the afternoon, the
  midday sun or the morning just past.

The moments come from the essence (Sen's "after a surf at My Khe" and "after
laptop days", Svarga's "after a Mount Batur hike").

The image set-ups describe the photos: the captions never borrow their words
(the set-up's "warm golden oil"), and draw on the profile's senses instead.

### Plain words

The prompt asks for plain, concrete words and none that only adds intensity,
naming a few: completely, deeply, truly, ultimate, pure (CH
`copywriting/references/ai-tells.md`; IG
`ig-humanizer/references/scrub-rules.md`). They aren't banned words: IG's
humanizer finds that banning a word only brings in its synonyms. Code records
them instead ("Code's records").

The facts rule gains qualities: "signature", "expert", "best", or any
quality the profile doesn't claim, appears only if the profile holds it (CH
`ad-creative/SKILL.md`: no invented claims).

### Story text

Each story text is its own line, for the story the owner makes with the story
image and a WhatsApp link sticker (2.13): a reason to message now, a promise
or a highlight from the profile (CH `ad-creative/references/hook-system.md`:
a headline must not caption the image; IG
`ig-caption-writer/references/caption-checklist.md`: a promise, not a bare
title). Never the treatment's name alone, never the caption's first sentence,
never a price. As today: at most 100 characters asked and 120 checked, emoji
included; no hashtags, phone number, link or call to action, since the sticker
asks. An offer post's story text stays its offer line (2.13b).

Code still removes a story sentence that holds 2.13's call-to-action words
(book, reserve, WhatsApp, message us, DM, link in bio, click…), so the prompt
asks for the reason without them: "replies in about 5 minutes", not "we reply
on WhatsApp in 5 minutes" (developer's call: the sticker already says
WhatsApp, and 2.13's removal stays as it is).

### Hashtags

3 to 5, as today. One on the business's town or area, as its profile names
it; the others on the post's treatment, moment or place, drawing on the
essence's search terms (IG `references/hashtag-strategy.md`: one broad tag at
most; IG `ig-hashtag-strategist/SKILL.md`: every tag describes the post). The
prompt loses its examples ("canggu, danang", "massagedanang, aftersurf").

Code drops a hashtag that names a town or area in another country than the
business's, and records it: `{ field: 'hashtags', reason: 'post-2:
"massagedanang" names Da Nang' }`. Code holds the main tourist towns and
areas of Vietnam and Indonesia (Bali's are already in `BALI_PLACES`, for
2.12); the business's country is `countryOf` (`lib/brand/country.ts`). A
business whose country code can't read isn't checked. Matching ignores case,
accents and spaces, so "massagedanang" holds "danang". The full list is the
developer's call.

### The offer's end, by the WhatsApp line

A post that carries the special offer gets the offer's end in front of its
WhatsApp line (CH `offers/references/scarcity-urgency.md`: the deadline sits
next to the buy button): `Offer ends Tuesday 27 October. Book on WhatsApp:
+84 90 123 4567`, the last day as 2.11 writes it in English. Every other post
keeps `Book on WhatsApp: …`.

The line stays code's: a WhatsApp edit reaches both kinds with no model call
(2.5), the copied text holds each post's own line (2.4), and the copied tick
(2.6) goes only from a post whose line changed. "Offer ends" is English, as
"Book on WhatsApp" is: no new screen string.

The prompt names both lines the app adds; the model writes neither.

### What the model gets

`posts-13`, with or without an offer (amended 2026-11-08: `posts-12` is
2.17b's prompt). The plan prompt changes:

- **Who writes.** "You plan two Instagram posts for a small business, and
  write them as its owner would, to guests nearby." (CH
  `copywriting/references/ai-tells.md`: name who is writing.)
- **The mix.** Each type with its job (above), 2.17b's post 1 and post 2,
  and: "Only offer posts sell a treatment; the other types earn the guest's
  attention, name a treatment once at most, and never in their first line."
  The offer type loses "with its price".
- **The hooks.** "Code gives each post a hook style, in order, under
  '### Hooks'", the six styles as above, and that a post carrying the offer
  opens on its offer line instead.
- **The captions.** The hook alone on its first line, then short paragraphs
  with a blank line between them; the guest's feeling rather than what the
  business does; one thing only this business has; never a price; the
  endings by type; the light in fewer words; never a phrase from these
  instructions or from the image set-ups; plain words; 250 to 700 characters
  in all. The emoji rule, the facts rule (with qualities), the banned words
  and the rule against a call to action stay, the last naming both of the
  app's lines.
- **The story text** and **the hashtags** as above, with no example.

The user text gains `### Hooks` after `### Image set-ups`, one line per post
(`1. scene`); a post carrying the offer reads `offer line`. The offer stays
the last word (2.11).

The rewrite prompt gets the same caption, story and hashtag rules. Its user
text gives each post its `hook` from its set-up, next to its `light`, and
none for a post saved without one; such a post keeps the kind of hook it
has.

No example sentence, hook or hashtag is quoted (2.14b). The parentheses that
name topics stay ("after a surf, a hike, a long flight"; "stretch after a
dive, drink water after a massage"): they name things to post about, not words
to write.

### Code's records

Records only: a post is never changed for them, and the owner never sees
them; `pnpm eval:posts` prints them with the other `dropped` lines. In the
plan and in every rewrite, on the captions as code leaves them:

1. **Questions.** Two or more posts not carrying the offer whose first
   sentence ends in "?": `{ field: 'mix', reason: 'question hooks in post-1,
   post-2' }`.
2. **Stock words.** A word or phrase from a short list in 2 or more
   captions, both of a plan (amended 2026-11-08): `{ field: 'words', reason:
   '"feel" in post-1, post-2' }`.
   The list starts with feel, completely, deeply, truly, ultimate, pure,
   melt, unwind, indulge, bliss and golden oil; whole words, case ignored.
   The developer may add to it.
3. **Endings.** Two or more captions whose last sentences start with the
   same word: `{ field: 'mix', reason: 'endings start with "Drift" in post-1,
   post-2' }`.
4. **Places.** A caption that names none of the business's town, area,
   service-area places or place symbols: `{ field: 'words', reason: 'post-2
   names no place' }`. Case and accents ignored; how loosely a place matches
   ("My Khe" for "My Khe beach") is the developer's call.
5. **Story texts.** On a post not carrying the offer, a story text that
   starts with its set-up's treatment, or holds its caption's first
   sentence: `{ field: 'story', reason: 'post-2: story text starts with "Deep
   Tissue Tension Release"' }`.
6. **Calls to action.** A caption sentence that asks the guest to book,
   message, call or write: `{ field: 'cta', reason: 'post-2: "Message us on
   WhatsApp today."' }`. The app's WhatsApp line is the only call to action
   (CH `marketing-psychology/SKILL.md`: one clear call to action beats
   three), and the new endings, which answer a doubt, could drift into one.
   Recorded, not removed: a sentence that only names WhatsApp ("we reply on
   WhatsApp within about 5 minutes") is an answer to a doubt, and stays. The
   pattern is the developer's call.

2.14b's repeat and light records stay.

### What doesn't change

The images and their set-ups (treatment, guests, scene, light), the mix, the
special offer and its line (2.11, 2.13b), the emoji rules (2.13), the stop
before an emoji (2.14b), the caption and story-text limits, the banned
words, alt text, translations into the owner's language, the owner's screens
and strings, and the owner guide.

### Tests and evaluation

Unit tests (Vitest) for:

- the prompts: `posts-13`; the six hook styles and the type jobs; none of
  "after the beach", "a walk round town", "a sunset, dinner", "canggu,
  danang", "massagedanang" and "its price or duration" left; the story and
  hashtag rules; with and without an offer; the rewrite prompt;
- the deal: two different styles without an offer, none with an offer
  (amended 2026-11-08); the same seed dealing the same; `### Hooks` after the
  set-ups in the user text; the rewrite's user text giving each post its
  hook, and none for a post saved without one;
- the line break: put after the first sentence and its emoji; after the offer
  line on an offer post; no change when the hook already stands alone; the
  `firstLine` flag measuring the hook;
- the price removal: 2.17b's tests (amended 2026-11-08);
- hashtags: "massagedanang" dropped for a Canggu business, and recorded;
  "canggu", "seminyak" and "balimassage" kept; no check when the country
  can't be read;
- the call to action: "Offer ends … Book on WhatsApp: …" on an offer post,
  "Book on WhatsApp: …" on the others; a WhatsApp edit updating both; the
  copied text holding each post's own line;
- each record: questions, stock words (in 2 captions, not 1), endings,
  places, story texts, calls to action ("we reply on WhatsApp within about 5
  minutes" not recorded); none on a clean batch.

The replay test checks, on Sen's and Svarga's `posts-13` plans with and
without an offer: at most one hook ends in "?"; every caption's first line is
one sentence of at most 125 characters; no caption or story text holds a
price; no hashtag names a town of another country.

`pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga
--offer --record`: 4 Flash-Lite requests from the app's daily pool. The
developer asks the maintainer first, never on a pilot day. The `posts-1`
recordings (karsa-spa, orient-spa, serenity-bali) stay as they are: replayed,
they gain a line break and lose their prices, and their tests follow
(developer's call).

### Evaluation

The journal shows, for each new plan, the two hooks with their styles, the
two endings, the story texts, the hashtags and code's records, next to
`posts-11`'s. The developer scores both with these checks, from the
libraries' own checklists (IG `ig-caption-writer/references/caption-checklist.md`
and `ig-humanizer/references/audit-checklist.md`; CH
`copy-editing/references/checklist.md` and
`copywriting/references/ai-tells.md`). The `posts-11` column is the 2026-11-07
audit, on the 12 posts without an offer:

| Check | posts-11 |
|---|---|
| The hook lands a payoff, a tension or a number on its own | 6 of 12 |
| Short paragraphs, not a wall of text | 0 of 12 |
| Names a place of the business | 1 of 12 |
| Answers a guest's doubt | 1 of 12 |
| No empty intensifier | 4 of 12 |
| No neat closing line that could close any post | 0 of 12 |
| The captions differ in shape (sentence count and order) | no: 12 of 12 have four sentences in one order |
| The story text is more than a bare title | 6 of 12 |

Pass: on the 4 new posts without an offer, Sen's and Svarga's together, every
check's share beats `posts-11`'s share of its 12 in the table (amended
2026-11-08), the shape check passing when neither plan's two captions share
one shape; and the maintainer would post at least one of each plan's two. The
offer plans are scored
the same way, for the journal, with no pass mark. When a check doesn't pass,
the journal says why, and the maintainer decides whether the prompt changes
and the plans are recorded again (4 more requests, with their go-ahead).

## Acceptance criteria

```gherkin
Scenario: Two hook styles without an offer
  Given a plan without a special offer
  When code deals the set-ups
  Then the two posts get two different hook styles
  And the user text lists them under "### Hooks"

Scenario: No hook style with an offer
  Given a plan with a special offer
  When code deals the set-ups
  Then posts 1 and 2 get no hook style

Scenario: The hook alone on the first line
  Given the model writes post 2's caption "Sore shoulders from the paddle out? 🌸 Our therapists come to your villa."
  When code checks the plan
  Then post 2's caption is "Sore shoulders from the paddle out? 🌸", a blank line, then "Our therapists come to your villa."

Scenario: A hashtag from another country
  Given a business in Canggu, Bali
  When the model gives post 2 the hashtag "massagedanang"
  Then post 2 keeps its other hashtags without it
  And the batch's dropped list holds 'post-2: "massagedanang" names Da Nang'

Scenario: The offer's end by the WhatsApp line
  Given a special offer until Tuesday 27 October, and the WhatsApp number +84 90 123 4567
  When the plan is made
  Then posts 1 and 2 have the call to action "Offer ends Tuesday 27 October. Book on WhatsApp: +84 90 123 4567"
  And a plan without the offer gives both posts "Book on WhatsApp: +84 90 123 4567"

Scenario: Question hooks are recorded
  Given a plan without an offer whose posts 1 and 2 open on a question
  When code checks the plan
  Then the batch's dropped list holds 'question hooks in post-1, post-2'
  And both captions stay as the model wrote them

Scenario: A stock word is recorded
  Given "completely" in the captions of posts 1 and 2
  When code checks the plan
  Then the batch's dropped list holds '"completely" in post-1, post-2'

Scenario: A rewrite keeps the hook styles
  Given a batch whose post 2 has the hook style "place"
  When the owner edits the business and the captions are rewritten
  Then the rewrite's user text gives post-2 "hook": "place"

Scenario: A recorded plan
  Given Sen's plan recorded with posts-13, without an offer
  When the replay test runs it
  Then at most one hook ends in "?"
  And every caption's first line is one sentence of at most 125 characters
  And no caption or story text holds a price
```

## Known limits

- Hook styles and type jobs are words in a prompt. Code tells a question by
  its "?", not a scene from a promise: the journal judges the rest.
- Each attempt deals two of the six styles again. Records are per attempt,
  on its two captions: an attempt may repeat the words of the one before it,
  and nothing records it (amended 2026-11-08).
- Records don't rewrite: a batch can still reach the owner with two hooks
  that are questions. The owner reads each post before posting it.
- The places record matches names: a caption can name a place in other words
  and be recorded, or drop one in passing and pass.
- The town list covers two countries; a hashtag naming a far town of the
  same country passes.
- A guest who wants a price asks on WhatsApp, or opens the business's own
  menu.
- The libraries' claims about Instagram's ranking (sends, saves, reach, the
  125-character fold) cite no sources. Nothing here relies on them, beyond the
  125 characters 2.2 already uses.

## Out of scope

- A first WhatsApp message written ahead in the story's link
  (`wa.me/<number>?text=…`, CH `sms/references/whatsapp.md`): it changes the
  story part of the suggestion and the owner guide. Its own item.
- Review replies: their prompt doesn't change.
- Carousels and Reels (phase 5), asking guests to save or share, and the
  Instagram bio.
- The guests' own words from reviews, which the profile doesn't hold.
- A second model call to rewrite a repeated or off-style caption.
- Repeats across days.
