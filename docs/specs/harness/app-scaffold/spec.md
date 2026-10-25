---
title: "App scaffold"
description: "The Shopfront Next.js app at the repo root, with its tooling in hooks and CI, deployed to Vercel Hobby in Singapore behind one passphrase per spa, showing a passphrase screen and a placeholder home page."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T07:26:42Z }
date: "2026-10-24"
---

# App scaffold

## Goal

Phase 0's gate is "CI green, and a page live on the production URL". Today
the repo has docs and a harness, but no app. This spec builds the empty shell
every later spec adds to: the Next.js app with the tooling from decision 0002,
the styling from decision 0007, a deploy on Vercel Hobby (decision 0001), and
the private pilot gate that keeps everyone but Sen, Svarga and the developer
out.

When it ships, Sen's owner can open the production link on a phone, type the
spa's passphrase, and land on a home page that greets the spa by name. The
look is the one later screens build on.

Why now: every later spec needs a running app, a gate and green CI to land in.

## Behaviour

### Name and copy

The app is called **Shopfront**. Its description is "Your posts and review
replies, written for you." Both appear on the passphrase screen and in the
page title and meta description. The repo, package name and docs keep the name
`inst-gen`.

Every visible string lives in a next-intl English message file
(`messages/en.json`), so `platform/i18n` (roadmap 0.6) only adds Indonesian
and Vietnamese and the language switch. The scaffold has no language switch
and no locale in the URL.

### Passphrases

- One passphrase per spa, plus one for the developer. Each passphrase ends
  with a hyphen and its owner's name: for example `lotus-river-moon-sen`,
  `blue-wave-harbour-svarga`, `quiet-stone-path-dev`. (These examples are not
  the real passphrases.)
- The text after the last hyphen is the **owner id** (`sen`, `svarga`, `dev`).
  The app greets the owner by that id, capitalised ("Sen", "Svarga", "Dev").
  `platform/usage-counters` (2.8) will key the daily limits on the owner id and
  decide how `dev` is treated.
- All passphrases are in one secret environment variable, `PILOT_PASSPHRASES`,
  comma-separated. They are never in the code, the repo or a log line. Adding
  a spa means adding one entry; no code change.
- At start-up the app checks `PILOT_PASSPHRASES`: every entry has an owner id
  of lowercase letters; the secret part before the last hyphen is at least 12
  characters (`lotus-river-moon` is 16); and no owner id appears twice. If the check fails, every request answers with a
  plain 503 page saying the app isn't configured, and the reason goes to the
  server log, never the passphrase itself.
- The entered passphrase is compared with each entry in constant time, after
  trimming spaces at both ends. Case matters.

### Passphrase screen (`/enter`)

Left-aligned, one column, on a phone first:

1. The "S" mark: a jade tile with a white "S" (a placeholder until there is a
   logo).
2. "Shopfront" as the heading.
3. "Your posts and review replies, written for you."
4. The label "Passphrase" above a password field (`autocomplete="current-password"`,
   so the phone can offer to save it).
5. An **Enter** button, full width.
6. At the bottom of the screen: "Private pilot for invited spas."

The form works without JavaScript (a Server Action or a route handler with a
plain form post).

- **Right passphrase:** a session cookie is set and the owner goes to `/`.
- **Wrong or empty passphrase:** the server waits about 1 second, then shows
  the same screen with "That passphrase isn't right. Try again." under the
  field, the field outlined in the error colour and linked to the message
  (`aria-describedby`), and focus back in the field. The field is emptied.
  There is no lockout and no counter: the usage counters don't exist yet.
- A visitor who already has a valid session and opens `/enter` goes to `/`.

### Session

- A cookie named `shopfront_session`: `HttpOnly`, `Secure`, `SameSite=Lax`,
  `Path=/`, lasting 30 days from sign-in. It is not renewed on each visit.
- Its value is signed with HMAC-SHA256 (Web Crypto, so it runs in `proxy.ts`)
  under a second secret, `SESSION_SECRET` (at least 32 random bytes). It
  holds the owner id, the sign-in time, and a short fingerprint of that
  owner's passphrase (an HMAC of it under `SESSION_SECRET`).
