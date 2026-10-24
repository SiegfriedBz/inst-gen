---
title: "Image model"
description: "Images come from FLUX.2 klein on the Workers AI free plan, 4B or 9B as a blind bake-off on the fixtures decides; models free only during a beta, square-only models and the costly ones are ruled out."
status: draft
date: "2026-10-25"
---

# Image model

## Context and Problem Statement

A run makes six drafts, each with an image (decision 0005). Each image is one
tall 9:16 picture, used as it is for the story and cropped to 4:5 for the
post (roadmap 2.3). Images come from Workers AI on Cloudflare's free plan
(decision 0001); Gemini's image models have no free API tier.

The pilot is small: each spa makes one run every two days, so about one run,
six images, a day for the whole app. The owner posts about once every two
days, so she needs only one good image per run. She doesn't ask for new
images.

The images speak to tourists in hotels and villas and to expats nearby, who
book a massage on WhatsApp. They have seen plenty of generic spa ads, so an
image has to look real, local and calm to stop their thumb.

Which free Workers AI model makes those images?

## Decision Drivers

- $0, no card on file, no new account (decision 0001).
- A published price that fits the free plan's 10,000 neurons a day: about six
  tall images a day, with room for this decision's bake-off and for testing.
  No model that is free only "during beta", whose price can change without
  notice.
- Tall images made natively, at least 1080 px wide, so the 4:5 post crop
  (1080×1350) and the 9:16 story (1080×1920) stay sharp on a phone.
- About 5 to 10 s per image, six in parallel (decision 0005), and a response
  well under 4.5 MB.
- An owner can post at least 2 of every 6 images without a second thought
  (the criteria in Confirmation). One is enough; two leaves a margin.

## Considered Options

1. **FLUX.2 klein 4B** (`@cf/black-forest-labs/flux-2-klein-4b`).
2. **FLUX.2 klein 9B** (`@cf/black-forest-labs/flux-2-klein-9b`).
3. **SDXL Lightning** and **DreamShaper 8 LCM**: free while in beta.
4. **FLUX.1 schnell**: cheap, square only.
5. **Leonardo Phoenix 1.0, Leonardo Lucid Origin, FLUX.2 dev**: priced per
   tile and step, several thousand neurons per tall image.

## Decision Outcome

Options 1 and 2 go to a bake-off. Options 3 to 5 are ruled out on the
drivers, without testing (see Pros and Cons).

**Bake-off.** For 3 or 4 brands from the saved site fixtures, 4 image prompts
each, hand-written from the brand's essence (the post plan that will write
them, roadmap 2.2, doesn't exist yet). Both models get the same prompts at
1080×1920. It runs over a few days, since klein 9B spends most of a day's
neurons on 6 images. The script and the images live in `.superpowers/`,
outside git; the numbers and verdicts come into this decision.

1. **Automatic check.** Gemini looks at each image against criteria 1 to 6
   below and gives a pass or fail with a one-line reason. Images are sent one
   brand and one model per call, to spare the free quota (decision 0003).
2. **Blind look.** The maintainer sees the passing images side by side, model
   names hidden, and marks each one "a tourist would book this" or "no"
   (criterion 7).
3. **Measures.** Neurons, time and size per image, from the real calls.

**Picking rule.** A model passes if, for every brand, at least 2 of its 4
images pass both steps.

- If both pass: klein 9B only if the blind look clearly prefers it, otherwise
  klein 4B for its headroom.
- If one passes: that one.
- If neither passes: no free model is good enough, and a new decision says
  what to do (Phase 5 of the roadmap names better images as a paid feature).

**Bake-off result:** pending. It is filled in here, and the chosen option
named, before this decision is approved.

### Consequences

- Good, because both candidates have a published price, and one family means
  the same call shape (multipart prompt, width, height) whichever wins.
- Good, because klein 4B leaves room for a third spa, retries and tests,
  while klein 9B gives the better image if the free budget can carry it.
- Good, because the bar is what an owner needs to post, judged blind by a
  person, not a benchmark.
- Bad, because a bake-off on 3 or 4 brands with hand-written prompts is small;
  the post plan's real prompts may do better or worse.
- Bad, because if klein 9B wins, six images use about 94% of the day's free
  neurons: a seventh image, a third spa or a test run on a pilot day fails
  until 00:00 UTC.
