---
title: "Short captions"
description: "Every caption the model writes is three short paragraphs in plain words: a question of the kind code deals (a sore spot and its moment, or what a guest asks before booking), what the guest gets with a person doing the acting, and one fact from the business's highlights; with an offer, the offer line first and the question after it; never a description of the light, the room or the calm; story texts of ten words at most. Code holds a caption to three paragraphs and puts an offer post's line first, and records long sentences, setting words, clichés, missing questions and sore spots with no part of the body."
status: draft
date: "2026-11-10"
---

# Short captions

## Goal

The maintainer finds the captions too long (2026-11-10). Their last posts were
verbose, with a heavy description of the relaxing atmosphere. They want at
most three paragraphs, each one short and easy to read.

The `posts-14` recordings (2.15) show the same thing in their 8 captions, from
Sen's and Svarga's plans with and without an offer:

| Finding | posts-14 |
|---|---|
| Captions over three paragraphs, the hook counted | 5 of 8, with four or five |
| Characters, before the WhatsApp line | 264 to 438 |
| Words in a sentence | up to 25; a sentence over 15 in 7 of 8 captions |
| Captions that describe the light, the room or the quiet | 4 of 8 |

The four: "You rest easily in your own space as the late afternoon light warms the
room." (Sen); "Evening falls softly over the tropical garden while you lean
back and let the quiet settle in after hours exploring the local streets",
"…while evening lamps cast a golden glow across fresh linens." and "Soft
afternoon light filters through the open windows of your quiet Seminyak villa
into the peaceful room." (Svarga).

The causes, in `posts-14`'s prompt and in code:

- "Then short paragraphs … what the guest will feel, rather than what the
  business does", with no limit on how many;
- post 2 asked for three paragraphs after its hook, so four in all;
- "250 to 700 characters in all";
- "Each caption and story text follows its post's light": the guest's
  afternoon or evening, which the model describes;
- the ritual type's "through the senses (the oils, the warm towels, the
  quiet)", the offer type's "how it feels", the moment type's "puts the guest
  back in that moment", and "Feelings, senses and place symbols are yours to
  use freely";
- the image prompt's light, in the same prompt ("lamps and candles giving the
  room a warm, golden glow", "the garden outside, through open doors"), which
  the captions borrow;
- code keeps every paragraph the model writes, and cuts a caption only past
  700 characters.

Amended 2026-11-10, after the first `posts-15` recordings (the journal). The
maintainer found them "very bad", and asked that the first sentence end with a
question mark. Shown two examples, they chose them as the model to follow, and
chose the question before the offer line when there is an offer:

```
Sore shoulders after a surf at My Khe? 🌸

Our therapists come to your hotel and work the knots out of your back and arms.

Free travel in our core areas.
```

```
Tight hips after a day exploring Da Nang? 🌸

10% off our 90-minute Thai Massage, until Sunday 1 November.

We come to your hotel, with free travel in our core areas.
```

Both are the developer's, from Sen's profile. They aren't sent to the model:
the prompt describes them in its own words (2.14b).

Success: in the new recordings, Sen's and Svarga's, with and without an offer,
every caption is three paragraphs: a question, what the massage does (or the
offer line), and one fact from the highlights. None is over 300 characters
before the WhatsApp line, and none describes the light, the room, the garden
or the calm. Each still names a real place. The maintainer would post at least
one of each plan's two.

Amended 2026-11-12. This spec's branch was never merged, so the app still
writes `posts-14`'s captions. The maintainer found its last posts and stories
"very bad (no question hook, long descriptions of an atmosphere with pseudo
romantic author skills)", and asked for them to be improved dramatically with
marketing skills, Instagram ones above all. At their word, the branch was
merged into this work, and this amendment builds on it.

`posts-16`, this spec's recordings, fixes the length and the setting, but not
the rest:

| Finding | posts-16 |
|---|---|
| Questions that name a part of the body | 0 of 8: "Tired in Da Nang?", "Need a break in Canggu today?", "Ready to unwind in Bali this afternoon?" |
| Captions in which a thing does the acting | 4 of 8: "Slow pressure loosens deep tension…", "Long strokes and palm pressure loosen tight muscles…" |
| Captions that say the therapist comes to the guest's room | 3 of 8 |
| Story texts, offer posts aside, that name a sore spot or a moment and what the business does about it | 0 of 4: "Easy recovery after the surf 🌺", "Soothe your travel fatigue tonight 🌺" |
| Spa clichés | 3 of 8: "melt away your stress", "soothe your tired body", "Ready to unwind" |

The libraries were read again (decision 0009): IG at `550d3cf`, unchanged; CH
at `1f83744`, whose files used here changed only in their descriptions since
`96798cf`; and a third, **KW**: `anthropics/knowledge-work-plugins` at
`877a617` (Apache 2.0), its marketing plugin's content-creation skill. Paths
are under IG's and CH's `skills/` folders, IG's root `references/` folder, and
KW's `marketing/skills/` folder.

They undo one call of 2.15: no library limits question hooks. 2.15's "one
hook formula twice a week at most" is a box on a creator's weekly checklist
(IG `ig-content-planner/SKILL.md`), and none of IG's hook formulas is a
question (IG `references/hook-formulas.md`). KW counts a question among the
first lines that grab attention (KW `content-creation/SKILL.md`). CH bans a
question that labels the writer's own claim ("The result?"), and keeps a
question in the reader's voice about their own need, followed by what to do
(CH `copywriting/references/ai-tells.md`).

The maintainer chose (2026-11-12) this example as the direction, and the offer
line first again when there is an offer, as 2.13b had it. The question then
comes right after the line (developer's call, told to the maintainer).

```
Legs still shaking from the Mount Batur sunrise hike? 🌺

Stay in. We bring a Balinese massage to your villa tonight.

Free travel to Canggu, Pererenan, Seminyak and Kerobokan. We reply in about 5 minutes.
```

Its story text: "Mount Batur legs? We come to you tonight 🌺". Both are the
developer's, from Svarga's profile, and aren't sent to the model (2.14b). The
last paragraph keeps one fact (2026-11-10): the example's second, "We reply in
about 5 minutes", would be the other caption's.

Success, amended 2026-11-12: in the `posts-18` recordings, Sen's and Svarga's,
with and without an offer, each question names a part of the body or what a
guest asks before booking, and a moment or a real place; no sentence has a
thing doing the acting; each caption says the therapist comes to the guest's
room; each story text, offer posts aside, holds at most 10 words and names the
sore spot or the moment; each offer post opens on its offer line; and the
maintainer would post both posts of each plan.

## Behaviour

### At most three short paragraphs

A caption has at most three paragraphs, its hook counted (developer's call:
the hook stands alone on its first line, 2.15, and reads as a paragraph). The
app's WhatsApp line and the hashtags come after the caption, as today, and
aren't counted.

- Every caption is exactly three paragraphs (amended 2026-11-10, replacing
  the two shapes of the first draft; amended 2026-11-12):
  1. the hook, a short question (below); on a post that carries the offer,
     its offer line instead (below);
  2. the answer: what the guest gets, doing its type's job, in one or two
     short sentences (below); on a post that carries the offer, its question
     first, then the answer;
  3. one fact from the business's highlights, stated plainly in one short
     sentence: free travel, no deposit, linens and oils included. The two
     captions of an attempt never use the same one (2.15). It replaces 2.15's
     endings by type.
- A sentence holds at most 15 words, the hook too; the offer line is code's
  (2.13b) and isn't held to it.
- 80 to 280 characters in all, before the WhatsApp line.

The two captions of an attempt now share one shape, as the maintainer's
examples do: 2.15's two shapes go (developer's call).

### The hook, a question

Amended 2026-11-10. Every caption opens on a short question that ends with
"?", alone on its first line (2.15): the guest's sore spot and the moment it
comes from, often with one of the business's places, in at most 12 words. The
model is no longer given 2.15's hook styles: code still deals one into each
set-up, as before, and the prompt doesn't read it (developer's call: the
set-ups and the random they use stay as they are). 2.15's record of two
question hooks becomes its opposite: a hook that isn't a question is recorded
(below).

A post that carries the offer opens on its question too, then its offer line.
Amended 2026-11-12: it opens on its offer line, and its question opens the
second paragraph (below).

