---
title: "Friendlier home"
description: "The home screen gets a smaller header (the spa's name, a Guide icon, one language button), its three tabs move to a bar at the bottom, 'Create Posts' becomes a grid of six per attempt that opens one suggestion at a time and ticks the ones saved and copied, 'Your business' shows what's missing first, and 'Reviews' shows one reply at a time with a Short | Warmer switch."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-27T10:23:10Z }
date: "2026-10-27"
---

# Friendlier home

## Goal

There is no feedback from the owners yet. This item makes the app easier to
use before they start, after a design review of the screens as they are on
`main` (2026-10-27):

- **Too much jade, all at once.** The open tab, the current language, the main
  button and the owner pill are all solid green, so nothing stands out.
- **The top of the screen is spent before the work starts.** The header, then
  "Welcome, Sen", then the tab row fill about a quarter of a phone screen, on
  every tab, and the spa's name shows twice.
- **"Create Posts" is very long**: about fifteen screens for one attempt of
  six. Each card repeats both steps, the Instagram line and the story link.
- **"Your business" mostly lists what's missing**: about ten rows of "Not
  found on your site · Add", and a source line under nearly every value.
- **"Reviews" shows two filled "Copy the text" buttons**, so neither reads as
  the one to tap.

The pilot's rule still holds: "super easy to use", fewer buttons, fewer
modes, nothing to learn, on cheap and slow phones. Success: an owner reaches
any suggestion's two steps in two taps from opening the app, sees which
suggestions they've already used today, and sees on "Your business" what to
add before reading what was found.

The mocks agreed on 2026-10-27, row "Chosen design":
<https://claude.ai/artifact/3j4zXdSZAG1S2ezZxmaxKV>. The look stays decision
0007's and `harness/app-scaffold`'s: the same tokens, Be Vietnam Pro 400 and
500, one 12px radius, no shadows, no gradients, light and dark from the
phone.

What the owners asked for in 2.6 `posts/suggestions` holds: no type labels
("Offer", "Local"), no post numbers, no feed preview, no "post them in this
order".

## Behaviour

### The header

On the home screen, in every state (no business, reading, tabs):

- **Left**: the S mark, then the spa's display name as plain text, 16px,
  weight 500, `ink`. It replaces the name pill. A long name is cut with an
  ellipsis; nothing wraps.
- **Right**: two controls, each at least 44px tall:
  - **Guide**: an icon only, the question-mark circle, `ink-secondary`, with
    "Guide" as its accessible name and tooltip. It links to `/guide` as
    today.
  - **The language button** (below).
- 56px tall, not sticky.

"Welcome, {name}" shows only on the screen with no business saved, under the
header, as today. Once a business is saved the header's name says it.

On `/enter`: the mark on the left, the language button on the right. On
`/guide`: the mark, the language button and "Back to Shopfront", as today
with the new button.

### The language button

It replaces 2.5's EN · VI · ID group everywhere it shows (home, `/enter`,
`/guide`).

- **Closed**: a globe icon and the current language's code (EN, VI or ID),
  14px, weight 500, `ink`, on the page background, no border. Accessible
  name "Language: {name}" with the current language's full name; it says
  whether it's open.
- **Open**: under the button, aligned right, a list of the three languages by
  their full names (`LOCALE_NAMES`): English, Tiếng Việt, Bahasa Indonesia,
  each in its own language (`lang`), each a 48px row. The current one has the
  `accent-tint` background, `accent-tint-ink` text and a check, and does
  nothing when tapped. The list sits on `field` with a 1px `edge` border and
  the control radius.
