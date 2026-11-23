# Reasons to book: journal

## Calls made along the way

- 2026-11-23: the builder's check on the spec asked two questions, both
  settled by the developer in the spec: a copied sample is caught by the
  samples' own listed phrases and Maré's places, never by whole sentences or
  runs of words, since "Just landed?" and "we come to you tonight" are what
  the reasons ask for; and the eval sends made-up recent posts to steer the
  deal, so the recordings show every reason and the hours at least once.
- 2026-11-23: the maintainer asked, while approving the plan, to keep the
  images, posts and stories on the phone for two days instead of clearing
  them every day, on this branch too. It needs its own spec before any code
  (AGENTS.md, hard rule 1), written once this plan's code is in.
- 2026-11-23: the eval and the replay steer the deal with made-up recent
  posts (`fixtureRecent`): Sen's plan after a laptop post (two of you, the
  first night with the hours), Svarga's plan unsteered (a day out, laptop
  days), Sen's offer plan after a staying-in post (laptop days, a day out),
  Svarga's after a laptop post (staying in, the first night). New texts take
  a seeded fact, the same on a replay.
- 2026-11-23: replayed through `posts-19`'s deal and checks, the `posts-18`
  recordings get the new records the maintainer's complaint describes:
  "question in the first person" on Sen's "Can a therapist come to my hotel
  room tonight?" and Svarga's "Can someone come to my villa tonight…",
  and `"professional therapeutic massage only"` on Sen's post 2.
- 2026-11-23: the first-person record treats a capitalised name after
  "My" ("My Khe", "Mỹ Khê", "My Son") and "US" in capitals as names: Sen's
  own beach made the record fire on "Sore shoulders after a surf at My Khe?".
- 2026-11-23: for a business that comes to its guests, code sets each post's
  type before the checks (post 1 offer, post 2 moment, both offer with an
  offer), so a type the model invents no longer drops a post on that path.
- 2026-11-23: the review of the whole branch (fresh reviewer): ready with
  fixes, none critical. Fixed: a post saved before this spec reached the
  posts-19 caption update and new texts with its posts-18 type, topic and
  kind of question ("tip", "Drink water after your massage", "ask"); it now
  goes with its reason only, its kind of question dropped, and the posts-19
  prompts no longer ask to keep a type or a topic. Fixed: new texts never
  take the other post's fact, as the plan says. Ten minor findings are
  deferred and listed in the PR.

## RED

Task 1: `Tests  4 failed | 95 passed (99)` (`Test Files  4 failed (4)`: no
`lib/posts/reasons.ts`, no reason in the set-up or the recent posts)

## GREEN

Task 9, `pnpm check`: `Test Files  134 passed (134)`, `Tests  2247 passed (2247)`

Task 9, `pnpm test:e2e` (on port 3101 with a scratch config: another
project held 3000; the first build stopped on Next.js's security notice and
the second ran): `73 passed (21.7s)`, `1 skipped`
