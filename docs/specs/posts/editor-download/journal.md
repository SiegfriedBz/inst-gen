# Editor and download: journal

## Calls made along the way

- 2026-10-25: The first draft was written without brainstorming; the owner
  then asked for the full flow. Brainstorming settled: edited posts survive
  "Update captions", with "Rewrite this one too" per post; translations are
  kept on the phone and read only on tap; "super easy to use" as this item's
  rule; no crop moving; no Feed/Posts switch (a grid above each batch); every
  card control kept until the pilot shows what's unused; no batch ZIP (it
  lands in Files, not Photos) and so no `fflate`.
- 2026-10-25: Keeping translations on the phone departs from decision 0003's
  "one call each time a view is opened". It's this feature's call, so the
  decision isn't rewritten: reopening costs nothing and the free Flash-Lite
  pool is shared by the whole pilot.
- 2026-10-25: The builder check found 2.3's images keyed by post id alone, so
  a second batch overwrote the first's. The owner chose to fix it as this
  item's first task: images keyed by batch and post, moved by the version 4
  upgrade.
- 2026-10-25: Builder's calls after the builder check: each post records the
  `profileHash` it was written against (saving an edit stamps today's);
  "Check that the image description still fits." has no dismiss button and
  clears on a saved edit (`altToCheck`); the alt text stays on the card to
  read and edit, and nothing copies it.
- 2026-10-25: The new post fields (`edited`, `altToCheck`, `profileHash`) are
  optional in the schema rather than defaulted, so a stored batch loads as
  it is and the plan and rewrite routes need no change; absent reads as
  `false`, `false` and the batch's hash.
- 2026-10-25: File names fold accents to ASCII (`Đà Nẵng` → `da-nang`), so
  every phone and computer shows them the same.
- 2026-10-25: Instagram's grid ratio: third-party guides for 2026 agree the
  profile grid shows a centred 3:4 slice of each post, so a 4:5 post loses a
  thin strip on each side (oktopost.com, kapwing.com, buffer.com). Instagram's
  Help Center wasn't checked. The tiles use 3:4 with `object-cover`. Still
  owed by the owner: one look at a real profile.
- 2026-10-25: Object URLs for images are shared and counted, so a card and
  its tile use one URL, revoked when neither shows it any more (2.3's
  revoke test kept).
- 2026-10-25: The feed preview shows only when images are on for the owner:
  without images it would be a grid of empty tiles.
- 2026-10-25: Translations recorded with `pnpm eval:translate --record`
  (owner's go-ahead, 2 Flash-Lite requests), prompt `translate-1`: Sen's
  first caption in Vietnamese (965 ms) and Svarga's in Indonesian (611 ms).
  Read back by the developer, not through Google Translate: no fact added or
  lost. Prices (500k VND, IDR 250k) and 60 minutes kept; "classic" became
  "traditional" and "ultimate" became "best", nuances the owner reads past.
  Verdict: fit for reading.

## Still owed (the owner, on real phones)

Playwright can't open a share sheet or Instagram, so these wait for the
owner, before or during the pilot:

- On a real iPhone and a real Android phone: "Save post image" and "Save
  story image" through the share sheet into Photos, then post both from
  Instagram. Record the phones and the outcome here.
- On a real iPhone: "Copy caption" with the clipboard refused shows "Copy it
  from here." with the text selected.
- One look at a real Instagram profile to confirm the 3:4 grid crop.

## RED

- Task 1: `Tests  15 failed | 34 passed (49)`
- Task 2: `Tests  1 failed | 2 passed (3)`, and `posts-edit.test.ts` failed to load (`Cannot find package '@/lib/posts/edit'`)
- Task 3: `Tests  7 failed | 19 passed (26)`
- Task 4: `Tests  8 failed (8)`
- Task 5: `Tests  1 failed | 10 passed (11)`, and `posts-feed-preview.test.tsx` failed to load
- Task 6: `Test Files  2 failed (2)` with `Tests  no tests` (the modules didn't exist)
- Task 7: `Tests  14 failed | 75 passed (89)`
- Task 8: `Test Files` 5 failed: 3 failed tests in `ai-text-model.test.ts`, and 4 files failed to load
- Final review fixes: `Tests  3 failed | 22 passed (25)`

## GREEN

- Vitest, whole suite: `Tests  883 passed (883)`
- Playwright, whole suite: `35 passed (37.2s)`
