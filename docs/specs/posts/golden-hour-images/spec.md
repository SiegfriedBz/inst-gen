---
title: "Golden-hour images"
description: "Every image is lit by the low golden sun of late afternoon, with lamps and candles lit, in the room a tourist pictures for their stay, open onto the place's own green plants, with the place's flower and, on a moment post only, one discreet sign of the guest's day; Sen's images become as bright and warm as Svarga's."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-28T18:41:16Z }
date: "2026-10-28"
---

# Golden-hour images

## Goal

Sen's images are too dark, and Svarga's look better. On 2026-10-28, the
maintainer wanted Sen's images to match Svarga's in brightness and in the
positive mood they bring. Side by side, on the 27 Oct eval run (`images-6`):

| | Svarga | Sen |
|---|---|---|
| The way out | Garden doors or a window open onto lit green plants | Curtains drawn, the window dark |
| The light | Honey and amber: lamps and candles, plus light from outside | Grey-beige, a few dim lamps |
| The room | Carved wood, rattan, frangipani on the tray | A plain hotel room |

The difference comes from two rules that disagree. 2.2's post plan
(`docs/specs/posts/generate-copy`) and 2.3's style line
(`docs/specs/posts/generate-images`) ask for "low, soft, warm light: dim and
intimate, nothing bright", and "dusk, lamps, lanterns or candles", following
decision 0004's first prompt lesson. But the post plan also says "use the
visual style's palette, light and textures". Svarga's profile asks for "soft
morning light" and "soft natural sunlight filtering through tropical
foliage", so its prompts bring the garden and the light back in, partly
undoing the dark rule. Sen's profile ("warm diffused sunlight") pushes less,
and its images stay dim.

The fix goes Svarga's way, for every spa, with the people who book in mind:
tourists and expats just off a long flight, after a surf or a hike, or after
days at a laptop, who picture a holiday room. Svarga's guests stay in villas
in Canggu, Pererenan and Seminyak; Sen's stay in hotels and villas by My Khe
and An Thuong.

Success: next to Svarga's, the maintainer finds Sen's images just as bright
and positive. In every image where the room shows, it opens onto green
plants of the place. No image has a grey sky, rain, harsh midday glare or a
dark room. Phase 2's gate ("would post at least 4 of 6") still holds.

Why now: Sen is one of the two pilot spas; dark images would fail its gate
before anything else is judged.

## Behaviour

### The light: golden hour

Every image is lit at **golden hour**: the low, warm sun of late afternoon
comes in through open doors or a wide window, and lamps or candles are lit.
The room glows honey and amber. It looks bright and happy, never harsh
midday sun, a grey sky, mist, rain or damp, and never a dark or dim room.

This replaces 2.2's "light is always low, soft and warm: dusk, a lamp,
lanterns, candles", 2.3's "dim and intimate, nothing bright" and "the light
is dusk, lamps, lanterns or candles". For images made from now on, it also
replaces decision 0004's first prompt lesson and the light in its
Confirmation criterion 5 ("low, soft and warm, never bright or harsh: the
mood invites introspection"). Decision 0004 itself stays as approved: it
records why Nano Banana 2.1 was chosen, and how images look is product
behaviour, which lives in specs. The reasons behind those rules still stand:
grey skies, mist, rain and damp gave gloomy, mouldy images in the bake-off,
and they stay banned, as does harsh sun.

### The room the guest pictures

When the room is in the frame (every scene but `detail`, the close view of
the hands), it is **the room a tourist pictures for their stay**, and it
**opens onto the outside**: open doors, a wide window or a balcony onto
green plants of the place, lit by the golden sun. Curtains are open and
hang still. Where the town or service area is by the sea, the sea may show
beyond the plants; where it suits a villa, a pool may show.

Code knows the place from the set-up's `locals` (2.12) and writes it into
the style line, so the image model reads it whatever the post plan wrote:

| `locals` | The room | Through the doors or window | The place's flower |
|---|---|---|---|
| `Balinese` | A Balinese villa room: carved and natural wood, rattan, a thatched alang-alang roof | A tropical garden: frangipani trees, banana leaves, coconut palms, ferns | Frangipani flowers on the tray |
| `Indonesian` | An Indonesian villa room: natural wood and rattan | A tropical garden: banana leaves, palms, ferns | Frangipani flowers on the tray |
| `Vietnamese` | A Vietnamese boutique hotel room or villa: warm wood, rattan and bamboo | A garden: areca palms, bamboo, banana leaves, coconut palms | A pink lotus floating in a bowl of water |
| `Southeast Asian` | A tropical boutique hotel room or villa: warm wood and rattan | Tropical greenery: palms, banana leaves, ferns | Orchids in a small vase |

The plants are always **green plants that grow in that place**: never
cactus, olive trees, pines or other plants from elsewhere. "Sen" means lotus
in Vietnamese and is in Sen's place symbols; frangipani is in Svarga's.

The place's flower is a touch of the room, shown when a tray, a bedside
table or the room is in the frame; it is not forced into every image, so a
batch doesn't repeat one lotus bowl six times. Any flower that shows is the
place's own: never a lotus at Svarga, never frangipani at Sen.

`imagePrompt` doesn't learn the scene: the style line says all this "when
the room shows", and the image model leaves the room out of a close view of
the hands, as it does today.

A post saved before set-ups (2.12) has no `locals`; it gets the `Southeast
Asian` row, as its therapists already do.

### A sign of the guest's day

Only in a **`moment` post's** image (a reason people come: after a surf, a
hike, a long flight, laptop days), the image prompt may hold **one small,
plain object from that moment**: a surfboard against the balcony rail,
hiking boots by the door, a suitcase, or a closed laptop on a desk. It sits
far in the background, half hidden and out of focus, never near the guest
and never the subject, with no logo or text on it. Most images have none.
The maintainer asked that it stay very subtle and discreet.