- Tapping another language switches as today: the same form post and cookie,
  the owner kept on the same screen and tab, anything being made carries on
  (2.6's "A faster language switch" holds, including its 1-second target).
- **Without JavaScript** it still works: the button and the list are a
  `<details>` and `<summary>`, and each language a submit button of today's
  form (builder's call: anything else that works without JavaScript).
- Escape, a tap outside and picking a language close the list. Keyboard: Tab
  reaches each language; focus returns to the button on close.
- Picking a language is two taps where 2.5 needed one; the button is always
  in view, on every screen.

### The tabs move to a bottom bar

2.5's tab row under "Welcome" is replaced by a bar fixed to the bottom of
the screen. **When it shows doesn't change**: only with a business saved and
no read running (2.5's rule), never on the empty or reading screens. Which
tab opens doesn't change either (2.5's table): "Create Posts" on every open,
"Your business" after a read.

- Three equal parts, in 2.7's order: **Your business · Create Posts ·
  Reviews**, each an icon over its label (Phosphor, decision 0007: a
  storefront, a picture and a speech bubble; builder's call on the exact
  glyphs). Labels 12px, today's `home.tabs.*` strings.
- **The open tab**: its icon on an `accent-tint` pill (about 56 by 28px),
  icon and label in `accent-tint-ink`, label weight 500. The others:
  `ink-secondary`, weight 400. No solid jade: solid jade is kept for the main
  button of each tab.
- The bar: `field` background, a 1px soft top border, 64px tall plus the
  phone's bottom safe area (`env(safe-area-inset-bottom)`, with
  `viewport-fit=cover` in the viewport). Full width; its three parts stay
  within the app's 420px column on wide screens.
- The page leaves room for it, so the last line of every tab can scroll
  above it.
- **It never covers what the owner is typing**: while a text field on the
  home screen has focus and the on-screen keyboard is up, the bar hides
  (builder's call on how; the edit sheets already cover it).
- It stays a real tab list: 2.5's roles, names, `aria-selected`,
  `aria-controls`, arrow keys; both other panels stay mounted and hidden, so
  switching tabs never stops anything.
- At 320px wide, in all three languages, the three labels fit on one line
  each, with no horizontal scroll.

### The usage line

2.8's usage bar moves from under the tab row to the **first line of each
tab's content**, under the header. Everything else about it holds (what it
says per tab, the error colour at 0, when it's read, its kept height).

### "Create Posts": a grid of six

Top to bottom, as 2.6 except where this says otherwise:

1. The usage line.
2. "Make 6 suggestions" / "Make 6 new suggestions" (filled, full width), its
   lines under it, the keep-open line and error line, as in 2.6.
3. With nothing on screen, 2.6's empty note.
4. The attempts, newest on top, each with 2.6's heading ("Attempt {n}",
   "{count} suggestions"), then **a grid of its suggestions, three to a
   row**, in the model's order. Attempts after the first are separated by a
   thin line.
5. 2.5's "Updating your captions to match your business…" line, 2.4's
   "Your business details changed…" with "Update captions", and 2.3's "Make
   the images" (all six images of an attempt in one run) stay where they are
   in 2.6: above their attempt, now above its grid.

**A tile** is one button, top to bottom:

- **The post image** (2.3's post crop, 4:5), filling the column, with the
  control radius.
  - While its image is made, or after it failed, or before images are made: a
    muted 4:5 block with 2.3's state in small text ("Making the image…", its
    failure line). The tile still opens.
  - **Without images** (not on `IMAGE_OWNERS`, or paused): no image block;
    the tile is a `field` card with the caption's first lines (up to 6) in
    14px.
- **The caption's first words**, 13px, at most two lines, cut with an
  ellipsis (with images).
- **"Check the text"**, 12px, in the error colour, when the suggestion has
  one of 2.6's warnings (price, duration, banned word). The warnings
  themselves are in the panel.
- **"Saved and copied"**, 12px, weight 500, `accent-tint-ink`, with a check on
  the image's top right corner (a 22px `accent` circle with an `on-accent`
  check), when both steps are done (below). Without images: "Copied", and
  the check sits at the card's top right.

Its accessible name: "Suggestion {n} of {count}", then its first words, then
"Saved and copied" or "Check the text" when they show.

**Tapping a tile opens the suggestion** in a bottom sheet (`components/ui/
sheet.tsx`, decision 0007) over the grid, about 94% of the screen tall,
covering the bottom bar. Top to bottom:

1. A small line, "Attempt {a}, suggestion {n} of {count}", and a close
   button (an X, accessible name "Close", at least 44px).
2. **The two images side by side**: the post image (two thirds of the width)
   and the story image (one third), each opening 2.3's full view when
   tapped. Under the story image, "Create new image" (2.6's link, with its
   optional hint). 2.6's "See the story image" link goes: the story image is
   in view.
3. **The text for the post**, exactly as it will be pasted (2.6's
   `postText`), 15px.
