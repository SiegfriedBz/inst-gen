---
title: "Reasons to book"
description: "For a spa that comes to its guests, every post sells one of five reasons to book today, dealt by code so the two posts of an attempt never share one and the next attempts move on to others: a day out in the guest's body, staying in, two of you, the first night after a long flight, laptop days; each caption asks about that moment, said to the guest, says what the guest gets and how easy it is, and ends on a fact code deals that removes a doubt, never one that turns a request away; each story text names the moment and says the business comes to the guest; the prompt shows five sample posts of a made-up business in Lisbon; code records a question in the first person, a question that misses its reason, a copied sample, a caption for two guests on an image of one and one that names two therapists on an image of one; each caption names only what its image shows, and code writes the opening hours in words; other businesses keep today's posts."
status: draft
date: "2026-11-23"
---

# Reasons to book

## Goal

The maintainer pasted two of Sen's newest suggestions (2026-11-23), both
written by `posts-18`:

```
Did I leave my water bottle on the table? 🌸

We offer professional therapeutic massage only in your hotel room or villa.

Linens, towels and oils included 🌼
```

Its story text: "Drink water after your massage 🌸".

```
Can a therapist bring oils for a late session in Da Nang? 🌸

We bring fresh linens and warm oils directly to your hotel room tonight 🌺

Professional therapeutic massage only
```

In their words: "HOW THIS IS SUPPOSED TO DRIVE INTEREST !!!??? AND LEAD
TO CONVERSION ????", and "THINK HARDER !!!!!".

Why it came out so (read in the code and the recordings, 2026-11-23):

- **The `ask` question** (2.18, amended 2026-11-12). Code deals it to one
  post of every attempt: "the question a tourist would ask or type before
  booking, in the first person (I, my) and their own words, that this
  business answers from its profile: whether a therapist comes to their room,
  tonight, what they bring, a deposit, how long". It came from a rule for
  search ads, where the buyer types the question (CH
  `ad-creative/references/hook-system.md`); nobody scrolling Instagram is
  searching. In the first person, the business seems to talk about itself:
  "Can we bring our massage table to your hotel room tonight?", "Can my
  therapist bring oils to my Da Nang hotel tonight?" (2.18's journal). "Write
  new texts" (2.20) then asks for "a different question of the kind its
  question names" each time, so once "Can a therapist come to my hotel room
  tonight?" is taken, the model makes questions up: the oils, the water
  bottle.
- **The tip type.** Post 2 of an attempt without an offer is a moment, local,
  ritual, tip or proof post, and the tip's job quotes its own example, "drink
  water after a massage" (2.15): the story text above is that example. Advice
  gives a guest no reason to book.
- **The fact.** The third paragraph is "one fact from the profile's
  highlights". Sen's highlights hold "Professional therapeutic massage only",
  which the website uses to turn away requests for anything but a massage. In
  a post, it raises the doubt it answers. With five highlights and two posts
  an attempt, it comes back in about two attempts of five; it is in
  `posts-18`'s recordings once and in both posts above.
- **No goal.** The prompt says at length what a caption must not be, and
  never what a post is for: a tourist or expat nearby wants a massage today
  and messages the business. 2.18 took out feelings, moods, the setting and
  the senses, each for a good reason. What is left is logistics (who comes,
  where, how long, what they bring), in the same three lines every time: a
  question, "we come to your hotel room", a highlight.
- **No sample.** Since 2.14b the prompt quotes no example, after Flash-Lite
  copied one ending into most captions. The model has seen no good post
  since, only rules.
- **Checks on form.** 2.18's scores measure form: a part of the body in the
  question, a person acting, the room said, no cliché. Its third run passed
  them all, with half its questions in the first person.

The developer proposed four reasons to book today, each a reason a guest
books a massage that comes to them rather than going to a spa. The maintainer
took the four and added one: "also laptop working days". Asked whether the
prompt may show sample posts written for a made-up business in another city,
they answered "Yes, add samples". Reading them, they asked that the parents
of the kids-asleep sample get "2 of you side by side in a Couple Massage
(with 2 therapists)" rather than take turns, and found the rest good.

Success: in the new recordings, Sen's and Svarga's, with and without an
offer, and their new texts, every post sells one reason to book today; every
question speaks to the guest; no post gives advice or a highlight that turns
a request away; no sample is copied; and the maintainer would post both posts
of each attempt as they are.

## Behaviour

### Who it's for