- Bad, because the automatic check spends Gemini quota shared with the brand
  read.

### Confirmation

Criteria for a postable image:

1. **It looks like this spa:** its colours and the essence's senses, in the
   customer's world where that fits (a villa deck, a hotel room).
2. **No AI tells:** no faces; partial bodies only (a back, shoulders, hands
   with oil); nothing warped, no extra fingers.
3. **No text** in the image; text goes in the caption or an overlay.
4. **Right size:** 9:16, at least 1080×1920, sharp on a phone.
5. **Tasteful:** relaxing, never suggestive.
6. **Varied:** across one brand's images, details, places and treatment
   moments, not one scene repeated.
7. **Tourists and expats would book it:** a holiday treat or a well-earned
   break, from a place they would trust.

Checks:

- `posts/generate-images` (roadmap 2.3) calls only the chosen model id, at
  the size measured here.
- The decision records the bake-off's per-image neurons, time and size, and
  `platform/usage-counters` (roadmap 2.6) sets its daily image limit from them.
- A model change, or a price change that breaks the drivers, needs a new
  decision that replaces this one.

## Pros and Cons of the Options

- **FLUX.2 klein 4B:** about 26 neurons per 512×512 output tile, fixed at 4
  steps, so about 310 neurons for 1080×1920 (12 tiles) and about 30 images a
  day free. Width and height from 256 to 1920 px. Apache 2.0 weights.
  Distilled, so detail and prompt-following are the risk.
- **FLUX.2 klein 9B:** about 1,364 neurons for the first megapixel and 182 for
  each further one, so about 1,560 neurons for 1080×1920 and 6 images a day
  free, with almost nothing left over. Larger, so likely better images. Its
  weights are under the FLUX Non-Commercial License; the app is
  non-commercial (decision 0001), and a commercial version needs a new
  decision anyway.
- **SDXL Lightning, DreamShaper 8 LCM:** tall images and $0.00 per step today,
  but marked Beta, with no word on the price after it. Older models: hands,
  faces and photorealism are weaker. Ruled out by the "no free only during
  beta" driver.
- **FLUX.1 schnell:** about 70 neurons per image, but the Workers AI model
  takes no width or height, so it makes square images only. Ruled out by
  "tall images made natively".
- **Leonardo Phoenix 1.0, Lucid Origin, FLUX.2 dev:** strong prompt-following
  and, for Leonardo, clean text. 530 to 636 neurons per output tile plus per
  step for Leonardo, and 37.5 neurons per tile per step for FLUX.2 dev: about
  3,500 to 4,500 neurons per tall image, 2 images a day. Ruled out by price.

## More Information

Checked on 2026-10-25:

- [Workers AI models](https://developers.cloudflare.com/workers-ai/models/):
  ten text-to-image models; SDXL Base, SDXL Lightning and SD 1.5 Inpainting
  marked Beta.
- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/):
  10,000 free neurons a day, reset at 00:00 UTC; per-model prices as quoted
  above. The neuron figures per image in this decision are worked out from
  that table; the bake-off replaces them with measured ones.
- [FLUX.2 klein 4B on Workers AI](https://developers.cloudflare.com/changelog/2026-01-15-flux-2-klein-4b-workers-ai):
  multipart input; width 256 to 1920 (default 1024), height 256 to 1920
  (default 768); 4 steps, fixed.
- [FLUX.2 klein 9B on Workers AI](https://developers.cloudflare.com/changelog/post/2026-01-28-flux-2-klein-9b-workers-ai/).
- [FLUX.1 schnell on Workers AI](https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/):
  inputs are prompt and steps (at most 8) only.
- [SDXL Lightning on Workers AI](https://developers.cloudflare.com/workers-ai/models/stable-diffusion-xl-lightning/):
  width and height 256 to 2048; "$0.00 per step", Beta.
- [FLUX.2 klein licences](https://venturebeat.com/technology/black-forest-labs-launches-open-source-flux-2-klein-to-generate-ai-images-in):
  4B under Apache 2.0; 9B under the FLUX Non-Commercial License.
- No free, reliable image API outside Workers AI could be confirmed; Gemini's
  image models have no free tier (roadmap, Constraints).
