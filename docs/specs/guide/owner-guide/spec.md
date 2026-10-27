---
title: "Owner guide"
description: "A How-to page inside the app, in English, Indonesian and Vietnamese, that walks the owner from the passphrase to a posted story and a review reply, explains the daily allowance and its reset, and prints or saves as an A4 PDF; its numbers and button names come from the app itself so it can't drift."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-26T09:37:10Z }
date: "2026-10-26"
---

# Owner guide

## Goal

The pilot owners (Sen in Da Nang, Svarga in Bali) get a link and a
passphrase, and then they're on their own with a phone. The app explains
each screen in one line, but some things it can't say there: how to add
Shopfront to the home screen so Safari keeps their business, how to take a
saved image into Instagram with a WhatsApp link on the story, why they should
wait out a run, what the usage bar counts and why the day's suggestions are
gone in the afternoon. Several specs already promised the guide would say
these things (below).

Success: an owner who has read the guide once posts their first post and
story and replies to a review without asking the developer, and the
developer can hand them the same guide on paper or as a PDF at the pilot
start. It is one page, in the owner's language, inside the app, because
that is where the owner already is.

## Behaviour

### Where it lives


> Changed by `platform/friendlier-home` (2026-10-27): the "Guide" link is a question-mark icon named "Guide".
- A page at **`/guide`**, behind the pilot gate like every page (`proxy.ts`
  needs no change). Without a session it redirects to `/enter`, as `/` does.
- **The way in**: a "Guide" link in the home header, left of the language
  switch, with a small question-mark icon (lucide `CircleHelp`), at least
  44px tall to tap. (Builder's call: the header is the only thing on every
  home screen state; a fourth tab would crowd the three.)
- **The way back**: the guide's header has the Shopfront mark, the language
  switch (`returnTo="/guide"`) and a "Back to Shopfront" link to `/`.
- The usage bar isn't on the guide (nothing is spent there).
- It follows the screen language rule of `platform/i18n` (cookie, then
  `Accept-Language`, then English) and switches language like the home
  screen.

### What it says

One scrolling page. At the top, the title "How to use Shopfront", one line
("Everything you need, in about five minutes of reading."), and a short list
of the sections as links to their headings. Then the sections, in this
order. Each is a heading and a few short paragraphs or numbered steps; the
wording follows `platform/i18n`'s rules (plain words, `Anda`, `bạn`).

1. **Getting started**
   - Open the link, type the passphrase you were given, tap "Enter". You
     stay signed in on this phone for 30 days.
   - **Add Shopfront to your home screen.** iPhone: in Safari, tap Share,
     then "Add to Home Screen". Android: in Chrome, tap ⋮, then "Add to Home
     screen" (or "Install app"). Why, in one sentence: your business and
     your posts are kept on this phone, and on an iPhone Safari may clear
     them after about a week without a visit unless Shopfront is on the home
     screen (`brand/brand-panel`, "Safari may clear the phone's store").
   - Everything stays on this phone: another phone starts empty.

2. **Your business**
   - Type your website and tap the read button. Keep the page open while
     Shopfront reads it (about a minute); the screen stays on by itself.
   - Check what it found, section by section, and tap "Edit" to fix or add
     anything. Add your WhatsApp number and your town if they're missing:
     every post ends with your WhatsApp and the hashtags use your town.
   - Facts are best written in English, since captions are in English.
   - "Re-read my website" replaces your changes with what your site says
     now (the app asks first). To use another website, "Forget this
     business" and start again.

3. **Making your posts**, with what decision 0005 requires:
   - Tap the make button: you get 6 suggestions, each with a post image, a
     story image and the text.
   - Keep the page open for about a minute. If you leave, Shopfront carries
     on where it stopped when you come back, but the part it was making is
     made again and uses some of today's allowance. So start when you have a
     minute to wait, not just before a call.
   - Make new suggestions: they go on top, the earlier ones stay below.
   - Tap a post's text to change it; "Create new image" (with an optional
     hint) for a different picture; read the text in your language.
   - If you change your business, the captions can be updated; posts you
     edited yourself are left alone.

