---
title: "Brand panel"
description: "The home screen reads the owner's website, streams the brand profile into an editable panel, keeps it on the phone in IndexedDB, and offers \"Re-read my website\" and \"Forget this business\", in English, Indonesian and Vietnamese."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-24T16:33:59Z }
date: "2026-10-24"
---

# Brand panel

## Goal

1.1 (`brand/extract-site`) built the reader: `POST /api/brand/read` streams a
checked brand profile, but nothing on screen uses it. The home page still
shows a read-only "Coming soon" website field.

This spec makes that field work. Sen's owner pastes `sendanangmassage.com`,
taps once, and within about 20 seconds sees what Shopfront understood: name,
what they offer, where, WhatsApp, colours, logo, the visual style and the
essence. Every fact says which page of her site it came from. Anything wrong
or missing she fixes in a tap or two. The profile stays on her phone, so next
time it is already there, and she can read her site again or forget the
business.

The Global Plan calls this panel "the trust moment and the biggest quality
lever": every post, story and review reply (phase 2) is written from what the
panel holds, so the owner must be able to see it and correct it before
anything is made from it.

Why now: it is the first screen that starts a run, so it also builds the run
record and resume from decision 0005, which phase 2 extends with more steps.

## Behaviour

### What this spec ships, and what it doesn't

- The home screen's three states: no business yet, reading, and the panel.
- The brand panel: every profile field shown with its source, and editable.
- The brand store on the phone (IndexedDB) and the run record of decision
  0005, with one step: the brand read.
- "Re-read my website" and "Forget this business".
- Every visible string about the read and the panel, in `en.json`, `id.json`
  and `vi.json`, including a message for each of 1.1's error codes.

No server change: the route, the profile schema's shape and the prompt from
1.1 stay as they are. No posts, no usage bar (2.8), no owner guide (its own
spec).

### One business per owner, per phone

The pilot has one passphrase per spa, and the session knows its owner id
(`lib/pilot`). The phone keeps at most one business per owner id, keyed by
that id. If a second owner signs in on the same phone, they see their own
empty home, not the first owner's brand. (My call: owners don't share phones
in the pilot, but keying by owner costs nothing and avoids showing one spa's
data to another.)

### The home screen

`/` stays the only screen. It has three states.

**1. No business yet.** The header, the welcome line, then:

- The "Your website" field, now live: a URL input (`inputmode="url"`,
  `autocomplete="url"`), placeholder `yourspa.com`.
- A primary button, "Read my website".
- One line under it: "We read a few pages and your photos. It takes about
  20 seconds."
- The language switch and "Signed in on this phone for 30 days", as today.

Tapping the button with an empty field does nothing but focus the field. The
browser does no URL validation of its own beyond "not empty"; the route
cleans and checks the URL and answers `invalid_url` (1.1).

**2. Reading.** The field and button are replaced by:

- The site's address, and a line "Reading your website…" with a progress
  animation (no percentage: the read has no measurable progress).
