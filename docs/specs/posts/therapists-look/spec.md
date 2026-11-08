---
title: "The therapists' look in images"
description: "The brand read writes down what the therapists wear and how their hair is done, from what the site says or its photos show; the owner sees and can change it in \"Your look\"; every image made from then on dresses the therapists that way, while captions and story texts stay as they are and the therapists stay women."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-08T15:27:09Z }
date: "2026-11-08"
---

# The therapists' look in images

## Goal

Today the image model chooses what the therapists wear. The image prompt
only says who they are ("One therapist, a young Vietnamese woman", then
"Every therapist is a young local woman with warm, golden-tan skin…",
`posts/varied-images`), so nothing keeps one image's clothes like the next,
and none matches what the spa's own therapists wear when they arrive at a
guest's villa.

On 2026-11-07 the maintainer asked that the therapists' look, how they look
and what they wear, clothes and colours, show in the next posts and stories,
and rebuilt both pilot sites so that it shows. The new sites went live on
2026-11-08:

- **Sen** (sendanangmassage.com): in its treatment and team photos, a white
  short-sleeved tunic with a small stand-up collar, white trousers, and dark
  hair in a neat low bun. Its largest photo, at the top of the home page,
  shows a black top instead.
- **Svarga** (svargabalimassage.com): in its treatment photos, a dark
  short-sleeved tunic (black or navy) with dark trousers, and the hair in a
  bun. Smaller team photos lower down show white and sage-green tops, and
  two photos show a man as the therapist.
- Neither site says it in words: both only say that the therapists arrive in
  a clean uniform and carry identification.

The app can't use any of this: the brand read's prompt says "Never describe
people", and the brand profile has no field for it.

This item makes the brand read write down the therapists' look, shows it on
"Your business" where the owner can change it, and dresses the therapists
that way in every image made from then on. Stories use the same images, so
they show it too.

The maintainer's calls (2026-11-08):

- **Images only.** Captions and story texts don't mention the look.
- **Always women.** The images keep showing women therapists, even where a
  site also shows men.

Success: Sen's next images show its therapists in white tunics and white
trousers, and Svarga's in dark tunics and dark trousers, both with the hair
in a bun, alike in every image, day or night, one therapist or two; no
caption or story text changes; and a site whose pages and photos show no
therapist gets the same images as today.

Why now: both pilot spas rebuilt their sites for it, and their next posts
should look like the people who will arrive at a guest's door.

## Behaviour

### What the brand read writes down

The brand profile gets one field, `staffLook`: what the staff who give the
service (for a spa, its therapists) wear, and their hair, written for an
image model to dress them alike. It is a sourced value (`{ value, source }`)
or `null`.

- **The pages first, then the photos.** When a page says what they wear,
  that page is the source (its URL). Otherwise the photos the read already
  looks at (up to 6, `lib/brand/extract/visual.ts`) give it, with
  `source: "model"`, as for the colours and the visual style. When neither
  shows them, it is `null`.
- **What it says, in this order:** the top (its cut, sleeves, collar and
  colour), the trousers or skirt and their colour, anything else worn for
  work, then the hair. One phrase, with no "she", "they" or name, at most 30
  words. For example: "a white short-sleeved tunic with a small stand-up
  collar, white trousers, dark hair in a neat low bun".
- **Photos that disagree:** what most of them show. On Sen's site, the white
  tunic, not the top photo's black top.
- **Only the women's look.** The app always shows women therapists, so the
  read describes what the women wear and never names a man. Where only men
  are shown, it is `null`.
- **Never** a face, skin, body, age, or anything that suggests more than a
  professional treatment.

The prompt (`lib/brand/prompt.ts`) says this in a new field note, and rule
3's "Never describe people." becomes "Never describe people in it.", so it
still holds for the visual style. `BRAND_PROMPT_VERSION` becomes `brand-8`.

**Code's checks** (`lib/brand/checks.ts`), after the model call:

- The source must be one of the pages read, or `"model"` when at least one
  photo was read. Otherwise the look is dropped (`unknown_source`, or
  `no_photos`).
- A look that names a man (`man`, `men`, `male`, `boy`, `gentleman`, `he`,
  `his`, whole words, any case) is dropped (`names_a_man`).
- A look of more than 30 words is cut after its last comma within its first
  30 words, or at 30 words when it has no comma there.

Each drop goes in the profile's `dropped` list, as today.

### The profile on the phone

`profileSchema` (`lib/brand/profile.ts`) gets `staffLook`, a sourced value of
at most 30 words, or `null`, and its `schemaVersion` becomes 3. A profile
saved before this (version 1 or 2) opens as before, with `staffLook: null`:
nothing is lost, and nothing is read again by itself. (Builder's call: the
upgrade extends `upgradeProfile`, as 1.3 did for version 2.)

