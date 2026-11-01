---
title: "Day and night copy"
description: "Each caption and story text follows its post's light, so a batch has three day posts and three night posts in its words as in its images; the prompt quotes no example hook or ending for the model to copy, asks for six different openings and endings, and code records any that repeat."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-01T13:46:48Z }
date: "2026-11-01"
---

# Day and night copy

## Goal

Too many captions end on "Wake up light tomorrow.", and the maintainer finds
it boring (2026-11-01). The sentence is 2.13's example of a positive ending,
quoted in the caption rules (`lib/posts/prompt.ts`, `posts-8` on), and
Flash-Lite copies it. In the recordings:

| Fixture | Prompt | Captions ending on it | Story texts holding it |
|---|---|---|---|
| Sen | `posts-8` | 3 of 6 | 1 |
| Sen, offer | `posts-10` | 5 of 6 | 0 |
| Svarga | `posts-8` | 2 of 6 | 2 |
| Svarga, offer | `posts-10` | 6 of 6 | 4 |

The `posts-1` recordings, made before the example, never use it. 2.13's hook
example is copied the same way: "Long flight?" opens a post in three of these
four plans. When the model leaves the example out, it ends on the night anyway
("Sleep deeply tonight.", "Drift into total peace.").

The words also miss half the images. Since 2.14, code deals three day images
and three night images per batch (`docs/specs/posts/day-and-night-images`),
but the caption rules never say which light a post has, so a late-afternoon
image gets a bedtime caption.

The maintainer asked (2026-11-01) for half the copy for the day and half for
the night, and for variety in the copy.

Success: in each recorded plan, three posts read as the day and three as the
night, each matching its image; no two captions share a first or last
sentence; no caption or story text quotes an example from the prompt. Phase
2's gate ("would post at least 4 of 6") still holds.

## Behaviour

### Day or night, in words

A post's light is its set-up's `light` (2.14): `day` or `night`. A post with
no set-up, or a set-up saved without a light, is a day, as 2.14 reads it.
So a batch of six has three day posts and three night posts, the same three
as its images.

Its caption and story text follow that light:

- **Day.** The guest's afternoon: a break in the middle of the day, after
  the beach, a surf, a walk round town or a morning at the laptop, with the
  evening still ahead (a sunset, dinner, a night out). Never sleep, bed or
  waking up.
- **Night.** The guest's evening: the day done, unwinding in the room, a
  deep sleep, the next day ahead. Never the afternoon, the midday sun or the
  morning just past.

The hook, the feeling, the concrete detail and the positive ending keep
2.13's order; each is written for that time of day. An offer post's offer
line stays its hook and its story text (2.13b); what follows the line
follows the light.

Hashtags, alt text and image prompts don't change: the image prompt already
follows the light (2.14), and the alt text describes the image prompt.

### What the model gets

The plan prompt becomes `posts-11`, with or without an offer. The caption
rules change:

- **No quoted examples.** The hook is still described ("a question or a
  promise the guest feels, about their own day"), and the ending ("a last
  sentence on a positive note: a feeling in the body, what the rest of the
  day or night holds, or a warm promise"), but neither quotes a sentence.
  The story-text rule keeps its words ("its hook cut down, the one thing
  that matters, and a positive ending") and quotes none either.
- **The light.** "Each caption and story text follows its post's light,
  the last word of its set-up", then the day and night lines above.
- **Six different posts.** "The six captions open differently and end
  differently: never the same first sentence, never the same last sentence,
  and never the same idea said twice in other words. Never reuse a phrase
  from these instructions."

The rest of 2.13's caption rules, 2.11's offer rules and 2.13b's offer line
stay as they are. The mix line keeps "(after a surf, a hike, a long
flight)": it names moments to post about, not a sentence.

The rewrite prompt (the owner edits the business) gets the same caption
rules. The rewrite's user text gives each post its light (`"light": "day"`
or `"night"`, from its set-up, `day` when there is none), so a rewritten
caption keeps its post's time of day.

### Code's checks

Code records, never changes and never shows the owner; `pnpm eval:posts`
prints the records with the other `dropped` lines.

1. **Repeats.** In the plan (once all posts are in) and in every rewrite:
   when two or more captions share their first sentence, or their last
   sentence, code records `{ field: 'mix', reason: 'last sentence "Wake up
   light tomorrow." in post-1, post-4' }` (or `first sentence`). Sentences
   split as 2.13's story-text rule says; flowers and other emoji are left
   out, case and spaces ignored. Story texts are checked the same way, as
   `story text "…" in …`, except on offer posts, whose story text is their
   offer line by design. Nor are offer posts' first sentences: an offer
   post opens on its offer line, and two offer posts on the same treatment
   share it. (Amended 2026-11-01, after the final review: a one-treatment
   offer recorded a repeat in every batch. Approved by the maintainer,
   2026-11-01T14:36:10Z.)
