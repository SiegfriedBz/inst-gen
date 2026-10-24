---
title: "Screens in three languages"
description: "Shopfront's screens in English, Indonesian and Vietnamese: the phone's language picks the first time, a switch on every screen changes it, the choice is kept in a cookie, and English fills any gap."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T08:04:18Z }
date: "2026-10-24"
---

# Screens in three languages

## Goal

The pilot spas are in Bali and Da Nang. Their owners and staff may read
English slowly, or not at all, so a screen they can't read is a screen they
won't use. Decision 0002 picked next-intl and left two product questions to
this spec: where the language lives (URL or cookie) and how an owner picks it.

When it ships, Svarga's owner opens the link on a phone set to Indonesian and
sees the passphrase screen in Indonesian, with nothing to choose. Anyone can
switch to English or Vietnamese from any screen, and the phone remembers it.

Why now: every later spec adds screens and strings. If the three languages
and the rule for adding a string exist first, each spec ships all three from
the start instead of catching up later.

## Behaviour

### Languages

| Code | Name shown in the switch | `<html lang>` |
|---|---|---|
| `en` | English | `en` |
| `id` | Bahasa Indonesia | `id` |
| `vi` | Tiếng Việt | `vi` |

English is the default and the fallback. Each language has its own message
file: `messages/en.json`, `messages/id.json`, `messages/vi.json`.

### Which language a screen uses

On every request, the first of these that gives one of the three codes wins:

1. **The saved choice:** a cookie named `shopfront_locale` holding `en`, `id`
   or `vi`. Any other value is ignored, as if the cookie weren't there.
2. **The phone's language:** the request's `Accept-Language` header, read in
   its own order of preference (`q` values). A tag matches on its primary
   subtag, so `id-ID` gives `id` and `vi-VN` gives `vi`. The old tag `in`
   (an earlier code for Indonesian) also gives `id`. The first tag that
   matches one of the three wins; `en-GB` gives `en`.
3. **English.**

The phone's language is never saved: only a tap on the switch sets the cookie.
An owner who never taps it follows the phone's setting, even if that changes.

The language is not in the URL. Addresses stay `/enter` and `/`, and the
private link given to each spa doesn't change. The pages aren't indexed, so
there is nothing to gain from per-language addresses.

### The switch

- A row of three links or buttons at the bottom of every screen, the
  passphrase screen included, just above the screen's footer line. Each
  language appears in its own name (the table above), so a reader finds theirs
  without reading the others. The names are never translated.
- The current language is shown as current (text colour and weight, and
  `aria-current="true"`) and does nothing when tapped. The row has an
  accessible name, "Language" in the current language.
- Tapping another language sets `shopfront_locale` and shows the same screen
  again in that language. The owner stays where they were: on `/enter` they
  stay on `/enter`, and a passphrase already typed may be lost (acceptable).
- It works without JavaScript: a plain form post (a Server Action or a route
  handler) that sets the cookie and sends the owner back to the page they
  came from. "Back" only ever means a path on this site; anything else goes
  to `/`.
- The cookie: `Path=/`, `SameSite=Lax`, `Secure`, `HttpOnly`, lasting one
  year. It holds only the language code, nothing about the owner.
- Switching works whether or not the owner is signed in, and signing in or
  out never changes it.
- The switch follows the look in `harness/app-scaffold`: secondary text
  colour, 13 to 14px, a tap target at least 44px high, visible focus, AA
  contrast in both modes, no horizontal scroll at 320px wide in any language.

### What gets translated

- Every visible string in `messages/en.json` today: the meta description,
  the passphrase screen, the home page, and the "isn't configured" page.
- The page title stays **Shopfront** in every language: it is the app's name.
  "Shopfront" is never translated anywhere it appears.
- The owner's name ("Sen", "Svarga") is never translated.
- The "isn't configured" 503 page uses the same rule as every other page
  (cookie, then `Accept-Language`, then English) and sets the matching
  `<html lang>`.