The post plan never sees the look: `postsModelInput` (`lib/posts/input.ts`)
picks its fields one by one and doesn't pick this one. So the captions, the
story texts, and the profile hash that marks captions out of date are not
changed by it, and editing the look rewrites no caption.

### "Your look"

The "Your look" section of "Your business" shows a new line after "Visual
style":

- **Your therapists' look**, its text, and under it the source line, as for
  other facts: "from /path" when a page says it, "our guess from your
  photos" when only the photos show it, "added by you" once the owner
  changes it.
- **Empty**, it is listed with what's missing at the top of "Your business"
  (`platform/friendlier-home`), and counted in the section's "{count} to
  add", like the visual style.
- **The form** ("Edit Your look") gets one text field, "Your therapists'
  look", with the hints the other fields use: "Up to 30 words" and "Write in
  English: your posts are in English." Over 30 words, it shows "That is too
  many words." A look that names a man, by the read's check above, shows
  "Describe what your women therapists wear: the images always show women."
  Empty is allowed, and saves `null`. (Builder's call: the images always
  show women, so the owner's look follows the read's rule; the image route
  checks only the length, since the server trusts the phone, as
  `platform/usage-counters` says.)
- **"Read it again"** reads the look afresh with the rest. An owner's change
  to it counts among the changes "Read it again" asks about first, as for
  any sourced field.

(Builder's call: the line sits in "Your look" because it is about how the
images look. The collapsed section's one line stays the visual style's
summary.)

### Every image made from now on

The phone sends the look on "Your business", as it is at that moment, with
every image it asks for: an attempt's first images, "Try again", "Make the
images", "Create new image", and an image asked for again after the owner
comes back. The image route (`POST /api/posts/image`) takes it as an
optional `staffLook` of 1 to 300 characters, and refuses a longer one as an
invalid request. An empty look is not sent.

With a look, code says it twice in the image prompt (`lib/posts/image-prompt.ts`,
`IMAGE_PROMPT_VERSION` becomes `images-10`):

1. **With the cast**, before the post's own image prompt, for example "One
   therapist, a young Vietnamese woman. Her look: a white short-sleeved tunic
   with a small stand-up collar, white trousers, dark hair in a neat low
   bun." With two therapists: "Two therapists, both young Balinese women,
   dressed alike. Their look: a dark navy short-sleeved tunic, dark trousers,
   hair in a neat bun."
2. **In the style line's therapist rules**, which come last, so the look
   holds whatever the post's image prompt or the owner's hint says, for
   example "Every therapist's look, whatever the scene says: {look}."

A post saved before set-ups has no cast line: its look is said in the last
rules only.

(Builder's call on the exact words. What's fixed: the look is said with the
cast and again in the last rules; two therapists are dressed alike; the
rules on women, skin, hands and faces stay as they are.)

Without a look (none found on the site, or an owner who emptied it), the
image prompt is today's, word for word, apart from its version.

Images already made keep their look; only new ones follow. The look never
changes a caption, a story text, the hashtags or the alt text.

### Usage and cost

No new model call: the look comes from the same brand read, and each image
is the same single request. The image prompt gets about 40 words longer.
Decision 0004's price and cap are unchanged.

### Sen and Svarga

Once this ships, Sen's and Svarga's phones show "Your therapists' look" as
missing until the owner taps "Read it again" (one of the day's website
reads) or types the look. The maintainer does this with each spa, or tells
them.

### Other documents

The PR that ships this item:

- adds its row to `docs/roadmap.md` (2.16) and marks it `done`;
- adds a dated note, "> Changed by `posts/therapists-look` (2026-11-08): …",
  where it changes `brand/extract-site` ("The model call": the visual style's
  rule; "The brand profile": the new field and version 3), `brand/brand-panel`
  ("The panel": the new line in "Your look") and `posts/varied-images` (the
  cast line and the therapist rules); their status and approval untouched.

### Strings

New, in the same commit as the code. The Indonesian and Vietnamese are the
developer's; the owners read them back during the pilot.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `brand.panel.fields.staffLook` | Your therapists' look | Penampilan terapis Anda | Diện mạo kỹ thuật viên của bạn |
| `brand.edit.errors.namesAMan` | Describe what your women therapists wear: the images always show women. | Tuliskan pakaian terapis wanita Anda: gambar selalu menampilkan wanita. | Hãy tả trang phục của nữ kỹ thuật viên: hình luôn là nữ kỹ thuật viên. |

### Tests

- Vitest:
  - the prompt holds the new field note, "Never describe people in it.", and
    `brand-8`;
  - the checks: a look from a page keeps its URL; from photos, `"model"`;
    `"model"` with no photo read is dropped; a look naming a man is dropped,
    one saying "woman" or "women" is kept; a 40-word look is cut at a comma
    within 30 words;
  - a version 1 or 2 profile opens as version 3 with `staffLook: null`; a
    version 3 profile with a look passes;
  - `postsModelInput` and `profileHash` are the same with and without a
    look;
  - "Your look" shows the line and its source; empty, it is listed as
    missing; the form saves it as the owner's, saves an empty one as `null`,
    and refuses 31 words and a look that names a man;
  - the image body takes `staffLook` and refuses 301 characters; the image
    prompt with a look holds it with the cast and in the last rules, for one
    therapist and for two, and for a post with no set-up in the last rules
    only; without a look, it is images-9's prompt word for word apart from
    the version;
  - the phone sends the profile's look with first images, "Try again",
    "Create new image" and an image asked for again, and none when the look
    is empty.
