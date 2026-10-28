# Golden-hour images: journal

## Calls made along the way

- 2026-10-28: the maintainer saw more light in Svarga's images than in Sen's.
  Cause found: 2.2's post plan says "use the visual style's palette, light
  and textures", and Svarga's profile asks for "soft morning light" and
  "soft natural sunlight filtering through tropical foliage", so its prompts
  bring the garden and the light back in ("a bright villa room" on the
  27 Oct run) against the "dusk, lamps, candles, dim" rule. Sen's profile
  ("warm diffused sunlight") pushes less, and its rooms stay grey-beige with
  the curtains drawn. Mean brightness of the 27 Oct story and post images,
  0 to 255: Svarga 72, Sen 83; the measure disagrees with the eye, so it is
  kept as a record only.
- 2026-10-28: the maintainer's verdict: Sen is way too dark; Sen's images
  should look like Svarga's in brightness and positive mood; plants seen
  outside must be local green plants. Of the four ideas offered, all were
  taken: golden hour, the room the guest pictures, each spa's flower, and
  the sign of the guest's day, which "must be very subtle and discreet".
- 2026-10-28: after the builder check, five calls in the spec: a "low"
  row in the swap table, for `posts-5` prompts saved on the phones; the
  place's flower not forced into every image; `imagePrompt` not learning
  the scene (the style line says "when the room shows"); the style line
  winning over the owner's hint on light, room, plants and flower, as it
  already did on light; decision 0004 left as approved, the spec replacing
  its light lesson and criterion 5's light for images.

- 2026-10-28: four older tests used "at dusk" in their sample prompts, which
  the new table now turns into golden hour; their samples say "at golden
  hour" instead, as they test the prompt's order, not its light.
- 2026-10-28: the test that grey skies, mist, rain and damp are dropped now
  checks `cleanLight` alone: the new style line names them to forbid them
  ("never … a grey sky, mist or rain"), so the whole prompt holds the words.
  The log line's test also moves to `images-7`.
- 2026-10-28: `pnpm check` stops at `check-repo` in this worktree only:
  AGENTS.md cites `.superpowers/guide/`, and the check looks at it because
  the worktree has a `.superpowers/` scratch folder (the plan's ledger)
  without the guide in it. `biome ci`, `pnpm typecheck` and `vitest run`
  were run directly instead, all green; CI has no `.superpowers/`.
- 2026-10-28: `posts-6` recorded for Sen and Svarga, with and without the
  offer: 6 Flash-Lite requests, not 4. Sen's first plan hit
  `model_timeout`, and Svarga's first offer plan put a hook before the offer
  line in both offer captions (2.13's rule, untouched here), which the
  replay test refuses; each was recorded once more. Reading the 24 image
  prompts: all at golden hour, none with dusk, dim, low, night or midday
  light; 21 name green plants, a garden or foliage outside (the style line
  adds them to the other 3). Signs of the guest's day: a surfboard on both
  Svarga moment posts and a suitcase on Sen's offer-batch moment post, as
  asked; but hiking boots on Sen's moment post (Sen's moments are a surf, a
  long flight and laptop days, not a hike) and a surfboard on Sen's
  offer-batch `local` post, where none should be. The images will show
  whether they stay discreet. Every caption's first line runs over 125
  characters (code's 2.13 warning), as it did on every `posts-5` post: not
  from this change.
- 2026-10-28: the first `pnpm eval:images sen svarga` with `images-7` gave
  12 `image_timeout` at 60 s and no image; a timing script a minute later
  first failed with "Cannot connect to API", then, with the maintainer's
  go-ahead ($0.10), made Sen's first post twice with no cut-off: `images-6`'s
  style line in 34 s (916 thinking tokens), `images-7`'s in 41 s (1,268
  thinking tokens, 461 words against 321). The new line costs about 6 s,
  well under the 60 s cut-off, so the timeouts were the network or Google at
  that moment, not the prompt. The `images-7` image shows the spec's room:
  a wide window onto banana leaves, palms and bamboo in golden light, lamps
  lit, a pink lotus in a bowl on a rattan table (mean brightness 113,
  against 104 for `images-6`).
- 2026-10-28: the whole-branch review found `posts-5` offer prompts saying
  "low-lit" ("a warm, low-lit hotel room in Canggu"), which the "low" row
  missed. Rows added: "dimly-lit" with a hyphen, "low-lit" or "low lit" →
  "golden-lit", "low-light" → "golden-hour light", and "low" before lamp
  light or candlelight → "golden". The twelve `posts-5` offer prompts joined
  the test's list. RED `Tests  8 failed | 72 passed (80)`, GREEN
  `Tests  80 passed (80)`; whole suite `Tests  1516 passed (1516)`.
- 2026-10-28: on the two test images, the maintainer: "There should be a mix
  of images for the day and images for the night, as for now the 2 images
  you show me looks too much bright". Golden hour for every image is
  dropped; the spec goes back to the maintainer before more images.
- 2026-10-28: the maintainer approved "Day and night images": day at the
  brightness of Svarga's 27 Oct images, three day and three night per batch.
  The spec folder moved from `golden-hour-images` to `day-and-night-images`.
- 2026-10-28: once, in a full Vitest run, `brand-fixtures-replay` timed out
  at 5 s on karsa-spa (a brand read, untouched here); alone it passes in
  time. Load on the machine, not this change.
- 2026-10-28: four older tests sampled prompts "at golden hour", which the
  day swap now writes "in the late afternoon"; their samples say "in the
  late afternoon" instead, as they test the prompt's order, not its light.

## RED

Task 1, the swap table (`tests/unit/posts-image.test.ts`):

```
      Tests  22 failed | 33 passed (55)
```

Task 2, the style line (`posts-image.test.ts`, `posts-image-run.test.ts`):

```
      Tests  15 failed | 56 passed (71)
```

Task 3, the post plan's prompt (`posts-prompt.test.ts`, `posts-run.test.ts`):

```
      Tests  7 failed | 41 passed (48)
```

Day and night, Task 1, the set-up's light (`posts-setup.test.ts`):

```
      Tests  5 failed | 58 passed (63)
```

Day and night, Task 2, swaps by light (`posts-image.test.ts`):

```
      Tests  39 failed | 63 passed (102)
```

Day and night, Task 3, the style line by light (`posts-image.test.ts`, `posts-image-run.test.ts`):

```
      Tests  8 failed | 108 passed (116)
```

## GREEN

Day and night, Task 1 (`posts-setup.test.ts`, `posts-fixtures-replay.test.ts`):

```
      Tests  76 passed (76)
```

Task 1:

```
      Tests  55 passed (55)
```

Task 2:

```
      Tests  71 passed (71)
```

Task 3:

```
      Tests  48 passed (48)
```

Whole suite after Task 3:

```
 Test Files  106 passed (106)
      Tests  1497 passed (1497)
```

Day and night, Task 2:

```
      Tests  102 passed (102)
```

Day and night, Task 3, then the whole suite:

```
      Tests  116 passed (116)
 Test Files  106 passed (106)
      Tests  1547 passed (1547)
```
