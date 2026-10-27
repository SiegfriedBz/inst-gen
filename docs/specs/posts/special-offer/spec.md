---
title: "Special offer"
description: "On 'Create Posts', the owner can add today's special offer in a few taps (a percentage off, or a free treatment with a paid one, always on 90-minute sessions or longer, until a set day); two of the six suggestions then carry it in their text, with a badge on their tiles, and code checks the captions keep to it."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-27T15:33:16Z }
date: "2026-10-27"
---

# Special offer

## Goal

Spas run offers: 10% off a 90-minute massage this week, a free foot massage
with any 90-minute treatment. Today the six suggestions can't say so: the
model only writes facts the site holds, and code flags any price it can't
find there. An owner who wants an offer post has to rewrite a caption by
hand, which is the work Shopfront is meant to save.

This item lets the owner tell Shopfront about today's offer in a few taps,
before making the suggestions. Two of the six then carry the offer in their
text, and the owner can see which two at a glance.

It has to stay **very easy**: one optional button, answers ready by default,
taps rather than typing. It is built before the pilot (roadmap 2.11), so Sen
and Svarga have it from day one.

## Behaviour

### The button

- "Create Posts" gets one optional button above "Make 6 suggestions":
  **"+ Special offer"**. Without an offer, everything works as today.
- Once an offer is set, the button becomes **the offer's line**, for example
  "10% off · 2 treatments · until Tue 27 Oct", with an "✕" to remove it.
  Tapping the line reopens the sheet with the offer's answers.
- The offer applies to the **next** "Make 6 suggestions" or "Make 6 new
  suggestions". Suggestions already on screen don't change when the offer is
  added, changed or removed.

### The sheet

A bottom sheet, like the post sheet and the business forms, with three
questions. Questions 1 and 3 have a ready answer; question 2 needs one tap.

1. **What kind of offer?** Two choices, "A discount" ticked by default:
   - **A discount:** chips "10%", "15%", "20%" (10% ticked), and "Other %",
     a box that takes **digits only**, 1 to 90. There is no free text: a money
     amount ("100k off", "$10 off") can't be entered at all, so nothing is ever
     refused or explained.
   - **A free extra:** "Free ___ with a 90-minute session". The owner fills
     the blank by **tapping one of their own treatments**, never by typing.
2. **On which treatments?** The treatments of "Your business", by name, none
   ticked. The owner ticks the ones the offer is on; at least one is needed
   for "Done". One line under the list: "The offer is on 90-minute sessions or
   longer." The owner ticks only the treatments they sell at 90 minutes or
   more.
   - The sheet never uses the durations saved in the profile, and never
     changes them: the site reader keeps one duration per treatment, usually
     the shortest (Sen's and Svarga's sites list 60, 90 and 120-minute
     sessions; their profiles say "60 min").
   - For a free extra, the free treatment isn't in this list's count: it is
     the gift, not what's paid for.
3. **Until when?** Chips "Today" (default), "3 days", "1 week". The line under
   the chips shows the last day as a date in the screen's language ("until
   Tue 27 Oct"), from the phone's calendar: "Today" ends today, "3 days" ends
   two days later, "1 week" six days later. A day ends at midnight in the
   owner's own time zone, the phone's, wherever the spa is.

When the business has **no treatment at all**, the sheet shows one line, "Add
your treatments on Your business first.", with a button that opens that form
(as "+ Phone" does in `platform/friendlier-home`), and no "Done".

The 90-minute minimum is **a fixed rule**, not a setting.

### What the model gets

- The plan request (`POST /api/posts/plan`) gains an optional `offer`:
  - its kind, `discount` with the `percent`, or `freeExtra` with the free
    treatment's name;
  - the ticked treatments' names;
  - the last day, as code writes it in English ("Tuesday 27 October").
- The route checks it with Zod: percent an integer 1 to 90; every name among
  the profile's treatments; at least one ticked. A request that fails gets
  400, as for any bad body.
- The offer goes to the **same single request** as the six posts: no extra
  model call, no extra count against the day's limits.
- The prompt (version bumped to `posts-3`) says, only when an offer is given:
  - the 2 `offer` posts carry the offer; they still each lead on one
    treatment, now one of the ticked ones, and on two different ones when two
    or more are ticked. The other four never mention a discount, a free
    treatment or a deadline;
  - each offer post states the offer **as given**: the same percentage or the
    same free treatment, "90-minute" with the treatment, and "until" with the
    last day as given. Never a bigger discount, never new terms, never a
    price, never "today only" or "this week";
  Without an offer, the prompt is today's `posts-2` rules, and `offer` posts
  stay as today: a treatment with its price and duration, no badge.
- Rewrites (`POST /api/posts/rewrite`, after a business edit) send the
  batch's offer too, with the same rules, so a rewritten offer post keeps its
  offer.

### Code's checks

`findFlags` learns the batch's offer, and gains one new flag kind, `offer`.
In a batch **without** an offer, nothing changes.

In a batch with an offer:

