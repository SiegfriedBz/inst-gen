---
title: "Generate copy"
description: "From the saved brand profile, one streamed text call plans six posts and writes each one's caption, hashtags, alt text and image prompt; code checks the facts, adds the WhatsApp call to action, and keeps the batch on the phone; a brand edit marks captions out of date, and one call rewrites them."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-25T12:43:53Z }
date: "2026-10-25"
---

# Generate copy

## Goal

Sen and Svarga opened their Instagram accounts this week, and both are empty.
Phase 1 gives each a brand profile the owner has checked in the panel. Phase
2 turns it into posts the owner would publish as they are: about 12 for the
launch, then about 3 a week (decision 0004).

This spec writes the words and plans the images. For one tap on "Make my
posts", the owner gets **six posts**. Each has:

- a **type** and a **topic**, spread so the six don't repeat each other;
- a **caption** in English, built from facts in the profile, ending with the
  business's WhatsApp number;
- up to 5 **hashtags**, mixing the town and the trade;
- **alt text** for the image;
- an **image prompt** that 2.3 (`posts/generate-images`) turns into a tall
  image, following decision 0004's prompt lessons.

Success: on Sen and Svarga, the developer would post at least 4 of the 6
captions as written, and none states a fact or a price the site doesn't. This
is the copy half of phase 2's gate.

Why now: 2.3 needs the image prompts, 2.4 needs the captions to show and
download, and decision 0003 asks this spec to batch caption re-writes after
brand edits.

## Behaviour

### Starting a batch

At the bottom of the brand panel, under the five sections, a button **"Make
my posts"**.

- It needs a WhatsApp number in the profile, since every caption ends with
  it. Without one, the button is disabled and the line under it repeats
  1.2's warning: "Add your WhatsApp number: every post ends with it."
- It is disabled while a brand read or re-read runs, and while a batch is
  already being made.
- A town is not required. Without one, the hashtags lean on the trade
  (1.2 already warns "Add your town: posts and hashtags use it.").
- Tapping it starts a run (decision 0005): a run record of kind `posts` with
  one step, `plan`, saved in IndexedDB; the screen wake lock is requested, as
  for a read; and the line "Keep this page open for about a minute while your
  posts are made." shows until the step ends.
- If a batch already exists, the button reads **"Make 6 more"**. The new batch
  is added; earlier batches are kept (see "On the phone").

### The request

`POST /api/posts/plan`, reached only with a valid pilot session (`proxy.ts`).
Body, checked with zod:

```json
{ "profile": { "…": "the saved profile, schemaVersion 2" },
  "recent": [ { "type": "offer", "topic": "Hot stone massage after a day on the beach" } ] }
```

- `profile` is checked with `profileSchema`.
- `recent` holds the type and topic of the owner's last 12 posts, newest
  first, so a new batch doesn't repeat them. It is empty for the first batch.
  Captions are not sent back.

The route builds the model's input from the profile, **leaving out every
contact field** (WhatsApp, phone, email, Instagram, booking link) and the
street address: the model never needs them, since code adds the call to
action, and what goes to Gemini's free tier stays to public business facts
(decision 0003). It sends: name, summary, category, offerings (with prices
and durations), highlights, town, area, service area, hours, tone, essence
(promise, feeling, place symbols, senses, moments, search terms), visual
style, and colours.

### The model step

One structured, streamed call through the text-model module, which gains a
`streamPostPlan` method next to `streamBrandProfile`.

- **Model.** A new constant `TEXT_MODELS.posts`, set to
  `gemini-3.5-flash-lite`. Decision 0003 named `gemini-3.8-flash` for the post
  plan, but on the free tier Flash took 103 to 114 s for a brand read
  (extract-site journal, 2026-10-24), past any step's 60 s cut-off. The plan's
  first eval runs both on Sen and Svarga, if Flash's time allows, and the
  journal records the times and the developer's pick. Flash wins only if it
  finishes under 45 s and reads better.
- **Thinking level** `low`, as the brand read; the builder may raise it if the
  eval shows better captions within the time limit.