2. **The light.** On each post, when a day post's caption or story text
   holds `sleep`, `asleep`, `bedtime`, `wake`, `waking` or
   `tomorrow morning` (not `bed`: the massage bed is in day posts too), or a night post's holds `this afternoon`, `this
   morning`, `midday` or `noon`, code records `{ field: 'light', reason:
   'post-2 (day): "sleep"' }`. Whole words, case ignored.

The server's log line per plan or rewrite gains `repeats=` and
`light_misses=`, the counts of those records, numbers only.

### No stop before an emoji

(Amended 2026-11-01, after the recordings: the maintainer finds a "." before
an emoji needless. The `posts-11` recordings mix "tomorrow. 🌺" and
"evening 🌸". Approved by the maintainer, 2026-11-01T14:36:10Z.)

In every caption and story text the model writes, in the plan and in every
rewrite, code removes a "." that comes right before an emoji, spaces or a
line break between them allowed: the emoji takes the stop's place.

- "Wake up light tomorrow. 🌺" becomes "Wake up light tomorrow 🌺".
- "Sore feet? 🌺" and "Hello! 🌸" stay: only "." goes.
- "..." stays, and a "." with no emoji after it stays.
- The offer line too: "10% off our 90-minute Thai Massage, until Sunday 1
  November. 🌸 Long flight?" becomes "…until Sunday 1 November 🌸 Long
  flight?", and its story text "…until Sunday 1 November 🌸".

It is the last change code makes to a caption or a story text: after the
offer line, the prices, the story cleanup and the spa's flowers, which all
find sentences by their stop, and before the flags, so a flag quotes the
text the owner sees. Nothing is recorded: it is how every caption is
written, not a fix. The prompt doesn't change, and stays `posts-11`; the
recordings stay as they are, since code applies it when they replay.

Code's records (above) read an emoji as the end of a sentence, and compare
sentences without their last ".", "!" or "?", so "…tomorrow 🌺" and
"…tomorrow." are the same sentence.

### What doesn't change

The images, the deal of day and night, the offer, the owner's screens,
strings and the owner guide stay as they are.

### Tests and evaluation

- Unit tests (Vitest) for:
  - the prompts: `posts-11`; no quoted hook or ending in the caption and
    story rules ("Wake up light", "Long flight?" absent); the light rule and
    the six-different rule present, with and without an offer;
  - the rewrite's user text giving each post's light, `day` for a post
    without a set-up;
  - the repeat records: a shared last sentence, a shared first sentence,
    flowers ignored, case ignored, offer posts' story texts left out, none
    when all differ;
  - the light records: day with "sleep", night with "this afternoon",
    whole words only ("awakening" is no `wake`), none on a clean batch;
  - `repeats=` and `light_misses=` in the log line;
  - the stop before an emoji: removed before a flower and before another
    emoji, with spaces or a line break between; "?", "!", "..." and a stop
    without an emoji kept; on an offer post's caption and story text; in a
    rewrite; the flags quoting the text without it (amended 2026-11-01);
  - the records splitting at an emoji: "Rest here 🌸 Feel new 🌺" has two
    sentences, and "…tomorrow 🌺" and "…tomorrow." are one repeat.
- The replay test checks, on Sen's and Svarga's plans with and without an
  offer, that no two captions share their last sentence, and that no caption
  or story text holds a "." right before an emoji; an offer post's caption
  starts with its offer line, its "." gone when an emoji follows it.
- `pnpm eval:posts sen svarga --record`, then
  `pnpm eval:posts sen svarga --offer --record`: 4 Flash-Lite requests from
  the app's daily pool. The developer asks the maintainer first, never on a
  pilot day. The journal records, per plan, the six last sentences, the
  `repeats` and `light` records, and the day and night posts side by side.
- The `posts-1` recordings (karsa-spa, orient-spa, serenity-bali) stay as
  they are: they have no set-ups and pass the new replay check already
  (developer's call).

## Acceptance criteria

```gherkin
Scenario: The prompt quotes no example
  Given the plan prompt posts-11, with or without an offer
  Then its caption and story-text rules hold neither "Wake up light tomorrow." nor "Long flight?"
  And they say each caption follows its post's light
  And they ask for six different first and last sentences

Scenario: Day and night copy in a recorded plan
  Given Sen's plan recorded with posts-11, whose set-ups give three days and three nights
  When the replay test runs it
  Then no two captions share their last sentence
  And the journal shows the three day captions about the afternoon and the three night captions about the evening

Scenario: A repeated ending is recorded
  Given a plan whose posts 1 and 4 both end on "Wake up light tomorrow. 🌺"
  When code checks the plan
  Then the batch's dropped list holds 'last sentence "Wake up light tomorrow." in post-1, post-4'
  And both captions are kept as the model wrote them

Scenario: A night word on a day post is recorded
  Given post 2's set-up is a day
  When its caption ends "Sleep deeply tonight."
  Then the batch's dropped list holds 'post-2 (day): "sleep"'

Scenario: A rewrite keeps the light
  Given a batch whose post 3 has a night set-up
  When the owner edits the business and the captions are rewritten
  Then the rewrite's user text gives post-3 "light": "night"

Scenario: No stop before an emoji
  Given the model ends post 1's caption "Feel light again. Wake up rested. 🌺"
  When code checks the plan
  Then post 1's caption ends "Feel light again. Wake up rested 🌺"
  And a caption opening "Sore feet? 🌺" keeps its question mark

Scenario: Offer posts keep their line
  Given a special offer and a night set-up on post 1
  When the plan is made
  Then post 1's caption still opens on its offer line, and its story text is that line
  And the batch's dropped list records no story-text repeat for posts 1 and 2
```

## Known limits

- Code records repeats and light misses; it doesn't rewrite them. A batch
  can still reach the owner with two endings alike. The owner reads each
  post before posting it, and the journal shows how often it happens.
- The light words are a short list. A day caption can still drift to the
  night in other words ("drift off"), and "a restful night" on a day post
  can be fine ("rest well tonight" after an afternoon massage). The records
  are for the eval, not for the owner.
- Six endings across one batch differ; the same ending may come back in
  tomorrow's batch. 2.6's recent posts carry topics, not sentences.

- The stop goes only from what the model writes. A caption the owner
  edits, and a translation into their language, keep theirs.

## Out of scope

- Rewriting a repeated sentence with a second model call: it would spend
  the daily pool. Its own item if the records show it's needed.
- Repeats across days (sending the recent posts' last sentences to the
  model).
- A different split than three and three, or a light the owner chooses.