- In an offer post, the offer's percentage, the free treatment's name and
  "90 minutes" ("90-minute", "90 min") are known facts: never flagged.
- A percentage from 1% to 90% that isn't the offer's, in any post, or the
  offer's percentage in a post that doesn't carry the offer, is flagged
  `offer`, shown as 2.6's other warnings are ("Check the text"). "100%" is
  never flagged, so "100% natural oils" stays fine.
- An offer post whose caption doesn't name the last day is flagged `offer`.
  The day matches when the caption has the day number with the month, full
  or short ("28 October", "28 Oct"), with or without the weekday, in any case.
- Prices with a currency stay flagged as today: the offer never adds one.

### Which posts carry it

- Each post gets an optional `offer: true`, set by code, in a batch with an
  offer, on its `offer`-type posts: at most 2. If the model returns more than
  2, code keeps the first 2 as carrying it and the plan's mix check records
  the extra ones, as it records any type used more than twice today. If it
  returns 0 or 1, the badge shows on those it returned, and the mix check
  records "fewer than 2 offer posts", as today.
- The batch keeps the offer it was made with (`offer`, optional), so the
  badge, rewrites and checks know it after the sheet's answers change.
- **The badge:** each tile that carries the offer shows a small badge in its
  top corner, in the accent colour: "10% off", or "Free extra". The opened
  post shows the same badge above the caption, with "until Tue 27 Oct" beside
  it. The badge is the app's: it is never on the downloaded images, and
  "Copy the text" copies only the caption, hashtags and call to action, as
  today.
- **Images are unchanged:** the offer never reaches the image prompt, and
  images show massage scenes as today.

### How long it lasts

- The offer's answers are kept on the phone (IndexedDB) for the owner, until
  **midnight at the end of its last day, on the phone's clock**: "Today" lasts
  until midnight tonight in the owner's time zone, "3 days" until midnight on
  its third day. Then it goes, so an offer whose last day has passed never
  slips into a post.
- The daily reset (`platform/one-daily-reset`, mid-afternoon in Da Nang and
  Bali) clears the suggestions but not the offer: an offer set in the morning
  is still there for the afternoon's suggestions, and a 3-day offer is set
  once, not every day.
- The owner can remove it earlier with "✕".
- Every "Make 6 suggestions" or "Make 6 new suggestions" before its end uses
  the offer again.
- An app left open past midnight drops the offer as soon as the page shows
  again, before the owner can make suggestions with it.

### Languages

- Every new string (the button, the sheet, the line, the badge) is in
  `messages/en.json`, `id.json` and `vi.json`. Dates follow the screen's
  language.
- Captions stay in English, as every caption. The owner's-language view
  translates them as today, offer included.
- The owner guide (`guide/owner-guide`) is brought up to date with the app,
  in its three languages; see "The owner guide" below.

### The owner guide

The guide is brought up to date with the app and made easier to follow: the
everyday steps first, numbered where the owner does them in order, the
optional offer after them. Buttons, tabs and labels are named with the app's
own strings, as the guide does today (shown in bold here). Every other line
of the guide was checked against the app and stays as it is. English text:

- **Your business** becomes three numbered steps, then its two other lines:
  1. "Type your website and tap **Read my website**. Keep the page open for
     about a minute while Shopfront reads it; the screen stays on by itself."
  2. "Check what it found. Tap a section to see all of it, and **Edit** to
     fix or add anything."
  3. "At the top, Shopfront lists what it couldn't find: tap one to add it.
     You can make posts without them, but each one you add makes your posts
     more exact. If your WhatsApp number or your town is missing, a red line
     says so: tap it to add it. Every post ends with your WhatsApp, and the
     hashtags use your town."
- **Making your posts** keeps its lines in today's order, with one more
  after "Tap a suggestion to open it…": "A suggestion marked **Check the
  text** has something to look at before you post: open it to see what,
  like a price that isn't on your website, or an offer that doesn't match
  the one you set."
- **Making your posts** ends with the offer, as numbered steps:
  - "To put today's offer in your posts, tap **+ Special offer** before you
    make them:"
    1. "Pick a discount (10%, 15%, 20% or your own) or a free extra: a
       treatment you give with a 90-minute session."
    2. "Tick the treatments it's on. An offer is always on sessions of 90
       minutes or longer."
    3. "Pick until when: today, 3 days or 1 week. It ends at midnight on its
       last day, on your phone's clock."
    4. "Tap **Done**. Two of your next 6 suggestions tell the offer and are
       marked **10% off** (or **Free extra**); the other four don't."
  - "The offer stays above **Make 6 suggestions** until its last day ends.
    Tap it to change it, or ✕ to remove it. Suggestions already made keep
    what they say."
- **Your daily allowance**, the reset line gains: "Your special offer stays:
  it lasts until its own last day ends."
- **Languages**: the button is named by the code it shows in the screen's
  language (**EN**, **ID** or **VI**), not always "EN".

Indonesian and Vietnamese say the same, in the guide's tone. The printable
PDFs are made again with `pnpm guide:pdf`.

### Checked with the real model