- **Prompt.** Its own module and version constant, `POSTS_PROMPT_VERSION`
  (`posts-1`), bumped with every change.
- **Cut-off.** The route sets `maxDuration` to 300 s and gives up by itself at
  60 s (decision 0005); typical time should be under 30 s, measured and
  recorded in the journal.
- **Streaming.** The response is NDJSON lines in the brand read's format
  (`lib/brand/stream.ts`): `partial` lines as posts fill, then one `final`
  line with the checked batch, or one `error` line. The browser shows each
  post as soon as its caption is complete.
- `maxRetries: 0`, and `request.signal` reaches the model call, as for the
  brand read.

### What the model writes

Six posts. The prompt holds these rules; code checks the ones it can (next
section).

**The mix.** Types, from the Global Plan's list, adapted to what a site can
ground:

| Type | What it is about | Grounded in |
|---|---|---|
| `offer` | One treatment or package, what it does for the guest, its price and duration when the site gives them | `offerings` |
| `moment` | A reason people come: after a surf, a hike, a long flight | `essence.moments` |
| `local` | The town or area and what it's known for, tied back to the business | `essence.placeSymbols`, `location` |
| `ritual` | How a treatment unfolds: the oils, the warm towels, the quiet, never staff | `offerings`, `essence.senses` |
| `tip` | A small piece of care advice tied to the trade (stretch after a dive, drink water after a massage) | category, `essence.moments` |
| `proof` | What the site says about the business: years open, a promise, a "5 stars on…" it quotes | `highlights`, `essence.promise` |

- At least 2 `offer` posts, on 2 different offerings when the profile has
  two. At most 2 posts of any type. At least 4 different types in the six.
- `proof` only when `highlights` or `essence.promise` gives something to say;
  never an invented review, rating or customer.
- No post repeats the topic of one in `recent`.
- Each post gets a `topic`: one line, ≤ 12 words, saying what it is about.
  It's what `recent` sends back next time.

**The caption.**

- English, in the profile's `tone` words, written to tourists and expats
  nearby.
- A first line of at most 125 characters that works on its own: it is what
  Instagram shows before "more".
- 250 to 700 characters in all, before the call to action. Short paragraphs,
  no hashtags in the text, at most 2 emoji.
- Facts only from the profile: a price, a duration, a number of years, a
  place name or a claim appears only if the profile holds it. Feelings,
  senses and place symbols are interpretation and may be used freely.
