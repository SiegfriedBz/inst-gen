# inst-gen

Shopfront, a Next.js app that turns a business's website link into
ready-to-post Instagram posts and stories, and drafts replies to its Google
Maps reviews. What to build next is in [`docs/roadmap.md`](docs/roadmap.md).
The app sits at the repo root; the pilot is gated by one passphrase per spa
(`docs/specs/harness/app-scaffold/spec.md`).

## How agents work here

This repo is developed with Superpowers (the working method) and Graft (an
index of the code).

- **Roadmap.** "Next roadmap item" means the first item in `docs/roadmap.md`
  whose status isn't `done`. One item = one spec or decision = one branch = one
  PR. The PR that ships an item also updates its status.
- **Specs.** When brainstorming ends in a spec, it goes in
  `docs/specs/<area>/<slug>/spec.md`, written from `docs/templates/spec.md`.
  Never in `docs/superpowers/`.
- **Approval.** A spec or decision stays `status: draft` until a person
  approves it explicitly: by asking for it to be approved, or by answering yes
  when the agent asks them to approve that written document, by name. Only then
  does the agent set `status: approved` and
  `approved: { by: <email>, at: <UTC time> }`, where `<email>` is the person's
  `git config user.email`. If that is empty or `noreply@anthropic.com`, ask
  them for it. Agreeing to an idea, an approach or a design section before the
  document is written is not an approval.
- **Plans.** `writing-plans` starts only from an approved spec, and writes
  `plan.md` next to it. Execute it with `executing-plans`, inline; use
  subagents only for independent tasks.
- **Journal.** `journal.md`, next to the spec, records calls made along the way
  and the RED and GREEN summary lines, copied as the test tool prints them.
- **Decisions.** A technical or method choice between real alternatives, which
  constrains work beyond the current task, becomes
  `docs/decisions/NNNN-<slug>.md`, written from `docs/templates/decision.md`,
  with the highest number + 1 and `status: draft`. Product behaviour goes in
  its spec; calls specific to one task go in its journal.
- **Worktrees.** If the session already runs in a worktree, don't create
  another; otherwise use Claude Code's own worktree tool, never `.worktrees/`.
- **Packages and tests.** Use the package manager and commands this file
  declares; never `npm install` by default.
- **Git.** Stage files by path, never `git add -A`.
- **End of a branch.** Push and open a PR to `develop`. Never merge locally,
  never delete a branch.
- **Code.** Prefer the `graft_*` tools to a series of greps and reads. If they
  are missing, run `graft build --no-ignore` and ask the person to reconnect
  Graft with `/mcp`. Never `graft init`.
- **A tool is missing.** If a `superpowers:*` skill or a `graft_*` tool is
  missing, say so instead of imitating it.
- **`.superpowers/`** is scratch space, outside git.

## Map

| Path | Role |
|---|---|
| `AGENTS.md` | This file: rules, commands, conventions |
| `docs/roadmap.md` | The ordered list of decisions and specs to build, with their status |
| `docs/specs/<area>/<slug>/` | `spec.md` (what), `plan.md` (how), `journal.md` (what happened) |
| `docs/decisions/` | One `NNNN-<slug>.md` per technical decision (MADR) |
| `docs/templates/` | Templates for specs, journals and decisions |
| `.agents/skills/` | Source of the repo's skills |
| `.claude/skills/` | Copy of `.agents/skills/`, made by the pre-commit hook; never edit it |
| `scripts/` | Repo checks and the skills copy |
| `app/` | Next.js App Router: pages, the `/enter` sign-in, the `/guide` owner guide, API routes |
| `components/` | Shared components; `components/ui/` holds the shadcn/ui ones (decision 0007) |
| `components/guide/` | The owner guide: its eight sections and the links in and out |
| `components/brand/` | The home screen: its three tabs, the brand read and panel (reading state, sections, edit forms) |
| `components/reviews/` | The Reviews tab: the pasted review and its two reply cards |
| `components/usage/` | The usage bar and the lines shown at a limit |
| `lib/pilot/` | The pilot gate: passphrases, signed session, gate decision |
| `lib/brand/` | The brand read: safe fetching, extraction, checks, the profile schema, fixtures and eval scoring; in the browser, the phone's store (IndexedDB), the read client and the owner's edits |
| `lib/reviews/` | Review replies: the request and answer, the prompt and code's checks, the route's run; in the browser, the name filled in, the current review kept on the phone and the request client |
| `lib/runs/` | Decision 0005's run record, kept on the phone, and its resume rule |
| `lib/usage/` | Usage counters: the Pacific day, the limits, the store (Upstash Redis or memory), the meter the routes call; in the browser, the usage answer and its bar |
| `lib/ai/` | The text-model and image-model modules (the only importers of `@ai-sdk/google`) and the replayer for recorded calls |
| `proxy.ts` | Runs the gate on every request |
| `messages/` | next-intl message files, `en.json`, `id.json` and `vi.json`; every visible string lives here |
| `lib/i18n/` | Which language a screen uses, and the messages laid over English |
| `tests/unit/`, `tests/e2e/` | Vitest tests, and Playwright tests at a phone viewport |
| `tests/fixtures/sites/` | Saved websites for the brand read: pages, stylesheets, robots.txt, recorded model calls, expected profiles |
| `tests/fixtures/reviews/` | Made-up Google Maps reviews and their recorded reply calls |
| `.env.example` | The environment variables the app needs, with made-up values |
| `.claude/settings.json`, `.mcp.json` | Superpowers pin and Graft server |