- "Keep this page open for about 20 seconds." (decision 0005, "Telling the
  owner", applied to the brand read).
- The panel below, filling in as `partial` lines arrive. Sections with no
  value yet show a placeholder shape, not empty labels. Nothing can be edited
  while reading.
- A "Stop" text button: it aborts the request and goes back to state 1 (or,
  during a re-read, to the saved panel). A stopped read has already counted
  against the model's free quota; the button doesn't say so (the usage bar,
  2.8, will).

The app holds a screen wake lock from the tap until the read ends, and asks
again when the page becomes visible (decision 0005). A refused lock is
ignored.

**3. The panel.** When the `final` line arrives, the profile is saved on the
phone and the panel becomes editable. On later visits the home opens straight
on the panel, read from the phone, with no request to the server.

A line above the panel: "This is what we understood about {name}. Fix
anything that's wrong: your posts are written from it." Posts aren't built
yet; until 2.2 a muted line at the end says "Your posts are coming soon."

### The panel

Five sections, in this order. Each is a card with a title and an "Edit"
button; the card shows the values, the edit opens a form for that section
only. Labels are in the owner's language; the profile's content is in
English (1.1 writes it in English, and captions are in English).

| Section | Fields shown |
|---|---|
| Your business | `name`, `summary`, `category`, `offerings` (name, price, duration, description), `highlights` |
| Where and when | `location.town`, `area`, `address`, `serviceArea`, `hours` |
| How people reach you | `contact.whatsapp`, `phone`, `email`, `instagram`, `bookingUrl` |
| Your look | `logoUrl`, `colours` (swatches with their role), `visualStyle` (summary, then palette, light, textures, mood), `photoUrls` (thumbnails) |
| Your feeling | `essence.promise`, `feeling`, `moments`, `placeSymbols`, `senses`, and `tone` |

Not shown: `schemaVersion`, `pagesRead`, `promptVersion`, `dropped`,
`readAt` (shown only as "Last read", below), `siteUrl` (shown in the footer).

**Sources.** Under each sourced fact, a small muted link "from /contact": the
source URL's path (or "from your home page" for `/`), opening the page in a
new tab. Facts with `source: "model"` say "our guess from your photos" for
colours and style, and "our suggestion" for the essence's `feeling`,
`placeSymbols` and `senses`, which 1.1 marks as interpretation. A value the
owner typed says "added by you". This is how the owner tells what the site
says from what the app guessed.

**Empty fields.** An empty field (`null` or an empty list) is shown as a muted
"Not found on your site" with an "Add" link that opens its section's form.
Two empty fields get a warning instead, because phase 2 needs them:

- `contact.whatsapp`: "Add your WhatsApp number: every post ends with it."
- `location.town`: "Add your town: posts and hashtags use it."

**Thin sites.** When `thin` is true, a notice at the top of the panel: "We
couldn't read much from your website. Fill in what's missing so your posts
are right." The panel is otherwise the same.

**Footer.** Below the sections: the website address, "Last read {relative
time}" (for example "Last read 3 days ago", from `readAt`, with
`Intl.RelativeTimeFormat` in the screen's language), then "Re-read my
website" and "Forget this business".

### Editing

- "Edit" opens the section's form in a bottom sheet (a shadcn/ui dialog
  styled as a sheet, decision 0007), with "Save" and "Cancel". Cancel, the
  back gesture and a tap outside close the form at once if nothing changed,
  and ask "Discard your changes?" first if something did.
- The forms validate with the same zod schema as the profile (Global Plan,
  "One schema, three uses"): the word and item limits of 1.1 (`LIMITS`) are
  shown as hints ("Up to 25 words") and checked on Save, with a message under
  the field.
- **WhatsApp and phone** are saved in E.164 with `libphonenumber-js`, as 1.1
  does. A number typed without `+` takes the country of the profile's other
  number, else of the town's country when the town is in Vietnam or
  Indonesia, else the owner is asked to start with the country code.
- **Instagram** is saved without a leading `@` or URL; a pasted profile link
  is reduced to its handle.
- **Email** and **booking link** must be valid; a booking link without
  `https://` gets it.
- **Lists** (offerings, highlights, tone, moments, place symbols, senses,
  feeling) have add, remove and reorder (up and down buttons, not drag: it is
  reliable with a thumb and with a screen reader). Short lists of words
  (tone, feeling, place symbols, senses) are chips with an "Add" field.
- **Colours** use the native colour input plus a hex field; each has a role
  picked from 1.1's four. At least one colour stays.
- **Logo and photos** can be removed, not replaced: uploading images is out
  of scope. A removed logo becomes `null`.
- **Visual style** is editable as text, all five parts; clearing all of them
  sets it to `null`.
- **Name** can't be emptied: the schema requires it.
- A hint at the top of every form: "Write in English: your posts are in
  English."