### The mood

The style line's mood changes from "a quiet, relaxing mood that invites
introspection, as if time has slowed down" to a warm, bright and happy
holiday mood: calm and restful, a treat the guest has earned.

### What the post plan's prompt says

`planPrompt` (`lib/posts/prompt.ts`) changes three image rules and adds one;
the rest stays as it is:

- The light rule becomes golden hour, as above.
- The room rule gains: the room opens onto the outside, onto green plants of
  the place, and the sea or a pool where the place has one.
- "Use the visual style's palette, light and textures" stays. The brand's
  light now agrees with the rule; where it says "morning" or "daylight",
  code's swap below turns it to golden hour.
- New: the sign of the guest's day, in a `moment` post only, as above.

`POSTS_PROMPT_VERSION` becomes `posts-6`.

### What code swaps in the post's image prompt

`cleanLight` (`lib/posts/image-prompt.ts`) keeps swapping weather and adds
the dark and midday words; it no longer swaps sunlight itself:

| The post's image prompt says | Code writes |
|---|---|
| bright sun, bright sunlight, bright sunshine | low golden sun |
| sunny | golden |
| daylight | golden-hour light |
| in the morning, in the afternoon, at dusk, at night, in the evening | at golden hour |
| morning, midday, noon, daytime, dusk, evening, night | golden hour |
| dimly lit | warmly lit |
| dim, darkened | warm |
| low, before light or lighting with only soft, warm, "and" or commas between ("low light", "Low, soft and warm lighting", "soft low lighting", "Warm low light") | golden-hour |
| an overcast, grey or gray sky | a golden sky |
| overcast | calm |
| misty, foggy | quiet |
| damp, wet | clean |
| rainy, rain, mist, fog | (removed) |

"Sunlit", "sunlight", "sunshine" and "bright" alone are no longer swapped:
the golden-hour sun is welcome now. "Late afternoon" is golden hour and
stays as written. "Dark" alone is not swapped, as it describes things that
should stay dark: a hot stone, and the small dark bottle the rules forbid.
Whole words only, the first letter's case kept, as today. The owner's hint
is not swapped.