- No call to action and no contact details: code adds them.
- No words that are banned for this trade on Instagram or that suggest
  anything but a professional treatment ("sensual", "happy ending", "body to
  body"…; the prompt holds the list).

**Hashtags.** 3 to 5, without the `#` in the model's answer: one or two on
the town or area (`danang`, `canggu`), the rest on the trade and the moment
(`massagedanang`, `aftersurf`), drawing on `essence.searchTerms`. Lower case,
letters and digits only. 5 is Instagram's current limit per post; the builder
checks it before the plan starts and records it in the journal.

**Alt text.** At most 125 characters, describing what the image will show,
written from the image prompt: "Hands pressing warm oil into a guest's
shoulders on a hotel balcony at dusk". No "image of".

**The image prompt.** English, at most 80 words, read by 2.3. It follows
decision 0004's lessons, and the maintainer's verdicts on the first images
(generate-images journal, 2026-10-25):

- **The massage is in every image:** a therapist's hands working on a guest,
  or oil or towels being used for a treatment. Only what the business offers:
  a tool or treatment appears only if `offerings` holds it (no hot stones
  for a business that doesn't offer them). Never a guest alone, never an
  empty room, never a drink or a prop on its own.
- A guest looks relaxed and alive, with the therapist there: never lying
  still as if asleep.
- Light low, soft and warm: dusk, a lamp, lanterns, candles. Never bright
  sun, grey sky, mist, rain or damp.
- Places clean, tidy and cared for: beds and linens neatly made, nothing
  rumpled or messy.
- Rooms warm and homely, like a boutique hotel or villa; never clinical or
  hospital-like.
- Still air: curtains hang still, no wind.
- Oil looks like massage oil: golden oil in a clear glass bottle, or poured
  into a palm; never a small dark bottle that could pass for medicine.
- For a business that goes to the guest (its `serviceArea` says so, as Sen's
  and Svarga's do), the scene is the guest's hotel room, balcony or villa,
  not a spa building.
- No guest seen from behind; no recognisable face; no text, logos or
  labels (bottles are plain).
- The palette, light and textures of `visualStyle`, and the senses and place
  symbols of the essence.
- Never the business's own premises, products or staff as if real (Global
  Plan, "Honest images").

Each post also gets a `scene`, and every scene shows the massage:
`treatment` (the therapist's hands at work on the guest), `detail` (a close
view of the treatment: oil poured into a palm, warm towels laid on a back),
`place` (the guest's room, balcony or villa with the massage under way in
it) or `guest` (the guest relaxed during the treatment, the therapist's
hands in the frame). Across the six, at most 2 of any scene, so the grid is
varied (decision 0004, criterion 6). The prompt version becomes `posts-2`.

### What code checks

Code checks the model's answer as 1.1's checks do: it trims, drops or flags,
records each change in the batch's `dropped`, and never refuses the whole
batch for one bad item.

- **Count.** Fewer than 6 posts after checks: the batch is kept with what it
  has, and the panel says "We made {count} posts this time." More than 6:
  the extra ones are dropped.
- **Mix.** A type over 2, or a scene over 2: kept, recorded in `dropped` as
  `{ field: "mix", reason }`. Code doesn't rewrite a post.
- **Prices and numbers.** Every price-like string in a caption (a currency
  symbol or code next to a number, or a number followed by `k`, `VND`, `IDR`,
  `$`, `USD`) must match a `price` in `offerings`, compared on its digits.
  Every duration ("60 minutes", "90 min", "1 hour") must match a `duration`.
  A caption with an unmatched one keeps its text and gets a flag,
  `unchecked: ["price 450k"]`, shown to the owner (see "On the screen").
  The check is best effort and says so.
- **Banned words.** A caption holding a word from the prompt's list is
  flagged the same way.
- **Length.** A first line over 125 characters is kept and flagged; a
  caption over 700 characters is cut at the last sentence that fits.
- **Hashtags.** `#` removed, lower-cased, anything but letters and digits
  removed, duplicates and empty ones dropped, trimmed to 5.
- **Alt text** cut to 125 characters at a word boundary.
- **Image prompt** cut to 80 words.

**The call to action**, added by code, never by the model: a blank line, then
"Book on WhatsApp: {number}", with the number as the profile holds it. It is
stored apart from the caption (`cta`), so a WhatsApp edit changes it on every
post without a model call.

### On the phone

A batch is saved in IndexedDB, in a new `posts` store keyed by owner:

| Field | What it holds |
|---|---|
| `id` | A new id |
| `ownerId` | The owner's id |
| `createdAt` | When the batch was made |
| `profileReadAt` | The `readAt` of the profile it came from |
| `profileHash` | A hash of the profile fields the model saw, to tell when it changed |
| `promptVersion` | `POSTS_PROMPT_VERSION` |
| `model` | The model id |
| `posts` | Six `{ id, type, topic, scene, caption, cta, hashtags, altText, imagePrompt, unchecked }` |
| `dropped` | `{ field, reason }[]` |

- Batches are kept until "Forget my business" (1.2), which deletes them with
  the profile. A re-read keeps them; they still show, marked out of date (see
  below).
- `recent` is taken from the newest posts across batches.
- The run record follows decision 0005: a `plan` step left `running` with no
  live request goes back to `pending` on load or `visibilitychange`, and is
  asked for again; a batch saved as done is never asked for again.

### When the brand changes

Decision 0003 asks for one call, however many fields changed.

- When the saved profile's `profileHash` no longer matches a batch's, that
  batch shows a line above its posts: "Your business details changed since
  these posts were made." with a button **"Update captions"**.
- The hash covers only the fields the model sees. A WhatsApp edit doesn't
  change it; it changes every post's `cta` at once, with no call and no line.
- "Update captions" calls `POST /api/posts/rewrite` with the profile and the
  batch's posts (type, topic, scene, caption, image prompt). One streamed call
  on the same model rewrites the captions, hashtags and alt text of all the
  batch's posts, keeping each post's type, topic, scene and image prompt
  unchanged; the same checks run. The batch is saved with the new
  `profileHash`. Images are never touched (Global Plan: images change only
  when the owner taps regenerate).
- It's a button, not an automatic call: an owner who edits three sections in
  a row would otherwise spend three of about 20 daily requests.
- A posts run of kind `rewrite` uses the same run record and resume rule.

### On the screen

Until 2.4 builds the feed preview, the home screen shows each batch under the
panel, newest first, under the heading **"Your posts"**: one card per post,
in order, with

- the type as a small label ("Offer", "Why people come", "Your town",
  "The ritual", "Tip", "What people say");
- the caption, then the call to action, then the hashtags with their `#`;
- "Image description", then the alt text;
- when a caption has flags: a muted line "Check before posting:" followed by
  what was flagged ("price 450k is not on your site").

Each card shows as soon as its caption is complete, while the others fill.
The image prompt is not shown; 2.3 uses it. Captions are read-only here;
editing, copying, the owner's-language view and downloads are 2.4's.

### Failures

| Case | Answer | What the owner sees |
|---|---|---|
| Body fails the schema | `400 { error: "invalid_profile" }` | "Something went wrong while writing your posts. Try again." |
| Gemini 429 or 503 | `error` line `model_busy` | "Shopfront has used today's free writing. Try again tomorrow." (as 1.1 says it for a read) |
| Past the 60 s cut-off | `error` line `model_timeout` | "Writing your posts took too long. Try again." |
| Any other model error | `error` line `model_failed` | "Something went wrong while writing your posts. Try again." |
| Page closed or offline mid-run | — | On return the step is asked for again (decision 0005) |

A failed step keeps no partial batch: the cards that had appeared go away,
and "Make my posts" comes back with the message. No retry inside the step.

Each run writes one log line, like the brand read's: host of `siteUrl`, kind
(`plan` or `rewrite`), model, prompt version, posts kept, flags, model ms,
total ms, outcome. Never the captions.

### Strings

Every new visible string goes in `messages/en.json`, `id.json` and `vi.json`
in the same commit: "Make my posts", "Make 6 more", "Keep this page open for
about a minute while your posts are made.", "Your posts", the six type
labels, "Image description", "Check before posting:", the flag lines, "We
made {count} posts this time.", "Your business details changed since these
posts were made.", "Update captions", and the three failure messages above.
The captions themselves stay in English.

### Tests and evaluation

- Unit tests (Vitest) for: the model input (no contact fields, no address);
  the checks (count, mix, prices and durations matched on digits, banned
  words, lengths, hashtag cleaning); the call to action and a WhatsApp edit
  changing it without a call; `profileHash` (changes on a summary edit, not on
  a WhatsApp edit); `recent` (newest 12); the route's error answers; the run
  record's `plan` and `rewrite` steps and resume.
- Recorded model answers for Sen, Svarga and three more site fixtures
  (`posts.json` next to each fixture, as `recording.json` and `search.json`
  are), replayed in tests that never call the network.
- `pnpm eval:posts [slug…] [--record]` runs the plan on the fixtures with the
  real model and prints each batch with its checks. ⚠️ It spends 1 Gemini
  request per fixture, from the same daily quota as the app. AGENTS.md's
  commands table gains it.
- The developer reads Sen's and Svarga's batches against this rubric, and the
  verdicts go in the journal with the prompt version and model: would post as
  written, would post after a small edit, or wouldn't post; any fact not in
  the profile. Pass: at least 4 of 6 "as written" for each, and no
  ungrounded fact. There is no automatic score: whether a caption is worth
  posting is a judgement.
- A Playwright test at the phone viewport, with the model mocked: tap "Make my
  posts", see the "keep this page open" line, see six cards fill, reload and
  see them still there; edit the summary and see "Update captions"; with a
  `model_busy` line, see the message and the button back.

## Acceptance criteria

```gherkin
Scenario: No WhatsApp, no posts
  Given a saved profile with no WhatsApp number
  When the owner looks at the panel
  Then "Make my posts" is disabled
  And the line under it reads "Add your WhatsApp number: every post ends with it."

Scenario: A batch streams in
  Given Sen's saved profile with a WhatsApp number
  When the owner taps "Make my posts"
  Then "Keep this page open for about a minute while your posts are made." shows
  And post cards appear one by one under "Your posts"
  And six posts are saved on the phone with the prompt version and model

Scenario: The model never sees contact details
  Given a profile with a WhatsApp number, an email and an address
  When the model input is built
  Then it holds none of them

Scenario: Every caption ends with WhatsApp
  Given a batch made for a profile whose WhatsApp is "+84 905 123 456"
  Then every post's call to action reads "Book on WhatsApp: +84 905 123 456"

Scenario: A WhatsApp edit needs no model call
  Given a saved batch
  When the owner changes the WhatsApp number in the panel
  Then every post's call to action shows the new number
  And no request is made
  And no "Update captions" line shows

Scenario: An invented price is flagged
  Given a profile whose only price is "350,000 VND"
  When a caption says "only 450k"
  Then the post keeps its caption
  And its card shows "Check before posting:" with the price

Scenario: Hashtags are cleaned
  Given the model answers "#DaNang", "massage danang", "danang" and 4 more
  When code checks them
  Then the post has at most 5 hashtags, lower case, letters and digits only, without duplicates

Scenario: A new batch avoids the last ones
  Given a saved batch of six posts
  When the owner taps "Make 6 more"
  Then the request's recent list holds those six types and topics
  And the new batch is added, the old one kept

Scenario: A brand edit asks for one rewrite
  Given a saved batch
  When the owner edits the summary
  Then the batch shows "Your business details changed since these posts were made."
  When the owner taps "Update captions"
  Then one request rewrites the batch's captions, hashtags and alt text
  And each post's type, topic, scene and image prompt stay as they were

Scenario: A lost step is asked for again
  Given a posts run whose plan step was running when the page closed
  When the owner opens the app again
  Then the plan is requested once more
  And a batch already saved is never requested again

Scenario: The model is busy
  Given Gemini answers 429
  When the owner taps "Make my posts"
  Then the cards go away
  And the owner sees "Shopfront has used today's free writing. Try again tomorrow."
  And "Make my posts" is enabled again
```

## Known limits

- **Quota.** A batch, or a rewrite, costs 1 request of the text model's free
  daily quota, shared with brand reads and evals. Per-owner limits and the
  usage bar are 2.8's.
- **The price check is best effort.** Prices written in words, or a price
  equal in digits to another offering's, pass. The owner reads every caption
  before posting.
- **Facts outside numbers aren't checked by code.** An invented claim ("the
  best in Da Nang") is caught only by the prompt and the developer's read.
- **Alt text describes the prompt, not the image.** If 2.3's image differs,
  the alt text may not match; 2.3 or 2.4 may revise it.
- **"Update captions" rewrites the whole batch.** With no caption editing yet,
  nothing of the owner's is lost; 2.4 must decide what a rewrite does to a
  caption the owner edited.
- **English only**, as the Global Plan says; the owner's-language view is
  2.4's.
- The hashtag and alt-text limits are Instagram's as of 2026-10-25, confirmed
  by the builder; Instagram changes them.

## Out of scope

- Images, post and story crops: 2.3 `posts/generate-images`.
- The feed preview, editing a caption, copying, the owner's-language view,
  regenerating one post, and downloads: 2.4 `posts/editor-download`.
- Daily limits and the usage bar: 2.8 `platform/usage-counters`.
- Captions in other languages, scheduling and publishing: later phases.
- Instagram as a source of tone or past captions: phase 3.
