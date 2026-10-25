---
title: "Home tabs"
description: "Once a business is saved, the home screen splits into two tabs, 'Your business' and 'Create your posts', opening on 'Create your posts' except right after a read; captions follow business edits automatically, the language switch moves to the top right as EN · VI · ID, and three small leftovers from 2.4 are fixed."
status: draft
date: "2026-10-25"
---

# Home tabs

## Goal

Today the home screen is one long page: the brand panel, then "Your posts",
then the website link, "Re-read my website" and "Forget this business", then
the language row at the very bottom. An owner who comes back to make posts
scrolls past their whole brand panel first, and an owner who wants to check
their details scrolls back up past six posts. On cheap, slow phones that is
most of the visit.

This item splits the home screen into two tabs, **"Your business"** and
**"Create your posts"**, once a business is saved. The app opens where the
owner wants to be: on "Your business" right after a read, so they check what
was understood, and on "Create your posts" every time after that. The pilot's
rule is "super easy to use": fewer buttons, fewer modes, nothing to learn. So
the tabs add one control and take away a long scroll; captions follow the
business details without a button; and the language switch moves from the
bottom of the page to the top right, where people look for it.

The tabs leave room for a third, review replies (2.6 `reviews/reply-drafts`).

## Behaviour

### When the tabs show

- **No business saved**: no tabs. The screen is today's: the website field
  and "Read my website".
- **During any read**, a first read or a re-read, and a read resumed after a
  reload: no tabs. The screen is today's reading screen, the panel filling in
  with "Stop".
- **A business saved and no read running**: the tab row shows, with two
  tabs, "Your business" and "Create your posts".

A business is "saved" when the home screen has a profile to show. That
includes the case where the phone couldn't keep it ("notKept"): the profile
is still on screen for this visit.

### Which tab is open

| Moment | Tab |
|---|---|
| The app opens or reloads with a business saved | "Create your posts" |
| A first read finishes | "Your business" |
| A re-read finishes, fails or is stopped | "Your business" |
| The owner taps a tab | That tab, until the app is closed or reloaded |
| "Forget this business" | No tabs (back to the empty screen) |

- The tab the owner picked is **not remembered**: it lives in the page's
  state only, never in storage or the URL. Every open lands on "Create your
  posts", which is what the owner comes back for.
- A first read that fails or is stopped goes back to the empty screen, with
  no tabs, as today.
- Switching tabs **never stops anything**. Posts, a rewrite, images, a
  translation or the essence search carry on while the other tab is showing,
  and their results are there when the owner comes back. Only "Re-read my
  website" and "Forget this business" stop a posts run, as they do today.
  (Builder's note: both tabs' contents stay mounted; the hidden one is
  hidden, not unmounted.)

### What each tab holds

Above the tabs, on both, unchanged: the header, "Welcome, {name}", and any
error or note about the brand (a failed re-read, "notKept", an invalid saved
profile).

