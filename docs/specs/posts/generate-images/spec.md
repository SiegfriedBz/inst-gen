---
title: "Generate images"
description: "Once a batch's captions are saved, the browser asks for its six images in parallel, one request each; the server makes a 9:16 image with Nano Banana 2.1, shrinks it to a 1080×1920 story and a centred 1080×1350 post crop, both JPEG, and the phone keeps them; only owners on an allowlist can make images until usage counters ship."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-25T12:43:53Z }
date: "2026-10-25"
---

# Generate images

## Goal

2.2 (`posts/generate-copy`) gives the owner six posts with captions and an
image prompt each, but no pictures. An Instagram post without its image can't
be posted, so phase 2's gate (Sen and Svarga would post at least 4 of 6
drafts) can't be met yet.

This spec turns each post's image prompt into **one tall image**, used as it
is for the **story** (1080×1920, 9:16) and cropped for the **post**
(1080×1350, 4:5), with Nano Banana 2.1 (decision 0004). The images show up on
the post cards as they are made and stay on the phone.

Success: on Sen's and Svarga's batches, the developer would post at least 4
of the 6 images as they are (decision 0004's "a tourist would book this"),
the post crop never cuts the subject, and a batch's six images cost about
$0.30 and arrive in about 30 s.

Why now: 2.4 (`posts/editor-download`) needs the images to preview and
download, and phase 2's gate needs them in front of the owners.

## Behaviour

### When images are made

Images are made **automatically after the captions**: when a batch's `plan`
step is saved as done, the run gains six `image` steps, one per post, and the
browser asks for all six at once (decision 0005: "Image (×6, in parallel)").

- The "keep this page open" line from 2.2 stays until the last image step
  ends; the wake lock is held as long.
- A batch made before this spec shipped, or one whose images all failed,
  shows a button **"Make the images"** above its cards. It starts a posts run
  of kind `images` with one `image` step per post that has no image.
- "Update captions" (2.2) never touches images (Global Plan: images change
  only when the owner taps regenerate). Regenerating one image is 2.4's.
- An image step that failed shows **"Try again"** on its card; it asks for
  that one image only.

### Who can make images

Until 2.7 (`platform/usage-counters`) counts image spend, decision 0004 says
images are made only for the two pilot spas. A new server variable,
**`IMAGE_OWNERS`**, lists the owner ids allowed, comma-separated
(`sen,svarga`). It goes in `.env.example` with a made-up value.

- An owner not on the list, or an empty list, gets `403 { error:
  "images_off" }`. Their cards show a muted line instead of an image:
  "Images aren't turned on for your account yet." No "Make the images"
  button shows for them; the home page knows from the session, server side,
  whether images are on.
- No key (`GOOGLE_IMAGE_API_KEY` missing): images are off for everyone, as
  above, and the server logs it once. Captions keep working.

### The request

`POST /api/posts/image`, reached only with a valid pilot session
(`proxy.ts`). Body, checked with zod:

```json
{ "postId": "…", "imagePrompt": "…", "scene": "treatment" }
```

- `imagePrompt` is a non-empty string of at most 80 words (2.2's limit),
  `scene` one of 2.2's four scenes. Anything else: `400 { error:
  "invalid_request" }`.
- Only the prompt goes to Google: no profile, no contact fields.

### The model step

One call through a new **image-model module**, `lib/ai/image-model.ts`, the
twin of the text-model module: callers see an `ImageModel` interface, tests
swap in a fake, and the module is the only other importer of
`@ai-sdk/google`.

- **Model.** A constant `IMAGE_MODEL = 'gemini-nano-banana-2.1'`, through
  `createGoogleGenerativeAI({ apiKey: GOOGLE_IMAGE_API_KEY })`, the paid
  project's key, never the free text key (decision 0004).
- **Call.** `generateText` with `responseModalities: ['IMAGE']` and
  `imageConfig: { aspectRatio: '9:16', imageSize: '2K' }`, as in the
  bake-off. `maxRetries: 0`; `request.signal` reaches the call.
- **Prompt.** The post's image prompt, with daylight and bad-weather words
  swapped for dusk and lamp light by code, then a fixed style line held in
  its own module with a version constant, `IMAGE_PROMPT_VERSION`
  (`images-3`). The style line starts from the bake-off's (full-frame
  photograph, 50 mm, low soft warm light, natural anatomy, no recognisable
  face, no text, labels, logos or watermarks, plain bottles), adds one rule
  for the crop, **"Keep the subject in the middle of the frame, with calm
  space above and below it."**, and repeats 2.2's image rules as a safety
  net, from the maintainer's verdicts on the first images (journal,
  2026-10-25): the massage under way in the frame, with the therapist's
  hands; a guest relaxed and alive, never lying still as if asleep; beds and
  linens neatly made, nothing messy; a warm, homely room, never clinical or
  hospital-like; curtains still, no wind; massage oil as golden oil in clear
  glass, never a small dark bottle; and whatever the scene says, the light
  is dusk, lamps, lanterns or candles.
- **Cut-off.** `maxDuration` 300 s; the route gives up by itself at 60 s
  (decision 0005). Typical time about 22 s (decision 0004), measured again
  and recorded in the journal.
- **Not streamed.** The answer is one JSON body once the image is ready;
  there is nothing useful to show of a half-made image.

### Shrinking and cropping

The model returns about 1536×2752 PNG, about 2.9 MB (decision 0004). The
route turns it into two JPEGs with **`sharp`**, a new direct dependency
(already in the lockfile through Next.js):

| File | Size | How |
|---|---|---|
| Story | 1080×1920 | Resized to cover 1080×1920, centred |
| Post | 1080×1350 | The story's middle 1350 rows, centred |

- JPEG, quality 85, sRGB, metadata stripped. Each about 300 to 500 KB;
  measured and recorded in the journal. Instagram takes JPEG for both.
- An image whose ratio isn't 9:16 within 2 % is still resized to cover and
  centred, and the log line records the size it came in.
- The response: `{ postId, story, post, model, promptVersion, ms }`, with
  `story` and `post` as base64 JPEG. About 1.1 MB in all, well under
  Vercel's 4.5 MB.

### On the phone

A new IndexedDB store, `images`, keyed by `postId`, with an `ownerId` index:

| Field | What it holds |
|---|---|
| `postId` | The post it belongs to |
| `batchId` | Its batch |
| `ownerId` | The owner's id |
| `story` | The 1080×1920 JPEG, as a Blob |
| `post` | The 1080×1350 JPEG, as a Blob |
| `imagePrompt` | The prompt it was made from |
| `model`, `promptVersion` | As the response gave them |
| `createdAt` | When it was saved |

- Images live apart from the batch so that loading and rewriting batches
  stays light.
- "Forget my business" (1.2) deletes them with the batches.
- A batch's six images take about 5 MB. The app already asks for persistent
  storage (`navigator.storage.persist()`). If a save fails for lack of space,
  the card says "Your phone is out of space for images." and the step is
  marked failed.
- The run record gains a step `{ name: 'image', postId, status }`; its
  output is the saved image's `postId`, not the image itself. Resume follows
  decision 0005: a `running` image step with no live request goes back to
  `pending` and is asked for again; a post with a saved image is never asked
  for again.

### On the screen

On each post card of "Your posts" (2.2), above the type label:

- While the image is made: a 4:5 placeholder in the panel's muted colour,
  with "Making the image…".
- Once saved: the **post crop**, at 4:5, the card's full width, with the
  post's alt text as its `alt`.
- Under it, a small button **"See the story"** opens the 9:16 story in a
  full-screen sheet (`components/ui/sheet.tsx`), closed by a tap or the
  close button.
- On failure: the placeholder shows the failure's message (below) and
  "Try again".

Downloads, the feed preview and moving the crop are 2.4's.

### Failures

| Case | Answer | What the owner sees on the card |
|---|---|---|
| Body fails the schema | `400 { error: "invalid_request" }` | "Something went wrong while making this image." + "Try again" |
| Owner not allowed, or no key | `403 { error: "images_off" }` | "Images aren't turned on for your account yet." (no "Try again") |
| Google 429, or the prepaid balance is spent | `503 { error: "images_paused" }` | "Images are paused for now. Your captions are ready." + "Try again" |
| No image returned (safety block, text only) | `502 { error: "image_blocked" }` | "This image couldn't be made. Try again for a new one." + "Try again" |
| Past the 60 s cut-off | `504 { error: "image_timeout" }` | "This image took too long. Try again." + "Try again" |
| Any other error, including `sharp` | `502 { error: "image_failed" }` | "Something went wrong while making this image." + "Try again" |
| Page closed or offline | — | On return the step is asked for again (decision 0005) |

One failed image never fails the batch or the other images. No retry inside
the step.

Each image writes one log line: owner id, post id, scene, model, prompt
version, size returned, bytes of each JPEG, model ms, total ms, outcome, and
the estimated cost (`IMAGE_USD = 0.05`, decision 0004). Never the prompt.

### Strings

Every new visible string goes in `messages/en.json`, `id.json` and `vi.json`
in the same commit: "Make the images", "Making the image…", "See the story",
"Try again", "Images aren't turned on for your account yet.", "Images are
paused for now. Your captions are ready.", "This image couldn't be made. Try
again for a new one.", "This image took too long. Try again.", "Something
went wrong while making this image.", "Your phone is out of space for
images.", and the sheet's close label.

### Tests and evaluation

- Unit tests (Vitest) for: the request schema; the allowlist and the missing
  key; the prompt (image prompt + style line, version); shrinking and
  cropping on a generated 1536×2752 test image (sizes, JPEG, centred crop)
  and on an off-ratio one; each failure's mapping; the run record's `image`
  steps, their resume, and that a post with a saved image is never asked for
  again; the `images` store and "Forget my business".
- No recorded model images in git: tests use small generated images and a
  fake `ImageModel`.
- `pnpm eval:images <slug…>` makes the six images of each fixture's recorded
  `posts.json` with the real model and writes the story and post JPEGs to
  `.superpowers/eval-images/<slug>/`, outside git, with each one's time and
  size. ⚠️ It spends about $0.30 of the prepaid balance per fixture. AGENTS.md's
  commands table gains it.
- The developer looks at Sen's and Svarga's images: for each, "a tourist
  would book this" or not, and whether the post crop cuts the subject. The
  verdicts, times and sizes go in the journal with the prompt version. Pass:
  at least 4 of 6 for each, and no crop that cuts the subject.
- A Playwright test at the phone viewport, with the image route mocked: after
  a batch's captions, see six placeholders become images; open "See the
  story"; reload and see the images still there; with one `image_blocked`,
  see its message and "Try again" while the other five show.

## Acceptance criteria

```gherkin
Scenario: Images follow the captions
  Given Sen is on the image allowlist and has a saved profile with WhatsApp
  When she taps "Make my posts" and the six captions are saved
  Then six image requests start at once
  And each card shows "Making the image…" until its image arrives
  And each saved image has a 1080×1920 story and a 1080×1350 post

Scenario: The post is the story's centre
  Given the model returns a 1536×2752 image
  When the route shrinks and crops it
  Then the story is 1080×1920 JPEG
  And the post is the story's middle 1350 rows, 1080 wide

Scenario: An owner not on the list
  Given IMAGE_OWNERS is "sen,svarga"
  When "karsa" makes a batch
  Then no image is requested
  And each card shows "Images aren't turned on for your account yet."

Scenario: One image fails
  Given the model returns no image for the third post
  Then the third card shows "This image couldn't be made. Try again for a new one." and "Try again"
  And the other five cards show their images
  When the owner taps "Try again"
  Then only the third image is requested

Scenario: The balance runs out
  Given Google answers 429
  Then the cards show "Images are paused for now. Your captions are ready."
  And the captions stay as they were

Scenario: A lost image is asked for again
  Given a batch with four images saved and two image steps running when the page closed
  When the owner opens the app again
  Then the two missing images are requested
  And the four saved ones are never requested again

Scenario: A caption rewrite keeps the images
  Given a batch with its six images
  When the owner taps "Update captions"
  Then no image is requested
  And each card keeps its image

Scenario: An old batch gets its images
  Given a batch saved before images existed
  When Sen taps "Make the images"
  Then one image is requested per post

Scenario: The story opens full screen
  Given a card with its image
  When the owner taps "See the story"
  Then the 9:16 story shows in a full-screen sheet

Scenario: Forget removes the images
  Given saved batches with images
  When the owner forgets her business
  Then the images store holds none of hers
```

## Known limits

- **Spend is capped only by the prepaid balance and the allowlist** until
  2.7 counts image calls a month. An allowed owner can make as many images as
  the balance pays for; "Try again" spends again.
- **The crop is always centred.** The style line asks the model to keep the
  subject in the middle; a subject near the top or bottom is cut in the post.
  Moving the crop is 2.4's.
- **Alt text describes the prompt, not the image** (2.2's limit stands).
- **About 22 s an image**, so a batch's images arrive about 25 to 30 s after
  the captions, and a lost image step costs its $0.05 at Google even though
  the phone never got it.
- **About 5 MB of phone storage per batch.** A phone short of space fails
  the save; nothing is cleaned up automatically.
- A safety block may return no image for an ordinary massage prompt; the
  owner can only try again.

## Out of scope

- Regenerating one image, moving the crop, the feed preview and downloads:
  2.4 `posts/editor-download`.
- Counting image spend a month and the usage bar: 2.7
  `platform/usage-counters`.
- Images that show the business's real premises, products or staff: never
  (Global Plan, "Honest images").
- Carousels and better images: phase 5.
