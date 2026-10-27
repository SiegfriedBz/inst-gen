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

## RED

```
 Test Files  1 failed (1)
      Tests  no tests
```

(`tests/unit/posts-setup.test.ts`, before `lib/posts/setup.ts` existed.)

## GREEN

```
 Test Files  103 passed (103)
      Tests  1359 passed (1359)
```