4. 2.6's warnings, in full.
5. One row of links: "Edit the text" and, on Vietnamese and Indonesian
   screens, "Show in Tiếng Việt / Bahasa Indonesia".
6. Pinned at the bottom of the sheet, above the phone's safe area: **"1 Save
   the 2 images"** (filled), **"2 Copy the text"** (outlined), then 2.6's
   Instagram line. Without images, one "Copy the text" with no number, and
   2.6's text-only line.

Everything a 2.6 card did, the sheet does: editing (2.4's editor opens over
it), "Rewrite this one too", a failed image's "Try again", "Copied" and its
"Copy it from here." fallback, disabled buttons while a text step runs.
Controls that belong to a whole attempt stay above its grid (item 5).
Closing the sheet goes back to the grid at the same scroll position, the
tile focused. The back gesture closes it (builder's call: a history entry,
or the sheet's own handling). There is no next or previous inside the sheet:
the owner closes it and taps another tile.

### "Saved and copied"

Each suggestion remembers, on the phone, two things done today:

- **saved**: "Save the 2 images" finished: the share sheet resolved with a
  save, or, without file sharing, both downloads started. A share sheet the
  owner cancels doesn't count.
- **copied**: "Copy the text" put the text on the clipboard, or showed the
  "Copy it from here." fallback and the owner copied from it (builder's call:
  showing the fallback counts).

The tile shows "Saved and copied" when both are set, in either order; "Copied"
when the suggestion has no images and copied is set. Nothing shows for one of
two.

- They are kept with the attempt on the phone (the posts store), as two
  optional timestamps per suggestion, so attempts saved before this item load
  unchanged. Builder's call on the exact shape.
- A change to the text (the owner's edit, "Rewrite this one too", 2.5's
  automatic update, and a new WhatsApp number, which rewrites every call to
  action on the phone) clears **copied**; a new image clears **saved**. What
  was saved or copied is no longer what's on screen.
- They go with the attempt at the daily reset (`platform/one-daily-reset`).
- They say what happened in Shopfront, not whether the owner posted: the
  label never says "posted".

### "Your business": what's missing first

Top to bottom:

1. The usage line.
2. A heading, "What we know about {name}" (22px, weight 500), and under it
   "Your posts are written from this. Fix anything that's wrong." They replace
   `brand.home.intro`.
3. The brand notes as today: a failed re-read, "notKept", an invalid saved
   profile, the thin-site notice, and 1.2's two warnings (WhatsApp, town)
   when those fields are empty.
4. **The missing block**, when at least one field is empty: an
   `accent-tint` box with "{count} things we couldn't find" (16px, weight
   500), "Each one you add makes your posts more exact.", then one button per
   empty field, "+ {field}", wrapping, each at least 44px tall, white
   (`field`) with a 1px `accent` border and `accent-tint-ink` text.
   - The fields and their order are 1.2's panel table, section by section,
     with their `brand.panel.fields.*` labels, plus 1.3's "What people search
     for". A field is empty under 1.2's rule (`null` or an empty list).
   - WhatsApp and town aren't buttons: their warnings already ask for them
     (item 3), and they're counted.
   - Logo and photos are left out, and not counted: 1.2's forms can remove
     them but not add them (uploading is out of scope).
   - The fields the essence search fills ("What people search for", "Why
     people come", "Symbols of your place") count only once the search has
     ended; while it runs, they aren't listed, so no button shows and then
     vanishes.
   - Each button opens its section's form (1.2's sheet), with that field's
     input focused when the form has one (builder's call for list and chip
     fields: the list's "Add").
   - No empty field: no box.
5. **The five sections**, in one bordered card, each section separated by a
   thin line:
   - **"Your business"** shows open: its title, "Edit", then name, what you
     offer, kind of business, and services (names, with price and duration
     when known), label beside value. Highlights stay inside "Edit".
   - **The other four** are rows: the title (16px, weight 500), one line of
     summary under it (13px, `ink-secondary`, one line, ellipsis), and a
     chevron. The summaries:

     | Section | Summary line |
     |---|---|
     | Where and when | town, then hours |
     | How people reach you | WhatsApp, else the first of phone, email, Instagram |
     | Your look | a swatch of the main colour, then the visual style's summary |
     | Your feeling | how guests should feel, then the tone |

     With nothing to summarise, the line is the missing count for that
     section ("3 to add").
   - **Tapping a row opens it in place**, showing that section as 1.2 shows
     it today, with its values, its source lines ("from /contact", "our
     suggestion") and "Edit", minus the "Not found on your site · Add"
     lines: the missing block lists those. Tapping again closes it. Any
     number can be open. "Your business" can close too.
   - Source lines show only inside an open section, never on the summary
     rows.
6. The footer: "Read from {site} {when}." (the site without `https://` and
   a trailing `/`; `{when}` as 1.2's relative time), then on one row **"Read
   it again"** and **"Forget this business"** (the error colour), each with
   today's confirmation. They replace the website line, "Last read …", "Re-
   read my website" and the two buttons.

What a section open or closed is, isn't remembered: every visit starts with
"Your business" open and the others closed.

### "Reviews": one reply at a time

The empty tab and the writing state are 2.7's, under the usage line. With
replies, top to bottom:

1. The usage line.
2. **The review** in its muted box, as 2.7 (its heading, the review, its
   translation under a thin line when it isn't in the screen's language).
3. 2.7's abusive note, when it applies.
4. **A switch, "Short | Warmer"**: one bordered `field-muted` bar with two
   equal halves, each at least 44px tall. The picked half is `field` with a
   1px `accent` ring, `accent-tint-ink` text, weight 500; the other is
   transparent, `ink-secondary`. It is a radio group named "Which reply";
   arrow keys move between the two. **Short** is picked when replies arrive.
5. **One card** with the picked reply: the reply as it will be pasted
   (17px), its translation under a thin line (2.7's rule), "Edit the text",
   and **"Copy the reply"** (filled, full width) with 2.4's "Copied" and its
   fallback.
6. 2.7's line: "In Google Maps: open the review, tap Reply and paste."
7. "Write 2 other replies" and "Paste a new review", centred on one row (two
   rows when they don't fit).

- Switching shows the other reply; nothing is lost: an edit made to one
  reply stays when the owner switches away and back.
- "Copied" belongs to the reply that was copied: switching shows the other
  reply's own button state.
- "Write 2 other replies" replaces both (2.7) and keeps the half that was
  picked.
- The picked half isn't stored: a reload shows Short.

### Strings

New or changed, in English, Indonesian and Vietnamese (the developer's
translations; the owners read them back during the pilot). Builder's call on
key names; these are suggestions.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `language.button` | Language: {name} | Bahasa: {name} | Ngôn ngữ: {name} |
| `posts.saved` | Saved and copied | Disimpan dan disalin | Đã lưu và sao chép |
| `posts.copiedOnly` | Copied | Disalin | Đã sao chép |
| `posts.checkText` | Check the text | Periksa teksnya | Kiểm tra phần chữ |
| `posts.tile` | Suggestion {n} of {count} | Saran {n} dari {count} | Gợi ý {n}/{count} |
| `posts.sheetTitle` | Attempt {attempt}, suggestion {n} of {count} | Percobaan {attempt}, saran {n} dari {count} | Lần thử {attempt}, gợi ý {n}/{count} |
| `posts.close` | Close | Tutup | Đóng |
| `brand.home.title` | What we know about {name} | Yang kami ketahui tentang {name} | Những gì chúng tôi biết về {name} |
| `brand.home.subtitle` | Your posts are written from this. Fix anything that's wrong. | Postingan Anda ditulis dari sini. Perbaiki yang salah. | Bài đăng của bạn được viết từ đây. Hãy sửa chỗ nào chưa đúng. |
| `brand.missing.title` | {count, plural, one {# thing we couldn't find} other {# things we couldn't find}} | {count} hal yang tidak kami temukan | {count} mục chúng tôi không tìm thấy |
| `brand.missing.body` | Each one you add makes your posts more exact. | Setiap yang Anda tambahkan membuat postingan Anda lebih tepat. | Mỗi mục bạn thêm giúp bài đăng chính xác hơn. |
| `brand.missing.add` (accessible name) | Add {field} | Tambah {field} | Thêm {field} |
| `brand.missing.inSection` | {count} to add | {count} untuk ditambahkan | {count} mục cần thêm |
| `brand.home.readFrom` | Read from {site} {when}. | Dibaca dari {site} {when}. | Đã đọc từ {site} {when}. |
| `brand.home.reread` (changed) | Read it again | Baca lagi | Đọc lại |
| `reviews.which` | Which reply | Balasan yang mana | Chọn câu trả lời |
| `reviews.short` (changed) | Short | Singkat | Ngắn |
| `reviews.warm` (changed) | Warmer | Lebih hangat | Ấm áp hơn |
| `reviews.copy` | Copy the reply | Salin balasan | Sao chép câu trả lời |

Removed where nothing else uses them: `brand.home.intro`,
`brand.home.lastRead`, `posts.images.seeStory`, and the panel's "Not found
on your site" and "Add" if no form uses them.

### The owner guide

The guide (2.9) describes the screens in words; these lines change, in the
three languages, in the guide's register (`Anda`, `bạn`):

| Key | English |
|---|---|
| `guide.business.check` | Check what it found. Tap a section to see all of it, and <b>{button}</b> to fix or add anything. |
| `guide.business.missing` | At the top, Shopfront lists what it couldn't find: tap one to add it. Add your WhatsApp number and your town first: every post ends with your WhatsApp, and the hashtags use your town. |
| `guide.posts.open` (new, after `guide.posts.make`) | Tap a suggestion to open it. The ones you've saved and copied show <b>{saved}</b>. |
| `guide.reviews.pick` | Switch between <b>{short}</b> and <b>{warm}</b> to pick the reply you like, change it if you want, copy it, and paste it as your reply in Google Maps. Replies are written in your guest's language, and you can read them in yours. |
| `guide.languages.switch` | The <b>EN</b> button at the top right changes the language of the screens. |
| `guide.allowance.bar` | The line at the top of each tab shows what's left today and the time it all comes back. |

Where a guide line names a button through a `{button}` placeholder, it takes
the new label ("Read it again" in `guide.business.reread`). The guide's PDF
(`pnpm guide:pdf`) is made again.

### Other documents

Each spec below gets a dated "Changed by `platform/friendlier-home`" note at
the section it changes, as `platform/one-daily-reset` did; the section text
itself stays as a record:

- `platform/home-tabs`: "The tab row", "The language switch at the top
  right" (and "a bottom tab bar" in its Out of scope).
- `platform/i18n`: "The switch".
- `posts/suggestions`: "The screen", "A suggestion".
- `brand/brand-panel`: "The home screen" (intro), "The panel" (sources, empty
  fields, footer).
- `reviews/reply-drafts`: "The Reviews tab, with replies".
- `platform/usage-counters`: "The usage bar" (its place).
- `guide/owner-guide`: "Where it lives" (the Guide link is an icon).
- The roadmap gains **2.10 `platform/friendlier-home`**, `in progress` with
  this spec, `done` with the PR that ships it.

### Tests

- Vitest (Testing Library):
  - the header: the spa's name as text, Guide's accessible name, the
    language button's name and its three languages, the current one marked;
  - the bottom bar: absent with no business and while reading; three tabs
    otherwise; the open one selected per 2.5's table; arrow keys;
  - the grid: three tiles to a row per attempt, newest attempt first; a
    tile's accessible name; "Check the text" with a warning; the image
    states; the text-only tile;
  - the sheet: opens on a tile, holds both steps and the links, closes back
    to the focused tile;
  - saved and copied: both needed, either order; a cancelled share doesn't
    count; an edit or a WhatsApp change clears copied, a new image clears
    saved; old attempt
    records load; cleared with the attempt at the reset;
  - the missing list: the fields in panel order; WhatsApp and town left to
    their warnings but counted; logo and photos neither listed nor counted; the search's fields only after the
    search ended; no box with nothing missing; each button opens its section;
  - the section summaries and "{count} to add"; open and close in place;
    sources only inside an open section;
  - the reply switch: Short first; an edit kept across a switch; "Copied"
    per reply; "Write 2 other replies" keeps the picked half.
- Playwright at the phone viewport, routes mocked as today:
  - a saved brand opens on "Create Posts" with the bar at the bottom; tap a
    tile, tap "1 Save the 2 images" and "2 Copy the text", close, see "Saved
    and copied" on that tile; reload, still there;
  - "Your business" shows the missing block first; "+ Phone" opens "How
    people reach you" with the phone field focused;
  - Reviews: write two replies, switch to Warmer, copy, see "Copied";
  - the language button: open, pick Tiếng Việt, same tab in Vietnamese;
  - no horizontal scroll at 320px in all three languages, on each tab and on
    `/enter`;
  - the bar doesn't cover the review field while typing.
  - Existing tests that count `article` cards, read the old tab row, the
    language codes or the two reply cards are updated.

## Acceptance criteria

```gherkin
Scenario: The header names the spa once
  Given a business is saved for Sen
  When the owner opens the app
  Then the header shows "Sen" beside the mark, a Guide icon and "EN"
  And there is no "Welcome, Sen" and no name pill

Scenario: The language list
  Given the screen is in English on "Reviews"
  When the owner taps "EN"
  Then a list shows English (checked), Tiếng Việt and Bahasa Indonesia
  When the owner taps "Tiếng Việt"
  Then "Reviews" shows in Vietnamese

Scenario: The tabs are at the bottom
  Given a business is saved
  When the owner opens the app
  Then a bar at the bottom shows "Your business", "Create Posts" and "Reviews"
  And "Create Posts" is open

Scenario: No bar before a business is saved
  Given no business is saved on the phone
  When the owner opens the app
  Then there is no bottom bar
  And "Welcome, Sen" and the website field show

Scenario: Six suggestions in a grid
  Given attempt 1 has 6 suggestions with images
  When the owner opens "Create Posts"
  Then attempt 1 shows as 2 rows of 3 tiles
  And no tile shows a type label

Scenario: One suggestion opened
  Given attempt 1 is on screen
  When the owner taps its 4th tile
  Then a sheet shows "Attempt 1, suggestion 4 of 6", the post and story images, the text, "1 Save the 2 images" and "2 Copy the text"

Scenario: Saved and copied
  Given the owner opened suggestion 2
  When they save the 2 images and copy the text, and close the sheet
  Then suggestion 2's tile shows "Saved and copied"
  And the other tiles don't

Scenario: Only one of two
  Given the owner copied suggestion 3's text but cancelled the share sheet
  Then suggestion 3's tile doesn't show "Saved and copied"

Scenario: An edit clears copied
  Given suggestion 2 shows "Saved and copied"
  When the owner edits its text and saves
  Then suggestion 2 no longer shows "Saved and copied"

Scenario: What's missing first
  Given the profile has no address, phone or Instagram, and has WhatsApp and town
  When the owner opens "Your business"
  Then the first box says "3 things we couldn't find"
  And shows "+ Address", "+ Phone" and "+ Instagram"

Scenario: Adding from the missing box
  When the owner taps "+ Phone"
  Then the "How people reach you" form opens with the phone field focused

Scenario: A section opens in place
  Given "Your business" is open
  When the owner taps "Where and when"
  Then it shows its values with their sources and "Edit"

Scenario: One reply at a time
  Given two replies were written for a review
  Then "Short" is picked and one card shows the short reply and "Copy the reply"
  When the owner taps "Warmer"
  Then the card shows the warmer reply

Scenario: An edit survives a switch
  Given the owner edited the short reply
  When they switch to "Warmer" and back to "Short"
  Then the short reply shows their edit

Scenario: Small phone
  Given a phone 320px wide with the screen in Vietnamese
  Then every tab, the bottom bar and the header fit with no horizontal scroll
```

## Known limits

- "Saved and copied" says what happened in Shopfront, not on Instagram. An
  owner who saved and copied but didn't post still sees the tick.
- Picking a language takes two taps instead of one.
- A fixed bottom bar takes 64px of a small screen on every tab.
- Hiding the bar while the keyboard is up relies on the browser reporting the
  keyboard; on a browser that doesn't, the builder's chosen fallback applies.
- The changes have no owner feedback behind them; the pilot will say whether
  they help.
- New strings in Indonesian and Vietnamese are the developer's; the owners
  read them back during the pilot.

## Out of scope

- Next and previous inside the opened suggestion, or swiping between
  suggestions.
- Marking a suggestion as posted, or anything that reads Instagram.
- Remembering the open tab, the open sections or the picked reply.
- New colours, fonts, radii or a logo: the S mark stays a placeholder.
- The empty and reading screens' layout, beyond the header.
- Any change to what is read, generated, counted or stored, beyond the two
  saved and copied timestamps.
