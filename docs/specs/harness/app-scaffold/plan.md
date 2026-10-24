# App scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, per `AGENTS.md`) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Shopfront Next.js app at the repo root, with Biome, Vitest and
Playwright in hooks and CI, a passphrase gate per spa, a passphrase screen
and a placeholder home page, ready to deploy on Vercel Hobby in `sin1`.

**Architecture:** The pilot gate is plain TypeScript in `lib/pilot/` (config
parsing, signed session, gate decision), with no Next.js imports, so Vitest
covers it fully. `proxy.ts` and the screens are thin layers over it. Screens
are Server Components; only the sign-in form is a client component, and it
works without JavaScript through a Server Action.

**Tech Stack:** Next.js 16.4.3 (App Router), React 19.3.1, TypeScript 6.0.3,
zod 4.6.7, next-intl 4.14.9, Tailwind CSS 4.3.3, shadcn/ui on `radix-ui`
1.8.1, Phosphor icons, Biome 2.6.2, Vitest 5.0.5, Playwright 1.64.1.

**Spec:** [`spec.md`](spec.md), with decisions 0001, 0002 and 0007.

## Global Constraints

- Exact versions in `package.json`, no `^` or `~`. Packages and versions
  from the spec's Tooling table; test-only extras: `@testing-library/react`
  16.3.3, `@testing-library/dom` 10.4.2, `jsdom` 30.1.3,
  `@vitejs/plugin-react` 6.1.2, `vite-tsconfig-paths` 6.1.1, `postcss`
  8.5.31, `@types/node` 24.19.2, `@types/react` and `@types/react-dom`
  19.3.0.
- Use `pnpm`; never `npm install`. Stage files by path, never `git add -A`.
- Commits: Conventional Commits, scope `web` for app code, `ci` for the
  workflow, `harness` for hooks and tooling config, `docs` for docs.
- No ESLint, Prettier, `lucide-react`, CSS-in-JS or other component library.
- Every visible string comes from `messages/en.json`. No em dashes in any
  visible string.
- No raw colour values in components: only the tokens in `app/globals.css`.
- Passphrases and `SESSION_SECRET` are never logged, never committed except
  the test values named in this plan.
- No test calls a network service.

## Review Focus

- A passphrase pasted from WhatsApp with a space or newline at the end is
  accepted (trimmed). Test in Task 2.
- A phone keyboard that capitalises the first letter or autocorrects words
  would make the right passphrase fail: the field turns off
  autocapitalise, autocorrect and spellcheck. Test in Task 6.
- `PILOT_PASSPHRASES` typed in Vercel with spaces after commas or a trailing
  comma still parses. Test in Task 2.
- A tampered, truncated or non-base64 cookie is "no session", never a 500.
  Test in Task 3.
- An owner whose passphrase was changed, opening `/enter` with the old
  cookie, sees the passphrase screen (no redirect loop between `/` and
  `/enter`). Test in Task 4.

---

### Task 1: Next.js app and tooling at the repo root

**Files:**
- Modify: `package.json`, `lefthook.yml`, `.gitignore`
- Create: `tsconfig.json`, `next.config.ts`, `biome.json`, `vitest.config.ts`,
  `playwright.config.ts`, `app/layout.tsx`, `app/page.tsx` (temporary),
  `tests/unit/smoke.test.ts` (removed in Task 2)

**Interfaces:**
- Produces: the scripts every later task runs: `pnpm lint`, `pnpm format`,
  `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm build`, `pnpm check`.
  The `@/` import alias for the repo root.

- [ ] **Step 1: Add the dependencies** with `pnpm add -E` (runtime: `next`,
  `react`, `react-dom`, `zod`, `next-intl`) and `pnpm add -DE` (TypeScript,
  types, Biome, Vitest and the test extras, Playwright). Add `@biomejs/biome`
  and `@tailwindcss/oxide`, if pnpm asks, to `pnpm.onlyBuiltDependencies`
  next to `lefthook`, plus `sharp` if Next.js pulls it in.
