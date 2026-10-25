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

## RED

Task 1: `Tests  15 failed | 34 passed (49)`

## GREEN

<the test tool's summary line, copied as printed>