**What an edit changes.** A field the owner changed gets `source: "owner"`;
an unchanged field keeps its source. "owner" joins 1.1's page URLs and
`"model"` as a source value. The profile keeps `schemaVersion: 1`: the shape
doesn't change, and `source` is already free text (`lib/brand/profile.ts`
gains a constant and a comment, not a field). Later specs treat an `"owner"`
fact as a fact, like one from a page. Removing an item from a list is not an
edit of the other items.

Save writes the whole profile to the phone at once; there is no draft state
between Save and the store.

### Stored on the phone

One IndexedDB database, `shopfront`, through a small wrapper the builder
picks and pins (or plain IndexedDB), with two object stores:

| Store | Key | Value |
|---|---|---|
| `brands` | owner id | `{ ownerId, profile, savedAt }`, where `profile` passes `profileSchema` |
| `runs` | run id | The run record (below) |

- The profile is saved only from a `final` line or a Save; partial lines are
  shown, never stored (decision 0005).
- A stored profile that fails `profileSchema` on load (a later schema
  version, a corrupted record) is not shown: the home opens on state 1 with a
  notice "We couldn't open your saved business. Read your website again."
  and the bad record is deleted when the new read is saved.
- After the first save, the app calls `navigator.storage.persist()` once, so
  the browser is less likely to clear the store; a refusal is ignored.
- If IndexedDB is unavailable (some private modes), reading still works and
  the panel is shown, with a notice "This browser won't keep your business:
  you'll need to read your site again next time." Edits then live in memory
  only.

### The run record and resume

Decision 0005's run record, built here with one step.

- Tapping "Read my website" (or confirming a re-read) creates a run
  `{ id, ownerId, kind: "brand-read", url, startedAt, steps: [{ name:
  "brand", status, output? }] }` with the step `running`, then posts to
  `/api/brand/read`.
- On `final`, the step becomes `done` with the profile as its output, the
  profile is saved in `brands`, and the run is deleted. On an `error` line or
  error answer, the step becomes `failed` and the run is deleted after its
  message is shown. (My call: with one step there is nothing to keep once it
  ends; 2.2 keeps runs with done steps while later steps are pending.)
- **Resume.** When the page loads or becomes visible, the app looks for this
  owner's unfinished run. A `running` step whose request is no longer alive
  (no request from this page load, or a request that ended without a `final`
  or `error` line) goes back to `pending` and is requested again, with no
  confirmation. A `done` step is never requested again.
- An interrupted re-read resumes as a re-read: the owner already confirmed
  it.
- A dropped connection mid-read therefore costs one extra read; the panel
  shows "Reading your website…" again, without any warning.

### Re-read my website