- Playwright at the phone viewport, models mocked: a read whose answer has a
  look shows it in "Your look"; after the owner edits it, a new image is
  asked for with the edited look.
- The strings check in `pnpm check` (three languages).

### Checked with the real model

Only with the maintainer's yes, asked at the time, and never on a pilot day
(AGENTS.md):

1. **Save the new sites** as Sen's and Svarga's test copies, with
   `pnpm fixtures:save https://www.sendanangmassage.com/ sen` and the same
   for Svarga: no AI call. Each `expected.json` is checked against the new
   pages, and gets the words its look must hold: Sen's "white"; Svarga's
   "black", "navy" or "dark". (Builder's call: an optional list in
   `expected.json`, scored only where present.)
2. **Read them** with the real model, recorded: `pnpm eval:brand sen svarga
   --record`, 2 requests from the day's pool. Both pass as before, and each
   look holds one of its words and names no man. If Sen's says black, the
   developer stops and asks the maintainer.
3. **Make their test images**: `pnpm eval:images sen svarga`, 4 images,
   about $0.20. The maintainer looks at them: the therapists wear their
   spa's look in every image.

The recorded post plans (`posts.json`, `posts-offer.json`) stay as recorded;
their replay test runs on the new profiles.

## Acceptance criteria

```gherkin
Scenario: Sen's look is read from its photos
  Given Sen's new site, whose photos show white tunics and white trousers
  When its owner reads the site
  Then "Your look" shows "Your therapists' look" with a white tunic, white trousers and the hair in a bun
  And under it "our guess from your photos"

Scenario: Svarga's look is a woman's
  Given Svarga's new site, where two photos show a man as the therapist
  When its owner reads the site
  Then the look describes the dark tunic and the dark trousers
  And it names no man

Scenario: The owner changes the look
  Given Sen's profile with its look
  When the owner edits "Your look" and writes "a pale green tunic, white trousers, hair in a low bun"
  Then the line shows it, with "added by you"
  And no caption is rewritten

Scenario: The owner's look names a man
  Given the "Your look" form
  When the owner writes "dark navy tunics; the men wear white shirts" and saves
  Then the form shows "Describe what your women therapists wear: the images always show women."
  And the look is not saved

Scenario: Every new image follows the look
  Given Sen's look is "a white short-sleeved tunic with a small stand-up collar, white trousers, dark hair in a neat low bun"
  When an attempt's two images are made
  Then each image prompt gives the therapists that look with the cast, and again in its last rules
  And a four-hands image dresses both therapists alike

Scenario: A new image after the look changed
  Given an attempt whose images were made with Sen's look
  When the owner changes the look and taps "Create new image" on a suggestion
  Then the new image is asked for with the changed look
  And the images already made stay as they are

Scenario: No look found
  Given a profile with no look
  When an image is made
  Then the image prompt is today's, apart from its version

Scenario: A profile saved before this
  Given an owner's phone with a profile saved before this item
  When the app opens
  Then the profile opens as before
  And "Your therapists' look" is listed as missing

Scenario: Captions stay as they are
  Given two profiles that differ only in their look
  When posts are planned for each
  Then the post plan's model is given the same profile
```

## Known limits

- **The read sees at most 6 photos** (`MAX_PHOTOS`). A look shown only on
  other photos is missed, and the owner types it.
- **The read may still pick the wrong look** where photos disagree, as on
  Sen's site, whose top photo shows a black top. The owner fixes it on "Your
  business"; changing that photo on the site is the maintainer's call.
- **Always women.** A spa whose site shows men therapists still gets women
  in its images (the maintainer, 2026-11-08).
- **The owner's hint can't change the look of one image:** the look on "Your
  business" wins. To change it, the owner changes the look.
- **Images already made keep their look.** Only new images follow it.
- **The image model may still vary small details**, like a collar or a shade
  of navy; the developer judges on the test images.
- **Words, not pictures:** the image model gets the look as words, never one
  of the site's photos.

## Out of scope

- Captions and story texts that mention the look (the maintainer,
  2026-11-08: images only).
- Men therapists in the images.
- Faces: still never shown (`posts/varied-images`).
- Giving the image model one of the site's photos as a reference: a new
  decision, if the words aren't enough.
- More photos for the brand read: `MAX_PHOTOS` stays 6.
- The owner guide: unchanged. Its "Check what it found" already covers the
  new line.
- Sen's top photo on its website.
