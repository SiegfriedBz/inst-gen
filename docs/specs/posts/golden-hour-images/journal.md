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

## RED

Task 1, the swap table (`tests/unit/posts-image.test.ts`):

```
      Tests  22 failed | 33 passed (55)
```

## GREEN

Task 1:

```
      Tests  55 passed (55)
```
