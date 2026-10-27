---
title: "Varied images"
description: "Before the post plan is written, code sets up each of the six images: which treatment it shows from the spa's own list, a man or a woman as the guest (half and half), how many therapists, which part of the body, and the scene with its camera; the model writes each image prompt inside its set-up, and a fixed line makes every therapist a local woman with healthy, tanned, realistic skin and perfect hands."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-27T19:42:51Z }
date: "2026-10-27"
---

# Varied images

## Goal

The six images of a batch look alike. On Sen's and Svarga's recorded batches
(`tests/fixtures/sites/{sen,svarga}/posts.json`, `posts-2`), 10 of the 12
image prompts say little more than "a therapist's hands on a guest's back or
shoulders, in a villa room"; none says whether the guest is a man or a woman,
none says who the therapist is, and none shows the treatment its post is
about, although both spas offer a Four-Hands Massage and Sen also Thai
massage, Foot Reflexology and a Couple Massage. The image model fills the
gaps the same way every time: a woman lying face down, one therapist, the
back.

The maintainer expects **more men than women** to book these spas, and wants
the images to show both, half and half. The therapists are **local women**
(Vietnamese in Da Nang, Balinese in Bali): their skin is warm and tanned, as
local women's is, never white and never dark; it looks beautiful and healthy,
yet real. Their hands, arms and every part of their bodies in the frame are
perfectly formed. The setup of each image reflects a treatment the spa
offers: a four-hands massage shows two therapists.

Success: on Sen's and Svarga's batches, the six images show six different
setups, half the guests are men, each image shows the treatment it was set up
with, and the developer finds no therapist with pale, white or dark skin and
no badly drawn hand or arm. Phase 2's gate ("would post at least 4 of 6")
still holds.

Why now: the pilot shows these images to Sen and Svarga; six near-identical
pictures of a woman's back would fail the gate before anything else is
judged.

## Behaviour

### The set-up of each image

When a batch is planned (`POST /api/posts/plan`, 2.2), code first deals **six
set-ups**, one per post, in order, before the model is called. A set-up holds:

| Field | What it says |
|---|---|
| `treatment` | One of the profile's offerings, by its name as written |
| `look` | The treatment's look, from code's table below |
| `guests` | `man`, `woman`, or `man and woman` (a couple) |
| `therapists` | 1 or 2 |
| `bodyPart` | Where the hands work: back, shoulders and neck, legs, feet, arms and hands, head, or the whole body for a stretch |
| `scene` | One of 2.2's four scenes, each with its camera: `treatment` from the side, `detail` a close view of the hands on the body, `place` the room with the treatment in it, `guest` from above, the guest's body and the therapist's hands |

**Treatments.** Each set-up takes a different offering when the profile has
six or more; with fewer, each offering is used once before any is used
twice. Offerings are drawn at random, so two batches of the same spa don't
show the same six. A profile with no offering left after the filter below
gets the plain look (below) six times, without a `treatment`.

Every offering is kept unless its name holds one of these words (case and
accents ignored), which code holds in a list:

| Words | What happens |
|---|---|
| gift, voucher, card, night, room, drink, tea, transfer, class, yoga | Never drawn: not a treatment on a body |
| kid, kids, child, children, anak | Never drawn: the images never show a child |
| manicure, pedicure, nail, ear candling, reiki, singing bowl | Never drawn: the looks table has no picture for them, and the plain massage look would misrepresent them |
| pregnancy, pregnant, prenatal, maternity | Drawn; the guest is always a woman, lying on her side; this set-up counts as a woman in the half and half |

