---
title: "Story text"
description: "Each suggestion gets a short story text (at most 120 characters, counted so that it fits on Instagram), a short version of its caption that the owner may copy and paste on the story in Instagram; captions follow basic marketing (a hook first, a positive note to end); spas get flower emojis; the suggestion sheet becomes three boxed parts, each with its own button."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-27T21:54:32Z }
date: "2026-10-27"
---

# Story text

## Goal

Each suggestion gives the owner two images and the text for the post. The
story image is the post image made taller (2.3), and today the story gets no
words: the owner guide says "A story has no text to paste". Instagram lets
the owner write on a story with its text tool, and a few words on the
picture tell a tourist what it is about before the story moves on. The
maintainer wants the app to suggest those words: **a short version of the
post's text**, which the owner may use or skip.

The maintainer also wants the captions to sell better: **basic marketing,
with a hook first and a positive note to end**, and **flower emojis** on the
spas' captions and story texts (Sen and Svarga are both spas).

Success: on Sen's and Svarga's recorded batches, every suggestion has a
story text that fits on Instagram and reads as its caption cut down, every
caption opens on a hook and ends on a positive note, and every spa caption
and story text carries flowers. The owner finds each step of a suggestion
right under what it takes away. Phase 2's gate ("would post at least 4 of
6") still holds.

Why now: the pilot starts with Sen and Svarga. A story is the quickest thing
they post each day, and the app leaves it blank.

## Behaviour

### What the owner sees

