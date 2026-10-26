# Usage counters: journal

## Calls made along the way

- 2026-10-26: The owner skipped the brainstorming questions; the spec was
  written from what the earlier specs and decisions 0001, 0003 and 0004 leave
  to this item, and the Global Plan's per-owner numbers.
- 2026-10-26: Every text call runs on `gemini-3.5-flash-lite` today
  (`lib/ai/text-model.ts`), not decision 0003's split with Flash, so the
  app-wide pools are keyed by model id rather than by action.
- 2026-10-26: Spec approved by the owner; plan written and executed inline
  with executing-plans, in the cloud session's own checkout on
  `claude/inspiring-rubin-gxt2oq`, cut from `develop` (no extra worktree).
- 2026-10-26: `@upstash/redis` pinned to 1.39.0 (September); 1.40.0 was a
  few hours old. `pnpm add` rewrote `pnpm-lock.yaml` in pnpm's own quoting;
  it was reformatted with Biome, as `develop`'s is.
- 2026-10-26: Logs: each take, refusal and give-back writes its own line,
  `usage owner=… action=… outcome=…`, instead of a `usage=` field on each
  route's line (the spec's "Logs"): those lines are written inside the runs;
  the same facts join by owner and time.
- 2026-10-26: `.env.example` leaves the Upstash variables empty rather than
  made-up: a copied `.env.local` with a fake URL would send `pnpm dev` to a
  dead Redis instead of the memory store.
- 2026-10-26: The usage codes aren't added to each route's error-code list;
  the clients pass them through and one `UsageMessage` renders them, so no
  message per code per namespace. The line under a button at 0 hides while
  the server's refusal line says the same.
- 2026-10-26: An image is "first" when the phone holds no image for that post
  yet, so "Try again" and a resumed image stay covered by the attempt.
- 2026-10-26: `UsageProvider` wraps `BrandHome` in `app/page.tsx`; without it
  (the component tests), usage is null and nothing is disabled.
- 2026-10-26: E2E in this cloud container ran with the pre-installed
  Chromium (a scratch config, not committed) and the test passphrases set on
  the command line: the container's own `PILOT_PASSPHRASES` and
  `SESSION_SECRET` take precedence in `playwright.config.ts`. 44 passed.

## RED

```
 Test Files  2 failed (2)
      Tests  no tests
```

(Task 1, before `lib/usage/day.ts` and `limits.ts` existed; each later task
started the same way, on a missing module or the routes answering 200 past
the limits: `Tests  16 failed | 13 passed (29)`, then
`Tests  12 failed (12)` for the screens.)

## GREEN

```
 Test Files  96 passed (96)
      Tests  1095 passed (1095)
```

(`pnpm check`.) Playwright: `44 passed (53.5s)`.