## Which document wins

- On facts (what the app does today), the code beats the spec.
- On why a technical choice was made, the decision beats everything else.
- On what to build next, the approved spec wins.

## Hard rules

1. No code before its spec is approved.
2. Never edit `.claude/skills/` by hand: edit `.agents/skills/`.
3. Never use the `gh` CLI. Use plain `git` over SSH; PRs are opened on github.com.

## Commands

| Command | What it does |
|---|---|
| `pnpm install` | Install dependencies and the git hooks |
| `pnpm check` | Check everything: docs and repo checks, `biome ci`, typecheck, Vitest. Changes nothing; run it as often as you like |
| `pnpm dev` | Run the app locally; needs `.env.local` (copy `.env.example`) |
| `pnpm build`, `pnpm start` | Build the app, and serve the build |
| `pnpm lint` | Biome lint and format check, changing nothing |
| `pnpm format` | Biome: write format and safe lint fixes |
| `pnpm typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `pnpm test` | Vitest unit tests |
| `pnpm test:e2e` | Playwright tests; builds and starts the app with test passphrases. First run: `pnpm exec playwright install chromium` |
| `pnpm fixtures:save <url> <slug>` | Save a site fixture with the real reader; no model call |
| `pnpm eval:brand [slug…] [--record]` | Score brand reads on the fixtures with the real model. ⚠️ Spends Gemini quota (about 20 reads a day for the whole app): run a few slugs at a time, never on a pilot day |
| `pnpm eval:search [slug…] [--record]` | Run the essence search on five fixtures with the real Tavily and Gemini, and print each essence before and after. ⚠️ Spends 3 Tavily credits (1,000 a month) and 1 Flash-Lite request per fixture |
| `pnpm eval:posts [slug…] [--record] [--model=<id>]` | Plan six posts for fixtures with the real model, and print each with code's checks. ⚠️ Spends 1 Gemini request per fixture from the app's daily pool: a few slugs at a time, never on a pilot day |
| `pnpm eval:images <slug…>` | Make the six images of fixtures' recorded posts with the real image model, saved as JPEGs under the scratch folder `eval-images`. ⚠️ Spends about $0.30 of the prepaid image balance per fixture: ask first |
| `pnpm eval:translate [slug:locale…] [--record]` | Translate the first recorded caption of `sen:vi` and `svarga:id` (by default) with the real Flash-Lite, and print each for reading back. ⚠️ Spends 1 Flash-Lite request per pair from the app's daily pool: never on a pilot day |
| `pnpm eval:replies [slug…] [--record]` | Write the two replies to the made-up reviews in `tests/fixtures/reviews/` (all, by default) with the real Flash-Lite, and print each after code's checks for reading back. ⚠️ Spends 1 Flash-Lite request per review from the app's daily pool: a few at a time, never on a pilot day |
| `pnpm guide:pdf` | Build the app, start it with test passphrases, and write the owner guide as three A4 PDFs under `.superpowers/guide/`; the contact line comes from `GUIDE_CONTACT` in `.env.local`. ⚠️ Needs port 3000 free; no model call |

## What fails silently

- ⚠️ If an agent misses the Specs rule, Superpowers writes to
  `docs/superpowers/`. Check where a new spec landed.
- ⚠️ A symlink from `.claude/skills` to `.agents/skills` breaks on Windows
  clones and Claude then sees no skills, with no error. Keep the copy.

## Conventions

- **Language:** English in code, docs and commits. The app's screens and owner
  guide are in English, Indonesian and Vietnamese; captions are generated in
  English.
- **Strings:** every new visible string is added to `messages/en.json`,
  `id.json` and `vi.json` in the same commit; a test in `pnpm check` fails
  otherwise.
- **Commits:** Conventional Commits, with a scope from `commitlint.config.mjs`.
- **Branches:** `main` is production, `develop` is integration; work branches
  open PRs to `develop`.
