---
title: "Review reply drafts"
description: "A third home tab, 'Reviews': the owner pastes a Google Maps review and the guest's name, and gets two replies (short and warmer) in the guest's language, each with its translation in the owner's language, from one Flash-Lite call; only the current review is kept, until a new one or 3am."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-25T20:55:19Z }
date: "2026-10-25"
---

# Review reply drafts

## Goal

Sen (Da Nang) and Svarga (Bali) are new: they have no Google Maps reviews
yet. After a guest's visit, the owner checks Maps for a review. When one
comes, replying well is hard: the guest may write in English, Russian or
Korean, and the owner reads Vietnamese or Indonesian; a reply that argues,
promises or sounds like a template does more harm than no reply.

This item adds a third tab, **"Reviews"**: the owner **pastes the review and
the guest's name, taps one button, and gets two replies ready to paste in
Google Maps**, written in the guest's language, with everything translated
into the owner's own language so they know what they post. The pilot's rule
holds: "super easy to use", fewer buttons, fewer modes, nothing to learn, on
cheap and slow phones. No Google connection: the owner copies and pastes.

The owner chose the screen from the mockup
(https://claude.ai/artifact/HiB4qoNUE8YENrF4SWDhtt), option 2A: translations
always shown, nothing to tap.

## Behaviour

### The tabs

The home tab row (2.5, `platform/home-tabs`) gets a third tab, after the two
others: **Your business · Create Posts · Reviews**. It shows whenever the
other two do. The app still opens on the posts tab.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `home.tabs.posts` (changed) | Create Posts | Buat postingan | Tạo bài đăng |
| `home.tabs.reviews` | Reviews | Ulasan | Đánh giá |

Only the English posts label changes (the owner's call: three tabs need the
room). The three tabs fit at 320px in all three languages, without
horizontal scroll.

### The Reviews tab, empty

Top to bottom:

1. One line: "Got a new review on Google Maps? Copy it and paste it here. We
   write 2 replies in your guest's language."
2. **"Guest's name (optional)"**, a one-line field, at most 60 characters.
3. **"The review"**, a text box of about 7 lines, at most 4,000 characters
   (Google's review limit is about 4,000), pasted as is.
4. The button **"Write 2 replies"**, full width, disabled while the review is
   empty (after trimming).

The owner pastes the review only; the star rating isn't asked. The model
reads the mood from the words (builder's call: one fewer field).

### While the replies are written

The button reads "Writing your replies…", disabled, and under it "Keep this
page open for a few seconds." The two fields can't be edited meanwhile. A
call usually takes a few seconds; it is cut at 20 seconds (below).

### The Reviews tab, with replies

Top to bottom, as the mockup's 2A:

1. **The review**, in a muted box: a small heading "{name}'s review · in
   {language}" ("The review · in {language}" without a name), the review as
   pasted, then, under a thin line, **the review in the owner's language**.
2. When the review looks **abusive or fake**, a calm note: "This review may
   be abusive or fake. It can be better not to reply, or to report it in
   Google Maps. If you reply, keep it calm, like below."
3. Two cards, **"Short reply"** then **"Warmer reply"**. Each card, top to
   bottom: the reply as it will be pasted; under a thin line, **the reply in
   the owner's language**; the link **"Edit the text"**; the button **"Copy
   the text"** (filled, full width), with 2.4's "Copied" and its "Copy it
   from here." fallback.
4. One line: "In Google Maps: open the review, tap Reply and paste."
5. Two links, centred, one under the other: **"Write 2 other replies"** and
   **"Paste a new review"**.

**The owner's language** is the screen's language (EN, VI or ID, 2.1's
switch). **No translation is shown** when the review is already in it: a
Vietnamese guest at Sen gets no Vietnamese line under the review or the
replies, and an owner reading the app in English gets no English line under
an English review. `{language}` is the review's language named in the
screen's language ("English", "tiếng Nga", "bahasa Rusia"), by the browser's
`Intl.DisplayNames`, from the language code the model returns.

Switching the screen's language while replies are shown keeps them, and
their translations stay in the language they were made in (builder's call: a
new translation would spend a request). The next "Write 2 replies" or "Write
2 other replies" uses the new language.

### "Write 2 other replies"

Spends one more request for two new replies to the same review and name; they
**replace** the two shown (no stack, unlike 2.6's attempts). The call is told
the two replies the model last wrote, as it wrote them (with `{name}`, never
the guest's name, and without the owner's edits), so the new ones say it
differently. It is the same call as "Write 2 replies", in the screen's
language at that moment, and its whole answer (the review's language and
translation, the abusive flag, both replies) replaces the kept one; edits
made to the old replies go with them (builder's call after the builder
check). While it runs, the link reads "Writing your replies…" and the cards
stay.

### "Edit the text"

Opens 2.4's editor on that reply's text only: one text box, "Save" and
"Cancel", at most 4,000 characters. After a save, the card shows the edited
text, its translation line goes (it no longer matches; the owner wrote the
change themselves), and "Copy the text" copies the edited text. No new
request.

### "Paste a new review"

Clears the review, the name and both replies, and shows the empty tab. It
asks for no confirmation: the replies were for one review, and nothing else
is lost.

### Kept until a new review or 3am

A trip to Google Maps on a cheap phone can reload the app, so **only the
current review** is kept on the phone (IndexedDB, as the suggestions): the
name, the review, its language and translation, the abusive flag, the two
replies as the model wrote them (with `{name}`), their translations and the
owner's edits, the screen language they were made in, and when.

- It goes when the owner taps "Paste a new review", when a new "Write 2
  replies" succeeds (it replaces it), or at **3am on the phone's clock**
  (2.6's day, `lib/posts/day.ts`): on opening the tab after 3am, a review
  from before it is deleted and the tab is empty.
- What the owner types but hasn't sent isn't kept (builder's call).
- A failed request keeps the fields as typed and shows the error under the
  button; nothing kept is lost.
- The record belongs to the signed-in owner, like the brand and posts; it is
  never sent anywhere but the reply request.

### The replies

What the model is asked for, and what code makes sure of:

- **Language.** Both replies are in the language of the review. A review
  mixing languages gets the main one.
- **Shape.** Each reply thanks the guest by name and names one thing they
  liked; owns any complaint in one short, plain sentence, with no excuse;
  invites them back, warmly and briefly; 2 to 4 sentences. The **short**
  reply is plainer and shorter; the **warmer** one is more personal. No
  promise the owner hasn't made ("we've fixed the heating"), no discount, no
  argument, no "as we told you", no phone number, link or email, nothing a
  guest could take badly.
- **Abusive or fake** (insults, threats, a review about a visit that can't
  have happened): both replies stay polite, neutral and short, with no emoji,
  and the model flags it; the tab shows the note above.
- **Emoji**, at most 2 per reply: the business's **flower**, usually at the
  end ("We hope to welcome you again soon 🪷"), and 🙏 by the thank-you. No 😊
  when the review complains. None when abusive.
- **The flower** is chosen by code from the business's country (2.2's
  search: WhatsApp or phone prefix, then the site's domain): Vietnam **🪷**
  (lotus), Indonesia **🌼** (closest in colour and shape to a frangipani; there
  is no frangipani emoji), anywhere else **🌸**. Code replaces any other
  flower emoji in a reply with it, and removes every emoji from the replies
  of a review flagged abusive. 🪷 is from 2021: some old phones show it as an
  empty box; 🌸 is the fallback to switch to if the pilot shows that.
- **The guest's name is never sent to the model.** Decision 0003's free tier
  takes no personal data. The request says only whether there is a name; the
  model writes the placeholder `{name}` where it goes, with the honorific
  its language uses around it when one fits ("chị {name}", "{name}님"), and
  code puts **the name as typed** there ("Anna K.", "Nguyễn Văn An") in the
  replies and their translations. Not a first word: Vietnamese and Korean
  names start with the family name (builder's call after the builder
  check); the owner types what the guest should be called, usually as Maps
  shows it. Without a name, code removes any `{name}` left with
  the space or comma before it ("Thank you, {name}!" → "Thank you!"). The
  review itself is sent as pasted: it is already public on Google Maps.
- **The business** the model writes for: its name and its one-line summary
  from the brand profile, so a reply can say "at Sen". Nothing else of the
  profile is sent.

### The model call

One request per "Write 2 replies" or "Write 2 other replies", on
`TEXT_MODELS.light` (Flash-Lite, decision 0003: "review replies, a warm and
a short version, one call per review"), structured output checked by zod,
not streamed, thinking level `low`, no retry, cut at 20 seconds. The same
call returns everything the screen needs, so a review never costs a second
request:

- the review's language, as a BCP 47 code (`en`, `ru`, `vi`…);
- whether it looks abusive or fake;
- the review in the owner's language, or nothing when it is already in it;
- the short and the warmer reply, each with its translation in the owner's
  language, or none when the review is in it.

A route, `POST /api/reviews/reply`, behind the pilot session like the posts
routes, takes the review, whether there is a name, the screen language, the
business's name and summary, its country (`VN`, `ID` or none) and, for
"Write 2 other replies", the two replies shown. It answers the parsed result
with the model and prompt version, or an error code as the translate route
does (`invalid_request`, `model_busy`, `model_timeout`, `model_failed`). Its
one log line holds the owner, model, prompt version, characters in and out,
the review's language, the abusive flag, time and outcome, **never the review
or the replies**.

The code checks on the answer, in the route: the flower and abusive emoji
rules above; a reply or translation left empty fails as `model_failed`; the
translation fields are dropped when the review's language is the screen's
(the model can't always be trusted to leave them out). The name is put in on
the phone, never on the server.

Errors, under the button, in the owner's language:

| Code | English |
|---|---|
| `model_busy` | Shopfront has used today's free writing. Try again tomorrow. |
| `model_timeout` | Writing your replies took too long. Try again. |
| `model_failed`, `invalid_request` | Something went wrong while writing your replies. Try again. |
| offline | You're offline. Try again when you're back. |

Signed out answers as the other tabs do (back to `/enter`).

Counting requests per owner waits for 2.8 `platform/usage-counters`.

### Prompt and eval

- The prompt is versioned (`reply-1`) like the others, and lives next to the
  route's code.
- `tests/fixtures/reviews/` holds made-up reviews, written for this item (no
  real guest's words): praise in English for Sen; praise with a complaint in
  English for Sen (the cold room and the wait); Russian for Svarga; Korean
  for Sen; Vietnamese for Sen (no translation for a VI screen); Indonesian
  for Svarga; and an abusive one. Each says its business, the screen
  language and whether there's a name.
- `pnpm eval:replies [slug…] [--record]` runs them with the real model and
  prints each answer with code's checks, for reading back; `--record` saves
  the calls the unit tests replay. ⚠️ 1 Flash-Lite request per review from
  the app's daily pool: a few at a time, never on a pilot day. AGENTS.md's
  commands table gets the line.

### Strings

New or changed, in English, Indonesian and Vietnamese (the developer's
translations; the owners read them back during the pilot). "Edit the text",
"Copy the text", "Copied", "Copy it from here.", "Save" and "Cancel" reuse
2.4 and 2.6's keys.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `home.tabs.posts` | Create Posts | Buat postingan | Tạo bài đăng |
| `home.tabs.reviews` | Reviews | Ulasan | Đánh giá |
| `reviews.intro` | Got a new review on Google Maps? Copy it and paste it here. We write 2 replies in your guest's language. | Ada ulasan baru di Google Maps? Salin dan tempel di sini. Kami menulis 2 balasan dalam bahasa tamu Anda. | Có đánh giá mới trên Google Maps? Hãy sao chép và dán vào đây. Chúng tôi viết 2 câu trả lời bằng ngôn ngữ của khách. |
| `reviews.nameLabel` | Guest's name (optional) | Nama tamu (opsional) | Tên khách (không bắt buộc) |
| `reviews.reviewLabel` | The review | Ulasan | Đánh giá |
| `reviews.write` | Write 2 replies | Tulis 2 balasan | Viết 2 câu trả lời |
| `reviews.writing` | Writing your replies… | Sedang menulis balasan… | Đang viết câu trả lời… |
| `reviews.keepOpen` | Keep this page open for a few seconds. | Biarkan halaman ini terbuka beberapa detik. | Hãy giữ trang này mở trong vài giây. |
| `reviews.heading` | {name}'s review · in {language} | Ulasan dari {name} · dalam {language} | Đánh giá của {name} · bằng {language} |
| `reviews.headingNoName` | The review · in {language} | Ulasan · dalam {language} | Đánh giá · bằng {language} |
| `reviews.short` | Short reply | Balasan singkat | Trả lời ngắn |
| `reviews.warm` | Warmer reply | Balasan lebih hangat | Trả lời ấm áp hơn |
| `reviews.abusive` | This review may be abusive or fake. It can be better not to reply, or to report it in Google Maps. If you reply, keep it calm, like below. | Ulasan ini mungkin kasar atau palsu. Mungkin lebih baik tidak membalas, atau laporkan di Google Maps. Jika membalas, tetap tenang, seperti di bawah. | Đánh giá này có thể mang tính xúc phạm hoặc giả mạo. Có thể tốt hơn là không trả lời, hoặc báo cáo trên Google Maps. Nếu trả lời, hãy giữ bình tĩnh, như bên dưới. |
| `reviews.howTo` | In Google Maps: open the review, tap Reply and paste. | Di Google Maps: buka ulasannya, ketuk Balas, lalu tempel. | Trên Google Maps: mở đánh giá, nhấn Trả lời rồi dán. |
| `reviews.again` | Write 2 other replies | Tulis 2 balasan lain | Viết 2 câu trả lời khác |
| `reviews.newReview` | Paste a new review | Tempel ulasan baru | Dán đánh giá mới |
| `reviews.errors.model_busy` | Shopfront has used today's free writing. Try again tomorrow. | (as `posts.errors.model_busy`) | (as `posts.errors.model_busy`) |
| `reviews.errors.model_timeout` | Writing your replies took too long. Try again. | Menulis balasan terlalu lama. Coba lagi. | Viết câu trả lời mất quá lâu. Hãy thử lại. |
| `reviews.errors.model_failed` | Something went wrong while writing your replies. Try again. | Terjadi kesalahan saat menulis balasan. Coba lagi. | Đã có lỗi khi viết câu trả lời. Hãy thử lại. |
| `reviews.errors.offline` | You're offline. Try again when you're back. | Anda sedang offline. Coba lagi saat kembali online. | Bạn đang ngoại tuyến. Hãy thử lại khi có mạng. |

### The roadmap

The PR that ships this item marks 2.7 `done`, and adds a row to "Later
phases": a **Google Maps connection** (fetch new reviews and post replies
through the Business Profile API), gated on owners asking for it after the
pilot (the owner's call: later, kept as a to-do).

### Tests

- Vitest:
  - the reply prompt: the review's language, the shape and tone rules, the
    flower, the `{name}` placeholder or none, the replies to avoid;
  - the answer's checks: another flower replaced, emoji removed when
    abusive, translations dropped when the review is in the screen's
    language, an empty reply failing;
  - the route: 401 without a session, 400 on a bad body, each error code,
    the log line without the review or replies, replayed answers;
  - the name: put in as typed in replies and translations; no name removes
    `{name}` and the comma or space before it;
  - the store: kept across a reload; replaced by a new review; cleared by
    "Paste a new review"; gone after 3am (02:59, 03:00, with a time zone
    set);
  - the tab: empty state, button disabled on an empty review, waiting state,
    both cards with translations, no translation when the review is in the
    screen's language, the abusive note, "Write 2 other replies" sending the
    shown replies and replacing them, an edit hiding the translation,
    "Copy the text" copying the (edited) reply, each error line.
- Playwright at the phone viewport, routes mocked: paste a review and a name,
  write, see both replies with their translations; copy one; reload and see
  them; move the clock past 3am (`page.clock`) and see the empty tab; three
  tabs with no horizontal scroll at 320px in Vietnamese and English.

## Acceptance criteria

```gherkin
Scenario: Two replies in the guest's language
  Given Sen's owner reads the app in Vietnamese
  When they paste "Lovely hot stone massage… the room was a bit cold and we waited 20 minutes" with the name "Anna K."
  And tap "Viết 2 câu trả lời"
  Then a short and a warmer reply show, in English, each thanking "Anna K."
  And each owns the cold room and the wait in one sentence, with no promise
  And the review and each reply show in Vietnamese under them

Scenario: No translation when the guest writes in the owner's language
  Given Sen's owner reads the app in Vietnamese
  When they paste a review written in Vietnamese
  Then the replies are in Vietnamese
  And no translation line shows

Scenario: The flower follows the country
  Given Svarga's phone number starts with +62
  When replies are written for a happy review
  Then a reply that has a flower has 🌼, never 🪷

Scenario: The name stays on the phone
  When the owner writes replies for "Anna K."
  Then the request to the server holds no "Anna"

Scenario: An abusive review
  When the owner pastes "SCAM!!! Never been there but my friend says they are thieves"
  Then the note says it may be better not to reply or to report it
  And both replies are calm and have no emoji

Scenario: A trip to Google Maps keeps the replies
  Given replies are shown
  When the page reloads before 3am
  Then the same review and replies show, with no new request

Scenario: The next day starts empty
  Given replies made at 22:00
  When the owner opens the tab at 03:10
  Then the tab is empty

Scenario: Two other replies
  When the owner taps "Write 2 other replies"
  Then one request is made with the two replies the model last wrote, with "{name}" and no "Anna"
  And two new replies take their place

Scenario: Three tabs fit
  Given the screen is 320px wide, in Vietnamese
  Then "Doanh nghiệp", "Tạo bài đăng" and "Đánh giá" show without horizontal scroll
```

## Known limits

- The owner copies the review from Maps and the reply back: two trips
  between apps per review.
- The model judges "abusive or fake" from the words only; it can be wrong
  both ways, and the owner decides.
- 🪷 shows as an empty box on some old phones (before 2021's emoji).
- The review text goes to Gemini's free tier, which may keep it; it is
  already public on Maps. A name written inside the review goes with it.
- An edited reply loses its translation line.
- Replies translated into one screen language stay in it after a language
  switch.
- The language name comes from the browser; a very old browser shows the
  code ("ru").

## Out of scope

- A Google Maps connection, fetching reviews or posting replies: a later
  phase, added to the roadmap.
- A history of reviews and replies; more than one review at a time.
- Per-owner daily limits and the usage bar: 2.8 `platform/usage-counters`.
- The owner guide's pages on reviews: 2.9 `guide/owner-guide`.
