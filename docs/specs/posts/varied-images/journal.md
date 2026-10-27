# Varied images: journal

## Calls made along the way

- 2026-10-27: `locals` travels inside the set-up rather than as its own
  field of the image request: one object goes from the plan to the image.
- 2026-10-27: the scene list moves to `lib/posts/scene.ts`, re-exported by
  `batch.ts`: the set-ups need it and `batch.ts` imports the set-up schema,
  which would otherwise be a circular import.
- 2026-10-27: `countryOf` moves to `lib/brand/country.ts`, so the server
  can use it without the browser's search client.
- 2026-10-27: the post plan lists the set-ups before the special offer, so
  the offer stays the last thing the model reads.
- 2026-10-27: a post saved before set-ups has no cast line, and its style
  line names the therapists "young Southeast Asian" women instead of "young
  local" ones.
- 2026-10-27: the evals deal the set-ups with a seed from the slug
  (`<slug>:offer` for offer plans), and so does the fixture replay test, so
  replaying a recording deals the set-ups it was recorded with.
- 2026-10-27: `pnpm check` stops at `check-repo.mjs`: "AGENTS.md: cites
  .superpowers/guide/, which doesn't exist". That folder is git-ignored
  scratch made by `pnpm guide:pdf`, missing in this worktree and in the
  main checkout; unrelated to this change. The rest of `pnpm check` (biome
  ci, typecheck, Vitest) passes when run on its own.
- 2026-10-27: first real plans for Sen and Svarga (2 Gemini requests,
  asked first): every image prompt followed its set-up. Two fixes came of
  it: "two women therapists" now satisfies the two-therapists check, and
  the plan prompt tells the model not to write "scene" or "set-up" labels
  in the image prompt (Sen's had "Scene place…"). Those two recordings were
  thrown away, made before the fix.
- 2026-10-27: final review fixes. A couple never takes the close-up scene,
  which can't show both guests; "room", "tea", "night" and the like exclude
  a name only when it holds no treatment word ("In-Room Massage" is drawn,
  "Afternoon Tea" isn't), while gift, voucher, card, children and the
  pictureless treatments stay excluded whatever the name says; the refill
  takes the least-used treatment each time, so an offer's treatment isn't
  dealt again before the others; a name listed twice is one treatment.
- 2026-10-27: `pnpm eval:posts sen svarga --record` and `--offer --record`
  with the final `posts-4` (4 Gemini requests, asked first; not a pilot
  day). Sen and Svarga, and Svarga's offer plan: every image prompt shows
  its set-up's treatment, guests and therapists; three men and three women
  in each plain plan; four-hands has "two female therapists". Both spas
  offer a Couple and a Four-Hands Massage; each batch draws 6 of their 7
  or 8 treatments at random, so these four batches drew four-hands three
  times and the couple once (Sen's offer plan: a man and a woman, two
  female therapists). The maintainer confirmed it stays random from batch
  to batch. Sen's offer plan
  slipped one row for posts 3 to 5 (post 3, a foot reflexology set-up,
  describes a back massage; posts 4 and 5 swap their guests); code flagged
  two of the three (`no "man"`, `no "woman"`). The cast line still tells
  the image model who is in the picture, so those images get the dealt
  guests; the prose may still describe another treatment.
- 2026-10-27: `pnpm eval:images sen svarga` with `posts-4` and `images-5`
  (12 images, about $0.60, asked first), all made on the first try, 20 to
  36 s each. Set-ups shown: Sen, deep tissue on a man's back, a close view
  of a man's arm, foot reflexology for a man in a reclining chair, a woman
  from above, four-hands on a woman's legs with two therapists, a woman's
  arm; Svarga, a woman's back, foot reflexology for a man, a man's arm, a
  lulur scrub with its bowl, four-hands on a man's legs with two
  therapists, a woman from above. Therapists warm and tanned in all 12;
  Svarga's in Balinese sarongs. The maintainer's verdict on the twelve:
  "They look very good": pass. Seen but not failed: several therapists'
  faces show in profile (Svarga 1 to 4) or blurred (Sen 1), and a guest
  under a sheet is hard to tell man or woman (Sen 5, Svarga 5).
- 2026-10-27: asked by the maintainer: never a full face. The style line
  gains "Her face is turned away, lowered or out of frame." and "Every
  guest's face is turned away, resting in the face cradle, covered or out
  of frame: never a full face."; `images-6`. `pnpm eval:images svarga`
  (6 images, about $0.30, asked first) remade Svarga's six set-ups. The
  maintainer's verdict on the therapists' angles: very good on 2 of 6 with
  `images-5` (3 and 6), on 4 of 6 with `images-6` (2, 3, 4 and 6); in 1
  and 5 the therapists look down with part of the face showing. No face
  looks at the camera; two guests show in profile, eyes closed (2 and 3).

## RED

```
 Test Files  1 failed (1)
      Tests  no tests
```

(`tests/unit/posts-setup.test.ts`, before `lib/posts/setup.ts` existed.)

## GREEN

```
 Test Files  103 passed (103)
      Tests  1366 passed (1366)
```
