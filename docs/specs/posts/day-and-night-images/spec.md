---
title: "Day and night images"
description: "Code deals each batch three day images and three night images: day in late afternoon, lamps the main light and the garden in soft shade, at the brightness of Svarga's 27 Oct images, night in a warm glow of lamps and candles, never dark; each in the room a tourist pictures for their stay, open onto the place's own green plants, with the place's flower and, on a moment post only, one discreet sign of the guest's day."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-28T20:14:16Z }
date: "2026-10-28"
---

# Day and night images

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

A first version of this spec lit every image at golden hour. Two test images
made with it (journal, 2026-10-28) came out too bright, sun streaming into
the room, and the maintainer asked for "a mix of images for the day and
images for the night", with the day at the brightness of Svarga's 27 Oct
images. The first day and night images (`images-8`, journal) came out with
days far brighter than that (mean 98 to 131 against 58 to 82, a sunlit
garden through open doors), and the maintainer found them too bright: by
day, the lamps are now the main light and the garden is in soft shade.

The fix is built with the people who book in mind: tourists and expats just
off a long flight, after a surf or a hike, or after days at a laptop, who
picture a holiday room. Svarga's guests stay in villas in Canggu, Pererenan
and Seminyak; Sen's stay in hotels and villas by My Khe and An Thuong.

Success: each spa's batch shows three day images and three night images. The
maintainer finds the day images as bright as Svarga's 27 Oct images, never
brighter, and the night images warm and inviting, never dark. In every image
where the room shows, it opens onto green plants of the place. No image has
a grey sky, rain, harsh sun or a gloomy room. Phase 2's gate ("would post at
least 4 of 6") still holds.

Why now: Sen is one of the two pilot spas; dark images would fail its gate
before anything else is judged.

## Behaviour

### Day or night: code deals it

Each set-up (2.12, `lib/posts/setup.ts`) gains a `light`, `day` or `night`.
Code deals **three of each** per batch of six, in a random order from the
batch's seed, after the other fields, so the rest of a deal stays as it was.
With fewer than six set-ups, the extra one is a day. The post plan's
set-up line ends with the light ("…; day" or "…; night"), and the post's
image prompt describes that light.

A set-up saved before this spec has no `light`; it is read as `day`. A post
saved before set-ups has no set-up and is also a day.

### The two lights

**Day.** Late afternoon, at the brightness of Svarga's 27 Oct images, never
brighter: the lamps lit inside are the main light, and the garden of local
plants outside, seen through open doors or a wide window, is in soft shade,
with no sunlight on it. Warm and calm, never bright: never sunbeams across
the room, a sunlit garden, harsh sun or blown-out windows.

**Night.** Evening: lamps and candles give the room a warm, golden glow;
through the window or open doors, the garden of local plants is lit by
lanterns under a deep blue sky. Warm and inviting: never dark, dim or
gloomy, never as dim as Sen's 27 Oct images.

In both, never a grey sky, mist, rain or damp, as decision 0004's bake-off
showed they give gloomy, mouldy images.

