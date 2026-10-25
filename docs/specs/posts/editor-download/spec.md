---
title: "Editor and download"
description: "Each batch gets an Instagram-style feed preview; the owner edits a post's caption, hashtags and alt text, reads the caption in their own language through one small Flash-Lite call kept on the phone, asks for a new image with an optional hint, copies the words, saves each image, and downloads a batch as a ZIP; 'Update captions' leaves edited posts alone, with a per-post rewrite on offer."
status: draft
date: "2026-10-25"
---

# Editor and download

## Goal

2.2 (`posts/generate-copy`) and 2.3 (`posts/generate-images`) give the owner
six posts with captions and images, stored on the phone. The owner can read
them but can't change them, can't read them in Vietnamese or Indonesian, and
can't get them out of the app. So nothing is posted yet, and phase 2's gate
(Sen and Svarga would each post at least 4 of their 6 drafts) can't be
measured.

This spec covers the last step before Instagram (Global Plan, "Tweak" and
"Take it away"):

- a **feed preview**: the batch as a grid, the way the owner's profile will
  look once it's posted;
- **edits**: the caption, hashtags and alt text, inline, checked again by
  code;
- the **owner's-language view**: "Show in Tiếng Việt" or "Show in Bahasa
  Indonesia" on each caption, read-only, while what gets posted stays in
  English;
- **a new image**, optionally with a short hint ("more green");
- **taking it away**: copy the words, save the post and story images to the
  phone, or download the batch as one ZIP.

Success: on their own phones, Sen and Svarga each get at least 4 posts and
their stories from the app into Instagram, without help beyond the How-to
page that 2.7 will write. Every caption they post is one they've read in
their own language at least once, if they want to.

Why now: it's the last piece phase 2's gate needs. 2.2 and 2.3 handed over
everything listed here.

**Super easy to use** (the owner's rule for this item): the pilot's owners
use cheap, slow phones and aren't app people. Fewer buttons, fewer modes,
nothing to learn; when in doubt, leave a control out and add it later if
the owners ask.

## Behaviour

### Where things are

The "Your posts" section (2.2) gains a two-way switch at the top, under its
heading: **"Feed"** and **"Posts"**.

- **Posts** (the default) is today's list of cards, newest batch first, with
  the controls below added to each card.
- **Feed** is the preview. Tapping a tile switches to Posts and scrolls to
  that post's card.
- The switch remembers the owner's last pick on this phone (`localStorage`, read
  and written inside a `try`): a per-phone convenience, never saved with the
  batch.
- While a plan or rewrite streams, the switch stays on Posts, as today.

### The feed preview

An Instagram-style profile grid for all of the owner's posts, newest batch
first:

- A header like a profile's: a round initial (the business name's first
  letter on the brand's first colour, as the panel shows it), the business
  name, and the line "Your feed once these are posted".
- A 3-column grid with 2 px gaps. Each tile is the post crop, shown at
  Instagram's grid ratio (3:4 on 2026-10-25, a centred slice of the 4:5
  post). The builder checks the grid ratio on a real profile before starting
  and records it in the journal; Instagram changes it.
- Order: Instagram shows the last post first, so the grid shows each batch's
  posts in reverse. A note above the grid says "Post them from 1 to 6: the
  last one you post shows first.", and each card in Posts shows its number,
  "Post 1", "Post 2"….
- A post with no image yet shows a tile in the panel's muted colour with its
  type label. A failed image shows the same tile.
- Nothing in the grid can be edited; it's a preview.

### Editing a post

Each card gets an **"Edit"** button under the hashtags. It turns the caption,
hashtags and alt text into fields, with **"Save"** and **"Cancel"**.

- **Caption**: a textarea that grows with its text. The call to action is
  not part of it: it stays below, read-only, and still follows the WhatsApp
  number (2.2).
- **Hashtags**: one text field, written as the owner wants (`#danang
  massage`, `danang, massage`); code cleans them with 2.2's rules on save
  (lower case, letters and digits, no duplicates, at most 5). A line under
  the field says "Up to 5. Separate them with spaces."
- **Alt text**: a text field, at most 125 characters, with a counter.
- On **Save**, code runs 2.2's caption checks again on the new caption
  (prices, durations, banned words, first line), so "Check before posting:"
  reflects what the owner wrote. A caption over 700 characters is **not cut**
  this time: it's the owner's text. The only hard limit is Instagram's 2,200
  characters for caption, call to action and hashtags together. Past it,
  Save is disabled and the line "Too long for Instagram: {count} characters
  over." shows.
- An empty caption can't be saved ("Write a caption first.").
- Saving marks the post `edited: true` and saves the batch. Nothing goes to
  the server.
- **Cancel** puts the fields back as they were.
- An edited card shows a small muted "Edited" next to its type label.
- The image prompt, type, topic and scene can't be edited.