A business that comes to its guests: a spa (2.13's word test on its
category) whose profile has a service area. Sen and Svarga are both
(developer's call: the service area is where the read writes that a business
travels; a spa read without one gets today's posts).

Every other business keeps `posts-18`'s posts: its prompt's words, its types,
its two kinds of question, and its set-ups dealt seed for seed as today
(developer's call: the pilot has no other business; a later item can give
them reasons of their own).

### Five reasons to book, dealt by code

Each post sells one reason to book today. Code deals it into the post's
set-up, in place of 2.18's kind of question, and the prompt gives it under
`### Reasons`:

| Reason | The moment | Its question asks about |
|---|---|---|
| `dayOut` | the guest's body after a day out: a walk, a climb, a hike, a surf | the part of the body, and the day out it comes from: one of the essence's moments, or one of the business's real places |
| `stayIn` | the guest would rather not go out: it's late, it's raining, or the kids are asleep | that moment, and that they don't have to go anywhere |
| `twoOfYou` | two guests, a couple or friends | the two of them and a moment they share: a day out together (one of the essence's moments, or one of the business's real places) or an evening in; both massaged at the same time, side by side (amended 2026-11-23, after the second recordings) |
| `firstNight` | the guest has just landed after a long flight | the flight in their body: a stiff back, neck or legs |
| `laptop` | days of work on a laptop (the maintainer's "laptop working days") | the screen days in their neck, shoulders or back |

The essence's moments are shared out: a moment about a flight is
`firstNight`'s, one about a laptop or work is `laptop`'s, the others are
`dayOut`'s.

How code deals them:

1. **The reasons.** Two different ones, the least used by the recent posts
   first, at random among equals. The recent posts are the newest 12 the
   phone keeps (2.2), which outlive the daily reset; each now carries its
   reason. A reason is dealt only when one of the eligible offerings' looks
   takes it (step 2's table), so `twoOfYou` only when the offerings hold a
   couple massage (an offering whose look is `couple`, 2.12). When fewer than
   two reasons are left, the second post takes `stayIn`, which every look
   takes, even when the first has it.
2. **The treatments.** `twoOfYou` takes the couple massage, two guests and
   two therapists. The other reasons take the least-used eligible offering, as
   today (2.12), among those whose look takes the reason:

   | Look (2.12) | Reasons it takes |
   |---|---|
   | `couple` | `twoOfYou`, `stayIn` |
   | `foot` | `dayOut`, `stayIn`, `firstNight` |
   | `head` | `laptop`, `stayIn`, `firstNight` |
   | `pregnancy` | `stayIn` |
   | any other | `dayOut`, `stayIn`, `firstNight`, `laptop` |

   A four-hands massage is one guest with two therapists: never `twoOfYou`.
3. **The part of the body.** A look that fixes one keeps it (2.12: the feet
   for a foot massage, the head for a head massage). The others take the
   least used of the free parts that fit the reason:

   | Reason | Free parts it fits |
   |---|---|
   | `dayOut` | legs, back, shoulders and neck |
   | `stayIn` | any |
   | `twoOfYou` | any |
   | `firstNight` | back, shoulders and neck, legs |
   | `laptop` | shoulders and neck, back, arms and hands |

4. **The light.** `firstNight` takes the night: its post is the attempt's
   night post and the other its day post. Otherwise one day and one night,
   as today.
5. **The rest** (guests, scene, the therapists' look) as today.

With a special offer, the treatments come first, the offer's, as today. Each
then takes a reason its look takes, two different ones, the least used
first; when nothing else is left, the second takes `stayIn`, as above.

### The caption

Three short paragraphs, as 2.18 has them, code still making sure of three:

1. **The question**, alone on its first line, at most 12 words and ending in
   "?": the post's reason, asked to the guest with "you" or "your", in a
   tourist's own words, about the moment they are living. Never in the first
   person ("I", "my", "we", "our"): the business writes the post. A `dayOut`
   or `laptop` question names the part of the body from its set-up, as 2.18's
   `sore` question does, and a `dayOut` question names its day out. Never a
   question that names only a mood (a long day, a break, stress), as today.
2. **What the guest gets, and how easy it is**, in two short sentences of at
   most 12 words. A therapist comes to the guest's own room (hotel room,
   apartment or villa, as the profile writes it), and something changes for
   the rest of their day or evening: legs ready for tomorrow, the evening
   free, an early night on a night post, the afternoon ahead on a day post.
   It may name the post's treatment. A person does the acting, as 2.18 asks.
3. **The fact code deals** (below), as the profile writes it, in one short
   sentence.

The caption speaks to the guests its set-up shows, as its image does: two
guests on a couple massage are both massaged at once, side by side, each with
a therapist; one guest is massaged alone. A `stayIn` post on a couple massage
may sell it to both of them, as the second sample does (the maintainer's
word, 2026-11-23); a `stayIn` post with one guest speaks to that guest.

The caption names only what its image shows (amended 2026-11-23, after the
second recordings): the set-up's treatment, never another of the
business's; as many therapists as the set-up has, "two therapists" only on
a couple massage or a four-hands massage, otherwise "a therapist", "your
therapist" or "she"; and for `dayOut` and `laptop`, the set-up's part of
the body.

The guest's body and plans may be named again, as the samples do; the room,
the light, the calm and the spa clichés still may not (2.18). The rule
"Feelings and place symbols are yours to use, in a few words" becomes "The
guest's body and plans are yours to name, in a few words".

With a special offer, the offer line comes first, then the question with its
answer, then the fact, as today (2.18, amended 2026-11-12).

The rest stays as `posts-18` asks it: a real place of the business in the
question or the answer; 80 to 280 characters; two flowers for a spa, one
after the first line and one at the end; never a price (2.17b); never a call
to action, since the app adds the WhatsApp line; the post's light; the banned
words; the clichés; never "Imagine…", a "not this, it's that" contrast or an
em dash.

### The fact, dealt by code

- Code deals each post one of the profile's highlights, never the same in
  both posts, at random. The prompt gives it under `### Facts`.
- A night post may get the opening hours instead, when the profile gives
  them: a late close removes the doubt that it's too late to book. For a
  night post, the hours are one more fact to draw.
- Code writes the hours fact in words, and the caption copies it like any
  other fact (amended 2026-11-23, after the second recordings: the model
  copied Sen's "Hours: Mo-Su 08:30-23:00" as it was). Hours open every day
  with one closing time give "Open every day until 11 pm"; a closing time
  with minutes, "until 10:30 pm"; one after midnight, "until 1 am";
  midnight, "until midnight"; open from midnight to midnight, "Open 24
  hours, every day". The days may come as one range ("Mo-Su", "Monday to
  Sunday", "daily", "every day") or as several that cover the week with
  the same closing time ("Mo-Fr 09:00-22:00; Sa-Su 10:00-22:00"). Hours
  that skip a day, close at different times on different days, or that
  code can't read give no hours fact: the night post draws a highlight.
- Two kinds of highlight are never dealt:
  - one that turns a request away: it holds "only", "strictly", "sexual",
    "sex", "erotic", "extra service" or "happy ending", whole words, case
    ignored. Sen's "Professional therapeutic massage only" is one. The list
    may grow;
  - one of six words or fewer that names the guest's place ("your villa",
    "your hotel", "your room", "your apartment", "your home"): it says what
    the answer says. Svarga's "Massage at your villa or hotel" is one.
- The model never sees a highlight that turns a request away: code leaves it
  out of the profile it sends with the posts' prompts. The profile's hash is
  computed as today, so no saved post goes out of date for it. The highlight
  stays in the profile, and answers to guests' questions still use it (2.19).
- A profile with no highlight left to deal, and no hours for a night post,
  gives its post no fact; the prompt then asks for none, and the caption may
  end on its answer.

### The story text

- It names the post's moment in a few words and says the business comes to
  the guest, at the post's time of day. At most 10 words and 60 characters,
  one flower for a spa, as today (2.18).
- Never advice, never the treatment's name alone, never the caption's first
  sentence, never a price, and never "book", "reserve", "WhatsApp",
  "message", "DM" or "click": the sticker asks (2.13).
- An offer post's story text stays its offer line (2.13b).

### Five sample posts

The prompt shows five sample posts, one per reason, which the developer
wrote for Maré, a made-up business that sends therapists to hotels and flats
in Lisbon. They show the voice, the length and the three parts. The prompt
asks for new posts in the same spirit, and never a sample's words, places or
facts. Lisbon shares no place, moment or fact with Sen or Svarga, so a copy
shows at once (developer's call). Approving this spec approves the samples.

Maré's highlights, made up: "No payment until after your massage", "Open
until midnight, every day", "Massage tables, towels and oils included", "A
therapist at your door within the hour", "Free travel in central Lisbon".

`dayOut`, a night post:

```
Sore calves after all the stairs at Sintra? 🌸

Tonight a therapist comes to your room and works your legs. Then a shower, and you're in bed by ten.

No payment until after your massage 🌺
```

Story text: "Sintra stairs in your calves? We come to you tonight 🌸"

`stayIn`, a night post with two guests on a couple massage, its fact the
hours:

```
Kids asleep, and neither of you can go out? 🌷

We send two therapists to your Alfama apartment for a Couple Massage. You lie side by side, and nobody needs a babysitter.

Open until midnight, every day 🌸
```

Story text: "Kids asleep? A Couple Massage in your room 🌷"

(Amended 2026-11-23, at the maintainer's word: the first draft had the
parents take turns, "one parent after the other"; they asked for "2 of you
side by side in a Couple Massage (with 2 therapists)".)

`twoOfYou`, a day post:

```
Massage for two, side by side, in your own room? 🌼

Two therapists come to your Belém hotel, one for each of you. You're both done at the same time, with the afternoon ahead.

Massage tables, towels and oils included 🌸
```

Story text: "Two of you, two therapists, one room 🌼"

`firstNight`, a night post:

```
Stiff back after the long-haul flight into Lisbon? 🪷

We come to your hotel tonight. Your therapist works the flight out of your back before you sleep.

A therapist at your door within the hour 🌺
```

Story text: "Just landed? We bring the massage to your hotel 🪷"

`laptop`, a day post:

```
A week of laptop calls, and now your neck won't turn? 🌺

Take an hour off this afternoon, without leaving your Chiado flat. Your therapist works your neck and shoulders loose before tomorrow's calls.

Free travel in central Lisbon 🌸
```

Story text: "Laptop neck? A therapist at your flat this afternoon 🌺"

Each keeps the rules above: its question at most 12 words, its answer's
sentences at most 12, a real place, a person acting, the light of its post,
no setting, no cliché, two flowers, a story text of 10 words at most.

The samples' own phrases, which code records when a post holds one (record 4
below): "all the stairs at", "in bed by ten", "neither of you can go
out", "you lie side by side", "babysitter", "side by side, in your own
room", "both done at the same time", "works the flight out", "laptop calls",
"neck won't turn", "take an hour off", "neck and shoulders loose",
"tomorrow's calls", "two therapists, one room", "bring the massage to your
hotel", "within the hour", "no payment until" and "until midnight". The last
three are Maré's made-up facts: in Sen's or Svarga's post, each would be a
fact their profile doesn't hold. The list may grow.

2.14b's rule stands for Sen's and Svarga's own words: the prompt quotes none
of their sentences.

Amended 2026-11-23, after the first `posts-19` recordings (the journal). The
model copied the sample of its own reason: Sen's laptop post opened on
"A week of laptop calls, and now your neck won't turn?", word for word;
Svarga's on "A week of laptop work, and now your neck won't turn?"; two
story texts were the samples' own ("Two of you, two therapists, one room",
"Just landed? We bring the massage to your hotel"); and Svarga's first night
opened on the sample's shape with Bali for Lisbon. Code recorded a copy in 4
posts of 8. The developer's proposal, for the maintainer to approve:

- The prompt shows only the samples of the reasons no post of the call has:
  three in a plan whose two posts have two reasons, four when both have
  `stayIn`; in a caption update, those of the reasons none of the sent posts
  has; in new texts, the four of the other reasons. The samples text says
  how many it shows: "one for each of the other reasons".
- A post never sees its own reason's sample, so it can't copy its question,
  its answer or its story text; the other samples still show the voice, the
  length and the three paragraphs. The copy record stays, for a phrase taken
  from another reason's sample.
- Two samples opened on the noun ("Calves still burning from the stairs at
  Sintra?", "Back stiff from the long-haul flight into Lisbon?"), and the
  model took the shape ("Legs heavy from the long surf session at Echo
  Beach?", "Back stiff from the long flight into Bali?"). The maintainer
  asked (2026-11-23): "Is this proper english ??? or rather be Heavy legs
  from the long surf session at Echo Beach?". Both samples now open on what
  the guest feels, then "after": "Sore calves after all the stairs at
  Sintra?" and "Stiff back after the long-haul flight into Lisbon?"; the
  first sample's listed phrase becomes "all the stairs at".
- Sen's and Svarga's plans are recorded again, with and without an offer,
  and their new texts: 6 Flash-Lite requests, with the maintainer's
  go-ahead.

### Post types

For a business that comes to its guests, the model no longer picks a type.
Without an offer, post 1 is an offer post and post 2 a moment post; with an
offer, both are offer posts, as today. Both sell, through their reasons. The
type jobs (2.15) go from this prompt, the tip, local, ritual and proof posts
with them.

### Write new texts, and caption updates

- "Write new texts" (2.20) keeps the post's reason and asks for new words for
  it: another question about the same reason (for `dayOut`, another day out
  that fits its part of the body; for `twoOfYou`, another moment the two
  share, amended 2026-11-23), and a new fact dealt by code, neither the
  post's own nor the other post's when another is left. The new words name
  only what its image shows, as the caption's rule says.
- A caption update after a business edit (2.2) keeps each post's reason and
  its fact, while the profile still holds that fact; code deals another when
  it doesn't.
- A post saved before this spec has a kind of question and no reason. The
  first time it is updated or written anew, code gives it a reason its look
  takes, never the other post's, `stayIn` when none other is left, and a
  fact. Its light and its images stay.

### What the model gets

`posts-19`, for a business that comes to its guests, in the plan, in caption
updates and in new texts:

- It opens on what a post is for, before any rule: a tourist or expat nearby
  sees it on their phone, often in their room, and could want a massage
  today. The post makes them want this business, which comes to them, so
  they message it. Its edge over any spa: the guest never leaves their room,
  with no taxi and no getting dressed afterwards.
- The five reasons, described as above.
- The caption, the fact and the story text, as above, with the rules that
  stay.
- The sample posts of the reasons no post of the call has (amended
  2026-11-23, above).
- The image prompt's rules, unchanged.

A batch records `posts-19` for a business that comes to its guests, and
`posts-18` for any other, whose prompt doesn't change.

In the plan's user text, after `### Image set-ups`: `### Reasons`, one line
per post with its guests and therapists (`1. laptop: one guest, one
therapist`; `2. twoOfYou: two guests, two therapists`; a four-hands massage,
`one guest, two therapists`), and `### Facts`, one line per post with its
fact as the profile writes it (`1. No upfront deposit required`) or the
hours as code writes them (`2. Open every day until 11 pm`); a post with no
fact has no line. A caption update's and new texts' user text give each
post its `reason`, its `fact` and its `therapists` (1 or 2) next to its
`light`. (The guests and therapists, and the hours in words, amended
2026-11-23, after the second recordings.)

The rest of `posts-18`'s prompt goes for these businesses: the type jobs, the
two kinds of question and their description, and "Never a question about how
the guest feels" (the question about a mood stays).

### Code's records

Records only, like 2.15's and 2.18's: the owner never sees them, and `pnpm
eval:posts` prints them. They run on the captions and story texts as code
leaves them, in the plan, caption updates and new texts:

1. **A question in the first person.** The question (the first sentence, or
   the first after the offer line) holds "I", "I'm", "my", "me", "we",
   "our" or "us", whole words: `{ field: 'mix', reason: 'post-1: question in
   the first person' }`.
2. **A question that misses its reason.** It holds none of its reason's
   words, whole words, case ignored: `{ field: 'mix', reason: 'post-2:
   question misses its reason (laptop)' }`. The lists may grow:
   - `dayOut`: a part of the body (2.18's list), as the `sore` record does
     today, which it replaces;
   - `stayIn`: late, tonight, evening, rain, raining, rainy, kids, children,
     asleep, stay, staying, out;
   - `twoOfYou`: two, both, together, couple, partner, friend, friends;
   - `firstNight`: flight, flights, flew, landed, landing, plane, jet,
     arrived, arrival;
   - `laptop`: laptop, screen, desk, work, working, calls, emails.
3. **A highlight that turns a request away**, in a caption or a story text:
   the highlight's words, case and punctuation ignored: `{ field: 'words',
   reason: 'post-1: "professional therapeutic massage only"' }`.
4. **A copied sample.** A caption or a story text that holds one of the
   samples' own phrases (listed with the samples), or Maré or one of its
   places (Lisbon, Sintra, Alfama, Belém, Chiado), case and accents ignored:
   `{ field: 'words', reason: 'post-2 copies a sample: "in bed by ten"' }`.
   What every post is asked to say is no copy: a short question that names
   the moment ("Just landed?", "Kids asleep?") and "we come to you tonight"
   are what the reasons and the story text ask for, so code doesn't match
   whole sentences or runs of words (developer's call, after the builder's
   check: a run of eight words already matched "a therapist comes to your
   room and works", which every answer may say).
5. **A caption for two on an image of one.** On a set-up with one guest, a
   caption or story text that holds "both of you", "the two of you", "each
   of you", "you both", "side by side" or "couple", whole words, case
   ignored: `{ field: 'mix', reason: 'post-2: caption for two guests, image
   of one' }`. "Two therapists" isn't on this list: a four-hands massage has
   them, for one guest; record 6 checks them. The list may grow.
6. **Two therapists on an image of one** (amended 2026-11-23, after the
   second recordings). On a set-up with one therapist, a caption or story
   text that holds "two therapists", "both therapists", "four hands" or
   "four-hands", case ignored: `{ field: 'mix', reason: 'post-1: caption for
   two therapists, image of one' }`. A couple massage and a four-hands
   massage have two therapists, and may say so.

2.18's other records stay. Its `sore` record ("question names no part of the
body") becomes the `dayOut` line of record 2 for these businesses, and stays
for the others.

### Amended after the second recordings

Amended 2026-11-23, after the second `posts-19` recordings (the journal).
The maintainer read three of their faults and asked "Did you fix this?":

- Sen's laptop post with the offer said "Two therapists come to your room"
  on an image of one therapist. Two of the samples say "two therapists",
  and nothing told the model how many each post has. Each post's line
  under `### Reasons` now says its guests and therapists, the caption
  names only what its image shows, and code records two therapists on an
  image of one (record 6). Svarga's new texts, which named Foot
  Reflexology and tired feet on an image of a leg massage, fall under the
  same rule.
- Sen's first-night post ended on "Hours: Mo-Su 08:30-23:00", the line as
  code dealt it, though the prompt asked for it in words. Code now writes
  the hours in words ("Open every day until 11 pm"), and the prompt drops
  its special case for "Hours: …".
- Sen's new texts opened on "Both tired of resting alone when you could
  share this afternoon?": `twoOfYou` was the one reason whose question
  named no moment. Its question now names a moment the two share, as
  `dayOut`'s names a day out.

`posts-19` never shipped, so it stays `posts-19`, as with the first
amendment. Sen's and Svarga's plans, with and without an offer, and their
new texts are recorded again: 6 Flash-Lite requests, with the maintainer's
go-ahead.

### What doesn't change

- Every business that doesn't come to its guests: its prompt's words, its
  types, its kinds of question, its set-ups seed for seed, its records.
- The images: their set-ups apart from the reason's treatment and part of the
  body, their image prompts' rules, the therapists' look, the day and night.
- The offer line, its place first, its story text and the offer's end by the
  WhatsApp line (2.13b, 2.15, 2.18).
- Never a price (2.17b).
- Three paragraphs, the paragraph limit, the cut at 400 characters, the fact
  on its own line, the flowers (2.18).
- The WhatsApp line's words, the hashtags, the alt text, translations into
  the owner's language.
- The owner's screens and strings, and the owner guide, which names no type
  or kind of question.
- The text model, `gemini-3.5-flash-lite`, and its thinking level.

### Tests and evaluation

Unit tests (Vitest) for:

- who it's for: Sen's and Svarga's profiles come to their guests; a spa with
  no service area and a café don't;
- the deal: two different reasons; the least used by the recent posts first;
  `twoOfYou` only with a couple massage, always with it, two guests and two
  therapists; each look taking only its reasons; the free parts by reason;
  `firstNight` at night; with an offer, the reasons following its treatments,
  and `stayIn` when nothing else is left; the same seed dealing the same;
  another business's set-ups unchanged seed for seed;
- the facts: never the same in both posts; never a highlight that turns a
  request away, nor a short one that names the guest's place; the hours only
  on a night post; none when none is left; the model's profile without the
  turned-away highlight, and the profile's hash unchanged;
- the prompt: `posts-19`; the goal before the rules; the five reasons; the
  samples of the reasons no post of the call has, never a post's own
  (amended 2026-11-23); no type jobs, no kinds of question; `### Reasons` and
  `### Facts` after the set-ups; a caption update's and new texts' `reason`
  and `fact`; another business's prompt word for word `posts-18`'s;
- new texts and caption updates keeping a post's reason; a post saved with a
  kind of question and no reason given one, never the other post's;
- each new record, and none on a clean batch; "Just landed?" and "We come to
  you tonight" never recorded as a copy; "two therapists" on a four-hands
  massage for one guest never recorded as a caption for two; the samples
  themselves, the second and third with two guests, passing every other
  record and every rule above;
- the second amendment (2026-11-23): the hours in words, from "Mo-Su
  08:30-23:00" to "Open every day until 11 pm", with minutes, midnight, a
  close after midnight, 24 hours, and ranges that cover the week with one
  closing time; no hours fact for hours that skip a day, close at
  different times, or that code can't read; `### Reasons` lines with each
  post's guests and therapists; a caption update's and new texts'
  `therapists`; the rule on what the image shows; `twoOfYou`'s moment; no
  "Hours: …" rule; record 6, never on a couple or four-hands massage.

The replay test checks the new `posts-19` recordings, Sen's and Svarga's,
with and without an offer: every question ends in "?" and holds no first
person; no caption or story text holds a highlight that turns a request
away, a copied sample or a price, or speaks to two guests or names two
therapists on an image of one;
every caption has three paragraphs at most;
an offer post's first paragraph is its offer line.

`pnpm eval:posts sen svarga --record`, `pnpm eval:posts sen svarga --offer
--record` and `pnpm eval:posts sen svarga --new-texts --record`: 6
Flash-Lite requests from the app's daily pool. The developer asks the
maintainer first, never on a pilot day.

The recordings show each of the five reasons at least once, and the hours as
a night post's fact at least once, so the maintainer judges them all. Where
the seeds alone don't deal them, the eval sends made-up recent posts to steer
the deal, at no extra request (developer's call, after the builder's check).
The offer runs can't deal `twoOfYou`, since the fixtures' offer is on two
other treatments: a run without an offer covers it.

The journal shows each new post next to `posts-18`'s, with its reason, its
fact and code's records. The developer scores the 8 plan posts on:

| Check | posts-18 |
|---|---|
| The question speaks to the guest about its reason, never in the first person | 4 of 8 |
| The answer says what the guest gets and how easy it is | to judge |
| The fact removes a doubt; none turns a request away | 7 of 8 |
| No advice, no tip | 8 of 8 |
| No sample copied | none to copy |
| The story text names the moment and says the business comes, offer posts aside | to judge |

Pass: the first, third, fourth and fifth checks on all 8; the others on at
least 7; 2.18's checks no worse than `posts-18`; and the maintainer would post
both posts of each of the four attempts, and both new texts, as they are.

When a check fails, the journal says why, and the maintainer decides whether
the prompt changes and the plans are recorded again, with their go-ahead.

## Acceptance criteria

```gherkin
Scenario: Two reasons, never the same
  Given Sen's profile and no special offer
  When code deals the set-ups
  Then the two posts get two different reasons
  And the plan's user text lists them under "### Reasons", after "### Image set-ups"

Scenario: The next attempt moves on
  Given the recent posts hold the reasons "dayOut" and "stayIn"
  When code deals the next set-ups for Sen
  Then neither post gets "dayOut" or "stayIn"

Scenario: Two of you, with the couple massage
  Given Sen's profile, which offers a Couple Massage
  And code deals the reason "twoOfYou" to post 2
  Then post 2's treatment is the Couple Massage, with two guests and two therapists

Scenario: No couple massage
  Given a business that comes to its guests and offers no couple massage
  When code deals the set-ups many times
  Then no post gets the reason "twoOfYou"

Scenario: The first night is a night
  Given code deals the reason "firstNight" to post 1
  Then post 1's light is night
  And post 2's light is day

Scenario: A head massage on laptop days
  Given a special offer on a head massage only
  When code deals the set-ups
  Then each post gets a reason the head look takes: "laptop", "stayIn" or "firstNight"

Scenario: A fact that turns a request away
  Given Sen's highlights hold "Professional therapeutic massage only"
  When code deals the facts many times
  Then no post gets it
  And the profile the model sees doesn't hold it
  And Sen's profile hash is the one it was

Scenario: The hours, at night
  Given Sen's hours "08:30-23:00 daily"
  When code deals the facts
  Then only the night post may get "Hours: 08:30-23:00 daily"

Scenario: A question in the first person
  Given the model writes post 1's caption opening "Can a therapist bring oils to my hotel tonight?"
  When code checks the plan
  Then the batch's dropped list holds 'post-1: question in the first person'
  And post 1's caption stays as it is

Scenario: A question that misses its reason
  Given post 2 is dealt the reason "laptop"
  And the model writes post 2's caption opening "Sore shoulders after a surf at My Khe?"
  When code checks the plan
  Then the batch's dropped list holds 'post-2: question misses its reason (laptop)'

Scenario: A copied sample
  Given the model writes post 1's caption holding "Then a shower, and you're in bed by ten."
  When code checks the plan
  Then the batch's dropped list holds a record that post 1 copies a sample

Scenario: A caption for two on an image of one
  Given post 1 is dealt the reason "stayIn" with one guest, a woman
  And the model writes post 1's caption "Kids asleep, and neither of you can go out?", then "We bring a Couple Massage to your hotel room, side by side.", then a fact
  When code checks the plan
  Then the batch's dropped list holds 'post-1: caption for two guests, image of one'

Scenario: New texts keep the reason
  Given Sen's post 2 has the reason "stayIn" and the fact "No upfront deposit required"
  When the owner taps "Write new texts" on it
  Then the user text gives post 2 "reason": "stayIn"
  And its fact is another of Sen's highlights, or the hours on a night post

Scenario: A post saved before
  Given Sen's post 1 was saved with the question "ask" and no reason
  When the owner taps "Write new texts" on it
  Then code gives post 1 a reason its look takes, not post 2's
  And post 1 keeps its light and its images

Scenario: Another business
  Given a café's profile and a seed
  When code deals its set-ups and writes its prompt
  Then its set-ups are the ones that seed dealt before this spec
  And its prompt is posts-18's, word for word

Scenario: A recorded plan
  Given Sen's plan recorded with posts-19, without an offer
  When the replay test runs it
  Then every question ends with "?" and holds no first person
  And no caption or story text holds "therapeutic massage only", a copied sample or a price

Scenario: The hours in words (amended 2026-11-23)
  Given Sen's hours "Mo-Su 08:30-23:00"
  When code deals a night post the hours
  Then its fact is "Open every day until 11 pm"

Scenario: Hours code can't say in words
  Given the hours "Mo-Fr 09:00-18:00; Sa 10:00-14:00"
  When code deals a night post its fact
  Then the hours are never its fact

Scenario: Each post's guests and therapists
  Given Sen's post 1 is a laptop post with one guest and one therapist
  When code writes the plan's user text
  Then "### Reasons" holds "1. laptop: one guest, one therapist"

Scenario: Two therapists on an image of one
  Given Sen's post 1 has one guest and one therapist
  When its caption says "Two therapists come to your room"
  Then the batch's dropped list holds 'post-1: caption for two therapists, image of one'
```

## Known limits

- Code can't tell whether a post makes anyone want to book: the
  maintainer's reading of the recordings does. The records catch the
  failures seen so far, by their words.
- The reason words are rough: "Long day in Da Nang? We come to you tonight"
  passes `stayIn` on "tonight" though it names only a mood, and a question
  can carry its reason in words not on a list.
- The copy record matches the samples' listed phrases and Maré's places: a
  sample said again in other words passes, and so does a phrase not on the
  list.
- The turned-away list matches words. A highlight that turns a request away
  in other words is dealt; one that says "only" for a good reason ("only 10
  minutes from the beach") is never dealt.
- A business that comes to its guests but whose read found no service area
  gets today's posts, `ask` question included, until its service area is
  read or typed in "Your business".
- Svarga's saved read has no moments: its `dayOut` questions lean on its
  places, as 2.18's `sore` questions do.
- Five reasons, two an attempt: a reason comes back every two or three
  attempts, in new words. Nothing records a question repeated across days.
- Svarga's "Massage at your villa or hotel" is left out as a fact by its
  words; a longer highlight that only says where the massage happens is
  still dealt, and repeats the answer.
- Code reads hours written as schema.org writes them, or with "daily",
  "every day" or a range of days and one time range; other hours give no
  fact.
- Only the prompt asks a caption to name its own treatment and part of the
  body: no record checks them.

## Out of scope

- Reasons to book for businesses that don't come to their guests: cafés,
  tours, spas guests go to. They keep today's posts.
- Prices, which never go in a caption or story text (2.17b).
- A second model call to judge or rewrite a post.
- Reviews as proof in a post.
- The WhatsApp line's words.
- The images: a sign of the reason in the photo (a laptop, a suitcase).
- Reels and carousels.