#### Two kinds of question, dealt by code

Amended 2026-11-12. Code deals each post one of two kinds of question, into
its set-up, as 2.15 dealt its hook styles, and the prompt gives it under
`### Questions`:

| Kind | The question |
|---|---|
| `sore` | the guest's sore spot, named as a part of the body, and the moment it comes from, with a real place when the moment holds none (IG `references/hook-formulas.md`: a specific moment, not a mood; CH `copywriting/SKILL.md`: name the reader's pain) |
| `ask` | the question a tourist would ask or type before booking, in their own words, that this business answers: whether a therapist comes to their room, tonight, what they bring, a deposit (CH `ad-creative/references/hook-system.md`: the exact question the buyer types into search) |

- The part of the body is the post's set-up's, which its image shows: the
  question and the photo match. For "whole body" or "head", it is a part its
  treatment's description names ("stiff hips, back and legs" for Thai).
- The moment is one of the essence's moments that fits that part of the body,
  never the same one in both posts.
- The two posts of an attempt get the two kinds, in a shuffled order, with or
  without an offer. The deal uses the plan's random and comes last, where
  2.15's hook styles were drawn, so a seed still deals the set-ups it dealt
  before; 2.15's styles are no longer dealt.
- A post keeps its kind in its set-up, and a caption update gives it back. A
  post saved with one of 2.15's styles, or with none, keeps the kind of
  question it has: no prompt reads a style.