- **"Your business"**: the intro line ("This is what we understood about
  …"), the brand panel with its edit sheets, then the website link, "Last
  read …", "Re-read my website" and "Forget this business", with their
  confirmations. Exactly today's, minus "Your posts".
- **"Create your posts"**: today's "Your posts" section from 2.4, unchanged
  except for the automatic caption update below and the "Edit" fix in the
  leftovers.

The brand panel's first section is also called "Your business". It stays so:
inside the tab, the repeat reads as the tab's first part.

### The tab row

- Under "Welcome, {name}", full width, in the style of the mockup's option C
  (https://claude.ai/artifact/Gupm6Uyig4XXSJpgh8o2tC, section 1b): one
  segmented bar on the muted field colour (`field-muted`, a 1px soft edge,
  12 to 14px radius, 4px inner padding), each tab an equal share of it.
- **The open tab** is filled with `accent`, its label in `on-accent`, weight
  600. The other tabs are transparent with `ink-secondary` text, weight 500.
  No dot, no icon.
- Each tab is at least 44px high, 14px text, centred; a label that doesn't
  fit wraps onto two lines rather than being cut off.
- AA contrast in both modes for both states. Visible focus. No horizontal
  scroll at 320px wide in any language, with two tabs and with three.
- It is a real tab list: `role="tablist"` with an accessible name, each tab
  `role="tab"` with `aria-selected` and `aria-controls`, each panel
  `role="tabpanel"`; left and right arrow keys move between tabs. (Builder's
  call: the shadcn/ui Tabs component on Radix, with both panels kept
  mounted, or a small hand-written one.)
- Not sticky: the row scrolls away with the page, which keeps the small
  screen for the posts.
- "Make my posts" stays today's filled green button: the tab sits inside a
  grey bar and is smaller, so the two don't read as the same thing.

Labels, short so that three fit at 320px in Vietnamese:

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `home.tabs.label` (the list's name) | Home | Beranda | Trang chính |
| `home.tabs.business` | Your business | Usaha Anda | Doanh nghiệp |
| `home.tabs.posts` | Create your posts | Buat postingan | Tạo bài đăng |

### Captions follow the business automatically

2.4 shows "Your business details changed since these posts were made." with
an "Update captions" button on each out-of-date batch, and rewrites nothing
until the owner taps it. The owner's rule for this item: an edit on "Your
business" brings the posts back in sync without a tap, captions only.

- **When**: whenever "Create your posts" is showing and the **newest batch**
  has at least one post that is out of date (2.4's rule: its `profileHash`
  isn't the profile's) and not edited by the owner, and nothing is being
  made for posts (no plan, rewrite or images running or resuming). That
  covers opening the tab, opening the app (it lands on the tab), and a
  change that arrives while the tab is showing, such as the essence search's
  answer, or a plan or images finishing.
- **What**: one `POST /api/posts/rewrite` with those posts only, as "Update
  captions" sent in 2.4. Their caption, hashtags and alt text are replaced;
  images stay (the roadmap's rule: "Brand-panel edits re-run captions only;
  images change only when the owner taps regenerate"). Several edits made
  before the tab opens make one rewrite, not one each.
- **Edited posts are kept** as the owner wrote them, with 2.4's "Rewrite
  this one too" on each out-of-date edited post of the newest batch.
- **Older batches** are never rewritten: they are probably posted already.
  They show no "details changed" line, no "Update captions" and no "Rewrite
  this one too". Their "Check before posting:" flags still follow the
  current profile, with no call, as in 2.4.
- **While it runs**: the newest batch shows the line "Updating your captions
  to match your business…" above its cards, with today's "Keep this page
  open…" line, and the posts' buttons are disabled as for any rewrite.
- **If it fails** (offline beyond 2.4's resume, the day's limit, a timeout):
  2.4's error line shows, and the newest batch shows 2.4's "Your business
  details changed…" line with the "Update captions" button, so "Try again"
  has something to tap. There is **no automatic retry** until the tab is
  opened again: a tap on the other tab and back, or the app opening again.
  Never a loop.
- A WhatsApp-only edit changes no `profileHash` (the number is not in what
  the model sees) and so starts no rewrite; it still updates every call to
  action with no model call, as today.
- Cost: one text-model request from the app's daily Gemini pool per
  automatic update, as one tap on "Update captions" cost before.

New strings:

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `posts.updating` | Updating your captions to match your business… | Memperbarui keterangan agar sesuai dengan usaha Anda… | Đang cập nhật chú thích cho khớp với doanh nghiệp của bạn… |

### The language switch at the top right

The row of three language names at the bottom of every screen
(`platform/i18n`, "The switch") becomes three short codes at the **top
right** of the header, on the home screen and on `/enter`, as in the
mockup's option F. Full names don't fit beside the logo and the spa's name
at 360px ("Bahasa Indonesia" is the widest).

- Order: **EN · VI · ID**, for English, Tiếng Việt and Bahasa Indonesia.
  This is display order only; `LOCALES` and the phone-language rules don't
  change.
- One bordered group (1px `edge`, the control radius), three equal targets,
  each at least 44px high and 40px wide, 12 to 13px text, weight 500.
- **The current language** is filled with `accent`, its code in
  `on-accent`, with `aria-current="true"`; it does nothing when tapped. The
  others are `ink-secondary` on the page background.
- Each code has its language's full name from `LOCALE_NAMES` as its
  accessible name and tooltip (`aria-label`, `title`), and `lang` set to the
  language, so a screen reader says "Tiếng Việt", never "V I". The group
  keeps its accessible name, "Language".
- On the home screen the header is: logo on the left; on the right, the
  codes, then the spa's name pill. On `/enter` (no one signed in yet): logo
  on the left, codes on the right.
- No horizontal scroll at 320px wide in any language. Where the row is too
  narrow, the name pill shortens with an ellipsis; the codes never shrink
  below their targets.
- Everything else in `platform/i18n` holds: a plain form post that works
  without JavaScript, the same cookie, the owner sent back to the same
  screen.
- The bottom row is removed from both screens. The footer lines ("Signed in
  on this phone for 30 days.", the `/enter` footer) stay at the bottom.

### Leftovers from 2.4's final review

Three of the minors listed in PR #18, each its own commit:

1. **"Edit" no longer waits for images.** Today every post's "Edit" is
   disabled while any image is being made, so after "Make my posts" the
   owner waits for all six. From now on "Edit" (and its "Save") is disabled
   only while a text step runs or resumes (a plan or a rewrite), since only
   those replace the words. An edit saved while images are made keeps both:
   the owner's words and the new image, with 2.4's `altToCheck` set by an
   image that lands after the edit. "Make my posts", "Update captions",
   "Rewrite this one too" and "New image" keep 2.4's rules.
2. **File names use the phone's date.** `imageFileName` takes the batch's
   date in the phone's own time zone, not the first ten characters of its UTC
   timestamp. A batch made at 6:30 in Da Nang (23:30 UTC the day before) is
   saved as `sen-2026-10-26-1-post.jpg`, not `…-2026-10-25-…`.
3. **Hashtags keep Vietnamese and other letters.** `cleanHashtags` (2.2's
   rule, used for the model's tags and the owner's) keeps any letter, its
   accents and any digit, not only `a-z0-9`: text is normalised to NFC, lower
   cased, and everything but letters (`\p{L}`), combining marks (`\p{M}`) and
   digits (`\p{N}`) is dropped. `#ĐàNẵng` becomes `đànẵng`; `#da-nang` still
   becomes `danang`. No duplicates, at most 5, as before.

### The roadmap

- This item becomes **2.5 `platform/home-tabs`**. Reviews move to 2.6,
  usage counters to 2.7 and the owner guide to 2.8. The PR that ships it
  marks 2.5 `done`.
- Number references in the other specs (`2.5 reviews`, `2.6 usage
  counters`, `2.7 owner guide`) are updated to the new numbers. Plans and
  journals are records of what happened and keep their numbers.
- `platform/i18n`'s "The switch" gets a one-line note pointing here for the
  switch's new place and form.

### Tests

- Vitest:
  - which tab opens: a pure rule from (business saved, how it got there:
    loaded, first read, re-read) to tab, and no tabs while reading or empty;
  - which posts the automatic update sends: the newest batch's out-of-date
    unedited posts only; none when every out-of-date post is edited, when
    only an older batch is out of date, or when only the WhatsApp number
    changed;
  - the home screen (Testing Library): no tablist before a read; after a
    first read, "Your business" selected; mounted with a saved brand,
    "Create your posts" selected; switching tabs keeps a running posts
    request alive; a failed automatic update shows "Update captions" and
    doesn't send again until the tab is reopened;
  - "Edit" enabled while images are made, disabled during a rewrite;
  - `imageFileName` with a time zone set (`TZ`), across midnight;
  - `cleanHashtags` with Vietnamese and Indonesian tags, accents in NFD
    form, and the old cases;
  - the language switch: order EN, VI, ID; accessible names; the current one
    marked.
- Playwright at the phone viewport, routes mocked: a saved brand opens on
  "Create your posts"; a first read lands on "Your business" with both tabs;
  "Re-read my website" hides the tabs until it ends; edit the summary on
  "Your business", tap "Create your posts", and see one rewrite request
  holding the unedited posts with no tap; tap "VI" at the top right and see
  the screen in Vietnamese; no horizontal scroll at 320px in Vietnamese.
  Existing tests that reach "Your posts" tap the tab first.

## Acceptance criteria

```gherkin
Scenario: No tabs before a business is saved
  Given no business is saved on the phone
  When the owner opens the app
  Then the website field shows
  And there is no tab row

Scenario: The first read lands on "Your business"
  Given no business is saved on the phone
  When the owner reads their website and the read finishes
  Then the tab row shows "Your business" and "Create your posts"
  And "Your business" is open

Scenario: Every later open lands on "Create your posts"
  Given a business is saved on the phone
  And the owner last had "Your business" open
  When the owner opens the app again
  Then "Create your posts" is open

Scenario: No tabs during a re-read
  Given a business is saved and "Your business" is open
  When the owner taps "Re-read my website"
  Then the tab row is hidden while the reading screen shows
  And when the read finishes, "Your business" is open with the tab row

Scenario: Switching tabs doesn't stop posts
  Given posts are being made on "Create your posts"
  When the owner opens "Your business" and comes back
  Then the posts are still being made, or are finished

Scenario: Captions follow a business edit without a tap
  Given the newest batch has six posts, two of them edited by the owner
  When the owner edits the summary on "Your business"
  And opens "Create your posts"
  Then one rewrite request holds the four unedited posts
  And the two edited captions stay as the owner wrote them
  And "Updating your captions to match your business…" shows while it runs

Scenario: Older batches are left alone
  Given two batches, the older one out of date
  And the newest batch up to date
  When the owner opens "Create your posts"
  Then no rewrite request is sent
  And the older batch shows no "Update captions"

Scenario: A WhatsApp edit doesn't rewrite
  Given the newest batch is up to date
  When the owner changes only the WhatsApp number and opens "Create your posts"
  Then no rewrite request is sent
  And every call to action shows the new number

Scenario: A failed update waits for the owner
  Given the automatic update fails with the day's limit reached
  Then the error line and "Update captions" show
  And no new request is sent until the owner opens the tab again or taps "Update captions"

Scenario: The language switch at the top right
  Given the owner is on the home screen in English
  Then the header shows EN, VI and ID in that order, EN marked as current
  When the owner taps VI
  Then the same screen shows in Vietnamese
  And there is no language row at the bottom of the screen

Scenario: Edit while images are made
  Given a new batch's images are being made
  Then each post's "Edit" can be tapped

Scenario: File name in the phone's date
  Given the phone is in Asia/Ho_Chi_Minh
  And a batch was made at 2026-10-25T23:30:00Z
  When the owner saves post 1's image
  Then the file is named "sen-2026-10-26-1-post.jpg"

Scenario: Vietnamese hashtags keep their letters
  When the owner saves hashtags "#ĐàNẵng #massage"
  Then the post's hashtags are "đànẵng" and "massage"
```

## Known limits

- An owner who makes posts before the essence search has answered gets one
  automatic rewrite when the answer lands (the essence is part of what the
  model sees). It costs one request from the daily pool, as tapping "Update
  captions" would have.
- The codes "VI" and "ID" are short forms an owner may not know at first;
  each one's full name is its accessible name and tooltip, and the current
  one is always marked, so a wrong tap is undone with one more.
- The tab picked is lost on reload by design.
- Tab labels and the new line in Indonesian and Vietnamese are the
  developer's; the owners read them back during the pilot.

## Out of scope

- The third tab, review replies: 2.6 `reviews/reply-drafts` adds it to this
  row.
- Rewriting images after a business edit: never automatic (roadmap rule).
- Remembering the last tab, sticky tabs, a bottom tab bar.
- The other minors from 2.4's review (the image-description reminder after a
  resumed image, "Edited" cleared on a dropped rewrite answer, the translate
  client's failure paths, the v4 upgrade reading images at once,
  `profileHash` recomputed on every render): later, when they bite.
- Usage counters and the usage bar: 2.7 `platform/usage-counters`.