With a special offer (2.11), the offer's treatments are dealt first, to set-
ups 1 and 2 (the same one twice when the offer names one), and **the two
offer posts are posts 1 and 2** (`posts-4` says so; `checkPlan` flags a plan
where they aren't), so the two offer posts show what they sell. Without an
offer, the model places its types freely, as today.

Set-ups go to posts **by position**: set-up *n* belongs to the *n*-th post the
model writes, counted as streamed, before code's checks drop any post. A
dropped post takes its set-up with it.

**Looks.** Code holds a small table that turns a treatment's name into how it
looks, matched on words in the name, case and accents ignored:

| Words in the name | Look |
|---|---|
| four hands, four-hand, 4 hands | One guest on a massage bed, **two therapists** working in step, one on each side |
| couple, couples | **Two guests**, a man and a woman, on two beds side by side, **two therapists** |
| thai, stretch | A floor mattress; the guest in loose cotton clothes; the therapist stretching a leg or an arm, or pressing with palms |
| foot, reflexology | The guest sitting back in a reclining chair, feet on a towel; the therapist seated at the feet |
| hot stone, stone | Smooth dark stones laid along the back; the therapist's hands holding one |
| head, scalp, face, facial | The guest lying face up, eyes covered by a folded towel; the therapist's hands at the head or shoulders |
| scrub, body wrap | Scrub or wrap on the skin of the back or arms; a bowl of it nearby |
| anything else (aroma, oil, Balinese, Vietnamese, deep tissue, sport…) | The plain look: a massage bed, warm golden oil, the hands working |

The look decides `therapists` (2 only for four-hands and couple) and, for
the couple look, `guests`. For the other looks, code picks the `bodyPart`
that fits it (feet for reflexology, the whole body for Thai, the back for hot
stone, the head for a facial), and for the plain look one at random, never
the same part twice in a batch when it can be avoided.

**Guests.** Code deals the guests so that the batch shows as many men as
women. A couple image shows one of each and isn't counted; the others are
split half and half, and when their number is odd, the extra one is a man.
The order is shuffled.

**Scenes.** Code now deals the scene, so that no scene is used more than
twice (2.2's `perScene`), and writes each post's `scene` from its set-up;
whatever the model writes in `scene` is ignored. The camera comes with the
scene, so a set-up never asks for a close view in a `place` scene.

The deal is code's alone: random, but with a seed the tests can set, so a
given seed always deals the same six.

### What the model gets

The post plan's user text gains a section **"### Image set-ups"**, one line
per post, in order:

```
1. Four-Hands Massage: one guest, a man, on a massage bed; two therapists working in step, one on each side; the back; scene guest, from above.
```

`planPrompt` changes where it speaks of images (`POSTS_PROMPT_VERSION`
becomes `posts-4`):

- Post *n* uses set-up *n*. Its image prompt shows that treatment, those
  guests, that number of therapists, that part of the body, in that scene
  and from that camera; it never changes them, and never adds a guest or a
  therapist. The model no longer chooses the scene.
- An `offer` post leads on its set-up's treatment. With a special offer,
  posts 1 and 2 are the offer posts.
- The image prompt names the guest as "a man" or "a woman", and says "two
  therapists" when there are two.
- The `detail` scene still shows the guest's body: oil poured onto a man's
  back, not only into a palm, so who the guest is can be seen.
- "never the staff" stays for the `ritual` type's caption; the therapists
  are in every image, as today.

The rest of 2.2's image rules stay as they are (low warm light, tidy rooms,
golden oil, no face, no text).

### What the post keeps

Each post gains an optional `setup` field holding its set-up, saved with the
batch on the phone. Posts saved before this spec have none; nothing about
them changes.

- "Update captions" (2.2) and the per-post rewrite (2.4) keep the set-up.
- "New image" (2.4) and "Try again" (2.3) send the post's set-up with the
  image request, so a new image shows the same treatment, guests and
  therapists. The owner's hint can still ask for something else; it comes
  after the set-up, as today.

### What the image model gets

The image request (2.3) gains an optional `setup` and an optional `locals`,
both checked with zod. `locals` is the therapists' origin, worked out by code
from the profile when the batch is planned and kept with the set-up:

| The profile | `locals` |
|---|---|
| Country `VN` (`countryOf`, `lib/brand/search-client.ts`) | `Vietnamese` |
| Country `ID`, and the town, area or service area names a place in Bali, or the site's host holds "bali" | `Balinese` |
| Country `ID`, otherwise | `Indonesian` |
| Anything else | `Southeast Asian` |

The places in Bali are a short list in code: Bali, Denpasar, Canggu,
Pererenan, Seminyak, Kerobokan, Kuta, Legian, Sanur, Ubud, Uluwatu,
Jimbaran, Nusa Dua, Amed, Lovina. Svarga's fixture (town Canggu, host
`svargabalimassage.com`) gives `Balinese` both ways.

`imagePrompt` (`lib/posts/image-prompt.ts`) builds, in this order:

1. **A cast line, written by code from the set-up**, so the image model reads
   the facts first and the model's prose can't drop them: "One guest, a man.
   Two therapists, both young {locals} women." or "Two guests, a man and a
   woman, on two beds side by side. Two therapists, both young {locals}
   women."
2. The post's image prompt, with daylight words swapped as today.
3. The owner's hint, if any.
4. The style line, which gains **the therapists' look** and keeps the rest:
   "Every therapist is a young local woman with warm, golden-tan skin, as
   women from here have: smooth, healthy and glowing, yet real, with natural
   texture; never pale or white, never dark. Her hands and arms are perfectly
   formed and look healthy: five slender fingers on each hand, clean short
   nails, natural joints and wrists, no extra or missing fingers, hands or
   arms. Her face is turned away, lowered or out of frame. Every guest's
   face is turned away, resting in the face cradle, covered or out of
   frame: never a full face."

`IMAGE_PROMPT_VERSION` becomes `images-6` (`images-5`, without the two face sentences, showed therapists' faces in profile; the maintainer asked for them on 2026-10-27). A request without `setup` (a post
from before this spec) gets no cast line; it still gets the new style line,
with "local" read as Southeast Asian.

The cast line, the hint and the style line go to Google with the prompt, as
today; nothing of the profile but the treatment's look and `locals` does.

### Code's checks

