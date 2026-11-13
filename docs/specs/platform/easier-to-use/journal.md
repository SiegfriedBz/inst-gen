# Easier to use: journal

## Calls made along the way

- 2026-11-13, Task 2: the guide no longer names "Read my website": its first step says the read starts by itself, as the spec's table writes it, so `guide.test.tsx` checks that line instead of the button. `guide.trouble.gone` ("Read your website again") is left as it is: the spec doesn't list it, and the read happens by itself anyway.

- 2026-11-13: the builder check's three points settled in the spec before approval: an offer post keeps its story text (its offer line); new texts keep the post's kind of question and see the attempt's other post; caption updates land only their words on the post as stored (an existing bug: the copied mark stayed).
- 2026-11-13: short passwords added after the first hand-over, at the maintainer's request; their example password is not copied anywhere in the repo.

- 2026-11-13, Task 9: `checkNewTexts` takes the answer with the post's id, or else the first: one post was asked for, and a model that drops or changes the id would otherwise waste the call.

- 2026-11-13, Task 11: a refusal at the limit shows under the link, and the card then leaves out its own limit line, so the line shows once. "Write new texts" waits on posts runs only (`editBusy`), not on an image being made: the spec keeps the images part usable.
- 2026-11-13, Task 11: the whole suite caught a race in Task 2's Stop test (a Stop before the read's request left); the test now waits for the request. The app was right.

- 2026-11-13, Task 12: the phone tests ran on port 3101 with a scratch config, as another project's dev server held 3000 on this machine. Tests that sign in as Sen or Svarga without a read of their own hold the read, so none reaches the real route or the spa's website.

- 2026-11-13, Task 13: the two real new-texts calls wait for the maintainer's yes; this worktree has no `.env.local` with a Gemini key. `pnpm guide:pdf` waits too: it needs port 3000, held by another project's dev server on this machine.

- 2026-11-13, final review: four fixes. The read starts once per page load and owner (`lib/brand/auto-read.ts`), with no button before it starts; new texts' spinner and error follow their batch and post; the copy buttons wait while new texts are written; a long owner id is never named in a start-up problem, as it may be a password written first. Three small points are left for the maintainer.

- 2026-11-13, Task 13, with the maintainer's yes: two real new-texts calls, `pnpm eval:posts sen svarga --new-texts --record`. Both first failed with `model_failed` (a `SyntaxError`, "finish other", 105 and 32 tokens out), as plan calls have before (`posts/short-captions` journal). A retry, once the request also held the post's hashtags and alt text, came back for both in 6.6 and 7.5 s. Sen's answer was its post word for word: the same caption and story text. Svarga's had new words, but its question moved the sore spot to the shoulders while the image shows legs. Neither is good enough to ship as new texts: the prompt must keep the image's sore spot and forbid the old sentences, and code could refuse an answer that repeats the old caption. The recordings stay out of the repo until that's fixed. 4 Flash-Lite requests spent.

- 2026-11-13, Task 13, second round, at the maintainer's "Yes, fix it": the request names the old words `captionNow` and `storyTextNow` and asks for the hashtags and alt text empty; the prompt keeps a `sore` question on the image's part of the body and reuses no old sentence; code refuses an answer whose caption or question is the old one. Both calls came back first time, in 10.6 and 10.8 s (6 Flash-Lite requests spent in all), and are recorded as `new-texts.json`. As the owner sees them, paragraphs split by " / ":
  - Sen (`ask`), before: "Can a therapist come to my hotel room tonight? 🌸" / "We bring professional care directly to your apartment in Da Nang for sixty minutes. Trained local therapists." / "Linens, towels and oils included 🪷"; story "In-room massage tonight? We come to you 🌸". After: "Can I get a massage in my room tonight? 🌸" / "Our trained therapists come to your Da Nang hotel for sixty minutes of tension release. Linens, towels and oils included." / "Free travel in our core areas 🪷"; story "Need an in-room massage tonight? We come to you 🪷". A new question, answer and fact; the old fact moved into the answer.
  - Svarga (`sore`, legs), before: "Are your legs heavy after walking all day in Canggu? 🌸" / "We use warm coconut oil and long strokes to loosen tight muscles." / "Experienced local therapists bring a Balinese massage to your villa or hotel: book on WhatsApp and relax 🌼"; story "Heavy legs? Our oil massage helps 🌸". After: "Are your legs tight after walking through Canggu today? 🌸" / "We use long strokes and warm oil to loosen tired muscles for your afternoon." / "Experienced local therapists with 5+ years of spa and villa experience come directly to your room 🌺"; story "Tired legs? We bring our massage to your room 🌸". The legs stay, as the image shows; new words, a new fact, much the same idea. Code records its last sentence's 16 words.