### "Update captions" and edited posts

2.2 left this open. When the business details change and the owner taps
"Update captions":

- **Edited posts are kept as the owner wrote them.** Only unedited posts go
  to `POST /api/posts/rewrite`, and only they come back rewritten.
- If every post in the batch is edited, no request is made: the batch takes
  the new `profileHash` and the line goes away.
- When at least one post is edited, the stale line adds: "Posts you edited
  stay as you wrote them."
- An edited post's flags are checked again against the new profile, with no
  call, so a price the owner removed from the site shows up as one to check.
- While the batch is out of date, each edited card shows a small **"Rewrite
  this one too"** button. It sends that one post to the same
  `POST /api/posts/rewrite`, replaces its caption, hashtags and alt text with
  the answer, and marks it `edited: false`. The owner's words are replaced
  only when they tap it. Once every post is rewritten or kept, the batch
  takes the new `profileHash` as above.

### The owner's-language view

When the screen's language is Indonesian or Vietnamese, every caption has a
button **"Show in Bahasa Indonesia"** or **"Show in Tiếng Việt"**: the
language's own name from `LOCALE_NAMES`, never translated. In English there's
no button.

- Tapping it shows the caption's translation in a muted box under the
  caption, labelled "In {language}, for you to read. Instagram gets the
  English." The button becomes **"Hide"**.
- Only the caption is translated: the call to action and hashtags stay as
  they are.
- **The request.** `POST /api/posts/translate`, reached only with a valid
  pilot session. Body, checked with zod: `{ "text": "…", "locale": "vi" }`,
  where `text` is 1 to 2,200 characters and `locale` is `id` or `vi`
  (`400 { error: "invalid_request" }` otherwise). The caption alone goes to
  Gemini, never the call to action, so no contact detail reaches the free
  tier (decision 0003).
- **The model.** `TEXT_MODELS.light` (`gemini-3.5-flash-lite`), decision
  0003's model for this view, through a new text-model method
  `translateCaption(text, locale, signal)`. Plain text out, not streamed:
  a caption is short and the call takes a second or two. Thinking level
  `minimal`. Its prompt lives in its own module with
  `TRANSLATE_PROMPT_VERSION` (`translate-1`): translate faithfully for the
  owner to understand, keep prices, numbers, names and emoji as they are,
  add nothing. `maxRetries: 0`, `request.signal` passed, a 20 s cut-off.
- **Kept on the phone.** Decision 0003 has one call "each time a view is
  opened"; this spec keeps the answer instead, so reopening the view costs
  nothing. A new IndexedDB store, `translations`, keyed by `postId` and
  `locale`, holds `{ postId, ownerId, locale, captionHash, text, model,
  promptVersion, createdAt }`. A saved translation is used only while its
  `captionHash` matches the caption; an edit or a rewrite makes the next
  view call the model again. "Forget my business" deletes them.
- **Read only when asked.** The pilot's phones are slow, so a translation
  is read from the store only when the owner taps "Show in…", never for
  every card when the list opens. A saved one shows at once, with no
  network.
- **Failures**, shown in the box with no retry inside the call: `model_busy`
  (429 or 503) "Shopfront has used today's free translations. Try again
  tomorrow."; `model_timeout` "The translation took too long. Try again.";
  anything else, `model_failed`, "Something went wrong with the translation.
  Try again." Each failure also brings back the "Show in…" button.
- One log line per call: owner id, locale, model, prompt version, characters
  in and out, ms, outcome. Never the text.

Keeping the answer is a call specific to this feature: it goes in the
journal, and decision 0003 is not rewritten.

### A new image

On a card with an image (or a failed one), a button **"New image"** opens a
small form under the image:

- An optional field "What should change? (optional)", at most 60 characters,
  with examples as its placeholder: "more green, a sunset balcony".
- **"Make it"** asks for one image, the way 2.3's "Try again" does, but with
  the hint. **"Cancel"** closes the form.
- The image request (2.3) gains an optional `hint`: a string of at most 60
  characters, trimmed, with line breaks removed. The route adds it to the
  prompt as one sentence before the style line, "The owner asks: {hint}.",
  so 2.3's rules still come last and win. `IMAGE_PROMPT_VERSION` becomes
  `images-4`. The hint goes to Google with the prompt; it is the owner's
  own words about the picture, not a contact detail.
- The current image stays on the card, dimmed, with "Making the image…" over
  it, until the new one arrives. If the new one fails, the old one stays and
  the failure's message (2.3's table) shows under it. The old image is
  replaced only once the new one is saved.
- The same allowlist applies (`IMAGE_OWNERS`): with images off, no "New
  image" button shows.
- Each new image costs about $0.05 of the prepaid balance, as 2.3's "Try
  again" does. Counting them a day (Global Plan: about 10 regenerations) is
  2.6's.
