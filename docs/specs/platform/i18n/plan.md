# Screens in three languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans
> (inline, per `AGENTS.md`) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shopfront's screens in English, Indonesian and Vietnamese, chosen
by a saved cookie, then the phone's `Accept-Language`, then English, with a
switch at the bottom of every screen.

**Architecture:** The language rule and the safe return path are plain
TypeScript in `lib/i18n/` with no Next.js or Node-only imports, so Vitest
covers them and `proxy.ts` can use them. `i18n/request.ts` reads the cookie
and header, picks the language, and lays its messages over English. The
switch is a Server Component holding a plain form posted to a Server Action,
so it works without JavaScript.

**Tech Stack:** Next.js 16.4.3, next-intl 4.14.9, Vitest 5.0.5,
Playwright 1.64.1 (all already installed; no new dependency).

**Spec:** [`spec.md`](spec.md).

## Global Constraints

- Codes `en`, `id`, `vi`; names in the switch `English`, `Bahasa Indonesia`,
  `Tiếng Việt`, never translated. `<html lang>` is the code.
- Cookie `shopfront_locale`: `Path=/`, `SameSite=Lax`, `Secure`,
  `HttpOnly`, max age one year (`60 * 60 * 24 * 365`). It is set only by the
  switch.
- "Shopfront" and the owner's name are never translated.
- Indonesian uses `Anda`, Vietnamese uses `bạn`. No em dashes in any visible
  string, in any language.
- No new dependency. Use `pnpm`. Stage files by path. Commits: scope `web`
  for app code, `docs` for docs.
- Every visible string lives in all three message files.

## Review Focus

- A return path like `//example.com/` or `/\example.com` is a different site
  to a browser: it goes to `/`. Test in Task 1.
- `Accept-Language` in odd shapes: upper case (`ID-id`), spaces around
  commas and `;`, `q=0` (means "not this one"), a `*`, an unparseable `q`.
  Tests in Task 1.
- A missing or empty `Accept-Language` (curl, some in-app browsers) gives
  English, never an error. Test in Task 1.
- A long Indonesian or Vietnamese string pushing the switch off a 320px
  screen. Test in Task 3.
- The switch posted on `/` after the session expired: the gate sends the
  owner to `/enter`, not a 500. Covered by the existing gate; checked by hand
  in Task 3.

---

### Task 1: The language rule

**Files:**
- Create: `lib/i18n/locale.ts`
- Test: `tests/unit/i18n-locale.test.ts`

**Interfaces:**
- Produces:
  - `LOCALES: readonly ['en', 'id', 'vi']`, `type Locale`,
    `DEFAULT_LOCALE: 'en'`, `LOCALE_NAMES: Record<Locale, string>`
  - `LOCALE_COOKIE = 'shopfront_locale'`,
    `LOCALE_COOKIE_MAX_AGE_SECONDS = 31_536_000`
  - `isLocale(value: unknown): value is Locale`
  - `localeFromAcceptLanguage(header: string | null | undefined): Locale | null`
  - `pickLocale(cookie: string | undefined, acceptLanguage: string | null | undefined): Locale`
  - `safeReturnPath(value: unknown): string`

- [ ] **Step 1: Write the failing tests**

```ts
test.each([
  ['id-ID,id;q=0.9,en;q=0.8', 'id'],
  ['fr-FR,fr;q=0.9', null],
  ['fr;q=1, vi;q=0.8, en;q=0.5', 'vi'],
  ['en-GB', 'en'],
  ['in', 'id'],
  ['ID-id', 'id'],
  [' vi-VN ; q=0.7 , id ; q=0.6', 'vi'],
  ['vi;q=0, id;q=0.5', 'id'],
  ['*', null],
  ['vi;q=abc, id', 'id'],
  ['id;q=0.5, vi;q=0.5', 'id'], // equal weights keep header order
  ['', null],
  [undefined, null],
])('localeFromAcceptLanguage(%j) is %j', (header, expected) => { … });

test('a valid cookie beats the header', () =>
  expect(pickLocale('en', 'vi-VN')).toBe('en'));
test('a bad cookie is ignored', () => expect(pickLocale('fr', 'id')).toBe('id'));
test('nothing matches: English', () => expect(pickLocale(undefined, 'fr')).toBe('en'));

test.each([
  ['/enter', '/enter'],
  ['/', '/'],
  ['https://example.com/', '/'],
  ['//example.com/', '/'],
  ['/\\example.com', '/'],
  ['enter', '/'],
  [undefined, '/'],
  [42, '/'],
])('safeReturnPath(%j) is %j', …);
```