The "low" row matters for posts already saved on the phones: their
`posts-5` image prompts all say the light is low ("Low, soft and warm
lighting", "Soft low lighting"), and "New image" on one of Sen's dark posts
is the likeliest way an owner tries to fix it. Swapped, those prompts no
longer pull against the golden-hour style line.

### What the image model gets

`imagePrompt` keeps its order (cast line, the post's image prompt swapped as
above, the owner's hint, the style line). The style line:

- asks for golden-hour light and the new mood, in place of the dim light
  and the introspective mood;
- ends its light rule with "whatever the scene says, the light is golden
  hour: the low warm sun from outside, with lamps or candles lit";
- gains the place's room, view and flower from the table above, by
  `locals`;
- says any object from the guest's day is small, far in the background and
  out of focus;
- keeps everything else: the camera, the centred subject, no text, the
  massage under way, the relaxed guest, neat linens, the homely room, still
  curtains, golden oil, the therapists' look and the hidden faces.

The owner's hint still comes before the style line, so the style line wins
on the light, the room, the plants and the flower, as it already wins on the
light today. A hint can still ask for anything else (more green, a balcony,
towels on the legs).

`IMAGE_PROMPT_VERSION` becomes `images-7`.

### Tests and evaluation

- Unit tests (Vitest) for: each row of the swap table, and the words it
  leaves alone (sunlit, sunlight, bright, late afternoon, dark stones, the
  small dark bottle); the twelve recorded `posts-5` image prompts of Sen and
  Svarga, copied into the test before the fixtures are re-recorded, coming
  out with no low, dim or dusk light; the style line for each `locals` (room, plants,
  flower), with no lotus for Balinese and no frangipani for Vietnamese; the
  style line asking for golden hour and no longer saying dusk or dim; a
  request without a set-up getting the `Southeast Asian` row; the post plan's
  prompt holding the golden-hour rule, the open room and the `moment`-only
  sign, and no longer saying dusk; both versions bumped.
- `pnpm eval:posts sen svarga --record` re-records both fixtures with
  `posts-6` (1 Gemini request each), and again with `--offer` for
  `posts-offer.json`.
- `pnpm eval:images sen svarga` makes their twelve images with `images-7`
  (about $0.60 of the prepaid balance; the developer is asked first).
- The maintainer looks at both spas' images side by side. For each image:
  is it lit at golden hour, never grey, rainy, glaring or dark; where the
  room shows, does it open onto green plants of the place; is any flower the
  place's own; is any sign of the guest's day discreet; would a tourist book
  this. Verdicts go in the journal with both prompt versions, with each
  image's mean brightness next to the 27 Oct run's (Svarga 72, Sen 83 on a
  0 to 255 scale; that measure didn't match the eye, so it is a record, not
  a pass rule). Pass: the maintainer finds Sen's images as bright and
  positive as Svarga's, no image fails the light, every room shown opens
  onto the place's plants, and at least 4 of 6 per spa a tourist would book.

## Acceptance criteria

```gherkin
Scenario: Golden hour in every image
  Given any post's image prompt
  When the image prompt is built
  Then the style line asks for the low golden sun of late afternoon with lamps or candles lit
  And it no longer asks for dusk or dim light

Scenario: Dark and midday words are swapped
  Given a post whose image prompt says "A dimly lit villa at dusk, sunny balcony at midday"
  When the image prompt is built
  Then it says "A warmly lit villa at golden hour, golden balcony at golden hour"

Scenario: Weather stays banned
  Given a post whose image prompt says "an overcast sky over a misty, wet terrace"
  When the image prompt is built
  Then it says "a golden sky over a quiet, clean terrace"

Scenario: Sen's room
  Given a set-up with locals "Vietnamese"
  When the image prompt is built
  Then the style line asks for a Vietnamese boutique hotel room or villa open onto areca palms, bamboo, banana leaves and coconut palms
  And a pink lotus floating in a bowl of water
  And it never names frangipani

Scenario: Svarga's room
  Given a set-up with locals "Balinese"
  When the image prompt is built
  Then the style line asks for a Balinese villa room open onto frangipani trees, banana leaves, coconut palms and ferns
  And frangipani flowers on the tray
  And it never names a lotus

Scenario: An old post
  Given a post saved before set-ups
  When the owner taps "New image"
  Then the style line asks for a tropical boutique hotel room or villa, tropical greenery and orchids

Scenario: A sign of the guest's day, only on a moment post
  Given a batch planned with posts-6
  Then the post plan's prompt allows one small object from the guest's day only in a moment post's image, far in the background and out of focus

Scenario: Sen looks like Svarga
  Given Sen's and Svarga's twelve images made with images-7
  When the maintainer looks at them side by side
  Then Sen's images are as bright and positive as Svarga's
  And every room in the frame opens onto green plants of the place
```

## Known limits

- **The image model may still not listen.** Golden hour, the open room and
  the plants are words; nothing checks the image itself. A dark image can
  still come back; the owner taps "New image" (about $0.05), with a hint if
  needed.
- **Every image is at the same hour.** Six images of a batch share the
  golden-hour light, which keeps a spa's feed coherent but gives up night
  and candle-only scenes.
- **The place is the country, not the town.** The room, plants and flower
  follow `locals`; a spa in Hanoi gets Da Nang's palms, and a spa outside
  Bali gets the Indonesian row. The sea depends on the post plan knowing
  that the town is by the sea.
- **The sign of the guest's day may come out too big.** Nothing measures
  how discreet it is; the maintainer's verdicts are the measure, and the
  owner can ask for a new image.
- **Brightness is judged by eye.** The mean brightness is recorded, but it
  disagreed with the maintainer's eye on the 27 Oct run.

## Out of scope

- The guests' looks by persona (age, origin, style): still left to the model.
- The owner choosing the room, the hour or the flower: not offered. The
  style line wins over the hint on these, as it already does on the light.
- Changing the brand read's visual style: the profile stays as read and
  edited.
- Checking the image itself (a second model that looks at it): not planned.
- Better images or a different image model: phase 5.
