---
title: "App tooling"
description: "Biome for lint and format, Vitest for unit tests, Playwright for the main flow, next-intl for the three languages, run by lefthook and GitHub Actions."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-23T20:23:46Z }
date: "2026-10-23"
---

# App tooling

## Context and Problem Statement

Decision 0001 settled the stack: Next.js 16, App Router, TypeScript in strict
mode, on Vercel Hobby. The repo's harness already runs commitlint and the docs
checks through lefthook and GitHub Actions; `lefthook.yml` leaves format, lint
and typecheck of staged files for when the app arrives.

The app also needs tests that never call a model (the Global Plan's recorded
model calls and saved site fixtures), a check of the main flow in a real
browser, and screens in English, Indonesian and Vietnamese.

Which linter and formatter, which test tools and which i18n library should the
app use, and where does each one run?

## Decision Drivers

- One developer, working mostly with agents: few tools, few config files, and
  fast feedback on every commit.
- Next.js 16 no longer lints during `next build`, and `next lint` is gone: the
  linter runs on its own, in hooks and CI.
- $0: everything runs locally or on GitHub Actions' free minutes.
- Unit tests replay recorded model calls and saved sites, so CI never calls a
  model.
- The i18n library must work with the App Router, Server Components and
  Next.js 16's `proxy.ts`.

## Considered Options

Lint and format:

1. Biome, one tool for lint and format.
2. ESLint with `eslint-config-next`, plus Prettier.

Unit tests:

1. Vitest.
2. Jest.

Browser tests:

1. Playwright.
2. Cypress.

i18n:

1. next-intl.
2. Lingui.
3. A small hand-written dictionary lookup.

## Decision Outcome

Chosen: Biome, Vitest, Playwright and next-intl, because each is the
lightest choice that fully covers the need and is a current default for
Next.js App Router projects.

The tooling:

- **Lint and format:** Biome, with its `react` and `next` rule domains on
  `recommended`. One `biome.json`, no ESLint and no Prettier.
- **Typecheck:** `tsc --noEmit`, on the TypeScript version the Next.js release
  in use supports. The scaffold spec pins it.
- **Unit tests:** Vitest, with React Testing Library for client components.
  Model calls sit behind one interface; tests replay recorded responses and
  read saved sites from fixtures. Only `pnpm eval` calls a real model.
- **Browser tests:** Playwright, for the main flow only (passphrase, website
  link, drafts, download), on Chromium at a phone viewport. Model calls are
  replayed there too.
- **i18n:** next-intl, with English, Indonesian and Vietnamese message files.
  Whether the language sits in the URL or in a cookie is product behaviour,
  settled in `platform/i18n`.
- **Where each runs:**
  - pre-commit (lefthook): Biome on staged files, writing its fixes and
    restaging them; typecheck of the whole project.
  - CI (GitHub Actions, on every PR and on pushes to `develop` and `main`):
    `pnpm check`, which grows to run `biome ci`, the typecheck and Vitest
    next to the docs checks; and Playwright in a job of its own.

The scaffold spec (`harness/app-scaffold`, roadmap 0.5) installs these tools,
pins their versions, adds the commands to `AGENTS.md` and wires the hooks and
CI.

### Consequences

- Good, because one Rust binary formats and lints in well under a second, so
  the pre-commit hook stays fast.
- Good, because Biome reads one config file, where ESLint with Prettier needs
  two tools, two configs and a plugin to keep them from fighting.
- Good, because Vitest runs TypeScript and ESM as written, with no Babel or
  transform setup, and shares its config style with the rest of the toolchain.
- Good, because next-intl works in Server Components, so most screens send no
  translation code to the phone.
- Bad, because Biome has fewer rules than ESLint's plugin ecosystem, and
  `eslint-config-next`'s rules aren't all ported. Accepted: the Next.js and
  React domains cover the ones that matter here, and typecheck plus tests
  catch the rest.
- Bad, because Vitest can't render async Server Components. Those are covered
  by Playwright instead.
- Bad, because Playwright in CI downloads a browser on every run, adding a
  minute or two to each PR. Caching the browser keeps it down.

### Confirmation

- After the scaffold, the repo has a `biome.json` and no ESLint or Prettier
  config or dependency.
- `lefthook.yml` runs Biome and the typecheck before each commit.
- CI runs `pnpm check` (docs checks, `biome ci`, typecheck, Vitest) and the
  Playwright job, and both must pass to merge.
- No test in CI reaches Gemini or Workers AI: unit and browser tests replay
  recorded calls.

## Pros and Cons of the Options

- **Biome:** one fast tool, one config, formatter compatible with Prettier's
  output, Next.js and React rule domains. Fewer rules than ESLint, no plugin
  ecosystem.
- **ESLint + Prettier:** the most rules and plugins, and `eslint-config-next`
  is maintained by the Next.js team. Two tools and configs, slower in hooks,
  and nothing it adds is needed by this app yet.
- **Vitest:** fast, TypeScript and ESM without setup, Jest-compatible API.
  No async Server Components.
- **Jest:** mature, with `next/jest` support. Needs a transform setup for
  TypeScript and ESM, and is slower; nothing it does is missing from Vitest.
- **Playwright:** several browsers and phone viewports, parallel runs, traces
  for failed CI runs, free. Downloads browsers in CI.
- **Cypress:** good interactive runner. Slower in CI, weaker parallel runs
  without its paid cloud.
- **next-intl:** built for the App Router, Server Components and `proxy.ts`,
  ICU messages for plurals, typed message keys. One more dependency.
- **Lingui:** compact output and message extraction. Its App Router support
  needs a compiler plugin and more setup.
- **Hand-written dictionary:** no dependency. Plurals, dates and numbers in
  three languages would have to be rebuilt by hand.

## More Information

Checked on 2026-10-23:

- npm's latest versions: `@biomejs/biome` 2.6.2, `vitest` 5.0.5,
  `@playwright/test` 1.64.1, `next-intl` 4.14.9 (peer `next` up to `^16`),
  `next` 16.4.3.
- [Next.js ESLint docs](https://nextjs.org/docs/pages/api-reference/config/eslint):
  `next lint` is removed in Next.js 16 and `next build` no longer lints;
  `create-next-app` offers ESLint, Biome or no linter.
- [Biome linter domains](https://biomejs.dev/linter/domains/): `next` and
  `react` domains, turned on from `package.json` dependencies.
- [next-intl proxy / middleware](https://next-intl.dev/docs/routing/middleware):
  locale handling through Next.js 16's `proxy.ts`.
- Global Plan, "Decisions" (0002) and "Testing without burning tokens".

A later decision replaces this one if the app outgrows Biome's rules or needs
a tool this one rules out.