- A question never asks how the guest feels, and never names only a mood ("a
  long day", "a break", "unwind", "stress"): a `sore` question's sore spot is
  a part of the body (developer's call, after `posts-16`).
- At most 12 words and 125 characters, as before.

The line right after the question answers it, for the guest (CH
`copywriting/references/ai-tells.md`: a question in the reader's voice about
their own need, followed by what to do). Nothing else in the caption is a
question: never one that labels the writer's own claim ("The result?").

### The answer

Amended 2026-11-12. The paragraph after the question says what the guest
gets, in one or two short sentences:

- A person does the acting: "we", the therapist, or "you". Never the
  pressure, the strokes, the massage, the oil or the towels (CH
  `copywriting/references/ai-tells.md`: the customer as the subject; `posts-16`:
  "Slow pressure loosens deep tension…").
- The result is physical and soon: the sore spot loosened, tonight's sleep,
  tomorrow's hike or flight (CH `marketing-psychology/SKILL.md`: sell the result
  the customer is after).
- A business that comes to its guests (its promise or service area says so)
  says where, in the question or this paragraph: the guest's own hotel room,
  apartment or villa, as its profile writes it. Both captions may say it, each
  in its own words: it is why a guest books this business rather than a spa
  (developer's call).
- Each sentence holds something a guest could check: who comes, where, how
  long, what they bring, which part of the body (IG
  `ig-caption-writer/references/caption-checklist.md`: a real number tied to
  what it counts, or a proper name; CH `copywriting/SKILL.md`: a sentence a
  competitor could write fails).

On a post that carries the offer, the paragraph opens on its question, then
answers it the same way, within the 15 words of each sentence.

### With an offer: the offer line, then the question

Amended 2026-11-12, at the maintainer's word: the offer line goes first again.
On a post that carries the offer, the offer line is the caption's first
paragraph, word for word and alone, as 2.13b had it before this spec. Its
question opens the second paragraph, and the answer follows it; the third is
its fact. The 2026-11-10 rule, the line second after the question, goes, and
code puts the line first where it put it second.

- When the model wrote the line as its first paragraph, word for word, it
  stays.
- When it wrote it anywhere else, the sentences that state the offer go
  (2.13b), and the line goes in as the first paragraph.
- When it left it out, the line goes in the same way.
- Each fix is recorded, as 2.13b's were: `offer line put first`, `offer line
  added`.
- The paragraph limit keeps the first, the second and the last paragraphs, so
  the line always stays.

The rest of 2.13b stands: the line's words, the price removed from the rest of
the caption, the story text that is the offer line, and the offer's end by the
WhatsApp line (2.15).

The model is asked for all of it. Code makes sure of the three paragraphs.
When the model writes more, the caption keeps its hook, the paragraph after it
and its last paragraph, and the others go, each recorded: `{ field:
'caption', reason: 'post-2: paragraph dropped "No deposit needed."' }`. The
last one stays because, on an offer or a moment post, it answers a guest's
doubt (2.15).

- A paragraph is the text between line breaks. A line with no letter or
  digit, such as a flower alone, isn't one.
- Code counts paragraphs as the owner sees them, after the hook goes alone on
  its line (2.15): a first line holding two sentences counts as two.
- A spa's caption that loses its only flower this way gets one back, as 2.13
  adds one.

Code's cut moves from 700 characters to 400: past it, a caption ends at its
last full sentence, as today.

This applies to what the model writes, in the plan and in every caption
update. The owner's own edits keep their paragraphs and their length, as
today (2.4).

### Two flowers in a caption, one in a story text

Amended 2026-11-10, after the `posts-16` recordings: the maintainer wants 2
emojis in each caption and 1 in each story text. For a spa (2.13), whose emoji
are flowers only, it replaces 2.13's 1 to 3 flowers in a caption and 1 or 2 in
a story text:

- The prompt asks for exactly 2 flowers in the caption, one right after the
  question and one at its very end, and exactly 1 in the story text, at its
  end.
- Code makes sure of it. A caption keeps its first two flowers, and the others
  go, as 2.13 removes a flower past its limit. A caption with one flower gets
  a second at its end, or after its question when it already ends on one; a
  caption with none gets one after its question and one at its end. This runs
  after the paragraph limit and the cut, so nothing removes them again; each
  flower added is recorded, as 2.13's are (`post-1: caption added 🌸`).
- A story text keeps its first flower, and gets one at its end when it has
  none, as today. An offer post's story text stays its line and one flower
  (2.13b).
- A business that isn't a spa is asked for at most 2 emoji in the caption and
  at most 1 in the story text; code adds none, as today.
- Amended 2026-11-12: "after the question" becomes "after the first line":
  on a post that carries the offer, the first flower follows its offer line,
  as 2.13b's did, and none is asked after its question.

`posts-17` is `posts-16` with these emoji words only. Its recordings stay
`posts-16`'s: replayed, code gives them their flowers (developer's call: no
model call is needed to test a count that code makes sure of).

### Plain words, no setting

A caption says what the massage does for the guest, plainly: the sore spot it
answers, what changes after, and one practical fact (a real place, a
highlight). It never describes the setting: the light, the sky, the sunset,
the garden, the room, the lamps, candles or linens, the oil's colour, or how
quiet, calm or peaceful it is. The photo shows the place, so the caption
doesn't need to. Story texts follow the same rule.

The prompt changes with it:

- **The caption body.** "What the guest will feel, rather than what the
  business does" goes. In its place: what the massage does for the guest, in
  plain words.
- **The type jobs.** The offer type loses "how it feels": the sore spot it
  answers and what changes after. The moment type names its moment in a few
  words, then what the massage does for it, instead of "puts the guest back
  in that moment". The ritual type gives the steps of one treatment in plain
  words (where it starts, what it works on, how long) instead of "through the
  senses (the oils, the warm towels, the quiet)". The local, tip and proof
  jobs stay; the local type's "last lines" become its last paragraph.
- **The `scene` hook style.** It names a moment the guest is living, in a few
  plain words, in the present tense, with no question, instead of "drops the
  guest into a moment they are living".
- **The light.** A caption or story text that says when follows its post's
  light, as 2.14b asks. A day post speaks of the guest's afternoon, never of
  sleep, bed or waking up. A night post speaks of the guest's evening, never
  of the afternoon, the midday sun or the morning just past. It no longer has
  to say when, and never describes the light (developer's call: 2.14b's
  records of the wrong time of day stay).
- **The facts rule.** "Feelings, senses and place symbols are yours to use
  freely" becomes "Feelings and place symbols are yours to use, in a few
  words".
- **The senses.** Amended 2026-11-10: the caption rules' two pointers to the
  profile's senses go, "as it may a sense" and "the captions draw on the
  profile's senses". Both spas' senses describe the setting ("soft hotel
  lighting", "gentle tropical breeze").
- **The image prompt.** Its light, room and garden are for the image only.
  The caption rules add: "Never describe what the photo shows." 2.15's "never
  reuse a phrase from these instructions or from the image set-ups" stays.
- **Clichés and AI tells.** Amended 2026-11-12. Never "Imagine…", a "not X,
  it's Y" contrast, an em dash, three adjectives in a row, or a spa cliché:
  unwind, indulge, pamper, oasis, escape, melt away, soothe (CH
  `copywriting/references/ai-tells.md`; CH `copywriting/SKILL.md`: no em dashes
  in social posts). The prompt names them; code records them (below).

### Story text

Amended 2026-11-12. A story text is read in two seconds over its photo, above
the WhatsApp sticker: at most 10 words and 60 characters asked, its flower
included, one idea (IG `ig-carousel-planner/references/slide-architecture.md`:
few words on an image, one idea; CH
`ad-creative/references/static-ad-templates.md`: 5 to 8 words over a
lifestyle photo).

- It names the post's sore spot or moment, in a few words, and what the
  business does about it, often as a short question and its answer.
- It never repeats the caption's first sentence, never names the treatment
  alone, never gives a price, and never asks to book or message, as before:
  the sticker asks.
- It follows the setting rule, the clichés and the light, as captions do.
- An offer post's story text stays its offer line and one flower (2.13b).

Code's limit stays 120 characters, since an offer line and its flower run
past 60. A story text over 10 words, an offer post's aside, is recorded
(below).

### What the model gets

Amended 2026-11-12. `posts-18`, in the plan and in every caption update:

- the caption rules above: the two kinds of question, the answer, the offer
  line first, the clichés, the story text;
- in the plan's user text, `### Questions` after `### Image set-ups`, one line
  per post: `1. sore` or `1. ask`;
- in a caption update's user text, each post's `question` from its set-up,
  next to its `light`, and none for a post without one.

No example sentence, question or story text is quoted (2.14b): each kind is
described in the prompt's own words.

### Code's records

These are records only, like 2.15's: the owner never sees them, and `pnpm
eval:posts` prints them. They run on the captions and story texts as code
leaves them, in the plan and in every caption update:

1. **Long sentences.** A sentence of more than 15 words, the offer line
   aside: `{ field: 'words', reason: 'post-2: 23 words in "Evening falls
   softly over…"' }`.
2. **The setting.** A caption or story text holding words from a short list,
   whole words, case ignored: `{ field: 'words', reason: 'post-1 describes the
   setting: "lamps", "glow", "linens"' }`. The list starts with glow, lamp,
   lamps, candle, candles, candlelight, lantern, lanterns, sunset, sunlight,
   sky, garden, linen, linens, breeze, quiet, calm, peaceful, serene,
   tranquil, afternoon light, evening light, soft light and golden light. It
   leaves out "light" alone, since "feel light" isn't a setting. The developer
   may add to the list.
3. **Hooks that aren't questions.** Amended 2026-11-10: a caption whose first
   sentence doesn't end with "?": `{ field: 'mix', reason: 'post-2: hook is no
   question' }`. It replaces 2.15's record of two question hooks. Amended
   2026-11-12: on a post that carries the offer, the first sentence after its
   offer line: `{ field: 'mix', reason: 'post-1: no question after the offer
   line' }`.
4. **No part of the body.** Amended 2026-11-12: on a post dealt a `sore`
   question, the sentence record 3 reads (its first, or the first after its
   offer line) naming no part of the body, whole words, case ignored: `{
   field: 'mix', reason: 'post-2: question names no part of the body' }`. The list starts with back, shoulder, shoulders, neck, leg,
   legs, calf, calves, thigh, thighs, knee, knees, foot, feet, ankle, ankles,
   arm, arms, hand, hands, wrist, wrists, hip, hips and head; "muscles" and
   "body" aren't on it. The developer may add to it.
5. **Clichés.** Amended 2026-11-12: a caption or story text holding a phrase
   from the clichés list (above), or an em dash, whole words, case ignored:
   `{ field: 'words', reason: 'post-1: "melt away"' }`.
6. **Long story texts.** Amended 2026-11-12: a story text of more than 10
   words, an offer post's aside: `{ field: 'story', reason: 'post-2: story
   text of 12 words' }`.

2.15's other records stay, its stock words with them.

### What doesn't change

These stay as they are:

- how code deals the hook styles into the set-ups (2.15), though the prompt no
  longer reads them (amended 2026-11-10); amended 2026-11-12: code deals the
  two kinds of question in their place (above);
- the hook alone on its first line, and its 125-character flag;
- a real place in each caption;
- the offer line's words (2.13b), and the offer's end by the WhatsApp line;
- never a price (2.17b);
- the hashtags, and the emoji rules apart from the counts above;
- the story text's limits: 100 characters asked, 120 checked; amended
  2026-11-12: 10 words and 60 characters asked, 120 checked (above);
- alt text, the images and their set-ups;
- translations into the owner's language;
- the owner's screens and strings, and the owner guide.

### Tests and evaluation

Unit tests (Vitest) for:

- the prompts (first draft): `posts-15`; at most three paragraphs; the shapes, two
  paragraphs after the hook on post 1 and one on post 2; 15 words; 80 to 280
  characters; the setting rule. None of "what the guest will feel", "through
  the senses", "how it feels", "puts the guest back", "senses and place
  symbols are yours to use freely" or "250 to 700" is left. The rewrite prompt
  has the same rules, without the shapes;
- the paragraph limit: five paragraphs keep the first, the second and the
  last, and record the others; three stay; a first line of two sentences
  counts as two once split; a flower alone on a line isn't a paragraph; a
  spa's caption that loses its only flower gets one back; an owner's edit of
  five paragraphs keeps them; a caption update is held to three as a plan is;
- the cut at 400 characters;
- the records: a sentence of 16 words recorded, one of 15 not; the offer line
  not counted; "glow" recorded in a caption and in a story text; "feel light"
  not recorded;
- amended 2026-11-10: the prompt's question hook, its three paragraphs for
  every post, its fact last, its offer line second, and no hook styles, no
  `### Hooks` and no pointer to the senses; `posts-16`; a hook with no "?"
  recorded, and two question hooks no longer; the offer line put second when
  the model wrote it first or elsewhere, added second when it left it out, and
  kept when the model wrote it second; an offer caption of five paragraphs
  keeping its question, its line and its last.
- amended 2026-11-12: `posts-18`; the prompt's two kinds of question, its
  answer with a person acting, the room said by a business that comes to its
  guests, its clichés, its story text of 10 words and 60 characters, its offer
  line first, and `### Questions` after the set-ups; none of "offer line
  comes right after it" or "its offer line, word for word, as its second
  paragraph" left; a caption update's user text giving each post its
  `question`, and none for a post without one; the deal: two kinds, one each,
  with and without an offer, the same seed dealing the same, and the set-ups
  before it unchanged for a seed; a set-up saved with a 2.15 style still
  loading; the offer line put first when the model wrote it elsewhere, added
  first when it left it out, and kept when it wrote it first; an offer caption
  of five paragraphs keeping its line, its question and its last; a spa's
  first flower after the offer line; each new record, and none on a clean
  batch.

The replay test checks Sen's and Svarga's `posts-16` plans, with and without
an offer: no caption has more than three paragraphs, a spa's caption has
exactly 2 flowers and its story text 1, every hook ends with "?",
an offer post's second paragraph is its offer line, and no caption or story
text holds a price (amended 2026-11-10). Older recordings (`posts-1`'s karsa-spa, orient-spa and
serenity-bali), replayed through today's checks, lose their extra paragraphs,
and their tests follow (developer's call). Amended 2026-11-12: it checks the
`posts-18` plans, and an offer post's first paragraph is its offer line, its
second opening on a question.

`pnpm eval:posts sen svarga --record`, then `pnpm eval:posts sen svarga
--offer --record`: 4 Flash-Lite requests from the app's daily pool. The
developer asks the maintainer first, never on a pilot day.

### Evaluation

The journal shows each new caption next to `posts-14`'s, with its paragraphs,
its characters, its longest sentence and code's records. The developer scores
them on:

| Check | posts-14 |
|---|---|
| At most three paragraphs, the hook counted | 3 of 8 |
| At most 300 characters before the WhatsApp line | 2 of 8 |
| No sentence over 15 words | 1 of 8 |
| Doesn't describe the setting | 4 of 8 |
| Names a real place of the business | 6 of 8 |
| Ends by answering a guest's doubt | 7 of 8 |
| The hook is a question (amended 2026-11-10) | 1 of 8 |

Pass, on the 8 new captions:

- the first, second and fourth checks pass on all 8, and so does the last;
- the third passes on at least 6;
- the place and doubt checks do no worse than `posts-14`;
- and the maintainer would post at least one of each plan's two.

When a check fails, the journal says why. The maintainer decides whether the
prompt changes and the plans are recorded again (4 more requests, with their
go-ahead).

Amended 2026-11-12. The journal shows each `posts-18` caption and story text
next to `posts-16`'s, with its kind of question and code's records. The
developer scores them on these checks, from the libraries' checklists (IG
`ig-caption-writer/references/caption-checklist.md`; CH
`copywriting/references/ai-tells.md` and `copywriting/SKILL.md`):

| Check | posts-16 |
|---|---|
| The question names a part of the body (`sore`) or what a guest asks before booking (`ask`), with a moment or a real place | 0 of 8 |
| No sentence in which a thing does the acting | 4 of 8 |
| Says the therapist comes to the guest's room | 3 of 8 |
| No cliché, em dash or question that labels the writer's claim | 5 of 8 |
| An offer post opens on its offer line | 0 of 4 |
| The story text, offer posts aside, holds at most 10 words and names the sore spot or the moment | 0 of 4 |

Pass, on the 8 new captions:

- the offer-line and story checks pass on all 4;
- the other four pass on at least 7 of 8;
- 2026-11-10's checks do no worse than `posts-16`;
- and the maintainer would post both posts of each plan.

## Acceptance criteria

```gherkin
Scenario: A caption of five paragraphs
  Given the model writes post 2's caption in five paragraphs
  When code checks the plan
  Then post 2's caption keeps its first, second and last paragraphs
  And the batch's dropped list holds each paragraph that went

Scenario: A caption of three paragraphs
  Given the model writes post 1's caption as its hook and two paragraphs
  When code checks the plan
  Then post 1's caption is unchanged

Scenario: A first line of two sentences
  Given the model writes post 1's caption "Sore legs after Mount Batur? 🌸 Our therapists come to your villa.", then "No deposit needed." and "Free travel in Canggu.", each after a blank line
  When code checks the plan
  Then post 1's caption is "Sore legs after Mount Batur? 🌸", "Our therapists come to your villa." and "Free travel in Canggu.", each a paragraph
  And the batch's dropped list holds 'post-1: paragraph dropped "No deposit needed."'

Scenario: A spa's caption that loses its only flower
  Given a spa's post 2 in four paragraphs, whose only flower is in the third
  When code checks the plan
  Then post 2's caption has three paragraphs
  And it holds a flower

Scenario: The hook is no question
  Given the model writes post 2's caption opening "Tired feet after a long walk through Seminyak."
  When code checks the plan
  Then the batch's dropped list holds 'post-2: hook is no question'

Scenario: The offer line goes first (amended 2026-11-12)
  Given a special offer, and a business that isn't a spa
  And the model writes post 1's caption "Tight hips after a day exploring Da Nang?", then the offer line, then "We come to your hotel.", each a paragraph
  When code checks the plan
  Then post 1's caption is the offer line, "Tight hips after a day exploring Da Nang?" and "We come to your hotel.", each a paragraph
  And the batch's dropped list holds 'post-1: offer line put first'

Scenario: The offer line added first (amended 2026-11-12)
  Given a special offer, and a business that isn't a spa
  And the model writes post 1's caption "Tight hips after a day exploring Da Nang? We come to your hotel."
  When code checks the plan
  Then post 1's caption is the offer line, then "Tight hips after a day exploring Da Nang? We come to your hotel.", each a paragraph
  And the batch's dropped list holds 'post-1: offer line added'

Scenario: No question after the offer line (amended 2026-11-12)
  Given a special offer, and post 1's caption is its offer line, then "We come to your hotel.", then "Free travel in our core areas."
  When code checks the plan
  Then the batch's dropped list holds 'post-1: no question after the offer line'

Scenario: Two kinds of question (amended 2026-11-12)
  Given a plan, with or without a special offer
  When code deals the set-ups
  Then one post gets the question "sore" and the other "ask"
  And the user text lists them under "### Questions", after "### Image set-ups"

Scenario: A sore question with no part of the body (amended 2026-11-12)
  Given post 2 is dealt the question "sore"
  And the model writes post 2's caption opening "Tired after a long day in Canggu?"
  When code checks the plan
  Then the batch's dropped list holds 'post-2: question names no part of the body'
  And post 2's caption stays as it is

Scenario: A cliché (amended 2026-11-12)
  Given post 1's caption holds "Long strokes melt away your stress."
  When code checks the plan
  Then the batch's dropped list holds 'post-1: "melt away"'
  And post 1's caption keeps the sentence

Scenario: A long story text (amended 2026-11-12)
  Given post 2 doesn't carry the offer, and its story text is "Easy and quick recovery after your long morning surf at My Khe beach 🌺"
  When code checks the plan
  Then the batch's dropped list holds 'post-2: story text of 13 words'

Scenario: A rewrite keeps the kinds (amended 2026-11-12)
  Given a batch whose post 2 was dealt the question "ask"
  When the owner edits the business and the captions are rewritten
  Then the rewrite's user text gives post-2 "question": "ask"

Scenario: The owner's own caption
  Given the owner edits post 1's caption into five paragraphs
  When they save it
  Then post 1's caption keeps its five paragraphs

Scenario: A caption that describes the setting
  Given post 1's caption holds "Evening lamps cast a golden glow across fresh linens."
  When code checks the plan
  Then the batch's dropped list holds 'post-1 describes the setting: "lamps", "glow", "linens"'
  And post 1's caption keeps the sentence

Scenario: A long sentence
  Given post 2's caption holds a sentence of 25 words
  When code checks the plan
  Then the batch's dropped list records it as a long sentence

Scenario: A recorded plan
  Given Sen's plan recorded with posts-16, without an offer
  When the replay test runs it
  Then no caption has more than three paragraphs
  And no caption or story text holds a price

Scenario: A recorded offer plan (amended 2026-11-12)
  Given Svarga's plan recorded with posts-18, with the offer
  When the replay test runs it
  Then each post's first paragraph is its offer line
  And its second paragraph opens on a question
```

## Known limits

- Fifteen words and 280 characters are asked, not made sure of: code can't
  shorten a sentence without breaking it. The records and the journal show
  what the model misses.
- The setting record matches words. A sentence can describe the room without
  them, and one can name a garden for a good reason and still be recorded.
- Dropping a paragraph between the second and the last can leave a gap in
  what the caption says. The owner reads each post before posting it.
- The model may still write fewer than three paragraphs. Code makes sure of
  three at most, not of each paragraph's job.
- Code can't turn a statement into a question: a hook without "?" reaches the
  owner, and the record shows it (amended 2026-11-10).
- Every hook names a sore spot and a moment, so hooks can look alike from one
  day to the next; nothing records repeats across days (2.15). Amended
  2026-11-12: the two kinds of question, the set-ups' parts of the body and
  the moments vary them, but an attempt can still repeat the one before it.
- Amended 2026-11-12: code tells a part of the body by its words, so "sore
  muscles" is recorded and "stiff lower back" isn't. Whether a question is
  specific, whether an `ask` question is one, and whether a thing does the
  acting are the journal's to judge: code reads no sentence's subject.
- Code deals a kind but can't make the model follow it: a post dealt `ask`
  may still ask about a sore spot, and nothing records it.
- Both captions may say the therapist comes to the guest's room, so the line
  comes back, in other words, from one attempt to the next.
- A profile with no moments gives the model the place alone for its `sore`
  question.

## Out of scope

- A second model call to shorten a long caption.
- Story texts' length: 2.13's limits stay. Amended 2026-11-12: what the model
  is asked for changes (above); code's 120 characters stay.
- The owner's own edits, which are never cut.
- Review replies, and answers to guests' questions (2.19).