- Because of the fingerprint, changing one spa's passphrase signs out only
  that spa. Changing `SESSION_SECRET` signs out everyone.
- A cookie that is missing, badly signed, expired, or whose owner or
  fingerprint no longer matches `PILOT_PASSPHRASES` counts as no session.
- There is no sign-out button in the scaffold. Clearing the site's data on the
  phone signs out.

### The gate (`proxy.ts`)

Next.js 16's `proxy.ts` checks the session on every request except:
`/enter` and its form post, Next.js static assets (`/_next/static`,
`/_next/image`), the favicon and icons, and `/robots.txt`.

- A page request without a session is redirected to `/enter`.
- A request under `/api/` without a session gets `401` with a JSON body
  `{ "error": "unauthorized" }`, never a redirect. The scaffold has one such
  route, `GET /api/health`, answering `{ "ok": true }` to a signed-in owner;
  the browser tests use it to check the gate on API routes.
- Preview deployments are behind the same gate, with the same rules.

### Home page (`/`)

The placeholder later specs replace:

- Header: the "S" mark on the left; on the right a small jade-tinted pill with
  the owner's name ("Sen").
- Heading "Welcome, Sen".
- "Soon you'll paste your website link here and get six posts, each with a
  story."
- The label "Your website" above a read-only, greyed field showing the
  example `yourspa.com`, with "Coming soon" under it. It does nothing.
- At the bottom: "Signed in on this phone for 30 days."

### Not indexed

`/robots.txt` disallows everything, every response carries
`X-Robots-Tag: noindex, nofollow`, and the pages have the matching robots
meta tag.

### Look

From decision 0007 (Tailwind v4, shadcn/ui, Phosphor icons, Be Vietnam Pro).
The mockups shown on 2026-10-24 set the direction; these values are the
contract:

| Token | Light | Dark |
|---|---|---|
| Page background | `#F6F7F5` | `#121614` |
| Text | `#16181A` | `#ECEFEC` |
| Secondary text | `#4A524C` | `#B4BDB6` |
| Field background | `#FFFFFF` | `#1B201D` |
| Field border | `#858E87` | `#646E67` |
| Accent (button, mark) | `#0F7B5F`, white text | `#3FBF94`, text `#0B1F18` |
| Accent tint (owner pill) | `#E2F1EB`, text `#0D7259` | the builder picks a matching dark tint |
| Error | the builder picks a red that passes AA on both backgrounds | |

- Dark mode follows the phone's setting (`prefers-color-scheme`); there is no
  toggle.
- One accent colour, jade, everywhere. No gradients, no shadows, no photos on
  these two screens.
- Be Vietnam Pro through `next/font/google`, weights 400 and 500, with the
  `latin`, `latin-ext` and `vietnamese` subsets.
- One corner radius, 12px, for fields, buttons, pills and the mark. Fields and
  buttons are 48px tall. Labels always sit above their field, never inside it.
- Motion: the button presses in slightly when tapped (scale 0.98) and pages
  fade in over about 200 ms. Both are off under `prefers-reduced-motion`.
- Every text and control colour pair passes WCAG AA (4.5:1 for text, 3:1 for
  field borders and focus rings) in both modes. Focus is visible on every
  control.
- Layout is one column, at most about 420px wide, centred on wider screens;
  side padding 20px on phones; no horizontal scroll at 320px wide.
- No em dashes in any visible string.

### Tooling

Versions are pinned exactly in `package.json` (no `^`):

