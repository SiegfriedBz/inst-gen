---
title: "Normal bodies in every image"
description: "Code writes each image's pose from its treatment, in poses the image model draws well, half of the Thai images a leg stretch; every image prompt asks for normal human bodies in a clearly professional massage; two therapists only for four hands and couples, one on each side; what guests and therapists wear doesn't change."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-11-23T10:27:21Z }
date: "2026-11-23"
---

# Normal bodies in every image

## Goal

On 2026-11-23 the maintainer showed one of Sen's images, a Thai Massage: the
therapist kneels on a floor mattress where the guest's legs should be, and
the guest's legs disappear under her. Over the last days more images came out
with bodies or postures no person could have. They can't be posted, and each
one is paid for (about $0.05, decision 0004).

**Why it happens** (the developer's investigation, 2026-11-23):

- Nothing changed on Google's side or in the app's image prompt since
  2.16 (2026-11-08): the model is still `gemini-nano-banana-2.1`, and a web
  search found no update to it since its launch on 2026-10-06.
- The set-up asks for poses the image model can't draw. Thai's look
  (`posts/varied-images`) says "a floor mattress; the guest in loose cotton
  clothes; the therapist stretching a leg or an arm, or pressing with her
  palms", so the plan writes "a female therapist's hands gently stretching
  her leg" (Sen's `posts-offer.json`), and the model tangles two bodies on the
  floor. Nothing says where the guest lies or where the therapist kneels.
- Four hands puts three people in contact, a couple four. Thai, Four-Hands
  and Couple are 3 of Sen's 8 treatments and 2 of Svarga's 7. Neither
  decision 0004's bake-off nor 2.16's test images tried them.

**The test** (2026-11-23, with the maintainer's yes: 12 images, $0.60). Two
images per treatment with today's prompt, two with a pose line written by
code (below), on a Sen Thai leg stretch, a Svarga four hands and a Sen couple.
Today's prompt: 3 of 6 can't be used (Thai 2 of 2: the guest's legs vanish
under the therapist; couple 1 of 2: both therapists on the man, the woman
alone). The pose line: 6 of 6 with normal bodies. Four hands came out right
both ways. That test also changed the guests' colours, which the maintainer
refused (below), so the check images are the first test of the poses with
today's clothes.

**The maintainer's calls** (2026-11-23):

- Bodies are normal human bodies, never impossible shapes.
- It is clearly a professional massage, not a touch.
- Some images show a leg stretch.
- Clothes stay as they are, for every massage: the therapists in their spa's
  look, as on its website (`posts/therapists-look`), the guests as in today's
  images. No clothes or colours of code's own, and no rule for one kind of
  massage.
- Two therapists only for four hands and couple massages, one on each side.

**What the sites' photos show about poses** (the two the maintainer sent,
and the 14 the brand read saved on 2026-11-08): Sen's Thai stretch has the
guest on her back, one knee bent and raised, the other leg straight, and the
therapist kneeling beside the bent leg, one hand on the knee and one on the
foot. Sen's and Svarga's couple photos have each therapist at her own guest's
bed.

Success: every image's pose comes from code; on the check images (below)
every body is normal, every image reads as a professional massage, and two
therapists show only in four hands and couple images, with clothes as today.

Why now: Sen and Svarga pay for every image, and these can't be posted.

## Behaviour

### The pose, written by code

`imagePrompt` (`lib/posts/image-prompt.ts`) adds a **pose line** right after
the cast line (2.12, 2.16) and before the post's own image prompt. Code
writes it from the set-up's look and body part. It says where the guest
lies, where each therapist is and what her hands do, and nothing about
clothes:

| Look | Body part | Pose |
|---|---|---|
| plain | back, shoulders and neck, legs, arms and hands | The guest lies face down on a massage bed, face in the face hole. The therapist stands at the side of the bed and massages the {part} with both hands and warm golden oil. |
| stone | back | The guest lies face down on a massage bed, smooth dark stones laid along the back. The therapist stands at the side of the bed, one stone in her hand, her other hand on the back. |
| scrub | back, arms and hands | The guest lies face down on a massage bed, scrub on the skin of the {part}, a bowl of it nearby. The therapist stands at the side of the bed and spreads it with both hands. |
| thai | legs | **The leg stretch**, as in Sen's photo. The guest lies on their back on a low mattress, head on a pillow, a folded towel over the eyes, arms resting by the sides. One leg lies straight; the other is bent at the knee and raised toward the chest. The therapist kneels upright on the mattress beside the bent leg, her own knees clear of the guest's legs; one hand holds the knee, the other the foot or ankle, and she presses the knee gently toward the chest. |
| thai | back | **The palm press.** The guest lies face down on a low mattress, forehead on a pillow, arms by the sides, legs straight. The therapist kneels upright beside the mattress, level with the guest's hip, and presses both palms flat on the back. |
| fourHands | any | The guest lies face down on a massage bed, face in the face hole. The two therapists stand on opposite sides of the bed, one on each side and apart, each massaging the {part} on her side with both hands, in step. |
| couple | any | Two massage beds side by side, a little apart; on each, one guest lies face down, face in the face hole. Each therapist stands at the outer side of her guest's bed and massages that guest's {part} with both hands; the two therapists are apart, one for each guest. |
| foot | feet | The guest sits back in a reclining chair, feet on a towel. The therapist sits on a low stool at the guest's feet and massages one foot with both hands. |
| head | head | The guest lies face up on a massage bed, a folded towel over the eyes. The therapist sits or stands at the head of the bed, both hands at the guest's temples or shoulders. |
| pregnancy | back | The guest lies on her side on a massage bed, a pillow under her head and one between her knees. The therapist stands behind her and massages her lower back with both hands. |

The towel over the eyes and the face hole are 2.12's rule that no guest's
face shows, as today.

Right after the pose, every image with a set-up gets two sentences, the
wording of the test:

- "Every person has a normal human body in a natural, comfortable position:
  one head, two arms and two legs, each joined to their own body; each arm
  and leg can be followed from the body to its hand or foot; knees and elbows
  bend only the natural way. No body lies across, over or under another: the
  therapists work with their hands, the only contact."
- "It is clearly a professional massage: each therapist works with a trained
  technique and calm focus."

A post saved before set-ups (2.12) has no cast line and no pose line: the two
sentences open its style line instead.

(Builder's call on the exact words of each pose. What's fixed: the pose comes
from code, after the cast line; it says where the guest lies, where each
therapist is and what her hands do, and nothing about clothes; the two
sentences follow it.)

### Clothes: unchanged

This item adds no clothes, colours or linens, for any massage. The
therapists wear their spa's look exactly as `posts/therapists-look` left it,
said with the cast and again in the last rules; the guests are as in today's
images. Every word about clothes in today's prompts stays as it is.

### Thai: a leg stretch or a palm press

Thai's body part is now **the legs or the back**, instead of the whole body.
The deal picks it as it picks any part: the less used first, at random
between equals. So about half the Thai images are leg stretches and half are
palm presses. The deal draws as many random numbers as before, so a given
seed still deals the same treatments, guests, scenes, lights and questions;
only the body parts may differ, Thai's and those dealt after it.

A Thai set-up saved with "whole body" (before this) gets the leg stretch.
With the legs, a "sore" question (2.18) names the legs; with the back, the
back.

### Two therapists only for four hands and couples

As today, the look decides: two therapists for four hands and couples, one
for every other treatment. The pose places them: for four hands, one on each
side of the one bed; for a couple, one for each guest, at the outer side of
her guest's bed.

### What the post plan reads

The set-up line of "### Image set-ups" (`setupLine`) describes the same poses,
so the post's image prompt agrees with the pose line. It keeps today's words
about clothes and adds none. For example:

- Thai with the legs: "on a floor mattress, in loose cotton clothes, lying
  on the back, a towel over the eyes; the therapist kneeling beside,
  stretching one bent leg, a hand on the knee and one on the foot".
- Thai with the back: "on a floor mattress, in loose cotton clothes, lying
  face down; the therapist kneeling beside the hip, pressing both palms on
  the back".
- Four hands: "face down on a massage bed; two therapists working in step,
  one standing on each side of the bed".
- Couple: "face down on two massage beds side by side, a little apart; one
  therapist at the outer side of each bed, one for each guest".
- Plain, stone and scrub say "face down"; foot and head as today.

The plan still never sees the therapists' look, so captions stay independent
of it, as 2.16 wants. The rest of the plan prompt is unchanged.

### Versions and cost

`IMAGE_PROMPT_VERSION` becomes `images-11` and `POSTS_PROMPT_VERSION`
`posts-19`. Each image is still one request at decision 0004's price; the
image prompt gets about 150 words longer, which changes the price by a
fraction of a cent. No new request of any kind.

### Images already made

Images already made stay as they are. "Create new image" and "Try again" on
a saved post send its set-up, as today, so the new image gets the new pose.

### Other documents

The PR that ships this item:

- adds its row to `docs/roadmap.md` (2.23) and marks it `done`, and adds the
  same line to the Global Plan;
- adds a dated note, "> Changed by `posts/normal-bodies` (2026-11-23): …", to
  `posts/varied-images` (the looks table, Thai's body part, what the image
  model gets); its status and approval untouched.

No new string: no screen changes. The owner guide is unchanged.

### Tests

- Vitest:
  - the pose line for each look and body part in the table, naming no
    clothes or colours; a Thai set-up saved with "whole body" gets the leg
    stretch;
  - the order: cast line, pose line, the two sentences, then the post's image
    prompt;
  - a post without a set-up: no pose line, the two sentences open the style
    line;
  - the therapists' look still said with the cast and in the last rules,
    word for word as today;
  - `setupLine` for Thai with the legs and with the back, four hands and
    couple;
  - the deal: Thai's part is the legs or the back, never the whole body; a
    seed deals the same treatments, guests, scenes, lights and questions as
    before;
  - the two version strings.
- No Playwright change: no screen changes.
- `pnpm check` passes.

### Checked with the real model

Only with the maintainer's yes, asked at the time, and never on a pilot day
(AGENTS.md). One image for each look Sen and Svarga offer, built with the
app's own `imagePrompt` from a set-up of that look and an image prompt
written as the plan writes them from the new set-up lines (with "clean white
linens" where the recorded plans have it), so no text request is made:

- Sen: plain, Thai leg stretch, Thai palm press, four hands, couple, foot;
- Svarga: plain, four hands, couple, scrub, foot.

That is 11 images, about $0.55. The maintainer looks at them: every body is
normal, the massage looks professional, the clothes are as today, each spa's
therapists wear its look, and two therapists show only in four hands and
couple images. Verdicts go in the journal.

Pass: each of the 11 passes every point above. An image that fails a point is
made twice more with the same prompt; if either fails again, the developer
stops and asks the maintainer.

(Builder's call: the script, in `scripts/` like `pnpm eval:images`, with a
slug required so it never spends by accident.)

## Acceptance criteria

```gherkin
Scenario: A Thai leg stretch, as in Sen's photo
  Given a Thai Massage set-up with the legs
  When its image prompt is built
  Then the pose line has the guest on their back on a low mattress, a towel over the eyes, one knee bent toward the chest
  And the therapist kneeling beside the bent leg, one hand on the knee and one on the foot or ankle, her knees clear of the guest's legs

Scenario: A Thai palm press
  Given a Thai Massage set-up with the back
  When its image prompt is built
  Then the pose line has the guest face down on a low mattress
  And the therapist kneeling beside the hip, both palms flat on the back

Scenario: Half the Thai images stretch a leg
  Given a spa whose treatments include Thai Massage
  When many attempts are dealt
  Then about half of the Thai set-ups have the legs and half the back
  And none has the whole body

Scenario: Four hands, one therapist on each side
  Given a Four-Hands Massage set-up
  When its image prompt is built
  Then the pose line has the guest face down on one massage bed
  And one therapist standing on each side of the bed, apart

Scenario: A couple, one therapist for each guest
  Given a Couple Massage set-up
  When its image prompt is built
  Then the pose line has two beds side by side, a little apart, each guest face down
  And each therapist at the outer side of her own guest's bed

Scenario: One therapist for every other treatment
  Given a set-up of any look but four hands or couple
  When its image prompt is built
  Then it names one therapist

Scenario: Normal bodies and a professional massage in every image
  Given any set-up
  When its image prompt is built
  Then the pose line is followed by the sentence on normal human bodies and the one on a professional massage

Scenario: Clothes stay as they are
  Given Sen's look "a white short-sleeved tunic with a small stand-up collar, white trousers, dark hair in a neat low bun"
  When an image prompt is built for any treatment
  Then the therapists wear Sen's look, with the cast and in the last rules, word for word as today
  And the pose line names no clothes or colours

Scenario: A saved Thai post
  Given a post saved with a Thai set-up whose part is the whole body
  When the owner taps "Create new image"
  Then its image prompt has the leg stretch

Scenario: Captions stay independent of the look
  Given two profiles that differ only in their look
  When posts are planned for each
  Then the post plan's model is given the same profile and the same set-up lines
```

## Known limits

- **A bad body can still happen.** 6 of 6 in the test is a small sample.
  "Create new image" stays the owner's way out, at $0.05 an image.
- **Today's clothes, untested with the poses.** The test changed the guests'
  colours; the check images are the first test of the poses with today's
  clothes. If bodies merge there, the developer stops and asks the
  maintainer.
- **Faces, in part.** In the leg stretch a folded towel covers the guest's
  eyes, and the nose and mouth show, as in the head massage. A guest lying
  face down, seen from the foot of the bed, may show a cheek in profile.
- **The pregnancy pose is untested:** neither pilot spa offers it.
- **Only Thai stretches.** No other treatment shows a stretch.

## Out of scope

- Any change to what guests or therapists wear (the maintainer, 2026-11-23).
- The foot massage on a bed, as in Svarga's photo: the foot look keeps its
  reclining chair (`posts/varied-images`).
- A better, pricier image model (Nano Banana Pro, about $0.13 an image): a new
  decision, if bodies still fail after this.
- An AI check of each image before the owner sees it: one more request per
  image, and decision 0004's check with Flash-Lite passed all 24 bake-off
  images, so it may not catch these.
- A reference photo of each pose given to the image model.
- Captions, story texts, hashtags and alt text: their rules are unchanged.
- Refunds: Google bills every image it makes.
- The owner guide: unchanged.
