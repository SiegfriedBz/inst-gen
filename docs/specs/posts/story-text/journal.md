# Story text: journal

## Calls made along the way

- 2026-10-27: the branch was moved onto `develop` after 2.12 was squash-merged
  there (#35): same files, so the 2.13 PR shows only its own commits.
- 2026-10-27: an emoji is a grapheme matching `\p{Extended_Pictographic}`, so
  "©" or "™" in a spa's text would count as emoji and go; a flower is
  compared without its variation selector.
- 2026-10-27: `storyText` in `postSchema` checks `.length` with a refine:
  zod 4's `.max()` counts code points (an emoji as 1), so it let a
  121-unit story text through.
- 2026-10-27: when a spa's story text has no flower, code cuts it to 117
  before adding " 🌸", so the flower always fits; the cut is recorded once,
  from the length before to the length after.
- 2026-10-27: a rewrite drops the post's old story text before taking the
  answer's, so a rewrite whose answer has none leaves the post with none
  (the spec's "an empty story text … leaves the post with none").
- 2026-10-27: four older tests on Svarga (a spa) expected captions without
  a flower; they now expect the " 🌸" code adds, as the spec says.

- 2026-10-27: Task 5 keeps `translateCaption` for a caption alone and adds
  `translatePost` for a caption with its story text (structured output),
  rather than replacing the first: fewer stubs to change, and a post saved
  before story texts asks exactly as before.
- 2026-10-27: the browser shares one request between the two "Show in…"
  links while it is on its way; once settled, the phone's store answers.
  Without IndexedDB, a second tap after the answer asks again.
- 2026-10-27: until Task 9 re-records them, the Sen and Svarga translation
  recordings are `translate-1`, so their replay test fails on its version
  check; the rest of the suite passes.
- 2026-10-27: without images, the sheet keeps the line that says why there
  are no pictures ("Images aren't turned on for your account yet."), above
  the parts: the spec drops the Images part, not that line, and the
  friendlier-home test for it still holds.
- 2026-10-27: the three buttons are the app's one `Button` style (filled
  accent), as on mockup v6; "Copy post text" loses the outlined look the
  second step had.
- 2026-10-27: the phone tests (Task 8) were written after Task 6's code, so
  they have no RED run of their own; screenshots of the sheet at the Pixel 7
  viewport matched mockup v6 (three boxed parts, the dashed story part, the
  green buttons). `postsBody` gives story texts only when asked
  (`stories: true`), so the older phone tests keep posts without one.
- 2026-10-27: `.env.local` was copied unread from the 2.12 worktree
  (`whats-next-76b948`) at the maintainer's request; the main checkout has
  none. A first `pnpm eval:posts` run, before the copy, stopped at the
  missing key: no request spent.
- 2026-10-27: `pnpm eval:posts sen svarga --record` and `--offer --record`
  with `posts-5` (4 Gemini requests), then `pnpm eval:translate --record`
  with `translate-2` (2 Flash-Lite requests), all asked first; not a pilot
  day. Code made 0 emoji fixes and 0 story cuts on the four plans: the model
  kept to the flowers and the length by itself. Story texts ran from 58 to
  115 characters.
- 2026-10-27: every caption is still one paragraph, so its "first line" is
  longer than 125 characters and carries the hidden `firstLine` flag, as the
  `posts-4` captions did (163 to 236): not a regression. The hook now opens
  the paragraph.
- 2026-10-27: the replay test's offer check first took the caption's first
  paragraph as its offer line; the offer line is its first sentence, which
  each offer story text starts with. The test was fixed, not the code.
- 2026-10-27: final review (a fresh reviewer on the whole branch): no
  critical finding. Fixed, each with a test that failed first:
  - editing the caption re-checks the story text's flags against today's
    profile: before, the story text's warning disappeared once the edited
    post was no longer out of date;
  - code records one `emoji` entry per fixed text ("post-1: story text
    removed 💆, added 🌸"), so `emoji_fixes` counts fixed texts, as the
    spec's scenario says (`emoji_fixes=1`);
  - a removed emoji leaves a space, so "Relax💆tonight" becomes "Relax
    tonight", and a line left empty goes;
  - flags (🇻🇳) and keycaps (1️⃣) count as emoji, so a spa's text loses them.
  The four plans' verdicts below hold: code made no emoji fix on them.
- 2026-10-27: the phone tests can't show the sheet without images: the e2e
  server always runs with the image key, and `imagesOn` comes from it. The
  unit tests cover that sheet (`posts-section.test.tsx`).
- 2026-10-27: the spec was amended and approved again (21:54 UTC): code
  removes every story text sentence with a call to action ("book",
  "WhatsApp", "DM", "link in bio"…), before the emoji fixes, and counts
  them in `story_ctas=`. Replaying Sen's recorded offer plan, its sixth
  story text loses "🌸 Book on WhatsApp." and gets its 🌸 back: "Professional
  massage delivered to your room in Da Nang. 🌸" (`story_ctas=1
  emoji_fixes=1`). No new model call.

### Verdicts, `posts-5` (24 posts)

Caption: hook first and a positive ending? Story text: a fair short version
that ends well (an offer post's: its offer line and flower, word for word)?

| Plan | Post | Caption | Story text |
|---|---|---|---|
| Sen | 1 offer, deep tissue | yes ("…shoulders stiff?" … "ready to rest") | yes (109) |
| Sen | 2 offer, surf recovery | yes | yes (105) |
| Sen | 3 local, Da Nang | yes | yes (88) |
| Sen | 4 ritual, Vietnamese | weak hook: "Gentle stretching and warm oil", a label | yes (105) |
| Sen | 5 tip, water | yes | yes (90) |
| Sen | 6 ritual, aroma | weak hook: "Slow and flowing aroma massage" | yes (83) |
| Svarga | 1 offer, Balinese | yes ("Long flight or tired legs?") | yes (115) |
| Svarga | 2 moment, flight | yes | yes (112) |
| Svarga | 3 local, Canggu sun | yes | yes (94) |
| Svarga | 4 ritual, coconut oil | yes | yes (98) |
| Svarga | 5 offer, four hands | yes ("Ready for twice the calm?") | yes (101) |
| Svarga | 6 tip, surf | yes | yes (90) |
| Sen offer | 1 10% Vietnamese | yes (offer line, "Wake up light tomorrow.") | yes, offer line + 🌸 (81) |
| Sen offer | 2 10% Thai | yes | yes, offer line + 🌺 (63) |
| Sen offer | 3 moment, feet | yes | yes (68) |
| Sen offer | 4 tip, surf | yes | yes (69) |
| Sen offer | 5 ritual, aroma | yes | yes (75) |
| Sen offer | 6 proof, in-room | yes ("Simply book and relax.") | **no**: ended "Book on WhatsApp.", a call to action the prompt forbids (76); since the amendment, code removes it, leaving a plain line without a positive ending |
| Svarga offer | 1 10% Balinese | yes | yes, offer line + 🌸 (79) |
| Svarga offer | 2 10% four hands | yes | yes, offer line + 🌺 (69) |
| Svarga offer | 3 moment, waves | yes | yes (85) |
| Svarga offer | 4 local, Canggu | yes | yes (66) |
| Svarga offer | 5 ritual, golden oil | yes | yes (63) |
| Svarga offer | 6 tip, tension | yes | yes (58) |

Pass: every story text within 120 by code's count (max 115); every spa
caption and story text with flowers and no other emoji, with 0 fixes from
code; 22 of 24 captions with a hook and a positive ending (bar: 20); 23 of
24 story texts a fair short version (bar: 20). The translations keep prices,
durations and flowers; the Vietnamese one writes "500k" where the caption
says "VND 500k".

## RED

Task 1, `pnpm exec vitest run tests/unit/posts-emoji.test.ts` (no
`lib/posts/emoji` yet):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, `pnpm exec vitest run tests/unit/posts-story.test.ts tests/unit/posts-batch.test.ts`:

```
 Test Files  2 failed (2)
      Tests  1 failed | 5 passed (6)
```

Task 3, `pnpm exec vitest run tests/unit/posts-checks.test.ts tests/unit/posts-run.test.ts tests/unit/posts-log.test.ts tests/unit/posts-edit.test.ts`:

```
 Test Files  4 failed (4)
      Tests  10 failed | 90 passed (100)
```

Task 4, `pnpm exec vitest run tests/unit/posts-prompt.test.ts`:

```
 Test Files  1 failed (1)
      Tests  6 failed | 15 passed (21)
```

The run test that the spa flag reaches the prompt was written after the
code; it was checked to fail with the flag taken out of `run.ts`:

```
      Tests  1 failed | 21 skipped (22)
```

Task 5, the six translation test files:

```
 Test Files  4 failed | 2 passed (6)
      Tests  10 failed | 46 passed (56)
```

Task 6, the five sheet test files:

```
 Test Files  4 failed | 1 passed (5)
      Tests  26 failed | 76 passed (102)
```

Task 7, `pnpm exec vitest run tests/unit/guide.test.tsx`:

```
 Test Files  1 failed (1)
      Tests  3 failed | 23 passed (26)
```

Task 9, `pnpm exec vitest run tests/unit/posts-fixtures-replay.test.ts tests/unit/posts-translate-replay.test.ts`, before re-recording:

```
 Test Files  2 failed (2)
      Tests  6 failed | 9 passed (15)
```

Final review fixes, the five test files touched:

```
 Test Files  5 failed (5)
      Tests  8 failed | 129 passed (137)
```

Call-to-action amendment, `pnpm exec vitest run tests/unit/posts-story.test.ts tests/unit/posts-log.test.ts tests/unit/posts-run.test.ts tests/unit/posts-fixtures-replay.test.ts`:

```
 Test Files  4 failed (4)
      Tests  11 failed | 50 passed (61)
```

## GREEN

Task 1:

```
 Test Files  1 passed (1)
      Tests  21 passed (21)
```

Task 2:

```
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

Task 3, then `pnpm test`:

```
 Test Files  4 passed (4)
      Tests  100 passed (100)
 Test Files  105 passed (105)
      Tests  1413 passed (1413)
```

Task 4, then `pnpm test`:

```
 Test Files  2 passed (2)
      Tests  43 passed (43)
 Test Files  105 passed (105)
      Tests  1419 passed (1419)
```

Task 5, then `pnpm test` (the two recordings still `translate-1`):

```
 Test Files  5 passed (5)
      Tests  54 passed (54)
 Test Files  1 failed | 104 passed (105)
      Tests  2 failed | 1427 passed (1429)
```

Task 6, then `pnpm test` (the two recordings still `translate-1`):

```
 Test Files  5 passed (5)
      Tests  102 passed (102)
 Test Files  1 failed | 105 passed (106)
      Tests  2 failed | 1439 passed (1441)
```

Task 7:

```
 Test Files  1 passed (1)
      Tests  26 passed (26)
```

Task 8, `pnpm test:e2e tests/e2e/story-text.spec.ts tests/e2e/friendlier-home.spec.ts tests/e2e/editor.spec.ts`:

```
  16 passed (24.5s)
```

Task 9, after re-recording, then `pnpm test`:

```
 Test Files  2 passed (2)
      Tests  15 passed (15)
 Test Files  106 passed (106)
      Tests  1448 passed (1448)
```

Final review fixes, then `pnpm test`:

```
 Test Files  5 passed (5)
      Tests  137 passed (137)
 Test Files  106 passed (106)
      Tests  1453 passed (1453)
```

Call-to-action amendment, then `pnpm test`:

```
 Test Files  4 passed (4)
      Tests  61 passed (61)
 Test Files  106 passed (106)
      Tests  1462 passed (1462)
```
