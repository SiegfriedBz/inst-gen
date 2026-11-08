# The therapists' look in images: journal

## Calls made along the way

- 2026-11-08: the maintainer's calls, before the spec: **images only**
  (captions and story texts don't mention the look), and **always women**
  (Svarga's new site shows a man as the therapist in two photos).
- 2026-11-08: both new sites, looked at in the browser pane before the spec.
  Sen's treatment and team photos show a white short-sleeved tunic with a
  small stand-up collar, white trousers and dark hair in a low bun; its
  largest photo (`hero-v2.jpg`) shows a black top, in a garden like Svarga's.
  Svarga's treatment photos show a dark tunic (black or navy) with dark
  trousers and the hair in a bun; smaller team photos show white and
  sage-green tops. Neither site says it in words: both say "clean uniform"
  and ID.
- 2026-11-08: the spec's builder check asked whether "always women" holds
  for a look the owner types. It does: the form refuses a look that names a
  man, with its own message, the spec's second string.
- 2026-11-08: the developer's calls, listed at hand-over: the look from the
  pages first, else what most photos show; shown in "Your look", listed as
  missing when empty; sent with every image as it is when the image is asked
  for; said with the cast and again in the last rules; the form refuses a
  man; the owner guide unchanged.
- 2026-11-08: the profile caps the look at 300 characters as well as 30
  words, and the read cuts it to both, so the phone never sends a look the
  image route refuses.
- 2026-11-08: the model's answer must hold `staffLook` (null or a value),
  like every other key of the brand read.
- 2026-11-08: images-9's prompts were pinned, from the code before the
  change, in `tests/fixtures/image-prompt/images-9.json`, so "without a look,
  today's prompt word for word" is a test.
- 2026-11-08: the brand replay test got the post replays' 20 s timeout:
  karsa-spa takes 2.9 s alone and 6 to 9 s under the whole suite, with the
  machine at load 8.
- 2026-11-08: the phone test reads the image requests with
  `page.on('request')`, as `editor.spec.ts` does, so the images helper is
  unchanged.
- 2026-11-08: `pnpm check` fails in a worktree whose scratch folder
  `.superpowers/` has no `guide/` (AGENTS.md cites `.superpowers/guide/`);
  an empty one was made here. CI has no `.superpowers/` and skips the check.
- 2026-11-08: saving the new sites showed the read gave each one photo
  besides its og:image: every image a Next.js site serves has the path
  `/_next/image`, and the read keyed photos by path. Sen's would have been
  its top photo, the black top. Each such image now counts once by its own
  file (`lib/brand/extract/visual.ts`, test first), so both sites give 6
  photos; Sen's are its og image, its top photo and four white-tunic
  treatment photos.
- 2026-11-08: the replayed fixture profile counts no photo (the image cache
  isn't in git), so it dropped the recorded look as `no_photos`, and
  `pnpm eval:images` would have sent none. `fixtureProfile` takes an
  optional image cache, which `eval:images` passes; tests still read
  without it.
- 2026-11-08: with the maintainer's yes (not a pilot day), the new sites
  were saved (`pnpm fixtures:save`), read once each with the real model and
  recorded (`pnpm eval:brand sen svarga --record`, 2 Flash-Lite requests),
  and their images made (`pnpm eval:images sen svarga`, 4 images, about
  $0.20). Sen's look: "a white short-sleeved tunic with a small stand-up
  collar, white trousers, dark hair in a neat low bun". Svarga's: "a dark
  brown short-sleeved top with a V-neck wrap collar, dark brown trousers,
  dark hair in a neat low bun"; its six photos mix dark brown (its top
  photo, twice, and one of the couple's therapists), navy (four hands, the
  other couple's therapist) and black (Traditional Balinese), and a man in
  brown (Deep Tissue). Each look is from the photos (`model`), and both
  fixtures pass. In the four images, every therapist wears her spa's look,
  with the hair in a bun.
- 2026-11-08: the maintainer's verdict on the four images: "Yes, they're
  right", Svarga's dark brown included.

## RED

Task 1, the profile's field:

```
      Tests  55 failed | 64 passed (119)
```

Task 2, the brand read:

```
      Tests  22 failed | 71 passed (93)
```

Task 3, "Your look":

```
      Tests  10 failed | 75 passed (85)
```

Task 4, every new image:

```
      Tests  12 failed | 224 passed (236)
```

## GREEN

`pnpm test`, after Task 4:

```
 Test Files  110 passed (110)
      Tests  1725 passed (1725)
```

`pnpm test:e2e tests/e2e/therapists-look.spec.ts`:

```
  1 passed (21.8s)
```

`pnpm eval:brand sen svarga --record`:

```
brand eval: 2/2 passed · prompt brand-8 · model gemini-3.5-flash-lite
```

`pnpm eval:images sen svarga`:

```
images eval: 2 fixture(s) · prompt images-10 · model gemini-nano-banana-2.1 · about $0.20 spent ($0.05 an image)
```
