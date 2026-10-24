---
title: "Image model"
description: "Images come from a paid Google Gemini image model, Nano Banana 2.1 or Nano Banana Pro as a blind bake-off decides, in a billed Google project of their own, capped at $8 a month; the free Workers AI models were tried and draw people badly."
status: draft
date: "2026-10-25"
---

# Image model

## Context and Problem Statement

Sen and Svarga opened their Instagram accounts this week; both are empty. The
app's first job is to make them look established: about 12 posts each before
the accounts are promoted (the first 3 or 4 rows of the grid, a common rule of
thumb), then about 3 posts a week each. Each post has one tall 9:16 image,
used as it is for the story and cropped to 4:5 for the post (roadmap 2.3).

The images speak to tourists in hotels and villas and to expats nearby, who
book a massage on WhatsApp. They have seen plenty of generic spa ads, so an
image has to look real, local and calm, and it has to show people: an owner
won't run a massage feed of objects and rooms only.

The plan was a free model on Workers AI (decision 0001). A first bake-off on
2026-10-25 tried FLUX.2 klein 4B and 9B there: details and places looked good,
but bodies and hands were warped or odd in most images that showed them, and
klein 4B took 14 to 38 s an image. The maintainer judged both "very bad with
bodies and hands" and agreed to pay a little for better images, at most $8 a
month.

Which paid image model makes these images, and how is the spend kept under $8
a month?

## Decision Drivers

- People shown well: a back, shoulders, hands, feet, a guest at rest, without
  warped anatomy.
- At most $8 a month for all images, enforced by the app, not only by alerts.
- Tall images made natively, 9:16, at least 1080 px wide, so the 4:5 post
  crop and the story stay sharp on a phone.
- About 5 to 15 s per image, several in parallel (decision 0005), and a
  response well under 4.5 MB.
- As few new services, accounts and libraries as possible.
- The free Gemini text tier of decision 0003 stays free and untouched.
- An owner can post at least 2 of every 4 images without a second thought
  (the criteria in Confirmation).

Expected volume for the two pilot spas: about 24 images for the launch, then
about 26 a month (3 a week each), so about 50 images in the first month.

## Considered Options

1. **Nano Banana 2.1** (`gemini-nano-banana-2.1`), at 2K.
2. **Nano Banana Pro** (`gemini-3-pro-image`), at 2K.
3. **FLUX.2 klein 4B and 9B** on Workers AI, free.
4. **FLUX.2 pro or FLUX 3** from Black Forest Labs, prepaid credits.
5. **GPT Image** (`gpt-image-2`) from OpenAI.
6. **Leonardo Lucid Origin or Phoenix** on Workers AI, past the free neurons.

## Decision Outcome

Options 1 and 2 go to a bake-off. Option 3 was tried and failed on people.
Options 4 to 6 are ruled out without testing (see Pros and Cons).

**Bake-off.** For Sen, Svarga and Karsa Spa, 4 image prompts each, written by
hand from the brand's essence (roadmap 2.2's post plan doesn't exist yet):
one guest at rest seen from behind, one wide treatment shot where the hands
are small in the frame, one detail, one place or foot treatment. Both models
get the same prompts at 9:16 and 2K: 24 images, about $2.20. The script and
the images live in `.superpowers/`, outside git; the numbers and verdicts
come into this decision.

1. **Automatic check.** Gemini Flash-Lite looks at each image against
   criteria 1 to 6 below and gives a pass or fail with a one-line reason, one
   call per brand and model.
2. **Blind look.** The maintainer sees the passing images side by side,
   model names hidden, and marks each one "a tourist would book this" or "no"
   (criterion 7).
3. **Measures.** Price, time and size per image, from the real calls.

**Picking rule.** A model passes if, for every brand, at least 2 of its 4
images pass both steps.

- If Nano Banana 2.1 passes: Nano Banana 2.1, unless the blind look clearly
  prefers Pro and Pro's month still fits the cap.
- If only Pro passes: Pro.
- If neither passes: a new decision.

**Billing.** Image calls use a second Google project with billing turned on,
and its own key (`GOOGLE_IMAGE_API_KEY`). The project with the free key for
text (decision 0003) gets no billing account. Google Cloud budget alerts at
$4 and $8 a month on the image project warn the maintainer by email.

**The $8 cap.** Budget alerts don't stop spending, so the app stops it:
`platform/usage-counters` (roadmap 2.6) counts image calls a month across all
owners, at the price measured here, and refuses new images once the month's
estimate reaches $8. Until 2.6 ships, images are made only by the maintainer
for the two pilot spas.

**Bake-off result:** pending. It is filled in here, and the chosen option
named, before this decision is approved.

### Consequences

- Good, because the Gemini image models are known to draw people well, and
  the first free bake-off showed that is where free models fail.
- Good, because both candidates come through `@ai-sdk/google`, already the
  app's only model library (decision 0003): no new library, no new vendor.
  The SDK sets `imageConfig.aspectRatio` to `9:16` and `imageSize` to `2K`.
- Good, because at about $0.05 an image, Nano Banana 2.1 costs about $2.50 in
  the launch month and $1.30 a month after; Nano Banana Pro, about $6.70 and
  $3.50. Both fit under $8.