- Not translated here: captions, hashtags and review replies, which are
  generated in English (their owner's-language view is 2.4 and 2.5), and the
  owner guide (2.7).

### Wording

- The agent writes the Indonesian and Vietnamese strings. The developer reads
  them back with Google Translate before the pilot; no native speaker reviews
  them in this spec.
- Address the owner politely and plainly: `Anda` in Indonesian, `bạn` in
  Vietnamese. Short sentences, everyday words, no slang.
- Keep the meaning of each English string, not its word order. Placeholders
  like `{name}` stay as they are, and each language puts them where its grammar
  wants.
- No em dashes in any visible string, in any language (as in the scaffold).
- The agent's choice of word for "passphrase" in each language is recorded in
  the journal, so later specs reuse it.

### Missing strings and the rule for new ones

- At run time, a key missing from `id.json` or `vi.json` shows the English
  string, never a blank, a key name or an error. The English messages are the
  base and the chosen language is laid over them.
- A Vitest test fails if the three files don't have exactly the same keys, if
  a string's placeholders (`{name}` and the like) differ between languages, if
  any string is empty, or if any string contains an em dash. It runs in
  `pnpm check`, so CI catches a string added in English only.
- The language rule is one function shared by `i18n/request.ts` and
  `proxy.ts` (for the 503 page), so it must run in the proxy too: no Node-only
  APIs.
- `AGENTS.md` gains one convention line: every new visible string is added to
  all three message files in the same commit.

### Fonts and layout

- Be Vietnam Pro already loads the `vietnamese` subset; Vietnamese diacritics
  render in it, never in a fallback font.
- Longer Indonesian and Vietnamese strings wrap; nothing is cut off, overlaps,
  or scrolls sideways at 320px wide.

## Acceptance criteria

```gherkin
Scenario: The phone's language picks the first time
  Given a phone with no Shopfront cookies and Accept-Language "id-ID,id;q=0.9,en;q=0.8"
  When it opens /enter
  Then the passphrase screen is in Indonesian
  And the page has lang="id"
  And no shopfront_locale cookie is set

Scenario: An unsupported phone language falls back to English
  Given a phone with Accept-Language "fr-FR,fr;q=0.9"
  When it opens /enter
  Then the passphrase screen is in English

Scenario: The order of preference is respected
  Given a phone with Accept-Language "fr;q=1, vi;q=0.8, en;q=0.5"
  When it opens /enter
  Then the passphrase screen is in Vietnamese

Scenario: Switching language keeps the owner on the same screen
  Given Sen's owner signed in, on / in English
  When they tap "Tiếng Việt"
  Then they are still on /
  And the home page is in Vietnamese, with "Sen" unchanged
  And a shopfront_locale cookie holds "vi", for one year

Scenario: The saved choice beats the phone's language
  Given a shopfront_locale cookie holding "en" and Accept-Language "vi-VN"
  When the owner opens /
  Then the home page is in English

Scenario: The switch works without JavaScript
  Given JavaScript is off, on /enter in English
  When the visitor taps "Bahasa Indonesia"
  Then /enter shows in Indonesian

Scenario: A bad cookie value is ignored
  Given a shopfront_locale cookie holding "fr" and Accept-Language "id"
  When the owner opens /enter
  Then the passphrase screen is in Indonesian

Scenario: The switch never sends the owner off the site
  When the language form is posted with a return address of "https://example.com/"
  Then the owner lands on / on Shopfront

Scenario: A missing string shows in English
  Given a key present in en.json and missing from vi.json
  When a screen using it renders in Vietnamese
  Then that string shows in English and the rest in Vietnamese

Scenario: An English-only string fails the check
  Given a new key added to en.json only
  When pnpm check runs
  Then it fails and names the key and the files missing it

Scenario: Every language fits a small phone
  Given a 320px wide viewport
  When /enter and / render in each of the three languages
  Then nothing scrolls sideways and the switch is fully visible
```

Unit tests cover choosing the language (cookie, `Accept-Language` with `q`
values and the `in` tag, fallback), the safe return path, laying a language
over English, and the parity check. Playwright covers the first-visit choice,
switching on `/enter` and `/` with and without JavaScript, and the 320px
layout in all three languages.

## Known limits

- The Indonesian and Vietnamese wording is the agent's, checked by the
  developer with Google Translate rather than by a native speaker. A spa may
  find some of it stiff; fixing a string is a one-line change.
- The choice lives on one phone. A second phone, or cleared site data, starts
  again from that phone's language.
- Dates and numbers aren't formatted yet: no screen shows any. The usage bar
  (2.6) is the first, and formats them for the current language with
  next-intl.
- Right-to-left languages aren't considered; none of the three needs it.

## Out of scope

- Captions, hashtags and replies in the owner's language: 2.4
  `posts/editor-download` and 2.5 `reviews/reply-drafts`.
- The owner guide in three languages: 2.7 `guide/owner-guide`.
- Any language beyond these three, and a per-spa default language.
- Language in the URL, and per-language pages for search engines.