The plan records one offer plan for `sen` and one for `svarga` with
`pnpm eval:posts --record` (2 Gemini requests from the app's daily pool),
after asking the person first and never on a pilot day. The tests replay
those recordings.

## Acceptance criteria

```gherkin
Scenario: No offer, nothing changes
  Given a saved business and no special offer
  When the owner taps "Make 6 suggestions"
  Then the plan request has no offer
  And no tile has a badge

Scenario: A 10% offer on one treatment
  Given a business with the treatments "Thai Massage" and "Foot Reflexology"
  When the owner taps "+ Special offer", ticks "Thai Massage" and taps "Done"
  Then the line reads "10% off · 1 treatment · until" and today's date
  And the next plan request carries a 10% discount on "Thai Massage", until today

Scenario: Nothing ticked, no Done
  Given the sheet is open
  When no treatment is ticked
  Then "Done" is disabled
  And the sheet says "The offer is on 90-minute sessions or longer."

Scenario: Two posts carry the offer
  Given a plan made with a 10% offer
  When the six suggestions show
  Then exactly 2 tiles have the badge "10% off"
  And opening one shows "10% off" and "until" with the last day above the caption

Scenario: A money amount can't be typed
  Given the sheet is open on "A discount"
  When the owner types "100k" in "Other %"
  Then the box holds "100"
  And "Done" stays disabled until the box holds 1 to 90

Scenario: A free extra
  Given a business with "Foot Reflexology" and "Thai Massage"
  When the owner picks "A free extra", taps "Foot Reflexology" as the gift, ticks "Thai Massage", then "Done"
  Then the line reads "Free Foot Reflexology · 1 treatment" and the last day
  And the badge on the offer posts reads "Free extra"

Scenario: The saved durations are left alone
  Given a business whose treatments all say "60 min"
  When the owner sets an offer on one of them
  Then the treatment can be ticked
  And "Your business" still says "60 min"

Scenario: No treatments
  Given a business with no treatments
  When the owner taps "+ Special offer"
  Then the sheet says "Add your treatments on Your business first."
  And there is no "Done"

Scenario: The end date is written as a date
  Given the phone's date is Sunday 25 October
  When the owner picks "3 days"
  Then the sheet shows "until Tue 27 Oct"
  And the plan request's last day is "Tuesday 27 October"

Scenario: A wrong percentage is flagged
  Given a 10% offer
  When a caption says "15% off"
  Then the post is flagged "Check the text"

Scenario: An offer in a plain post is flagged
  Given a 10% offer
  When a post without the offer says "10% off"
  Then that post is flagged "Check the text"

Scenario: 100% is never flagged
  Given a 10% offer
  When a caption says "100% natural oils"
  Then that phrase isn't flagged

Scenario: A missing last day is flagged
  Given a 10% offer until Tuesday 27 October
  When an offer post's caption says "until 27 Oct"
  Then it isn't flagged
  When another offer post's caption names no day
  Then that post is flagged "Check the text"

Scenario: Removing the offer
  Given an offer is set
  When the owner taps "✕" on its line
  Then the button reads "+ Special offer" again
  And the suggestions already on screen keep their badges

Scenario: A "Today" offer ends at midnight on the phone
  Given a "Today" offer set at 16:00 in Da Nang on Sunday 25 October
  When the phone's clock passes midnight
  Then the button reads "+ Special offer"

Scenario: The daily reset leaves the offer
  Given a "Today" offer set at 10:00 in Da Nang
  When the daily reset passes at 14:00
  Then the offer's line is still there
  And the next suggestions carry the offer

Scenario: A 3-day offer lasts its three days
  Given a "3 days" offer set on Sunday 25 October
  When the owner opens Create Posts on Tuesday 27 October
  Then the line reads "until Tue 27 Oct"
  When the phone's clock passes midnight that night
  Then the button reads "+ Special offer"

Scenario: The guide explains the offer
  Given the owner guide in English, Indonesian or Vietnamese
  Then its posts section names "+ Special offer", "Done" and "Check the text" as the app does
  And its language line names the code the language button shows

Scenario: A rewrite keeps the offer
  Given today's suggestions were made with a 10% offer
  When the owner edits the business and the captions are rewritten
  Then the rewrite request carries the 10% offer
  And the 2 offer posts still have the badge
```

## Known limits

- The model may still write an offer post loosely; code's checks catch a
  wrong percentage and a missing last day, not every wording. The owner reads
  each post before posting it, as today.
- Shopfront can't tell whether a ticked treatment is really sold at 90
  minutes: the owner's tick is trusted.
- The 90-minute rule is fixed for both pilot spas; another business would
  need it as a setting.
- Captions are in English; the offer reads in the owner's language only in
  the translated view.

## Out of scope

- Money amounts off ("100k off"), "buy one get one", and any free-text offer.
- Reading every session length from the site: the brand read keeps one
  duration per treatment, as today.
- An offer that changes the images, or text drawn on an image.
- Several offers at once, offers scheduled ahead, or an offer kept past the
  end of its last day.
- Offers in review replies.