- Bad, because the app is no longer $0: decision 0001's "$0, no card on file"
  now holds for everything except images, and the image project needs a card
  on file. The roadmap's constraint "Images come from a free model" changes
  with this decision.
- Bad, because Google may change prices or retire a model (Gemini 2.5 Flash
  Image shut down on 2026-10-02); a change that breaks the cap needs a new
  decision.
- Bad, because the cap depends on the app's own counter; a bug there could
  overspend until the $8 email alert.
- Bad, because a bake-off on 3 brands with hand-written prompts is small; the
  post plan's real prompts may do better or worse.

### Confirmation

Criteria for a postable image:

1. **It looks like this spa:** its colours and the essence's senses, in the
   customer's world where that fits (a villa deck, a hotel room).
2. **No AI tells:** no recognisable face; hands, fingers, limbs and bodies
   look natural.
3. **No text** in the image, including labels on bottles; text goes in the
   caption or an overlay.
4. **Right size:** 9:16, at least 1080 px wide, sharp on a phone.
5. **Tasteful:** relaxing and professional, never suggestive.
6. **Varied:** across one brand's images, people at rest, treatments, details
   and places, not one scene repeated.
7. **Tourists and expats would book it:** a holiday treat or a well-earned
   break, from a place they would trust.

Checks:

- `posts/generate-images` (roadmap 2.3) calls only the chosen model id, at
  9:16 and 2K, with `GOOGLE_IMAGE_API_KEY`.
- No code path sends a text request with `GOOGLE_IMAGE_API_KEY`, or an image
  request with `GOOGLE_GENERATIVE_AI_API_KEY`.
- `platform/usage-counters` refuses images once the month's estimate reaches
  $8, with a unit test at the boundary.
- The image project has budget alerts at $4 and $8.
- The decision records the bake-off's per-image price, time and size.

## Pros and Cons of the Options

- **Nano Banana 2.1:** $0.034 an image at 1K, $0.050 at 2K. Google's newest
  low-cost image model; takes 9:16 and 2K; every image carries a SynthID
  watermark. Same SDK and vendor as the text model.
- **Nano Banana Pro:** $0.134 an image at 1K or 2K. Google's strongest image
  model, the quality ceiling; still fits the cap at the pilot's volume, but
  with little room for a third spa.
- **FLUX.2 klein 4B and 9B (Workers AI, free):** tried on 2026-10-25 with 12
  prompts. Details and places were good; bodies and hands were warped or odd
  (two heads on one massage table, twisted fingers). Klein 4B took 14 to 38 s
  an image, klein 9B 3 to 4 s. Free, but fails the first driver.
- **FLUX.2 pro or FLUX 3 (Black Forest Labs):** priced per megapixel or per
  resolution tier, roughly $0.03 to $0.05 a tall image (estimated with BFL's
  calculator); prepaid credits cap spending by themselves. A new vendor,
  account and API, for a model family whose smaller members drew people badly
  here.
- **GPT Image (OpenAI):** strong on people; priced by tokens ($30 per million
  image output tokens for `gpt-image-2`), roughly $0.10 to $0.20 a tall image
  at high quality. A new vendor and library, at Nano Banana Pro's price or
  more.
- **Leonardo Lucid Origin or Phoenix (Workers AI, paid):** about 3,500 to
  4,500 neurons a tall image, about $0.04 to $0.05 past the free neurons on
  the Workers Paid plan ($5 a month minimum), which already eats most of the
  $8. Untested on people.

## More Information

Checked on 2026-10-25:

- [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing): no
  free tier for image output; Nano Banana 2.1 $0.0336 (1K) and $0.0504 (2K);
  Nano Banana Pro $0.134 (1K and 2K); Gemini 2.5 Flash Image shut down on
  2026-10-02.
- [Gemini image generation](https://ai.google.dev/gemini-api/docs/image-generation):
  Nano Banana 2.1 makes 1K, 2K and 4K images; every image carries a SynthID
  watermark. `@ai-sdk/google` (installed version) types `imageConfig` with
  `aspectRatio` including `9:16` and `4:5`, and `imageSize` `1K`, `2K`, `4K`.
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/):
  10,000 free neurons a day; $0.011 per 1,000 neurons past that, on Workers
  Paid.
- [BFL pricing](https://bfl.ai/pricing) and
  [BFL API pricing](https://docs.bfl.ai/quick_start/pricing): FLUX.2 priced
  per output megapixel, FLUX 3 per resolution tier; 1 credit = $0.01.
- [OpenAI API pricing](https://developers.openai.com/api/docs/pricing):
  `gpt-image-2` at $30 per million image output tokens.
- First bake-off, 2026-10-25, on Workers AI at 1080×1920 requested (the
  models returned 1072×1920): klein 4B, 12 images, 14.4 to 37.9 s each,
  about 1.3 MB; klein 9B, 3 images, 3.3 to 4.1 s, about 1 MB. Gemini's check
  passed 7 of the 12 klein 4B images; the fails were text on bottles (2),
  warped hands (2) and an odd body (1). The maintainer's look: "both very bad
  with bodies and hands".
- Posts for a new account: 9 to 12 posts before promoting it, then about 3 a
  week, is a common rule of thumb in social media guides, not a measured
  figure.
