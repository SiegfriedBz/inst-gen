# inst-gen

A Next.js app, developed with Claude Code, Superpowers and Graft. How agents
work here: [AGENTS.md](AGENTS.md).

## Set up your machine

Run these once per machine. Running one twice does no harm.

1. Tools: Node 24.21.0 and pnpm 10.17.1, pinned in `.prototools`. With
   [proto](https://moonrepo.dev/proto):

   ```bash
   proto use
   ```

2. Superpowers, pinned in `.claude/settings.json`:

   ```bash
   claude plugin marketplace add obra/superpowers@v7.0.0
   ```

   ```bash
   claude plugin install superpowers@superpowers-dev --scope project
   ```

3. Graft: install it, then build the index once per clone, in the main
   checkout (worktrees reuse it). Never run `graft init`.

   ```bash
   npm i -g @nanonets/graft
   ```

   ```bash
   graft build --no-ignore
   ```

   Then run `/mcp` in Claude Code to reconnect Graft.

4. Dependencies and git hooks:

   ```bash
   pnpm install
   ```

## Check everything

```bash
pnpm check
```

Quick, and it changes nothing. CI runs the same command.

## License

Copyright (C) 2026 Siegfried Bozza.

Licensed under the [GNU Affero General Public License, version 3](LICENSE)
(`AGPL-3.0-only`). Why: [decision 0008](docs/decisions/0008-license.md).