- [ ] **Step 2: Run `pnpm test tests/unit/i18n-locale.test.ts`.** Expected:
  FAIL, cannot find `@/lib/i18n/locale`. Copy the summary line to the journal
  (RED).

- [ ] **Step 3: Implement `lib/i18n/locale.ts`.** Parse the header by
  splitting on `,`, then `;`, trimming; `q` defaults to 1, an unparseable `q`
  drops the tag, `q=0` drops it. Sort by `q` descending, stable. Match on the
  lower-cased primary subtag, mapping `in` to `id`. `safeReturnPath` accepts
  only strings starting with `/` whose second character is neither `/` nor
  `\`.

- [ ] **Step 4: Run the same command.** Expected: PASS.

- [ ] **Step 5: Commit** `feat(web): pick the screen language from the cookie or the phone`.

### Task 2: Messages in three languages, laid over English

**Files:**
- Create: `messages/id.json`, `messages/vi.json`, `lib/i18n/messages.ts`
- Modify: `messages/en.json` (add `language.label`: `"Language"`),
  `i18n/request.ts`, `app/layout.tsx`, `proxy.ts`, `AGENTS.md`
- Test: `tests/unit/i18n-messages.test.ts`

**Interfaces:**
- Consumes: `pickLocale`, `LOCALE_COOKIE`, `type Locale` from Task 1.
- Produces:
  - `type Messages = typeof en` (from `messages/en.json`)
  - `MESSAGES: Record<Locale, unknown>` (the three files, imported
    statically)
  - `messagesFor(locale: Locale): Messages`: a deep copy of English with the
    chosen file's strings laid over it; non-string or missing values keep the
    English one.

- [ ] **Step 1: Write the failing tests** in
  `tests/unit/i18n-messages.test.ts`:
  - `every file has the same keys as en.json`: flatten each file to
    dotted keys; on a mismatch the message names each key and the files
    missing it.
  - `placeholders match English`: for every key, the set of `{…}` names is
    the same in all three files.
  - `no string is empty and none has an em dash` (U+2014).
  - `messagesFor lays the language over English`: with a fake overlay
    missing `home.soon`, `home.soon` is the English string and
    `home.welcome` the overlay's.
  - `messagesFor('vi').enter.label` is not the English string.

- [ ] **Step 2: Run `pnpm test tests/unit/i18n-messages.test.ts`.**
  Expected: FAIL (no `id.json`, no `lib/i18n/messages.ts`).

- [ ] **Step 3: Write `messages/id.json` and `messages/vi.json`** with every
  key of `en.json`, following the spec's Wording rules. "Shopfront" stays
  as is inside `meta.title`. Record the word chosen for "passphrase" in each
  language in the journal.

- [ ] **Step 4: Implement `lib/i18n/messages.ts`.** `messagesFor` takes an
  optional second parameter `overlay` (defaults to `MESSAGES[locale]`) so the
  test can pass a fake one.

- [ ] **Step 5: Wire it up.**
  - `i18n/request.ts`: read `cookies().get(LOCALE_COOKIE)?.value` and
    `headers().get('accept-language')`, return
    `{ locale, messages: messagesFor(locale) }`. Drop the "English only"
    comment.
  - `app/layout.tsx`: `<html lang={await getLocale()}>`; the root layout
    becomes `async`.
  - `proxy.ts`: the 503 page picks its language with `pickLocale` from the
    request's cookie and header, uses `messagesFor(locale).notConfigured`,
    and sets `<html lang>` to it.
  - `AGENTS.md` Conventions: "**Strings:** every new visible string is added
    to `messages/en.json`, `id.json` and `vi.json` in the same commit; a test
    in `pnpm check` fails otherwise." Map row for `messages/` names the three
    files and `lib/i18n/`.

- [ ] **Step 6: Run `pnpm check`.** Expected: all green.

- [ ] **Step 7: Commit** `feat(web): add Indonesian and Vietnamese messages over English`.

### Task 3: The language switch

**Files:**
- Create: `components/language-switch.tsx`, `app/language/actions.ts`
- Modify: `app/enter/page.tsx`, `app/page.tsx`
- Test: `tests/e2e/i18n.spec.ts`

**Interfaces:**
- Consumes: `LOCALES`, `LOCALE_NAMES`, `LOCALE_COOKIE`,
  `LOCALE_COOKIE_MAX_AGE_SECONDS`, `isLocale`, `safeReturnPath` (Task 1).
- Produces:
  - `setLocale(form: FormData): Promise<void>` (`'use server'`): reads
    `locale` and `returnTo`; if `locale` is valid, sets the cookie with the
    Global Constraints attributes; always ends with
    `redirect(safeReturnPath(returnTo))`.
  - `LanguageSwitch({ returnTo }: { returnTo: string })`: async Server
    Component. A `<form action={setLocale}>` with a hidden `returnTo`, inside
    `<nav aria-label={t('language.label')}>`. Each other language is a
    `<button type="submit" name="locale" value={code} lang={code}>` with its
    name; the current one is a `<span aria-current="true" lang={code}>`, in
    the text colour at weight 500. Others in secondary text, 13px, at least
    44px tall, focus ring as the scaffold's controls; the row wraps.

- [ ] **Step 1: Write the failing e2e tests** in `tests/e2e/i18n.spec.ts`,
  with `test.use({ locale: … })` setting `Accept-Language`:
  - `phone in Indonesian sees Indonesian` (`id-ID`): `/enter` has
    `html[lang=id]`, the Indonesian `enter.label` as the field's label, and
    no `shopfront_locale` cookie.
  - `phone in French sees English` (`fr-FR`): label `Passphrase`.
  - `switching on / keeps the owner there` (`en-US`): sign in as Sen, tap
    `Tiếng Việt`; URL is `/`, heading is the Vietnamese `home.welcome` with
    `Sen`, cookie `shopfront_locale` is `vi`, `httpOnly`, `secure`, `Lax`,
    expiring within 60 s of one year from now.
  - `the saved choice beats the phone` (`vi-VN`): add cookie
    `shopfront_locale=en`; `/enter` is in English.
  - `a bad cookie is ignored` (`id-ID`): cookie `fr`; `/enter` is in
    Indonesian.
  - `without JavaScript, the switch works`
    (`javaScriptEnabled: false`, `en-US`): on `/enter`, tap
    `Bahasa Indonesia`; `/enter` shows in Indonesian.
  - `every language fits 320px`: for each code, set the cookie, open
    `/enter` and, signed in, `/`; `scrollWidth <= 320` and every switch
    entry is in the viewport.

- [ ] **Step 2: Run `pnpm test:e2e tests/e2e/i18n.spec.ts`.** Expected: the
  switch tests FAIL (no switch); the first-visit tests already pass after
  Task 2.

- [ ] **Step 3: Implement `setLocale` and `LanguageSwitch`**, and place
  `<LanguageSwitch returnTo="/enter" />` and `<LanguageSwitch returnTo="/" />`
  just above each screen's footer line (the footer's `mt-auto` moves to the
  switch so both stay at the bottom).

- [ ] **Step 4: Run `pnpm test:e2e`.** Expected: every test passes,
  `pilot-gate.spec.ts` included. Copy the summary line to the journal
  (GREEN).

- [ ] **Step 5: Check by hand** with `pnpm dev`: sign in, delete
  `shopfront_session`, tap a language on `/`; you land on `/enter`, no 500.

- [ ] **Step 6: Commit** `feat(web): add the language switch to every screen`.

### Task 4: Close the item

**Files:**
- Create: `docs/specs/platform/i18n/journal.md` (from `docs/templates/journal.md`)
- Modify: `docs/roadmap.md` (0.6 `done`)

- [ ] **Step 1:** Journal: calls made (the "passphrase" words, the switch
  markup, anything the plan left open), RED and GREEN lines as printed.
- [ ] **Step 2:** Run `pnpm check` and `pnpm test:e2e`. Expected: both green.
- [ ] **Step 3: Commit** `docs(docs): record the three-languages work and mark roadmap 0.6 done`.