4. **Posting on Instagram**, the steps `posts/editor-download` left here:
   - **Save**: tap "1 Save the 2 images" and choose "Save 2 images"
     (iPhone) or the save option your Android shows in the sheet that opens;
     the post image and the story image land side by side in your photos.
     Where a phone has no sheet for images, both download instead.
   - **Copy**: tap "2 Copy the text". It holds the caption, your WhatsApp
     line and the hashtags, ready to paste.
   - **The post**: in Instagram, tap +, Post, pick the post image, paste the
     text, share.
   - **The story**: tap +, Story, pick the story image; tap the sticker
     icon, choose **Link**, paste your WhatsApp link (`https://wa.me/` then
     your number with country code, no + or spaces, for example
     `https://wa.me/84901234567`), and place the sticker. A story has no
     text to paste.
   - Optional: in Instagram's advanced settings for the post, "Accessibility"
     lets you write an image description (`posts/editor-download` left this
     here; Shopfront no longer shows one).
   - No pictures on your suggestions: post with your own photo and paste the
     text.
   - Shopfront never posts for you.

5. **Replying to reviews**
   - In Google Maps, open the review, copy its text; in the Reviews tab,
     paste it (the guest's name is optional) and tap "Write 2 replies".
   - Pick one, edit it if you like, copy it, and paste it as your reply in
     Google Maps. Replies are written in your guest's language; you can read
     them in yours.
   - "Write 2 other replies" if neither fits. A new review replaces the last
     one.

6. **Your daily allowance**
   - Shopfront is free, so each day has a limit. The numbers are read from
     `lib/usage/limits.ts` (`OWNER_LIMITS`), never typed into the text: 3
     website reads, 3 attempts of 6 suggestions, 10 new images, 20 review
     replies today, plus caption updates and translations.
   - The bar at the top shows what's left today and the time it all comes
     back. **That time is the reset**: at that moment the limits come back
     and the day's suggestions and review reply leave the screen
     (`platform/one-daily-reset`). Save what you want before then. The
     guide gives no fixed hour: the bar's time is right for your phone and
     changes twice a year.
   - New images also have a monthly budget for the whole app; if it runs out,
     the app says when it's back.

7. **Languages**
   - The language switch at the top changes the screens. Captions and
     replies are written in English (replies in your guest's language); the
     "read in your language" view is for reading, not posting.

8. **If something goes wrong**, one line each, matching the app's messages:
   - "You've made today's … attempts": wait for the time on the bar.
   - "Shopfront has used today's free writing": the whole app's free
     allowance is used; back at the time shown.
   - "Images are paused for a moment": try again in a few minutes.
   - Your business is gone: Safari cleared it (add Shopfront to the home
     screen) or this is another phone; read your website again.
   - Still stuck: contact the developer (the developer's WhatsApp, read from
     configuration, `GUIDE_CONTACT`; the line is left out when it is empty).

The page ends with "Print or save as PDF" (below).

### The app's own words

The guide names buttons and messages as the app shows them. Where a step
names a button, the guide's string takes it from the same message key the
button uses (next-intl rich text or a value passed in), so a renamed button
renames itself in the guide, in all three languages. (Builder's call which
names this covers; at least the make, save, copy, read and reply buttons.)
The daily numbers come from `OWNER_LIMITS` the same way.

### Strings

- All guide text lives in `messages/{en,id,vi}.json` under a new `guide`
  key, like every visible string; `tests/unit/i18n-messages.test.ts` then
  fails if a language misses a key, as today.
- Steps and lists are separate keys (or ICU rich text with `<b>` and `<code>`
  tags), not HTML in a string.
- The agent writes Indonesian and Vietnamese; the developer reads them back
  with Google Translate before the pilot (as `platform/i18n`). Instagram's
  and the phones' own menu names ("Add to Home Screen", "Link") are written
  as those apps show them in that language where the builder can confirm it,
  otherwise in English in quotes.
- "Shopfront", "Instagram", "WhatsApp", "Google Maps", "Safari" and "Chrome"
  are never translated.

### Printable PDF

- A **"Print or save as PDF"** button at the end calls `window.print()`. On
  iPhone and Android the print sheet offers saving as PDF.
- A print stylesheet (`@media print`): A4, black on white, no header links,
  no language switch, no buttons, section headings kept with their first
  paragraph, no section split across a page where it fits on one, link
  targets not printed. It fits on about 4 to 6 pages per language.
- For the pilot handover, **`pnpm guide:pdf`** builds and starts the app with
  the test passphrases (as `pnpm test:e2e` does), opens `/guide` in each
  language with Playwright's Chromium, and writes
  `.superpowers/guide/shopfront-guide-{en,id,vi}.pdf` (scratch, outside git).
  No PDF is committed and no new dependency is added. (Builder's call: a
  committed PDF would go stale at the first renamed button.)

### Looks

Built from the existing components and tokens (decision 0007): reading
width, 16px body, generous line height, numbered steps as ordered lists.
No screenshots or illustrations in this spec (below). Works at 320px wide
with no horizontal scroll in every language, light and dark.

### Other documents

- `AGENTS.md`'s Commands table gains `pnpm guide:pdf`; its Map row for
  `app/` mentions `/guide`.
- The roadmap's 2.9 row goes to `in progress` with this spec, `done` with
  the PR that ships it.

### Tests

- Vitest (`tests/unit/guide.test.tsx`): the page renders the eight section
  headings in each language; the allowance section shows `OWNER_LIMITS`'
  numbers (change a limit in the test, see it in the text); the contact line
  is absent with an empty `GUIDE_CONTACT`; button names in the guide equal
  the buttons' own messages.
- Playwright at the phone viewport (`tests/e2e/guide.spec.ts`): from the
  home screen, tap "Guide", land on `/guide`, switch to Vietnamese and stay
  on `/guide`; tap "Back to Shopfront"; no horizontal scroll at 320px in
  each language; with print media emulated, the header controls and the
  print button are hidden; `/guide` without a session goes to `/enter`.
- The `pnpm guide:pdf` script is run by hand once and its three PDFs are
  looked at; it isn't in CI.

## Acceptance criteria

```gherkin
Scenario: Opening the guide
  Given an owner signed in, on the home screen
  When they tap "Guide"
  Then the guide opens in the screen's language
  And it shows "How to use Shopfront" and its eight sections

Scenario: The guide in Indonesian
  Given the guide in English
  When the owner switches the language to Indonesian
  Then the guide shows in Indonesian and stays on /guide

Scenario: The numbers come from the app
  Given the owner's daily limit of attempts is 3
  When the owner reads "Your daily allowance"
  Then it says 3 attempts of 6 suggestions

Scenario: The guide is private
  Given no pilot session
  When someone opens /guide
  Then they land on the passphrase screen

Scenario: Saving as PDF
  Given the guide is open
  When the owner taps "Print or save as PDF"
  Then the phone's print sheet opens
  And the printed pages show no buttons, links or language switch

Scenario: PDFs for the handover
  When the developer runs pnpm guide:pdf
  Then .superpowers/guide holds an A4 PDF in English, Indonesian and Vietnamese
```

## Known limits

- **Instagram's and the phones' menus change** without notice; the steps
  name them as they are in October 2026 and need a reread before each pilot.
- No native speaker reads the Indonesian and Vietnamese (as `platform/i18n`).
- Text only: an owner who learns by seeing may want screenshots.
- The guide shows the reset as "the time on the bar", so a printed copy
  can't tell the owner the hour.

## Out of scope

- Screenshots, illustrations or a video: added after the pilot if the owners
  ask; they'd need redoing in three languages at every screen change.
- In-app tips or a first-run tour.
- A public guide outside the pilot gate, and a guide for the developer.
- Captions in the owner's language for posting: later phases.
