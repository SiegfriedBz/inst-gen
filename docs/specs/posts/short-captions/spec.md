---
title: "Short captions"
description: "Every caption the model writes has at most three short paragraphs, its hook counted, in plain words: what the massage does for the guest, never a description of the light, the room or the calm. Code drops any paragraph past the third, and records long sentences and the words of a setting."
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

Success: in the new recordings, Sen's and Svarga's, with and without an offer,
no caption has more than three paragraphs, none is over 300 characters before
the WhatsApp line, and none describes the light, the room, the garden or the
calm. Each still names a real place and ends as its type asks (2.15). The
maintainer would post at least one of each plan's two.

## Behaviour

### At most three short paragraphs

A caption has at most three paragraphs, its hook counted (developer's call:
the hook stands alone on its first line, 2.15, and reads as a paragraph). The
app's WhatsApp line and the hashtags come after the caption, as today, and
aren't counted.

- Post 1's caption is its hook and two paragraphs; post 2's, its hook and
  one. The two captions of an attempt still differ in shape (2.15). Post 1, an
  offer post, keeps room to answer a guest's doubt after its treatment.
- A paragraph is one or two short sentences. A sentence holds at most 15
  words, the hook too; the offer line is code's (2.13b) and isn't held to it.
- 80 to 280 characters in all, before the WhatsApp line.

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
- **The image prompt.** Its light, room and garden are for the image only.
  The caption rules add: "Never describe what the photo shows." 2.15's "never
  reuse a phrase from these instructions or from the image set-ups" stays.

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

2.15's records stay, its stock words with them.

### What doesn't change

These stay as they are:

- the hook styles and how code deals them (2.15), apart from the `scene`
  style's words;
- the hook alone on its first line, and its 125-character flag;
- a real place in each caption, and the endings by type;
- the offer line first (2.13b), and the offer's end by the WhatsApp line;
- never a price (2.17b);
- the emoji rules and the hashtags;
- the story text's limits: 100 characters asked, 120 checked;
- alt text, the images and their set-ups;
- translations into the owner's language;
- the owner's screens and strings, and the owner guide.

### Tests and evaluation

Unit tests (Vitest) for:

- the prompts: `posts-15`; at most three paragraphs; the shapes, two
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
  not recorded.

The replay test checks Sen's and Svarga's `posts-15` plans, with and without
an offer: no caption has more than three paragraphs, and no caption or story
text holds a price. Older recordings (`posts-1`'s karsa-spa, orient-spa and
serenity-bali), replayed through today's checks, lose their extra paragraphs,
and their tests follow (developer's call).

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

Pass, on the 8 new captions:

- the first, second and fourth checks pass on all 8;
- the third passes on at least 6;
- the last two do no worse than `posts-14`;
- and the maintainer would post at least one of each plan's two.

When a check fails, the journal says why. The maintainer decides whether the
prompt changes and the plans are recorded again (4 more requests, with their
go-ahead).

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
  Given Sen's plan recorded with posts-15, without an offer
  When the replay test runs it
  Then no caption has more than three paragraphs
  And no caption or story text holds a price
```

## Known limits

- Fifteen words and 280 characters are asked, not made sure of: code can't
  shorten a sentence without breaking it. The records and the journal show
  what the model misses.
- The setting record matches words. A sentence can describe the room without
  them, and one can name a garden for a good reason and still be recorded.
- Dropping a paragraph between the second and the last can leave a gap in
  what the caption says. The owner reads each post before posting it.
- The model may still write two paragraphs after the hook on post 2, or one
  on post 1. Code makes sure of three at most, not of each shape.

## Out of scope

- A second model call to shorten a long caption.
- Story texts' length: 2.13's limits stay.
- The owner's own edits, which are never cut.
- Review replies, and answers to guests' questions (2.19).