- [ ] **Step 2: Write the config files.**
  - `tsconfig.json`: Next.js defaults, `"strict": true`, path `@/*` → `./*`.
  - `biome.json`: `linter.domains` `{ "react": "recommended", "next": "recommended" }`;
    `css.parser.tailwindDirectives: true`; formatter 2 spaces, line width
    100, `javascript.formatter.quoteStyle: "single"` (the style of
    `scripts/*.mjs`); `files.includes` excludes `.claude/skills/**`,
    `.next/**`, `next-env.d.ts`, `playwright-report/**`, `test-results/**`.
  - `vitest.config.ts`: `vite-tsconfig-paths` and `@vitejs/plugin-react`,
    `include: ['tests/unit/**/*.test.{ts,tsx}']`, environment `node`
    (component tests opt into jsdom with `// @vitest-environment jsdom`).
  - `playwright.config.ts`: `testDir: 'tests/e2e'`, one project on
    Chromium with `devices['Pixel 7']`, `webServer` running
    `pnpm build && pnpm start` on port 3000 with `reuseExistingServer: !process.env.CI`,
    and the test env values from Task 7, Step 1, passed through `webServer.env`
    when the variables are not already set.
  - `.gitignore`: add `.next/`, `next-env.d.ts`, `.env*` with `!.env.example`,
    `playwright-report/`, `test-results/`, `.vercel/`.
- [ ] **Step 3: Scripts in `package.json`:** `dev` `next dev`, `build`
  `next build`, `start` `next start`, `lint` `biome check`, `format`
  `biome check --write`, `typecheck` `next typegen && tsc --noEmit`, `test`
  `vitest run`, `test:e2e` `playwright test`, `check`
  `node scripts/check-docs.mjs && node scripts/check-repo.mjs && biome ci && pnpm typecheck && vitest run`.
- [ ] **Step 4: `lefthook.yml` pre-commit**, after `sync-skills`:
  `biome` runs `pnpm exec biome check --write --no-errors-on-unmatched {staged_files}`
  with `stage_fixed: true` and `glob: "*.{js,mjs,ts,tsx,json,jsonc,css}"`;
  `typecheck` runs `pnpm typecheck`. Remove the "come with the app" comment.
- [ ] **Step 5: Minimal `app/layout.tsx` and `app/page.tsx`** (a heading,
  replaced in Task 6) and `tests/unit/smoke.test.ts` asserting `1 + 1 === 2`.
- [ ] **Step 6: Run `pnpm format`, then verify.**
  Run: `pnpm check && pnpm build`
  Expected: docs and repo checks `ok`, `biome ci` with no errors, `tsc`
  silent, Vitest `1 passed`, `next build` finishes.
- [ ] **Step 7: Commit** `package.json pnpm-lock.yaml lefthook.yml .gitignore`
  and the new files: `chore(harness): scaffold the Next.js app and its tooling`.

### Task 2: Pilot passphrases config

**Files:**
- Create: `lib/pilot/config.ts`, `tests/unit/pilot-config.test.ts`
- Delete: `tests/unit/smoke.test.ts`

**Interfaces:**
- Produces:
  - `type PilotEntry = { ownerId: string; passphrase: string }`
  - `type PilotConfig = { entries: PilotEntry[]; sessionSecret: string }`
  - `parsePilotConfig(env: { PILOT_PASSPHRASES?: string; SESSION_SECRET?: string }): { ok: true; config: PilotConfig } | { ok: false; problem: string }`
  - `findOwner(entries: PilotEntry[], input: string): string | null`
  - `displayName(ownerId: string): string`
  - `timingSafeEqual(a: string, b: string): boolean`