Rebuilds the profile from the stored `siteUrl` (Global Plan, "Re-read my
website").

- If any field has `source: "owner"`, a confirmation first: "Read your
  website again? Your {count} changes will be replaced by what your site
  says now." with "Read again" and "Cancel". Without owner edits, it starts
  at once.
- During the re-read the screen is in state 2, filling a fresh panel; the
  saved profile stays in the store untouched until the new `final` arrives
  and replaces it.
- If the re-read fails or is stopped, the saved profile is shown again,
  unchanged, with the error's message above it.
- To read a different website, the owner forgets the business first. (My
  call: in the pilot a spa's website doesn't change address; an "edit
  address" field would add a third flow for a case no pilot owner has.)

### Forget this business

Deletes everything stored on the phone for that owner (Global Plan, "Forget
this business"): the `brands` record and any run. A confirmation first:
"Forget {name}? This deletes everything Shopfront keeps on this phone for
your business. You can read your website again any time." with "Forget"
(destructive style) and "Cancel". Afterwards the home is in state 1, with the
website field empty. The owner stays signed in. Nothing is deleted on the
server, because nothing is stored there.

### Errors

Each of 1.1's error codes, and two failures of the browser's own, get a
message shown above the website field (state 1) or the panel (during a
re-read), with the field kept as typed:

| Code | Message (English) |
|---|---|
| `invalid_url` | "That doesn't look like a website address. Check it and try again." |
| `blocked_address` | "We can't read that address. Use your website's public link." |
| `unreachable` | "We couldn't open your website. Check the address, or try again in a few minutes." |
| `robots_disallowed` | "Your website asks apps not to read it, so we can't. Contact us and we'll help you set up." |
| `model_busy` | "Shopfront has used today's free reading. Try again tomorrow." |
| `model_timeout` | "Reading your website took too long. Try again." |
| `model_failed` | "Something went wrong while reading your website. Try again." |
| offline, or the connection dropped with no line | "You're offline. We'll carry on when you're back." (and resume, above) |
| `401` from the gate | No message: the app goes to `/enter` |

The builder may sharpen the wording; the three languages say the same thing.
`robots_disallowed` has no way forward in this spec, see Known limits.

### Accessibility and layout

- Phone first, the scaffold's width and tokens (decision 0007); the panel
  scrolls as one page, the footer actions at its end, not floating.
- The reading state announces "Reading your website" and, at the end, "Done:
  check what we understood" through a polite live region; partial updates are
  not announced one by one.
- Every Edit button names its section for screen readers ("Edit Contact").
- Sources and empty-field warnings are text, not colour alone.

### Code layout (the builder may adjust)

- `lib/brand/store.ts`: the IndexedDB stores, load, save, forget.
- `lib/runs/run-record.ts`: the run record and the resume rule, free of React
  so it is unit-tested on its own.
- `lib/brand/edit.ts`: applying a section's form values to a profile
  (sources set to `"owner"`, numbers to E.164, handles cleaned).
- `components/brand/`: the panel, its sections, the forms and the reading
  state. The home page stays a Server Component that checks the owner and
  hands the owner id and messages to a client component.
- New shadcn/ui components as needed (dialog/sheet, alert dialog), added the
  shadcn way into `components/ui/`.

## Acceptance criteria

```gherkin
Scenario: A first read fills the panel and stays on the phone
  Given Sen's owner is signed in with no business saved
  And the brand read answers with Sen's recorded stream
  When she types "sendanangmassage.com" and taps "Read my website"
  Then she sees "Reading your website…" and the panel filling before the final line
  And when the final line arrives the panel shows Sen's name, town and WhatsApp number
  And after a reload the panel is shown with no request to /api/brand/read

Scenario: Every fact shows where it came from
  Given a saved profile whose WhatsApp source is "https://sendanangmassage.com/contact"
  When the panel is shown
  Then the WhatsApp number reads "from /contact" with a link to that page
  And the visual style reads "our guess from your photos"

Scenario: An edit is saved and marked as the owner's
  Given a saved profile
  When the owner edits the hours to "9am to midnight" and taps Save
  Then the hours show "9am to midnight" and "added by you"
  And after a reload the stored profile's hours have source "owner"
  And the stored profile passes the profile schema

Scenario: A WhatsApp number typed without a country code
  Given a saved profile whose phone is "+84905123456"
  When the owner sets WhatsApp to "0905 111 222" and saves
  Then the stored WhatsApp is "+84905111222"

Scenario: A form refuses what the schema refuses
  When the owner writes a 30-word summary and taps Save
  Then the form stays open with a message that the summary is too long
  And the stored profile is unchanged

Scenario: Missing WhatsApp is called out
  Given a saved profile with no WhatsApp number
  When the panel is shown
  Then it warns that every post ends with the WhatsApp number, with a way to add it

Scenario: A thin site asks the owner to fill the gaps
  Given the brand read returns a profile with thin true
  When the read finishes
  Then the panel shows the "couldn't read much" notice

Scenario: Re-reading warns before replacing edits
  Given a saved profile with 2 fields edited by the owner
  When the owner taps "Re-read my website"
  Then she is asked to confirm that 2 changes will be replaced
  And when she cancels, no request is made

Scenario: A failed re-read keeps the saved profile
  Given a saved profile
  When a re-read ends with an error line "model_busy"
  Then the saved profile is shown unchanged
  And the message for model_busy is shown above it

Scenario: Forget this business
  Given a saved profile and an unfinished run
  When the owner taps "Forget this business" and confirms
  Then the brands store and the runs store hold nothing for this owner
  And the home shows the empty website field
  And the owner is still signed in

Scenario: A read interrupted by the page going away resumes once
  Given a read is running
  When the page is reloaded before the final line
  Then the read is requested again exactly once
  And the panel fills and is saved as usual

Scenario: A finished step is never requested again
  Given a run record whose brand step is done
  When the resume rule runs
  Then no request is made for that step

Scenario: Each error code has a message in every language
  When the messages for invalid_url, blocked_address, unreachable, robots_disallowed, model_busy, model_timeout and model_failed are looked up in en, id and vi
  Then each one exists and is not empty

Scenario: Another owner on the same phone sees their own home
  Given Sen's profile is saved on the phone
  When Svarga's owner signs in on that phone
  Then the home shows the empty website field

Scenario: An unreadable saved profile is not shown
  Given a stored record that fails the profile schema
  When the home loads
  Then it shows the empty website field and the "couldn't open your saved business" notice
```

Unit tests (Vitest, jsdom, with `fake-indexeddb` or the wrapper's own test
double, the builder's call) cover: the store (save, load, forget, owner
keys, an invalid record), the run record and resume rule, `lib/brand/edit.ts`
(sources, E.164, Instagram handles, booking links, limits), the error-code
messages, the relative "Last read" time, and the panel rendering a partial
profile without crashing on missing fields.

Playwright tests at the phone viewport serve `/api/brand/read` from a saved
NDJSON stream (built from 1.1's recorded fixtures for Sen), never the real
route: first read, edit and reload, re-read with edits, forget, reload mid-read
resume, and one error. CI calls no model and no website.

## Known limits

- **Safari may clear the phone's store.** Safari deletes a site's script
  storage after about 7 days without a visit, unless the site was added to
  the home screen; `persist()` helps on Chrome and Firefox, less on Safari.
  The owner then reads her site again and loses her edits. The owner guide
  will recommend adding Shopfront to the home screen.
- **Edits live on one phone.** No account, no sync (decision 0001): a second
  phone starts empty.
- **No way forward after `robots_disallowed`.** The owner can't type her
  business in by hand without a read. The pilot sites allow reading; a
  manual start is added if an owner hits this.
- **Every read and re-read spends free quota** (about 20 Flash requests a day
  for the whole app, decision 0003), and nothing counts or limits them until
  2.8. A stopped or interrupted read is still spent.
- **Profile content is English.** Labels follow the owner's language; the
  facts and the essence stay as 1.1 wrote them. Owners who edit in another
  language get that language in their captions; the form hint asks for
  English, nothing enforces it.
- **Photos and the logo are hot-linked** from the owner's site. If the site
  moves them, the panel shows a broken image until the next re-read.
- **No image upload.** The owner can remove the logo or a photo, not add one.

## Out of scope

- The post plan, the feed preview, and re-running captions after an edit:
  2.2 `posts/generate-copy` and the specs after it.
- The usage bar and counters, including what a re-read costs today: 2.8
  `platform/usage-counters`.
- The owner guide, including adding Shopfront to the home screen and staying
  on the page during a read: `guide/owner-guide`.
- Changing the website address without forgetting the business.
- Entering a business by hand, without a website.
- Enriching the essence from what people search for: 1.3
  `brand/search-essence`.
- Instagram data in the panel: phase 3.
- Uploading a logo or photos.
