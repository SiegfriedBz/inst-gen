# Offer line first: journal

## Calls made along the way

- 2026-10-29: the cause, from `docs/specs/posts/day-and-night-images/journal.md`
  (28 Oct): Svarga's offer plan failed the replay 3 times in 4 on `posts-6`
  and `posts-7`. Once both offer captions left the offer out; twice they
  opened "Long flight? 🌸 10% off our …". 2.13's spec already made the offer
  line the hook, but the prompt asks for "a question or a promise" first and
  states the offer line's rule in another paragraph.
- 2026-10-29: the maintainer chose that code makes sure (rather than the
  prompt alone, with code only recording a miss), then "go ahead" without
  more questions. The spec was written as roadmap 2.13b, in its own folder
  (developer's call, as 2.8b).
- 2026-10-29: the reviewer's read of the draft raised three questions, all
  settled by the developer and written in the spec: rewrites get the exact
  lines too; a story text with any of the five flowers is kept; the offer
  line is never cut. The longest line Sen's or Svarga's treatments allow, a
  free extra, is 116 characters with its flower.
- 2026-10-29: the spec approved by the maintainer. Writing the plan showed
  that the batch's schema (`lib/posts/batch.ts`) refuses a story text over
  120, so "a longer line goes over 120" couldn't hold. Amended: no story
  text then, recorded. The maintainer approved the amendment.
- 2026-10-29: the branch starts from `claude/svarga-sen-light-levels-fa82e3`
  (roadmap 2.14), not yet merged into `develop`.
- 2026-10-29: `pnpm check` stops at the repo check in a fresh worktree:
  `AGENTS.md` cites `.superpowers/guide/`, which only `pnpm guide:pdf`
  makes. An empty, git-ignored `.superpowers/guide/` lets it run: 107 test
  files, 1575 tests passed.
- 2026-10-29: `posts-9` recorded with the maintainer's go-ahead, 3
  Flash-Lite requests, the `.env.local` copied from the 2.14 worktree.
  Svarga, recorded: both offer captions open on their line, word for word,
  with their flower; story texts the line and its flower; no `offer` fix by
  code, nothing in `dropped`; the replay passes on the first try. Svarga
  once more, not recorded: the same, no `offer` fix (two in a row). Sen,
  recorded: the same, no `offer` fix; the replay passes.
- 2026-10-29: but 4 of those 6 offer captions quote a price ("for IDR
  250k", "VND 500k for 60 min" under a 90-minute offer), against none of
  the 20 offer captions recorded from `posts-3` to `posts-8`. `posts-9`
  dropped 2.11's sentence "Each states the offer as given: …", which
  framed "never a price"; the caption rules' "one concrete detail (… its
  price or duration when the profile gives them …)" then won. 2.11 and this
  spec forbid a price in an offer post, so the fix stays inside the spec:
  `posts-10` says it next to the concrete detail, only with an offer, and
  in the offer rules ("never a price, never another session length, …
  anywhere in an offer post"). The replay test now also refuses a price in
  an offer post's caption: the two `posts-9` recordings fail it, and are
  kept out of the branch.
- 2026-10-29: the whole-branch review (a fresh reviewer, up to `2878e24`):
  no Critical issue, one Important one, fixed: on a spa, when the model's
  line in other words was followed by its own flower, code added 🌸 before
  it ("… November. 🌸 🌺 Long flight?"). The line now takes the flower that
  already leads the rest. Minors left for later: a paragraph break after a
  replaced line becomes a space; a rewrite of a post without a set-up may
  take another offered treatment's line from the answer's caption; a flower
  written with U+FE0F isn't taken as a flower; a line with no space after
  its full stop drops the next sentence too; a rewrite's prompt promises a
  line it can't give when no treatment is found; the story counts include
  records on a story text code then replaces.
- 2026-10-29: one whole-suite run timed out on the brand-read replay of
  `karsa-spa` (5 s, under load); alone it passes in 8 s, and the next
  whole-suite run passed: not this change.
- 2026-10-29: `posts-10` recorded for Svarga, with the maintainer's
  go-ahead for 3 more requests (1 spent): both offer captions open on their
  line, with no `offer` fix, but both still quote a price ("a traditional
  90-minute session featuring warm golden oil for IDR 350k"). The prompt's
  "never a price" doesn't hold against the caption rules' concrete detail.
  The recording is kept out of the branch; the other 2 requests are held
  until the maintainer chooses the next step.
- 2026-10-29: the maintainer chose that code removes a price from an offer
  post, then approved the written amendment (the spec's "Code's checks",
  step 3; plan Task 7). The prompt stays `posts-10`, so Svarga's `posts-10`
  recording is kept: replayed through the price step, each offer caption
  loses one sentence ("Enjoy a traditional 90-minute session featuring warm
  golden oil for IDR 350k.", "Experience a 90-minute session in your room
  for IDR 680k."), no flag is left, and the replay passes. Both captions
  now run under 250 characters (the prompt's ask; code doesn't enforce it).
- 2026-10-29: Sen recorded with `posts-10` (the 2nd of the 3 requests
  allowed): both offer captions open on their line, no price, story texts
  the line and its flower, nothing in `dropped`; the replay passes on the
  first try. In all: 5 Flash-Lite requests today (3 on `posts-9`, 2 on
  `posts-10`); 1 of the 3 allowed for `posts-10` is left unspent.

## RED

Task 1, the offer line (`tests/unit/posts-offer-line.test.ts`):

```
 Test Files  1 failed (1)
      Tests  no tests
```

Task 2, code's checks (`tests/unit/posts-checks.test.ts`):

```
 Test Files  1 failed (1)
      Tests  4 failed | 51 passed (55)
```

Task 3, the log count (`posts-log.test.ts`, `posts-run.test.ts`):

```
 Test Files  2 failed (2)
      Tests  3 failed | 25 passed (28)
```

Task 4, the prompt (`posts-prompt.test.ts`, `posts-run.test.ts`):

```
 Test Files  2 failed (2)
      Tests  7 failed | 47 passed (54)
```

Task 7, prices out of offer posts (`posts-offer-line`, `posts-checks`):

```
      Tests  3 failed | 67 passed (70)
```

## GREEN

Task 1 (`posts-offer-line.test.ts`, `posts-story.test.ts`):

```
 Test Files  2 passed (2)
      Tests  32 passed (32)
```

Task 2 (`posts-checks`, `posts-run`, `posts-edit`):

```
 Test Files  3 passed (3)
      Tests  106 passed (106)
```

Task 3:

```
 Test Files  2 passed (2)
      Tests  28 passed (28)
```

Task 4, then the plan and rewrite prompts without an offer, printed for a
spa and another business before and after: no difference.

```
 Test Files  2 passed (2)
      Tests  54 passed (54)
```

The review's fix, two flowers in a row (`posts-offer-line`, then the whole
suite):

```
      Tests  1 failed | 11 passed (12)
 Test Files  107 passed (107)
      Tests  1576 passed (1576)
```

Task 7 (`posts-offer-line`, `posts-checks`, `posts-run`):

```
 Test Files  3 passed (3)
      Tests  95 passed (95)
```

`pnpm check` at the end of the branch:

```
 Test Files  107 passed (107)
      Tests  1579 passed (1579)
```