`checkPlan` (2.2) gains two checks on each kept post's image prompt, flagged
in the batch's `dropped` list as today, never dropping the post:

- it names "man" or "woman" as its set-up says (or both, for a couple);
- with two therapists, it says "two therapists".

A post that fails one keeps its image prompt: the cast line still tells the
image model the facts.

### Tests and evaluation

- Unit tests (Vitest) for: the looks table on Sen's and Svarga's offerings
  and on made-up names (accents, case, "4 hands"); the deal (six different
  treatments when there are six or more, each once before twice when fewer,
  offer treatments first, guests half and half with the odd one a man and the
  couple not counted, a pregnancy massage always a woman, no scene more than
  twice, offer set-ups on posts 1 and 2, the same seed giving the same deal,
  the offerings left out by the word list, a profile with none left);
  `locals` for VN, ID with a Bali town, ID with "bali" only in the host, ID
  elsewhere, and unknown; the model's `scene` replaced by the set-up's; the
  flag when an offer plan's posts 1 and 2 aren't its offer posts; the user text's set-up section; the cast line
  for one guest, a couple and two therapists; the prompt without `setup`;
  the image request schema with and without `setup`; "New image" sending
  the post's set-up; the two new checks.
- `pnpm eval:posts sen svarga --record` re-records both fixtures with
  `posts-4` (1 Gemini request each). `posts-offer.json` too, with `--offer`.
- `pnpm eval:images sen svarga` makes their twelve images with `images-5`
  (about $0.60 of the prepaid balance; the developer is asked first).
- The developer looks at the twelve images. For each: does it show its set-
  up's treatment, guests and number of therapists; is any therapist's skin
  pale, white or dark; is any hand or arm badly drawn; would a tourist book
  this. Verdicts go in the journal with both prompt versions. Pass: for each
  spa, six different set-ups, the guests as the deal set them (a man or a
  woman as dealt, both in a couple image), every four-hands image with two
  therapists, no failed skin or hand, and at least 4 of 6 a tourist would
  book.

## Acceptance criteria

```gherkin
Scenario: Six set-ups before the plan
  Given Sen's profile with eight body treatments
  When she taps "Make my posts"
  Then code deals six set-ups with six different treatments
  And the post plan's user text lists them in order

Scenario: Half the guests are men
  Given a deal with no couple
  Then three set-ups have a man as the guest and three a woman

Scenario: A couple and an odd number
  Given a deal with one Couple Massage set-up
  Then that set-up has a man and a woman as guests and two therapists
  And of the other five, three have a man and two a woman

Scenario: Four hands, two therapists
  Given a set-up for "Four-Hands Massage"
  Then it has two therapists
  And the image prompt sent to the image model starts with "One guest" and "Two therapists, both young"

Scenario: Local therapists
  Given Svarga's profile, with a +62 WhatsApp number and Canggu as its town
  When its images are made
  Then every image prompt calls the therapists young Balinese women
  And the style line asks for warm, golden-tan skin and perfectly formed hands and arms

Scenario: An offer shows its treatment
  Given a special offer on "Thai Massage"
  When the batch is planned
  Then set-ups 1 and 2 show Thai Massage
  And posts 1 and 2 are the offer posts and lead on it

Scenario: A treatment the images can't show
  Given a profile whose offerings include "Kids Massage" and "Gift Voucher"
  When code deals the set-ups
  Then neither is drawn

Scenario: A new image keeps its set-up
  Given a post whose set-up shows a foot reflexology for a man
  When the owner taps "New image" and writes "more green"
  Then the image request carries the same set-up and the hint

Scenario: An old post
  Given a post saved before this spec, with no set-up
  When the owner taps "New image"
  Then the image prompt has no cast line and ends with the new style line

Scenario: The same seed, the same deal
  Given the same profile and the same seed
  When code deals twice
  Then both deals are the same
```

## Known limits

- **The image model may still not listen.** The cast line and the style line
  ask; nothing checks the image itself. Six fingers or a pale arm can still
  come back; the owner taps "New image" (about $0.05).
- **Skin tone is words.** "Warm, golden-tan, never pale, never dark" is the
  closest a prompt gets; the developer's verdicts on the twelve images are
  the only measure.
- **Variety is within a batch.** Two batches on the same day may show some of
  the same treatments; the deal is random but doesn't look at earlier
  batches, whose set-ups the server never sees.
- **The looks table is in English and small.** A treatment named in another
  language, or a look not in the table, gets the plain look.
- **The guests' looks are left to the model.** Only man or woman is set; age
  and origin are not.
- **Faces stay hidden**, as 2.2 and 2.3 ask, which limits some views (a guest
  lying face up has a towel over the eyes).

## Out of scope

- Checking the image itself (a second model that looks at it): not planned.
- Choosing the guests' ratio or the treatments by hand: the owner's hint on
  "New image" stays the only lever.
- Showing the business's real therapists or rooms: never (Global Plan,
  "Honest images").
- Better images or a different image model: phase 5.