- [ ] **Step 1: Write the failing tests** in `tests/unit/pilot-config.test.ts`:
  - `parses three entries`: `PILOT_PASSPHRASES = 'lotus-river-moon-sen,blue-wave-harbour-svarga,quiet-stone-path-dev'`
    and a 44-character `SESSION_SECRET` give owner ids `['sen','svarga','dev']`.
  - `tolerates spaces and a trailing comma`: `' lotus-river-moon-sen , blue-wave-harbour-svarga ,'`
    gives two entries with trimmed passphrases.
  - `refuses a short secret part`: `'blue-wave-sen'` → `ok: false`, `problem` contains `sen` and `12`.
  - `refuses a duplicate owner`: two entries ending `-sen` → `ok: false`, `problem` contains `duplicate` and `sen`.
  - `refuses an owner id that isn't lowercase letters`: `'lotus-river-moon-Sen'` and `'lotus-river-moon-sen2'` → `ok: false`.
  - `refuses a missing or short SESSION_SECRET`: absent, and 31 characters → `ok: false`.
  - `refuses an empty list`: `''` → `ok: false`.
  - `never puts a passphrase in the problem`: for each refusal above, `problem` does not contain the secret part.
  - `findOwner matches and trims`: `'lotus-river-moon-sen\n'` and `'  lotus-river-moon-sen '` → `'sen'`.
  - `findOwner is case-sensitive`: `'Lotus-river-moon-sen'` → `null`; `''` → `null`.
  - `displayName capitalises`: `'sen'` → `'Sen'`, `'svarga'` → `'Svarga'`, `'dev'` → `'Dev'`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/pilot-config.test.ts`
  Expected: FAIL, cannot find `@/lib/pilot/config`.
- [ ] **Step 3: Implement** in `lib/pilot/config.ts` with zod. Rules: split
  on `,`, trim, drop empty items; owner id = text after the last `-`, must
  match `/^[a-z]+$/`; secret part (before the last `-`) at least 12
  characters; `SESSION_SECRET` at least 32 characters. `findOwner` trims the
  input and compares against every entry with `timingSafeEqual` (UTF-8
  bytes, XOR over the longer length, length difference folded in), without
  returning early.
- [ ] **Step 4: Run** the same command. Expected: PASS, 11 tests.
- [ ] **Step 5: Commit** `feat(web): parse and match the pilot passphrases`.

### Task 3: Signed session

**Files:**
- Create: `lib/pilot/session.ts`, `tests/unit/pilot-session.test.ts`

**Interfaces:**
- Consumes: `PilotConfig`, `PilotEntry` from Task 2.
- Produces:
  - `SESSION_COOKIE = 'shopfront_session'`
  - `SESSION_MAX_AGE_SECONDS = 2_592_000` (30 days)
  - `createSession(ownerId: string, config: PilotConfig, now: Date): Promise<string>`
  - `readSession(value: string | undefined, config: PilotConfig, now: Date): Promise<{ ownerId: string } | null>`

- [ ] **Step 1: Write the failing tests:**
  - `round trip`: `readSession(await createSession('sen', config, t0), config, t0 + 10 days)` → `{ ownerId: 'sen' }`.
  - `expires after 30 days`: at `t0 + 2_592_000 s + 1 s` → `null`.
  - `refuses a different secret`: config with another `SESSION_SECRET` → `null`.
  - `changed passphrase signs out only that owner`: Sen's and Svarga's
    sessions, then Sen's entry changed in the config → Sen `null`, Svarga
    `{ ownerId: 'svarga' }`.
  - `removed owner`: Svarga's entry removed → `null`.
  - `tampered`: one character of the payload changed; signature cut off;
    `'not-a-cookie'`; `'%%%.###'`; `''`; `undefined` → `null`, none throws.
  - `a session from the future`: issued at `now + 1 h` → `null`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/pilot-session.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** with Web Crypto only (it runs in `proxy.ts`).
  Value: `base64url(JSON.stringify({ o, t, f })) + '.' + base64url(hmac)`,
  where `o` is the owner id, `t` the issue time in seconds, `f` the first 16
  bytes, base64url, of `HMAC-SHA256(SESSION_SECRET, 'fp:' + passphrase)`, and
  `hmac` is `HMAC-SHA256(SESSION_SECRET, payload part)`. Verify with
  `crypto.subtle.verify`. Parse the payload with zod; any failure returns
  `null`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): sign and read the pilot session`.

### Task 4: The gate, health route and indexing rules

**Files:**
- Create: `lib/pilot/gate.ts`, `lib/pilot/runtime-config.ts`, `proxy.ts`,
  `app/api/health/route.ts`, `app/robots.ts`, `messages/en.json` (with only
  `notConfigured` for now), `tests/unit/pilot-gate.test.ts`