- The alt text is not rewritten: a line under the new image says "Check that
  the image description still fits.", until the owner edits the post or
  dismisses it.
- The post stays 2.3's centred crop of the story.

### Taking it away

Under each card's image and words, three actions:

- **"Copy caption"**: copies the caption, a blank line, the call to action,
  a blank line, and the hashtags with their `#`, through
  `navigator.clipboard.writeText`. The button reads "Copied" for 2 s. If the
  clipboard is refused, the text is selected in a sheet with "Copy it from
  here.".
- **"Save post image"** and **"Save story image"**: on a phone that can
  share files (`navigator.canShare({ files })`), they open the share sheet
  with the JPEG, so the owner can pick "Save Image" and find it in Photos,
  where Instagram looks. Otherwise they download the file with an
  `<a download>` link.
- File names: `{name}-{yyyy-mm-dd}-{n}-post.jpg` and `…-story.jpg`, where
  `name` is the business name in lower case with anything but letters and
  digits turned into `-`, the date is the batch's `createdAt`, and `n` is
  the post's number.

Above each batch's cards, **"Download all (ZIP)"** builds one ZIP in the
browser and downloads it as `{name}-{yyyy-mm-dd}.zip`:

```
1-post.jpg  1-story.jpg  …  6-post.jpg  6-story.jpg
captions.txt
```

- `captions.txt` holds, for each post in order: "Post {n}", the caption,
  the call to action, the hashtags, and "Image description: {alt text}",
  separated by a line of dashes. UTF-8.
- Posts without an image are left out of the images and say "(no image
  yet)" in `captions.txt`.
- The ZIP is stored, not compressed: JPEGs don't shrink. It is built with
  `fflate`'s `zipSync` (a new direct dependency, about 8 KB, chosen in the
  journal over writing a ZIP writer by hand), loaded only when the button is
  tapped.
- On an iPhone the ZIP lands in Files, not Photos; the per-image buttons are
  the way into Photos. The How-to page (2.7) says so.

### On the phone

- `postSchema` gains `edited: boolean`, defaulting to `false` when a stored
  batch lacks it, so older batches still load.
- The new `translations` store comes with the next database version; the
  upgrade adds it without touching the other stores.
- "Forget my business" deletes the translations with the batches and images.

### Strings

Every new visible string goes in `messages/en.json`, `id.json` and `vi.json`
in the same commit: "Feed", "Posts", "Your feed once these are posted",
"Post them from 1 to 6: the last one you post shows first.", "Post {n}",
"Edit", "Save", "Cancel", "Edited", "Up to 5. Separate them with spaces.",
the alt text counter, "Too long for Instagram: {count} characters over.",
"Write a caption first.", "Posts you edited stay as you wrote them.",
"Rewrite this one too", "Show in {language}", "Hide", "In {language}, for
you to read. Instagram gets the English.", the three translation failures,
"New image", "What should change? (optional)", its placeholder, "Make it",
"Check that the image description still fits.", "Copy caption", "Copied", "Copy it from here.", "Save
post image", "Save story image", "Download all (ZIP)", and in
`captions.txt`, "Post {n}", "Image description:" and "(no image yet)" in
English, as the captions are.

### Tests and evaluation

- Unit tests (Vitest) for: hashtag and caption checks on an edit (no cut,
  the 2,200 limit, flags again); the rewrite sending only unedited posts,
  none when all are edited, and one post for "Rewrite this one too";
  `edited` defaulting to `false` on an old batch; the translate route's
  schema, its failures, and that only the caption is sent; the translation
  store and its `captionHash` rule; the image route's `hint` (cleaned,
  placed before the style line, version `images-4`); file names; the ZIP's entries and
  `captions.txt`; "Forget my business" and the translations.
- A recorded Flash-Lite translation for one Sen caption in Vietnamese and
  one Svarga caption in Indonesian, replayed in tests.
- The developer reads those two translations (Google Translate back to
  English is enough) for added or lost facts, and records the verdict in
  the journal with the prompt version.
- Playwright tests at the phone viewport, with the routes mocked: switch to
  Feed and see six tiles, tap one and land on its card; edit a caption, save,
  reload, see it kept and "Edited"; edit the summary, tap "Update captions",
  see the edited caption unchanged, then tap "Rewrite this one too" and see
  it replaced; switch the screen to Vietnamese, tap "Show in Tiếng Việt",
  see the translation, reload and open it again with no request; ask for a
  new image with a hint and see the request carry it; tap "Download all (ZIP)" and check the downloaded file's
  entries.
- On a real iPhone and a real Android phone, the developer saves one post
  image and one story image to Photos through the share sheet and posts
  them from Instagram, and records it in the journal: the share sheet can't
  be tested in Playwright.

## Acceptance criteria

