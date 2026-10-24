# Screens in three languages: journal

## Calls made along the way

- 2026-10-24: "Passphrase" is **Frasa sandi** in Indonesian and **Cụm mật
  khẩu** in Vietnamese. Later specs reuse these words. Other recurring words:
  post is *postingan* / *bài đăng*, story stays *story* in both (the word
  owners see in Instagram), website is *situs web* / *trang web*.
- 2026-10-24: The developer checks the Indonesian and Vietnamese wording with
  Google Translate after this PR; no native speaker has read it yet.
- 2026-10-24: The switch is one form with a button per language (`name=locale`)
  and a hidden `returnTo`. The current language is a `<span aria-current>`, so
  it isn't a control and can't be tapped. Each entry carries its own `lang`
  attribute so screen readers say its name correctly.
- 2026-10-24: The switch takes the footer's place at the bottom (`mt-auto`);
  the footer line sits just under it.
- 2026-10-24: A missing string falls back to English because `lib/i18n/messages.ts`
  lays each language over a copy of `en.json`, not through next-intl's
  `getMessageFallback`. That way the proxy's 503 page uses the same rule.
- 2026-10-24: The Playwright test imports the message files with
  `with { type: 'json' }`, which Node's ESM loader needs.
- 2026-10-24: The scaffold's dark-mode browser test picked the Enter button
  by `button[type=submit]`, which now also matches the switch's buttons. It is
  narrowed to `button[type=submit]:not([name=locale])`.
- 2026-10-24: Tapping a language on `/` after the session has expired shows
  the passphrase screen, already in the new language, but the address bar
  still says `/`: the gate's redirect is followed inside the Server Action
  request (`POST /` 307, then `POST /enter` 200). There is no error, and
  signing in from there lands on the home page. This was left as it is.
- 2026-10-24: The final review was a self-review by the implementing agent;
  no separate reviewer read the branch.

## RED

Task 1, `pnpm test tests/unit/i18n-locale.test.ts`:

```
 Test Files  1 failed (1)
```

Task 2, `pnpm test tests/unit/i18n-messages.test.ts`:

```
 Test Files  1 failed (1)
```

Task 3, `pnpm test:e2e tests/e2e/i18n.spec.ts`:

```
  5 failed
  4 passed (59.0s)
```

## GREEN

`pnpm check` (Vitest):

```
 Test Files  7 passed (7)
      Tests  88 passed (88)
```

`pnpm test:e2e`:

```
  17 passed (8.9s)
```