The suggestion sheet (`docs/specs/platform/friendlier-home`, "Tapping a tile
opens the suggestion") becomes **three boxed parts**, top to bottom, each
with its button right under what it takes away. The two numbered steps
pinned at the bottom of the sheet go away, with their Instagram line.

1. **Images** (only when the suggestion has images, as today): the post
   image (two thirds of the width) and the story image (one third), each
   opening 2.3's full view when tapped, with "Post" and "Story" under them;
   "Create new image" under them on the right; then **"Save post & story
   images"**; then the hint "On an iPhone, choose "Save 2 Images"."
2. **Post text**: the offer badge when the post carries the offer (2.11);
   the caption, the WhatsApp line and the hashtags, exactly as they will be
   pasted (2.6's `postText`); 2.6's warnings on the caption; "Edit the
   text", and under it, on Vietnamese and Indonesian screens, "Show in
   Tiếng Việt / Bahasa Indonesia" with the caption's translation opening
   below it; then **"Copy post text"**; then the hint "In Instagram, make a
   post with the post image and paste this text."
3. **Story text (optional)**, in a box with a dashed border: the story text,
   17px, weight 500; its own warnings (below); on Vietnamese and Indonesian
   screens, its own "Show in Tiếng Việt / Bahasa Indonesia" with the story
   text's translation below it; then **"Copy optional story text"**; then
   the hint "In Instagram, make a story with the story image, add text and
   paste."

Each part is a box on the `field` colour with a thin `edge` border, 12px
corners, and a heading with a small number in an `accent-tint` circle:
"1 Images", "2 Post text", "3 Story text (optional)". All three buttons are
the app's own `Button` (filled `accent`, `on-accent` text, 48px tall, full
width). Without images, the Images part is gone, the other two are numbered
1 and 2, and their hints say "your own photo" instead of "the post image" and
"the story image". The maintainer approved this layout on mockup v6
(2026-10-27).

The guide doesn't name Instagram's text button: guides on the web call it
"Aa", but Instagram's own help doesn't, and its icons change.

**The story text can't be edited.** "Edit the text" changes the caption,
hashtags and alt text, as today; the owner who wants other words on the
story changes them in Instagram after pasting. Editing the caption leaves
the story text as it is.

**Copying** the story text works like "Copy post text" (2.4's `CopyText`):
"Copied" for 2 seconds, or the "Copy it from here." fallback when the phone
refuses the clipboard. It isn't one of the suggestion's steps: the tile's
"Saved and copied" (friendlier-home) still means the images saved and the
post text copied, and copying the story text changes nothing on the tile.

**Warnings.** The story text goes through 2.6's caption checks (price,
duration, banned word, and with an offer, 2.11's offer checks), shown in the
story part with the same messages. A tile shows "Check the text" when either
text has a warning.

**Posts without a story text** (saved before this spec, or whose story text
code left empty, below) show no story part. A rewrite (below) gives them one.

### The owner's language

The story text is in English, like the caption: it is what gets posted. Its
"Show in…" link works like the caption's (2.4, "The owner's-language view"),
read-only, with the same label. **One request translates both**: the first
tap on either link asks for the caption and the story text together, and
keeps both on the phone; the other link then opens its translation at once,
without a request. It counts as one translation in the usage counters
(2.8). A post without a story text asks for its caption alone, as today.
The translations kept on the phone are used only while the caption and the
story text they were made from are unchanged.

`translatePrompt` changes to take a caption and, when there is one, a story
text, and to answer both; `TRANSLATE_PROMPT_VERSION` becomes `translate-2`.

### What the model writes

Each post of the plan gains a **story text**, written with its caption. The
plan prompt's caption rules change (`POSTS_PROMPT_VERSION` becomes
`posts-5`); the rest of the prompt stays as it is.

**Captions sell, in this order:**

1. **A hook**: the first line, at most 125 characters as today, that stops a
   tourist scrolling: a question or a promise they feel ("Long flight?").
   On an offer post, the first line stays 2.11's offer line, which is its
   hook.
2. **The benefit**: what the guest will feel, rather than what the business
   does.
3. **One concrete detail** that makes it real: the treatment, its price or
   duration when the profile gives them, the place.
4. **A positive ending**: the last sentence leaves a good feeling or a warm
   promise ("Wake up light tomorrow."). The app's "Book on WhatsApp" line
   comes after it and stays the only call to action.

Length and facts stay as 2.2 and 2.11 set them (250 to 700 characters,
facts only from the profile, no contact details, the banned words).

**The story text:**

- A short version of its own caption, in English: its hook cut down, the one
  thing that matters, and a positive ending.
- At most **100 characters**, asked of the model; code's hard limit is 120
  (below), so the model has room to miss.
- One or two short lines; no hashtags, no phone number, no link, no "book"
  or call to action: the owner adds the WhatsApp link sticker (owner guide).
- An offer post's story text is its caption's first line (2.11's offer
  line, word for word) and its flower, nothing else: the offer is its
  positive note (mockup v6). Such a line is about 80 characters for a
  discount and at most about 100 for a free extra. The other posts' story
  texts never mention a discount, a free treatment or a deadline.

Example (Sen, made up): "Long flight? 🌸 Deep tissue in your room, 60 min.
Wake up light! 🌺"

**Emojis.** Code decides which rule the model gets:

| The business | What the prompt says |
|---|---|
| A spa: its category holds "spa", "massage", "pijat", "mát xa", "mát-xa" or "reflexology" (case and accents ignored) | Flowers only, from 🌸 🌺 🌼 🌷 🪷: 1 to 3 in the caption, 1 or 2 in the story text; no other emoji |
| Any other business | At most 2 emoji in the caption and at most 2 in the story text, any kind (today's rule) |

Sen's and Svarga's category is "massage spa"; the owner can change it in
"Your business" (1.2), and the next plan or rewrite follows it.

### Code's checks

Code never trusts the model to count. On each post's story text, in the
plan and in every rewrite:

- Trim it, and remove any hashtag (`#word`).
- **Remove a call to action.** Every sentence of the story text that holds
  one of these, as whole words, case ignored, is removed: "book",
  "booking", "reserve", "call us", "message us", "contact us", "DM",
  "WhatsApp", "link in bio", "tap the link", "click". A sentence ends at
  ".", "!" or "?" followed by a space or the end; whatever follows it, an
  emoji included, starts the next one. This comes before the emoji fixes
  and the length check, so a spa's story text that lost its flower with
  the sentence gets 🌸 back; when no sentence is left, the post has no
  story text. Each removed sentence is recorded in the batch's `dropped`
  list (field `story`): `post-6: story text removed "Book on WhatsApp."`.
  (Amended 2026-10-27, after Sen's offer plan on `posts-5` wrote "…in Da
  Nang. 🌸 Book on WhatsApp." although the prompt forbids it.)
- **Length**, counted as JavaScript counts a string (`.length`, UTF-16 code
  units): 🌸 counts 2, an emoji built from several pieces (🧘‍♀️, 🏵️) counts
  more. An emoji takes about the room of two letters on the story, so it is
  never counted for less than it takes; the 2,200-character caption limit
  (2.4's `INSTAGRAM_CAPTION_MAX`) is counted the same way. The limit is
  **120**. Over it, code keeps the whole
  sentences that fit; when even the first sentence doesn't fit, it keeps the
  whole words that fit, and never cuts inside an emoji. Each cut is recorded
  in the batch's `dropped` list (field `story`), as 2.2 records its fixes.
- An empty story text, from the model or after the cut, leaves the post with
  none (no story part) and a `dropped` entry; the post itself is kept.
- 2.6's checks (`findFlags`, with the offer context of 2.11) run on it, but
  not the first-line check; its flags are kept apart from the caption's.

On a spa's posts, **code fixes the emojis** of the caption and of the story
text, before the length check (the maintainer chose this on 2026-10-27, so
the rule holds without re-recording):

- an emoji that isn't one of the five flowers is removed, and the spaces
  around it tidied;
- more flowers than allowed (3 in a caption, 2 in a story text): the first
  ones are kept;
- no flower: 🌸 is added at the end, after a space.

An emoji is a pictograph (`\p{Extended_Pictographic}`) with any joiner,
variation selector or skin tone that belongs to it. Other businesses' texts
are not touched.

**Where code records its fixes.** Every cut, every call to action removed
and every emoji fix goes:

1. in the batch's `dropped` list (field `story` or `emoji`, with the post's
   id and what changed), saved with the batch on the phone and never shown
   to the owner, as 2.2's fixes are today;
2. in what `pnpm eval:posts` prints, for the developer's verdicts;
3. as counts in the server's one log line per plan or rewrite
   (`lib/posts/log.ts`): `story_cuts=`, `story_ctas=` (sentences removed
   for a call to action; amended 2026-10-27) and `emoji_fixes=`, numbers only,
   never the text, so the developer sees in Vercel's logs how often the
   model misses during the pilot.

The hook and the positive ending are not checked by code: the eval judges
them (below).

### What the post keeps

`postSchema` (`lib/posts/batch.ts`) gains two optional fields, saved with
the batch on the phone:

- `storyText`: the checked story text. Absent on posts saved before this
  spec and on posts whose story text code left empty.
- `storyUnchecked`: its flags, as `unchecked` holds the caption's.

The model's answer (`modelPostPlanSchema`, `modelRewriteSchema`) gains a
`storyText` the model must fill.

**Rewrites.** "Update captions" after a change to "Your business" (2.2) and
"Rewrite this one too" (2.4) write the story text again with the caption,
with the same rules and checks, so a post saved before this spec gains one
when it is rewritten. A missing story text doesn't make a post out of date:
nothing rewrites old posts by itself, and they leave the screen at the next
daily reset (2.8b). A post the owner edited and that isn't rewritten keeps
its story text.

### The owner guide

The guide (2.9) changes every line that speaks of the steps, the story or
the captions, in its three languages (`guide.*` in `messages/*.json`); the
printable PDF follows from it (`pnpm guide:pdf`). Its other lines stay.
Bold words are the app's own labels, filled in by `components/guide/
owner-guide.tsx` as today; `instagram.story` gains the story button's label.

| Line | English |
|---|---|
| `posts.make` | In **Create Posts**, tap **Make 6 suggestions**. You get 6 suggestions, each with a post image, a story image, the text for the post and a short text for the story. |
| `posts.edit` | Tap **Edit the text** to change a suggestion's words, and **Create new image** for a different picture; you can add a short hint. The story text can't be changed here: change it in Instagram after pasting, if you like. |
| `posts.update` | If you change your business, the captions and story texts are updated to match. Text you edited yourself is left alone. |
| `instagram.save` | Tap **Save post & story images**. On an iPhone, choose "Save 2 Images" in the menu that opens. On Android, both images download to your phone. Either way, the post image and the story image land side by side in your photos. |
| `instagram.copy` | Tap **Copy post text**. It copies the caption, your WhatsApp line and the hashtags, ready to paste. |
| `instagram.story` | The story: tap +, then Story, and pick the story image. Tap the sticker icon, choose "Link", paste your WhatsApp link and place the sticker. If you like, tap **Copy optional story text** in the suggestion, then add text to the story and paste it. |
| `instagram.noImages` | No pictures on your suggestions? Post a photo of your own and paste the text, and the same for a story with the story text. |
| `languages.captions` | Posts and story texts are written in English, and review replies in your guest's language. Showing them in your language is for reading, not for posting. |

| Line | Indonesian |
|---|---|
| `posts.make` | Di **{tab}**, ketuk **{button}**. Anda mendapat 6 saran, masing-masing dengan gambar postingan, gambar story, teks postingan, dan teks singkat untuk story. |
| `posts.edit` | Ketuk **{button}** untuk mengubah kata-kata sebuah saran, dan **{image}** untuk gambar lain; Anda bisa menambahkan petunjuk singkat. Teks story tidak bisa diubah di sini: ubah di Instagram setelah ditempel, jika mau. |
| `posts.update` | Jika Anda mengubah data usaha, teks postingan dan teks story diperbarui agar sesuai. Teks yang Anda ubah sendiri tidak disentuh. |
| `instagram.save` | Ketuk **{button}**. Di iPhone, pilih "Simpan 2 Gambar" di menu yang terbuka. Di Android, kedua gambar langsung diunduh ke ponsel Anda. Gambar postingan dan gambar story tersimpan berdampingan di foto Anda. |
| `instagram.copy` | Ketuk **{button}**. Ini menyalin keterangan, baris WhatsApp Anda, dan tagar, siap ditempel. |
| `instagram.story` | Story: ketuk +, lalu Story, dan pilih gambar story. Ketuk ikon stiker, pilih "Link", tempel tautan WhatsApp Anda, lalu letakkan stikernya. Jika mau, ketuk **{button}** di saran, lalu tambahkan teks di story dan tempel. |
| `instagram.noImages` | Saran Anda tanpa gambar? Posting foto Anda sendiri dan tempel teksnya, begitu juga untuk story dengan teks story. |
| `languages.captions` | Postingan dan teks story ditulis dalam bahasa Inggris, dan balasan ulasan dalam bahasa tamu Anda. Menampilkannya dalam bahasa Anda hanya untuk dibaca, bukan untuk diposting. |

| Line | Vietnamese |
|---|---|
| `posts.make` | Trong **{tab}**, chạm **{button}**. Bạn nhận 6 gợi ý, mỗi gợi ý có hình bài đăng, hình story, chữ cho bài đăng và một dòng chữ ngắn cho story. |
| `posts.edit` | Chạm **{button}** để đổi lời của một gợi ý, và **{image}** để có hình khác; bạn có thể thêm mô tả ngắn. Chữ story không sửa được ở đây: nếu muốn, hãy sửa trên Instagram sau khi dán. |
| `posts.update` | Nếu bạn thay đổi thông tin doanh nghiệp, chú thích và chữ story sẽ được cập nhật theo. Chữ bạn đã tự sửa thì được giữ nguyên. |
| `instagram.save` | Chạm **{button}**. Trên iPhone, chọn "Lưu 2 hình ảnh" trong menu hiện ra. Trên Android, cả hai hình được tải thẳng về điện thoại. Hình bài đăng và hình story nằm cạnh nhau trong ảnh của bạn. |
| `instagram.copy` | Chạm **{button}**. Nút này sao chép chú thích, dòng WhatsApp và hashtag, sẵn sàng để dán. |
| `instagram.story` | Story: chạm +, rồi Story, và chọn hình story. Chạm biểu tượng nhãn dán, chọn "Link", dán link WhatsApp của bạn và đặt nhãn dán. Nếu muốn, chạm **{button}** trong gợi ý, rồi thêm chữ vào story và dán. |
| `instagram.noImages` | Gợi ý không có hình? Hãy đăng ảnh của bạn và dán chữ, story cũng vậy với chữ story. |
| `languages.captions` | Bài đăng và chữ story được viết bằng tiếng Anh, và câu trả lời đánh giá bằng ngôn ngữ của khách. Hiển thị bằng ngôn ngữ của bạn là để đọc, không phải để đăng. |

### Strings

New and changed strings, in the three message files (`messages/*.json`);
2.6's `posts.howTo` and `posts.howToTextOnly` go, replaced by the hints.
Keys are the builder's call.

| English | Indonesian | Vietnamese |
|---|---|---|
| Images | Gambar | Hình |
| Post | Postingan | Bài đăng |
| Story | Story | Story |
| Post text | Teks postingan | Chữ bài đăng |
| Story text | Teks story | Chữ story |
| (optional) | (opsional) | (không bắt buộc) |
| Save post & story images | Simpan gambar postingan & story | Lưu hình bài đăng & story |
| Copy post text | Salin teks postingan | Sao chép chữ bài đăng |
| Copy optional story text | Salin teks story (opsional) | Sao chép chữ story (không bắt buộc) |
| On an iPhone, choose "Save 2 Images". | Di iPhone, pilih "Simpan 2 Gambar". | Trên iPhone, chọn "Lưu 2 hình ảnh". |
| In Instagram, make a post with the post image and paste this text. | Di Instagram, buat postingan dengan gambar postingan dan tempel teks ini. | Trên Instagram, tạo bài đăng với hình bài đăng và dán phần chữ này. |
| In Instagram, make a post with your own photo and paste this text. | Di Instagram, buat postingan dengan foto Anda sendiri dan tempel teks ini. | Trên Instagram, tạo bài đăng với ảnh của bạn và dán phần chữ này. |
| In Instagram, make a story with the story image, add text and paste. | Di Instagram, buat story dengan gambar story, tambahkan teks, lalu tempel. | Trên Instagram, tạo story với hình story, thêm chữ rồi dán. |
| In Instagram, make a story with your own photo, add text and paste. | Di Instagram, buat story dengan foto Anda sendiri, tambahkan teks, lalu tempel. | Trên Instagram, tạo story với ảnh của bạn, thêm chữ rồi dán. |

The empty state of "Create Posts" says the suggestions carry a story text:

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `posts.empty` | Each suggestion is 2 images (1 for the post, 1 for the story), the text for the post and a short text for the story, ready for Instagram. Pick the ones you like and save them to your phone. | Setiap saran berisi 2 gambar (1 untuk postingan, 1 untuk story), teks untuk postingan, dan teks singkat untuk story, siap untuk Instagram. Pilih yang Anda suka dan simpan di ponsel Anda. | Mỗi gợi ý gồm 2 hình (1 cho bài đăng, 1 cho story), phần chữ cho bài đăng và một dòng chữ ngắn cho story, sẵn sàng cho Instagram. Chọn những gợi ý bạn thích và lưu vào điện thoại. |
| `posts.emptyTextOnly` | Each suggestion is the text for a post and a short text for a story, ready for Instagram. Pick the ones you like and copy them. | Setiap saran berisi teks untuk postingan dan teks singkat untuk story, siap untuk Instagram. Pilih yang Anda suka dan salin. | Mỗi gợi ý là phần chữ cho một bài đăng và một dòng chữ ngắn cho story, sẵn sàng cho Instagram. Chọn những gợi ý bạn thích và sao chép. |

The guide's lines are in "The owner guide" above.

### Tests and evaluation

- Unit tests (Vitest) for: the spa test on categories (Sen's, Svarga's,
  "Spa", "Pijat Refleksi", a bakery, an empty category); the emoji rule in
  the plan and rewrite prompts for a spa and for another business; the
  story text's length count with flowers and a several-piece emoji; the cut
  (whole sentences, then whole words, never inside an emoji, a `dropped`
  entry); hashtags removed; a call to action removed ("Book on WhatsApp.",
  "DM us", "link in bio"; a sentence without one kept; nothing left means
  no story text; a spa's flower given back) and its record; an empty
  story text; the story text's flags,
  with and without an offer; the spa emoji fixes (another emoji removed, a
  joined emoji removed whole, flowers over the limit, 🌸 added) and their
  records; the three log counts; a rewrite carrying a new
  story text; the translation request and answer with and without a story
  text, and the phone's store reusing both while unchanged; a post without a
  story text showing no story part; copying the story text leaving the tile
  as it was.
- The sheet's three parts, with and without images, in the e2e tests at a
  phone viewport (`tests/e2e/`), with the recorded batches.
- `pnpm eval:posts sen svarga --record` and `pnpm eval:posts sen svarga
  --offer --record` re-record the four fixtures with `posts-5` (4 Gemini
  requests), and print each story text with its length and flags.
  `pnpm eval:translate --record` re-records `sen:vi` and `svarga:id` with
  `translate-2` (2 Flash-Lite requests). The developer asks the maintainer
  before each run, never on a pilot day.
- The developer reads the 24 captions and story texts (12 posts, 12 offer
  posts) and writes a verdict on each in the journal: does the caption open
  on a hook and end on a positive note; does the story text read as the
  caption cut down and end well (an offer post's: is it its offer line and
  flower, word for word). Pass: every story text at most 120 by code's count, every spa
  caption and story text with flowers and no other emoji after code's fixes
  (how many fixes it took goes in the journal), at least 20 of 24
  captions with both a hook and a positive ending, and at least 20 of 24
  story texts judged a fair short version.

## Acceptance criteria

```gherkin
Scenario: Each suggestion has a story text
  Given Sen's profile
  When the owner taps "Make 6 suggestions"
  Then each of the six suggestions has a story text of at most 120 characters, counted as JavaScript counts
  And each story text holds 1 or 2 flowers from 🌸 🌺 🌼 🌷 🪷

Scenario: The sheet in three parts
  Given a suggestion with images and a story text
  When the owner opens it
  Then the owner sees "Images" with "Save post & story images" under the two images
  And "Post text" with "Copy post text" under the hashtags and links
  And "Story text (optional)" with "Copy optional story text" under the story text
  And no button is pinned at the bottom of the sheet

Scenario: Without images
  Given a suggestion without images
  When the owner opens it
  Then the owner sees "1 Post text" and "2 Story text (optional)"
  And the hints say "your own photo"

Scenario: Copying the story text
  Given a suggestion whose images are saved and post text copied
  When the owner taps "Copy optional story text"
  Then the story text is on the clipboard
  And the tile still shows "Saved and copied"

Scenario: An offer post's story text
  Given a special offer of 10% off the 90-minute Vietnamese Traditional Massage until Sunday 1 November
  When the batch is planned
  Then each of the two offer posts' story texts states 10% off, the 90-minute Vietnamese Traditional Massage, and until Sunday 1 November
  And the other four story texts mention no discount and no deadline

Scenario: Code fixes a spa's emojis
  Given Sen's profile
  And the model writes a story text "Relax tonight 💆 in your room!" with no flower
  When code checks it
  Then the story text is "Relax tonight in your room! 🌸"
  And the batch's dropped list records the fix
  And the server's log line counts emoji_fixes=1

Scenario: A call to action in the story text
  Given Sen's profile
  And the model writes the story text "Professional massage in your room. 🌸 Book on WhatsApp."
  When code checks it
  Then the story text is "Professional massage in your room. 🌸"
  And the batch's dropped list records the removed sentence
  And the server's log line counts story_ctas=1

Scenario: A story text too long
  Given the model writes a story text of 140 characters in three sentences
  When code checks it
  Then the story text keeps its first sentences that fit within 120
  And the batch's dropped list records the cut

Scenario: Both translations in one request
  Given a Vietnamese screen and a suggestion with a story text
  When the owner taps "Show in Tiếng Việt" under the story text
  Then one translation request carries the caption and the story text
  And the story text's translation shows
  And tapping "Show in Tiếng Việt" under "Edit the text" shows the caption's translation without a new request

Scenario: A business that isn't a spa
  Given a bakery's profile
  When its posts are planned
  Then the prompt asks for at most 2 emoji of any kind
  And code changes no emoji in its texts

Scenario: An old post
  Given a post saved before this spec, with no story text
  When the owner opens it
  Then there is no story part
  And after the owner changes their business and the captions are updated, it has a story text

Scenario: Editing the caption
  Given a suggestion with a story text
  When the owner edits its caption and saves
  Then the story text is unchanged
```

## Known limits

- **120 is our own limit.** Instagram publishes none for story text: its text
  tool shrinks the words to fit. 120 keeps the words readable over a photo;
  it can change without touching anything else.
- **The hook and the positive ending are words in a prompt.** Code can't
  check them; the eval's verdicts are the only measure.
- **The spa test is a word list on the category.** A spa whose category says
  "wellness" or "beauty salon" gets the other rule until the owner changes
  its category.
- **A cut story text may lose its ending.** Code keeps whole sentences, so a
  story text cut after its first sentence loses the positive note; the
  `dropped` entry shows how often in the eval.
- **The call-to-action list is short and English.** "Ring us" or "Pesan
  sekarang" would stay; "book" also goes from a sentence like "Book lovers
  welcome", which a massage spa's story text is unlikely to hold.
- **The story text doesn't follow the owner's edits.** An owner who changes
  a price in the caption must change it on the story in Instagram too.
- **The owner places the text.** Font, colour and place on the story are
  chosen in Instagram.

## Out of scope

- Writing the text on the story image: never. The image stays clean (2.2's
  "No text in the image") and the owner chooses whether to add words.
- Editing the story text in the app: not planned; Instagram's text tool does
  it.
- Stickers, polls or music suggestions for the story: not planned.
- Posting the story from the app: phase 6.