This replaces 2.2's "light is always low, soft and warm: dusk, a lamp,
lanterns, candles", 2.3's "dim and intimate, nothing bright" and "the light
is dusk, lamps, lanterns or candles". For images made from now on, it also
replaces decision 0004's first prompt lesson and the light in its
Confirmation criterion 5 ("low, soft and warm, never bright or harsh: the
mood invites introspection"). Decision 0004 itself stays as approved: it
records why Nano Banana 2.1 was chosen, and how images look is product
behaviour, which lives in specs.

### The room the guest pictures

When the room is in the frame (every scene but `detail`, the close view of
the hands), it is **the room a tourist pictures for their stay**, and it
**opens onto the outside**: open doors, a wide window or a balcony onto
green plants of the place, in soft shade by day and lit by lanterns at
night. Curtains are open and hang still. Where the town or service area is
by the sea, the sea may show beyond the plants; where it suits a villa, a
pool may show.

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
introspection, as if time has slowed down" to a warm, happy holiday mood:
calm and restful, a treat the guest has earned. Day and night share it.

### What the post plan's prompt says

`planPrompt` (`lib/posts/prompt.ts`):

- The light rule follows the set-up: a day set-up gets the day light above,
  a night set-up the night light; never a grey sky, mist, rain or damp. An
  image prompt never calls a room or its light bright.
- The room rule gains: the room opens onto the outside, onto green plants
  that grow in that place, and the sea or a pool where the place has one.
- "Use the visual style's palette, light and textures" becomes "palette and
  textures": the light is the set-up's now, and Svarga's "morning sunlight"
  would pull a night image the wrong way. Code also leaves
  `visualStyle.light` out of the brand profile in the plan's user text
  (`planUserText`), so the model never reads it. The profile itself, its
  hash and the rewrite's user text don't change, so no batch on a phone is
  marked behind; the rewrite keeps image prompts as they are and never needs
  the light.
- New: the sign of the guest's day, in a `moment` post only, as above.

`POSTS_PROMPT_VERSION` becomes `posts-8`.

### What code swaps in the post's image prompt

`cleanLight` (`lib/posts/image-prompt.ts`) takes the set-up's light and
swaps words of the other light, and of dark or harsh light, before the image
model reads them. Whole words only, the first letter's case kept, as today.
The owner's hint is not swapped.

| The post's image prompt says | Day: code writes | Night: code writes |
|---|---|---|
| bright sun, bright sunlight, bright sunshine | soft light | lamplight |
| brightly lit | warmly lit | warmly lit |
| bright | warm | warm |
| sunbeams, sun rays | soft light | lamplight |
| sunset, sunrise | late afternoon | evening |
| sunlight, sunshine | soft light | lamplight |
| sun, except before lounger, loungers, deck, hat, bed, beds, terrace, umbrella, shade, cream or screen | soft light | lamplight |
| daylight | soft light | lamplight |
| sunlit | softly lit | lamp-lit |
| sunny | soft | warm |
| golden hour, golden-hour | late afternoon | evening |
| in the morning, in the afternoon, at golden hour | in the late afternoon | in the evening |
| in the evening, at dusk, at night | in the late afternoon | (kept) |
| morning, midday, noon, daytime | late afternoon | evening |
| afternoon, late afternoon | (kept) | evening |
| dusk, evening, night | late afternoon | (kept) |
| dimly lit, dimly-lit, low-lit, low lit | softly lit | warmly lit |
| dim, darkened | soft | warm |
| low-light | soft light | warm light |
| low, before light, lighting, daylight, lamp light, lamplight or candlelight, with only soft, warm, golden, "and" or commas between | gentle | glowing |
| an overcast, grey or gray sky | a soft blue sky | a deep blue sky |
| overcast | calm | calm |
| misty, foggy | quiet | quiet |
| damp, wet | clean | clean |
| rainy, rain, mist, fog | (removed) | (removed) |

The rows run top to bottom, so "bright sunlight" is swapped once, and the
"low" row sees what the sun rows wrote ("low golden sun" by day becomes
"gentle golden soft light"). The day keeps no sun and no daylight at all:
the golden-hour test images and the first day images showed that sun or
daylight in the prompt gives a sunlit room. "Bright" is "warm" again, by
day and by night, as it was before `images-7`: the 27 Oct images were made
with that swap, and every `posts-7` day prompt called the room "bright".
"Dark" alone is not swapped: it describes things
that should stay dark, a hot stone and the small dark bottle the rules
forbid. The "low" and "dim" rows matter for posts already saved on the
phones: their `posts-5` image prompts say the light is low ("Low, soft and
warm lighting", "a warm, low-lit hotel room"), and "New image" on one of
Sen's dark posts is the likeliest way an owner tries to fix it. Those posts
have no `light` and are read as day.

### What the image model gets

`imagePrompt` keeps its order (cast line, the post's image prompt swapped as
above, the owner's hint, the style line). The style line, by the set-up's
light:

- asks for the day or the night light above, and the new mood, in place of
  the dim light and the introspective mood;
- ends its light rule with "whatever the scene says, it is late afternoon:
  the lamps lit inside are the main light, the garden outside in soft
  shade" by day, or "whatever the scene
  says, it is evening: lamps and candles lit, the garden lit by lanterns
  under a deep blue sky" by night;
- gains the place's room, view and flower from the table above, by
  `locals`, the view in soft shade or lit by lanterns;
- says any object from the guest's day is small, far in the background and
  out of focus;
- keeps everything else: the camera, the centred subject, no text, the
  massage under way, the relaxed guest, neat linens, the homely room, still
  curtains, golden oil, the therapists' look and the hidden faces.

The owner's hint still comes before the style line, so the style line wins
on the light, the room, the plants and the flower, as it already wins on the
light today. A hint can still ask for anything else (more green, a balcony,
towels on the legs).

`IMAGE_PROMPT_VERSION` becomes `images-9`.

### Tests and evaluation

- Unit tests (Vitest) for: the deal (three day and three night in a batch of
  six, the same seed giving the same lights, the other fields dealt as
  before, fewer than six with the extra one a day); the set-up schema with
  and without `light`; the set-up line ending with the light; each row of
  the swap table for day and for night, and the words it leaves alone
  (dark stones, the small dark bottle, a low table, a sun lounger, a sun
  deck); the plan's user text without `visualStyle.light`, and the
  profile hash unchanged; the twenty-four
  recorded `posts-5` image prompts of Sen and Svarga (plan and offer plan),
  read as day, coming out with no low, dim or dusk light; the style line for
  each light (day: late afternoon, lamps the main light, the garden in soft
  shade, never bright, never sunbeams or a sunlit garden; night:
  evening, lamps, candles, lanterns, never dark) and for each `locals`
  (room, plants, flower), with no lotus for Balinese and no frangipani for
  Vietnamese; a request without a set-up getting a day and the `Southeast
  Asian` row; the post plan's prompt holding the day and night lights, the
  open room, "palette and textures", never calling a room bright, and the
  `moment`-only sign; both versions bumped.
- `pnpm eval:posts sen svarga --record` re-records both fixtures with
  `posts-8` (1 Gemini request each), and again with `--offer` for
  `posts-offer.json`.
- `pnpm eval:images sen svarga` makes their twelve images with `images-9`
  (about $0.60 of the prepaid balance; the developer is asked first). When
  Google is slow, the images may be made one at a time with a longer
  cut-off, as on 28 Oct.
- The maintainer looks at both spas' images side by side, next to Svarga's
  27 Oct images. For each image: is a day image as bright as those, never
  brighter, with no sunbeams or blown-out window; is a night image warm and
  inviting, never dark; is any image grey, rainy or gloomy; where the room
  shows, does it open onto green plants of the place; is any flower the
  place's own; is any sign of the guest's day discreet; would a tourist book
  this. Verdicts go in the journal with both prompt versions, with each
  image's mean brightness next to the 27 Oct run's (Svarga 72, Sen 83 on a 0
  to 255 scale) and the two golden-hour test images' (104 and 113); the
  measure is a record, not a pass rule. Pass: three day and three night
  images per spa; the maintainer finds the day images at Svarga's 27 Oct
  brightness and the night images warm, not dark; no image fails the light;
  every room shown opens onto the place's plants; and at least 4 of 6 per
  spa a tourist would book.
- If the images fail, the developer stops and reports with the images and
  the maintainer's verdicts; the style line is tuned only from the
  maintainer's words, with a new version, and each new image run is asked
  for first. Roadmap 2.14 is `done` only once the images pass.

## Acceptance criteria

```gherkin
Scenario: Three days and three nights
  Given Sen's profile
  When code deals the six set-ups
  Then three have light "day" and three have light "night"
  And the post plan's set-up lines end with their light

Scenario: The same seed, the same lights
  Given the same profile and the same seed
  When code deals twice
  Then both deals have the same lights, and the same treatments, guests and scenes as before this spec

Scenario: A day image
  Given a set-up with light "day"
  When the image prompt is built
  Then the style line asks for late afternoon, the lamps inside as the main light and the garden in soft shade
  And never a bright room, sunbeams across the room, a sunlit garden or harsh sun

Scenario: A night image
  Given a set-up with light "night"
  When the image prompt is built
  Then the style line asks for evening, lamps and candles, and the garden lit by lanterns under a deep blue sky
  And never a dark or gloomy room

Scenario: Words of the other light are swapped
  Given a night set-up whose post prompt says "Golden hour light streams through a sunlit window"
  When the image prompt is built
  Then it says "Evening light streams through a lamp-lit window"

Scenario: An old dark post gets a day image
  Given a post saved with posts-5 whose image prompt says "a warm, low-lit hotel room" and whose set-up has no light
  When the owner taps "New image"
  Then the image prompt says "a warm, softly lit hotel room"
  And the style line is the day one

Scenario: Weather stays banned
  Given a day set-up whose post prompt says "an overcast sky over a misty, wet terrace"
  When the image prompt is built
  Then it says "a soft blue sky over a quiet, clean terrace"

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

Scenario: A sign of the guest's day, only on a moment post
  Given a batch planned with posts-8
  Then the post plan's prompt allows one small object from the guest's day only in a moment post's image, far in the background and out of focus

Scenario: Sen looks like Svarga
  Given Sen's and Svarga's twelve images made with images-9
  When the maintainer looks at them next to Svarga's 27 Oct images
  Then each spa has three day images and three night images
  And the day images are as bright as Svarga's 27 Oct images, and the night images warm, not dark
  And every room in the frame opens onto green plants of the place
```

## Known limits

- **The image model may still not listen.** The light, the open room and
  the plants are words; nothing checks the image itself. A too-bright or
  too-dark image can still come back; the owner taps "New image" (about
  $0.05), with a hint if needed.
- **The light is dealt, not chosen.** A post about a sunset or a morning
  surf may get the other light; its prompt's words are swapped to match.
  "New image" keeps the post's light.
- **The place is the country, not the town.** The room, plants and flower
  follow `locals`; a spa in Hanoi gets Da Nang's palms, and a spa outside
  Bali gets the Indonesian row. The sea depends on the post plan knowing
  that the town is by the sea.
- **The sign of the guest's day may come out too big, or on the wrong
  post.** Nothing measures how discreet it is, and the image request doesn't
  carry the post's type; the maintainer's verdicts are the measure, and the
  owner can ask for a new image.
- **Brightness is judged by eye.** The mean brightness is recorded, but it
  disagreed with the maintainer's eye on the 27 Oct run.
- **The longer style line makes images a few seconds slower.** The first
  version's line took 41 s against 34 s for `images-6` on the same post,
  under the 60 s cut-off; Google's own slow moments can still cross it.

## Out of scope

- The guests' looks by persona (age, origin, style): still left to the model.
- The owner choosing the light, the room or the flower: not offered. The
  style line wins over the hint on these, as it already does on the light.
- Changing the brand read's visual style: the profile stays as read and
  edited, and the owner still sees its light; only the post plan stops
  reading it.
- Checking the image itself (a second model that looks at it): not planned.
- Better images or a different image model: phase 5.
