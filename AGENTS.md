# inst-gen

A Next.js app that turns a business's website link into ready-to-post Instagram
posts and stories, and drafts replies to its Google Maps reviews. What to build
next is in [`docs/roadmap.md`](docs/roadmap.md). The app code isn't scaffolded
yet: this file currently covers the harness only.

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
| `pnpm check` | Check everything: docs and repo checks. Changes nothing; run it as often as you like |

## What fails silently

- ⚠️ If an agent misses the Specs rule, Superpowers writes to
  `docs/superpowers/`. Check where a new spec landed.
- ⚠️ A symlink from `.claude/skills` to `.agents/skills` breaks on Windows
  clones and Claude then sees no skills, with no error. Keep the copy.

## Conventions

- **Language:** English in code, docs and commits. The app's screens and owner
  guide are in English, Indonesian and Vietnamese; captions are generated in
  English.
- **Commits:** Conventional Commits, with a scope from `commitlint.config.mjs`.
- **Branches:** `main` is production, `develop` is integration; work branches
  open PRs to `develop`.