## RED

- Task 1, passwords: `Tests  7 failed | 10 passed (17)`
- Task 1, sign-in words: `Tests  4 failed | 1 passed (5)`
- Task 2, the read by itself: `Tests  6 failed | 50 passed (56)`, and `pilot-sites.test.ts` could not import `@/lib/pilot/sites`
- Task 2, no read left on a new phone (the start switched off to watch it fail): `Tests  1 failed | 15 skipped (16)`
- Task 3, Questions before Reviews: `Tests  4 failed | 81 passed (85)`
- Task 4, no "They go on top" line: `Tests  1 failed | 61 skipped (62)`
- Task 5, the Questions hint: `Tests  1 failed | 20 passed (21)`
- Task 6, caption updates land as stored: `Tests  3 failed | 27 passed (30)`
- Task 7, ten new texts a day: `Tests  7 failed | 77 passed (84)`
- Task 8, the new-texts prompt and checks: `Tests  8 failed | 183 passed (191)`
- Task 9, the new-texts route: `Tests  3 failed | 28 passed (31)`, and two files could not import `@/app/api/posts/texts/route`
- Task 10, new texts on the phone: `Tests  3 failed | 27 passed (30)`, and `tsc` refused `step: 'texts'` and the missing `startNewTexts`
- Task 11, "Write new texts": `Tests  11 failed | 114 passed (125)`
- Task 12, the phone tests, first run: `4 failed`, `1 skipped`, `68 passed (37.2s)`: the usage bar's stubbed answer had no `newTexts`, and the tabs came before a check that there were none
- Final review fixes: `Tests  4 failed | 139 passed (143)`, then, with the remount test made to wait and the early-button test given a slow resume lookup, both failing every run

- Task 13, the fixed new texts: `Tests  5 failed | 202 passed (207)` (the prompt's new words, the refusal, Sen's echo and Svarga's shoulders in the replay)

## GREEN

- Task 1, passwords: `Tests  32 passed (32)`
- Task 1, sign-in words: `Tests  41 passed (41)`
- Task 2, the read by itself: `Tests  58 passed (58)`
- Task 2, with the limit and the guide: `Tests  110 passed (110)`
- Task 3, Questions before Reviews: `Tests  85 passed (85)`
- Task 4, no "They go on top" line: `Tests  69 passed (69)`
- Task 5, the Questions hint: `Tests  28 passed (28)`
- Task 6, caption updates land as stored: `Tests  108 passed (108)`
- Task 7, ten new texts a day: `Tests  124 passed (124)`
- Task 8, the new-texts prompt and checks: `Tests  191 passed (191)`
- Task 9, the new-texts route: `Tests  194 passed (194)`
- Task 10, new texts on the phone: `Tests  92 passed (92)`
- Task 11, "Write new texts": `Tests  156 passed (156)`; the whole suite: `Tests  2031 passed (2031)`
- Task 12, the phone tests: `1 skipped`, `72 passed (22.2s)` (the skip: no test owner has a 16-letter name, by design)
- Task 14, `pnpm check` (docs, repo, Biome, types, Vitest): `Tests  2031 passed (2031)`
- Final review fixes, `pnpm check`: `Tests  2036 passed (2036)`
- After the fixes, the phone tests: `1 failed`, `1 skipped`, `71 passed (2.0m)`; the failure was a sign-in still pending after 5 s with the machine's load at 48. Its files again: `1 skipped`, `20 passed (26.2s)`
- Task 13, the fixed new texts, replayed from the second round's recordings: `Tests  15 passed (15)`