| Package | Version |
|---|---|
| `next` | 16.4.3 |
| `react`, `react-dom` | 19.3.1 |
| `typescript` | 6.0.3 (Next.js 16.4.3 needs the TypeScript 6 JS API; 7.x doesn't provide it) |
| `@types/node`, `@types/react`, `@types/react-dom` | the latest matching Node 24 and React 19 |
| `zod` | 4.6.7 |
| `next-intl` | 4.14.9 |
| `@biomejs/biome` | 2.6.2 |
| `vitest` | 5.0.5, with React Testing Library |
| `@playwright/test` | 1.64.1 |
| `tailwindcss`, `@tailwindcss/postcss` | 4.3.3 |
| `@phosphor-icons/react` | 2.1.10 |
| `radix-ui` | 1.8.1 |
| shadcn/ui | `components.json` set up with the `shadcn` CLI 4.22.1, pointing at `components/ui/`; the scaffold adds `button`, `input` and `label`, restyled to the tokens, with Phosphor in place of Lucide (decision 0007) |

- The app lives at the repo root (`app/`, `components/`, `lib/`,
  `messages/`), next to the existing `docs/` and `scripts/`.
- TypeScript in strict mode. `zod` validates `PILOT_PASSPHRASES`,
  `SESSION_SECRET` and the session payload.
- `biome.json`: Biome's `react` and `next` domains on `recommended`, the CSS
  parser's Tailwind directives on, and `.claude/skills/` and generated files
  ignored. Biome formats the existing `scripts/*.mjs` too. No ESLint or
  Prettier config or dependency.
- `package.json` scripts: `dev`, `build`, `start`, `lint` (`biome check`),
  `format` (`biome check --write`), `typecheck` (`tsc --noEmit`), `test`
  (`vitest run`), `test:e2e` (`playwright test`), and `check`, which now runs
  the docs and repo checks, `biome ci`, the typecheck and Vitest.
- `lefthook.yml` pre-commit: the existing skills copy; Biome on staged files,
  writing its fixes and restaging them; the project typecheck.
- `.github/workflows/check.yml`: the existing `check` job runs the new
  `pnpm check`; a second job, `e2e`, builds the app and runs Playwright on
  Chromium at a phone viewport, with the browser cached between runs. Both
  jobs run on every PR and on pushes to `develop` and `main`. Test values for
  `PILOT_PASSPHRASES` and `SESSION_SECRET` are set in the workflow file
  itself; they are test values, not secrets.
- `.env.example` lists `PILOT_PASSPHRASES` and `SESSION_SECRET` with made-up
  values and a line on how to generate a secret. `.env*` files other than the
  example stay out of git.
- `AGENTS.md`: the opening says the app exists; the Map gains the app folders;
  the Commands table gains every new script; the "app code isn't scaffolded
  yet" line goes.
- `commitlint.config.mjs` already has the `web` scope for app code.

### Deploy

- A Vercel project on the Hobby plan, connected to the GitHub repo through
  Vercel's Git integration. Production branch: `main`. Every other branch,
  `develop` included, gets a preview deployment.
- `vercel.json` sets `"regions": ["sin1"]`.
- The production address is a free `*.vercel.app` address, with no custom
  domain. The project is named `shopfront` if Vercel allows it.
- `PILOT_PASSPHRASES` and `SESSION_SECRET` are set in the Vercel project for
  Production and Preview, as sensitive variables. The developer creates them;
  the agent never sees the real values.
- Vercel's own Deployment Protection stays at its Hobby default, so preview
  links also ask for a Vercel login; the passphrase gate is the only gate on
  production. Previews are for the developer, not the owners.
- Going live means a PR from `develop` to `main` once this spec's PR is
  merged.

### Who does what

The agent writes everything in the repo and checks it with the commands it
can run. The developer does what needs an account, with written steps from
the plan:

- create the Vercel project, link it to the GitHub repo and set `main` as the
  production branch;
- generate and set `PILOT_PASSPHRASES` and `SESSION_SECRET` in Vercel, and
  give each spa its passphrase;
- on GitHub, make the `check` and `e2e` jobs required on `develop` and
  `main` (branch protection);
- open the PRs on github.com.

**Done for this spec's PR:** CI green on the PR, and its Vercel preview
showing the passphrase screen, with Sen's sign-in working there. The
Singapore region and the live production page are checked on the later
`develop` to `main` PR; that check closes Phase 0's gate.

### Accounts and no card on file

Decision 0001 asks this spec to list each account the app uses and how to
check that none has a card. The scaffold only uses GitHub and Vercel; the
others arrive with later specs and are checked then.

| Account | Used from | How to check there is no card |
|---|---|---|
| Vercel (Hobby) | this spec | Team or account Settings → Billing: plan "Hobby", no payment method listed |
| Upstash | 2.8 `platform/usage-counters` | Console → Account → Billing: "Free" plan, no payment method |
| Cloudflare (Workers AI) | 2.3 `posts/generate-images` | Dashboard → Manage Account → Billing: no payment method, Workers plan "Free" |
| Google AI Studio (Gemini) | 1.1 `brand/extract-site` | Google Cloud console for the key's project → Billing: "This project has no billing account" |

## Acceptance criteria

```gherkin
Scenario: A visitor without a session is sent to the passphrase screen
  Given a phone with no Shopfront cookie
  When it opens the production address
  Then it lands on /enter
  And it sees "Shopfront", "Your posts and review replies, written for you." and a "Passphrase" field

Scenario: The right passphrase opens the home page
  Given the passphrase screen
  When the owner types Sen's passphrase and taps Enter
  Then they land on /
  And they see "Welcome, Sen" and the "Sen" pill
  And a shopfront_session cookie is set, HttpOnly, Secure, SameSite=Lax, for 30 days

Scenario: A wrong passphrase is refused
  Given the passphrase screen
  When the owner types a passphrase that matches no entry and taps Enter
  Then after about 1 second they see "That passphrase isn't right. Try again."
  And the field is empty, outlined in the error colour, and focused
  And no session cookie is set

Scenario: The session survives a return visit
  Given Svarga's owner signed in 10 days ago on this phone
  When they open the production address
  Then they land on / with "Welcome, Svarga"

Scenario: Changing one spa's passphrase signs out only that spa
  Given Sen and Svarga both have a session
  When the developer changes Sen's entry in PILOT_PASSPHRASES and redeploys
  Then Sen's next visit lands on /enter
  And Svarga's next visit lands on /

Scenario: API routes answer 401 without a session
  Given no session cookie
  When a request is made to GET /api/health
  Then the response is 401 with { "error": "unauthorized" }
  And with a valid session the same request answers 200 with { "ok": true }

Scenario: A bad configuration is refused at start
  Given PILOT_PASSPHRASES has two entries ending in "-sen"
  When the app receives a request
  Then it answers 503 with a page saying the app isn't configured
  And the server log names the problem without printing any passphrase

Scenario: Search engines are kept out
  When /robots.txt is fetched
  Then it disallows every path
  And every page response has the header X-Robots-Tag: noindex, nofollow

Scenario: The screens work in both colour modes
  Given a phone in dark mode
  When it opens /enter
  Then the page uses the dark tokens and every text pair passes WCAG AA

Scenario: CI checks everything
  Given a PR to develop
  When CI runs
  Then the check job runs the docs checks, biome ci, the typecheck and Vitest
  And the e2e job runs the Playwright tests at a phone viewport
  And both must pass to merge

Scenario: The production deploy runs in Singapore
  Given develop has been merged into main
  When Vercel deploys main
  Then the production address is a vercel.app address
  And its functions run in sin1
```

Unit tests cover parsing and checking `PILOT_PASSPHRASES`, signing and
reading the session (expiry, tampering, changed fingerprint), and the owner
id. Playwright covers the gate, sign-in, the wrong passphrase, `/api/health`
and the dark-mode screen.

## Known limits

- No attempt limit: someone who has the link can keep guessing, at about one
  try a second. Acceptable for a two-spa pilot with long passphrases;
  `platform/quotas-abuse` (phase 4) adds the bot check and blocklist.
- Hobby keeps runtime logs for 1 hour (decision 0001), so a failed sign-in
  report must be looked at quickly.
- A spa that shares its passphrase shares its daily limit. Changing that
  spa's entry fixes it.
- English only until roadmap 0.6.
- The "S" mark is a placeholder, not a logo.
- Contrast is checked by hand against the token table, not by an automated
  accessibility test.

## Out of scope

- Indonesian and Vietnamese, and the language switch: `platform/i18n` (0.6).
- Usage counters, Upstash and the usage bar: `platform/usage-counters` (2.8).
- Pasting a website link and everything after it: phase 1 and 2 specs.
- Sign-out, accounts and public sign-up: phase 4.
- A custom domain and a real logo.