- Modify: `next.config.ts`

**Interfaces:**
- Consumes: Tasks 2 and 3.
- Produces:
  - `type GateDecision = { kind: 'pass' } | { kind: 'redirect'; to: '/enter' | '/' } | { kind: 'unauthorized' } | { kind: 'misconfigured' }`
  - `decide(pathname: string, cookie: string | undefined, config: ReturnType<typeof parsePilotConfig>, now: Date): Promise<GateDecision>`
  - `getPilotConfig(): ReturnType<typeof parsePilotConfig>`, parsing
    `process.env` once per process and logging the `problem` once with
    `console.error`.
  - `PUBLIC_PATHS`: `/enter`, `/robots.txt`, `/favicon.ico`, `/icon*`,
    `/apple-icon*`, `/_next/static/*`, `/_next/image*`.

- [ ] **Step 1: Write the failing tests** for `decide`:
  - misconfigured config → `misconfigured` for `/`, `/enter` and `/api/health`.
  - no cookie: `/` → `redirect /enter`; `/api/health` → `unauthorized`;
    `/enter`, `/robots.txt`, `/_next/static/x.js` → `pass`.
  - valid cookie: `/` and `/api/health` → `pass`; `/enter` → `redirect /`.
  - old cookie after Sen's passphrase changed: `/enter` → `pass`, `/` →
    `redirect /enter` (no loop).
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/pilot-gate.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `decide` and `getPilotConfig`. Then `proxy.ts`
  (export `proxy` and a `config.matcher` covering everything except
  `_next/static` and `_next/image`): `misconfigured` → `503` HTML page
  with `notConfigured` from `messages/en.json` ("Shopfront isn't configured
  yet.") and `Cache-Control: no-store`;
  `unauthorized` → `Response.json({ error: 'unauthorized' }, { status: 401 })`;
  `redirect` → `NextResponse.redirect`. `GET /api/health` returns
  `{ ok: true }`. `app/robots.ts` disallows `/` for every user agent.
  `next.config.ts` adds `X-Robots-Tag: noindex, nofollow` on `/:path*`.
- [ ] **Step 4: Run** the same command, then `pnpm check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): gate every route behind the pilot session`.

### Task 5: Look, font, components and messages

**Files:**
- Create: `app/globals.css`, `postcss.config.mjs`, `components.json`,
  `components/ui/button.tsx`, `components/ui/input.tsx`,
  `components/ui/label.tsx`, `components/shopfront-mark.tsx`,
  `i18n/request.ts`
- Modify: `app/layout.tsx`, `next.config.ts`, `package.json`, `messages/en.json`

**Interfaces:**
- Produces: Tailwind tokens `bg-page`, `text-ink`, `text-ink-secondary`,
  `bg-field`, `border-field`, `bg-accent`, `text-on-accent`, `bg-accent-tint`,
  `text-accent-tint`, `text-error`, `border-error`, `rounded-control` (12px);
  `<ShopfrontMark />`; shadcn `Button`, `Input`, `Label`; next-intl
  namespaces `meta`, `enter`, `home`.

- [ ] **Step 1: Install** `tailwindcss`, `@tailwindcss/postcss`, `postcss`,
  `radix-ui`, `@phosphor-icons/react` with `pnpm add -E`; run
  `pnpm dlx shadcn@4.22.1 init` (no base colour CSS kept beyond what the
  tokens need), then `pnpm dlx shadcn@4.22.1 add button input label`. Remove
  any `lucide-react` the CLI added and switch its imports to Phosphor.
- [ ] **Step 2: Tokens in `app/globals.css`** with `@theme`, light values
  from the spec's table, dark values under `@media (prefers-color-scheme: dark)`.
  The spec leaves three to the builder; use: error `#B42318` (light) and
  `#F0948C` (dark); dark accent tint `#173A2F` with text `#7FD9B8`. Motion:
  `.press` `active:scale-[0.98]` and a 200 ms fade-in on `main`, both inside
  `@media (prefers-reduced-motion: no-preference)`.
- [ ] **Step 3: Restyle** `Button` (48px, full width, accent, `rounded-control`,
  visible focus ring), `Input` (48px, field tokens, error state through
  `aria-invalid`), `Label` (13px, secondary text).
- [ ] **Step 4: Font and layout.** `app/layout.tsx` loads Be Vietnam Pro via
  `next/font/google` (weights `400`, `500`; subsets `latin`, `latin-ext`,
  `vietnamese`), sets `lang="en"`, the page background, the one-column
  container (max width 420px, 20px side padding), and metadata from
  `meta`: title "Shopfront", description "Your posts and review replies,
  written for you.", `robots: { index: false, follow: false }`.
- [ ] **Step 5: next-intl.** `i18n/request.ts` always returns locale `en`
  and `messages/en.json`; `next.config.ts` wraps with `createNextIntlPlugin()`.
  `messages/en.json` holds every string in the spec's Behaviour section,
  word for word:
  `meta.title`, `meta.description`, `enter.label` "Passphrase",
  `enter.submit` "Enter", `enter.wrong` "That passphrase isn't right. Try
  again.", `enter.footer` "Private pilot for invited spas.",
  `home.welcome` "Welcome, {name}", `home.soon` "Soon you'll paste your
  website link here and get six posts, each with a story.",
  `home.websiteLabel` "Your website", `home.websiteExample` "yourspa.com",
  `home.comingSoon` "Coming soon", `home.signedIn` "Signed in on this phone
  for 30 days.", `notConfigured` "Shopfront isn't configured yet.".
- [ ] **Step 6: Verify.** Run: `pnpm check && pnpm build`. Expected: PASS,
  and `grep -rn "#[0-9A-Fa-f]\{6\}" components app --include=*.tsx` prints
  nothing.
- [ ] **Step 7: Commit** `feat(web): add the Shopfront look, font and messages`.

### Task 6: Passphrase screen and home page

**Files:**
- Create: `app/enter/page.tsx`, `app/enter/actions.ts`,
  `app/enter/sign-in-form.tsx`, `lib/pilot/current-owner.ts`,
  `tests/unit/sign-in-form.test.tsx`, `tests/e2e/pilot-gate.spec.ts`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: Tasks 2 to 5.
- Produces:
  - `type SignInState = { error: boolean; attempt: number }`
  - `signIn(prev: SignInState, form: FormData): Promise<SignInState>` (Server Action)
  - `WRONG_PASSPHRASE_DELAY_MS = 1000`
  - `getCurrentOwner(): Promise<string | null>` (reads the cookie with `next/headers`)

- [ ] **Step 1: Write the failing component test** (`// @vitest-environment jsdom`):
  - `shows no error at first`: no element with the wrong-passphrase text.
  - `shows the error linked to the field`: with state `{ error: true, attempt: 1 }`,
    the message is shown, the input has `aria-invalid="true"`, its
    `aria-describedby` points at the message, its value is empty and it
    has focus.
  - `field is safe for phone keyboards`: `type="password"`,
    `autocomplete="current-password"`, `autocapitalize="none"`,
    `autocorrect="off"`, `spellcheck="false"`, `name="passphrase"`.
- [ ] **Step 2: Run** `pnpm vitest run tests/unit/sign-in-form.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implement.** `SignInForm` uses `useActionState(signIn, { error: false, attempt: 0 })`
  with `<form action={formAction}>`; the input has `key={state.attempt}`
  (empties it) and `autoFocus` when `state.error`. `signIn`: right
  passphrase → set the cookie (`HttpOnly`, `Secure`, `SameSite=Lax`,
  `Path=/`, `maxAge: SESSION_MAX_AGE_SECONDS`) and `redirect('/')`; wrong or
  empty → wait `WRONG_PASSPHRASE_DELAY_MS`, return `{ error: true, attempt: prev.attempt + 1 }`.
  `app/enter/page.tsx` and `app/page.tsx` follow the spec's Behaviour
  layouts, in the mockups' order.
- [ ] **Step 4: Run** the component test. Expected: PASS.
- [ ] **Step 5: Write the e2e tests** in `tests/e2e/pilot-gate.spec.ts`
  (test passphrases from Task 7, Step 1):
  - `no session goes to /enter`: `/` lands on `/enter`, shows "Shopfront",
    the description and the "Passphrase" label.
  - `Sen signs in`: fill Sen's test passphrase, tap Enter → `/`, "Welcome,
    Sen", the "Sen" pill; the cookie `shopfront_session` is `httpOnly`,
    `secure`, `sameSite: 'Lax'`, expires 30 days ± 1 minute from now.
  - `wrong passphrase`: shows the error after at least 900 ms, no cookie set.
  - `works without JavaScript`: same as `Sen signs in` in a context with
    `javaScriptEnabled: false`.
  - `api health`: `/api/health` is 401 `{ error: 'unauthorized' }` without a
    cookie and 200 `{ ok: true }` after signing in.
  - `not indexed`: `/robots.txt` contains `Disallow: /`; the `/enter`
    response has `x-robots-tag: noindex, nofollow`.
  - `dark mode`: with `colorScheme: 'dark'`, `body` background is
    `rgb(18, 22, 20)` and the Enter button background `rgb(63, 191, 148)`.
  - `no horizontal scroll at 320px`: `document.documentElement.scrollWidth <= 320`.
- [ ] **Step 6: Run** `pnpm test:e2e`. Expected: `8 passed`. Copy the RED
  (Step 2) and GREEN (Steps 4 and 6) summary lines into `journal.md`.
- [ ] **Step 7: Commit** `feat(web): add the passphrase screen and home page`.

### Task 7: CI, deploy config, docs and hand-off

**Files:**
- Modify: `.github/workflows/check.yml`, `AGENTS.md`, `docs/roadmap.md`
- Create: `vercel.json`, `.env.example`, `docs/specs/harness/app-scaffold/journal.md`

- [ ] **Step 1: Test values** (not secrets), used by Playwright and CI:
  `PILOT_PASSPHRASES=test-lotus-river-sen,test-blue-wave-svarga,test-quiet-stone-dev`
  and `SESSION_SECRET=test-session-secret-not-for-production-0001`.
- [ ] **Step 2: Workflow.** Keep the `check` job (it now runs the new
  `pnpm check`). Add job `e2e`: checkout, pnpm, Node 24.21.0 with pnpm cache,
  `pnpm install --frozen-lockfile`, cache `~/.cache/ms-playwright` keyed on
  the `@playwright/test` version, `pnpm exec playwright install --with-deps chromium`
  (on a cache hit, `install-deps chromium` only), `pnpm test:e2e` with the
  test values in `env`, and upload `playwright-report/` when it fails.
- [ ] **Step 3: `vercel.json`:** `{ "regions": ["sin1"] }`. `.env.example`:
  both variables with made-up values and a comment:
  `SESSION_SECRET` from `openssl rand -base64 32`.
- [ ] **Step 4: `AGENTS.md`:** the opening says the app is scaffolded; Map
  rows for `app/`, `components/`, `lib/pilot/`, `messages/`, `tests/`;
  Commands rows for every Task 1 script; drop the "app code isn't
  scaffolded yet" sentence.
- [ ] **Step 5: `journal.md`** from `docs/templates/journal.md`: the calls
  this plan made (12-character rule, Deployment Protection kept, decision
  numbered 0007, TypeScript 6.0.3, the three builder colours, the
  phone-keyboard attributes) and the RED and GREEN lines.
- [ ] **Step 6: Roadmap:** row 0.5 status `done`.
- [ ] **Step 7: Verify.** Run: `pnpm check && pnpm test:e2e`. Expected: both
  pass.
- [ ] **Step 8: Commit** `ci(ci): run the browser tests` for the workflow,
  then `docs(docs): document the app and mark roadmap 0.5 done` for the rest.
- [ ] **Step 9: Push** the branch and write the developer's hand-off in the
  PR body, from the spec's "Who does what": create the Vercel project
  (`shopfront`, Hobby, production branch `main`), set both variables for
  Production and Preview as sensitive, make `check` and `e2e` required on
  `develop` and `main`, open the PR to `develop`, then check Sen's sign-in
  on the preview.