```gherkin
Scenario: The feed preview
  Given a batch of six posts with their images
  When the owner taps "Feed"
  Then a 3-column grid shows the six post images, post 6 first
  When the owner taps a tile
  Then the Posts list shows, scrolled to that post's card

Scenario: Editing a caption
  Given a post whose caption has no flags
  When the owner edits the caption to add "only 450k" and saves
  Then the card shows the new caption and "Edited"
  And "Check before posting:" lists the price
  And no request is made

Scenario: Too long for Instagram
  Given a post with its call to action and five hashtags
  When the owner writes a caption that takes the total past 2,200 characters
  Then "Save" is disabled
  And "Too long for Instagram: {count} characters over." shows

Scenario: Hashtags are cleaned on save
  When the owner writes "#DaNang massage, danang #spa" and saves
  Then the post's hashtags are danang, massage and spa

Scenario: An update keeps the owner's edits
  Given a batch with two edited posts
  When the owner edits the summary and taps "Update captions"
  Then the request holds the four unedited posts only
  And the two edited captions stay as the owner wrote them

Scenario: Rewriting one edited post on request
  Given an out-of-date batch with an edited post
  When the owner taps "Rewrite this one too" on that post
  Then one request holds that post only
  And its caption is replaced and "Edited" goes away

Scenario: Every post edited
  Given a batch whose six posts are all edited
  When the owner edits the summary and taps "Update captions"
  Then no request is made
  And the "Your business details changed" line goes away

Scenario: Reading a caption in Vietnamese
  Given the screen is in Vietnamese
  When the owner taps "Show in Tiếng Việt" on a caption
  Then one request sends the caption, without the call to action
  And the translation shows under the caption
  When the owner reloads and opens it again
  Then no request is made

Scenario: An edit makes the translation old
  Given a saved Vietnamese translation of a caption
  When the owner edits that caption and opens the view again
  Then a new translation is requested

Scenario: No view in English
  Given the screen is in English
  Then no caption has a "Show in" button

Scenario: A new image with a hint
  Given Sen is on the image allowlist and a post has its image
  When she taps "New image", writes "more green" and taps "Make it"
  Then one image request carries the hint "more green"
  And the old image stays on the card until the new one is saved

Scenario: A new image fails
  Given the image model returns no image
  When the owner asks for a new image
  Then the old image stays
  And "This image couldn't be made. Try again for a new one." shows

Scenario: Copying a caption
  When the owner taps "Copy caption"
  Then the clipboard holds the caption, the call to action and the hashtags with their "#"
  And the button reads "Copied"

Scenario: Downloading a batch
  Given a batch of six posts with five images
  When the owner taps "Download all (ZIP)"
  Then a ZIP downloads with ten JPEGs and captions.txt
  And captions.txt says "(no image yet)" for the post without one

Scenario: Forget removes the translations
  Given saved translations
  When the owner forgets her business
  Then the translations store holds none of hers
```

## Known limits

- **The translation is for reading.** Flash-Lite may soften or miss a
  nuance; the owner reads it to understand, not to check every word. No
  native speaker reviews it during the pilot.
- **Translations share the free text quota** with brand reads and post
  plans, on Flash-Lite's own daily pool. Keeping them on the phone means each
  caption costs one call per language, until it changes.
- **The alt text isn't rewritten for a new image.** The card asks the owner
  to check it; 2.2's "alt text describes the prompt" limit stands.
- **New images are counted only by the balance and the allowlist** until
  2.6.
- **The post crop can't be moved**: it's always the story's centre. 2.3's
  journal found no crop cutting its subject on twelve images; when one does,
  "New image" is the way out.
- **The 3:4 grid ratio and the 2,200-character limit** are Instagram's as
  of 2026-10-25, confirmed by the builder; Instagram changes them.
- **The share sheet differs by phone.** Where it can't take files, the
  image downloads to the phone's files instead, and the owner moves it to
  Photos.
- **No undo** after Save or a new image, beyond Cancel before
  saving.
- Edited captions aren't checked for facts beyond 2.2's code checks.

## Out of scope

- Regenerating a whole post (new caption and image together, Global Plan
  "Tweak"): left out to keep this spec to about a day; added to the roadmap
  after the pilot if the owners ask for it.
- Moving the post crop inside the story: left out to keep the card simple,
  since 2.3's crops kept their subjects; added after the pilot if the owners
  ask.
- Counting regenerations and translations a day, and the usage bar: 2.6
  `platform/usage-counters`.
- How to post a story with a WhatsApp sticker, saving hashtags, and the
  share sheet steps: 2.7 `guide/owner-guide`.
- Review replies and their owner's-language view: 2.5 `reviews/reply-drafts`.
- Scheduling and direct publishing: never in the MVP (Global Plan).
- Captions in the owner's language for posting: later phases.
