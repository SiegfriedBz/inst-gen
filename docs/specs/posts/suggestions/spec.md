---
title: "Suggestions"
description: "'Create your posts' becomes a plain stack of attempts, each of six suggestions (a post image, a story image and the post's text), used one at a time with 'Save the 2 images' and 'Copy the text'; suggestions last until 3am on the phone's clock; the feed preview, type labels, post numbers and image description go; and the language switch gets faster."
status: approved
approved: { by: siegfried.bozza@protonmail.com, at: 2026-10-25T19:26:38Z }
date: "2026-10-25"
---

# Suggestions

## Goal

The owner tested 2.5 on the develop deployment. "Create your posts" shows too
much: a feed preview grid with "Post them from 1 to 6: the last one you post
shows first.", type labels ("Offer", "What people say"), "Post 1…6", an
"Image description" on every card, a warning about the first line that the
owner couldn't understand, three save buttons, and every batch ever made,
so an older batch without images appears at the bottom like a duplicate.

The owner's flow is simpler: **pick a suggestion you like, check its text
makes sense, save its two images and copy its text, then post it in
Instagram.** This item cuts the screen down to that flow. They are
**suggestions**, not posts, until the owner posts them, and the screen says
so. The pilot's rule still holds: "super easy to use", fewer buttons, fewer
modes, nothing to learn, on cheap and slow phones.

The language switch also feels slow on the deployment; this item makes it
fast.

## Behaviour

### Words

What 2.2 to 2.5 call a batch is an **attempt**; each of its posts is a
**suggestion**. On screen, "post" only means the Instagram post the owner
makes ("the post image", "the text for the post").

### The screen


> Changed by `platform/friendlier-home` (2026-10-27): each attempt is a grid of six tiles, three to a row; a tile opens its suggestion in a sheet.
On "Create your posts" (2.5), top to bottom:

1. The button: **"Make 6 suggestions"** when no suggestion is on screen,
   **"Make 6 new suggestions"** once at least one is. Under the second, the
   line "They go on top. Attempt {n} stays below." ({n} is the newest
   attempt on screen). Today's keep-open line, WhatsApp warning and error
   line stay as they are.
2. With no suggestion on screen, a short note instead of the list: "Each
   suggestion is 2 images (1 for the post, 1 for the story) and the text for
   the post, ready for Instagram. Pick the ones you like and save them to your
   phone."
3. The attempts, **newest on top**. Each starts with a heading
   **"Attempt {n}"** and, on the same line in secondary text, "{count}
   suggestions". Attempts are numbered from 1 in the order they were made
   since 3am (below); the first of the day is "Attempt 1".
4. Under each heading, its suggestions one under the other, in the model's
   order.

Gone: the feed preview grid and its two lines, the "Your posts" heading,
2.2's "We made {count} posts this time." (the heading's count says it).

### A suggestion


> Changed by `platform/friendlier-home` (2026-10-27): the card is the opened sheet: the post and story images side by side, the two steps pinned at its bottom; a tile shows "Saved and copied" once both steps are done.
Each suggestion is one card, top to bottom:

1. **The post image** (2.3's post crop), full width.
2. **The text for the post**, exactly as it will be pasted: the caption, a
   blank line, the call to action, a blank line, the hashtags with their
   `#`, in one block (`postText`).
3. **Warnings**, in plain words, only when they apply:
   - price: "This price isn't on your website: {text}. Check it before
     posting."
   - duration: "This duration isn't on your website: {text}. Check it before
     posting."
   - banned: "Instagram may not allow \"{text}\". Better to change it."
   - The first-line check is no longer shown (the owner couldn't use it).
4. **"Show in Tiếng Việt / Bahasa Indonesia"**, as in 2.4, on those screens.
5. Two discreet links on one row: **"Edit the text"** (2.4's "Edit") and
   **"Create new image"** (2.4's "New image", with its optional hint).
6. Two numbered steps, full width:
   - **"1 Save the 2 images"**, filled: one share sheet holding both images,
     post first, so the owner picks "Save 2 images" and finds them side by
     side in Photos. Without file sharing, both are downloaded.
   - **"2 Copy the text"**, outlined: copies the text block of point 2, with
     2.4's "Copied" and its "Copy it from here." fallback.
7. One line: "In Instagram: make a post with the post image and paste the
   text, then a story with the story image."
8. **"See the story image"**, a small secondary link at the bottom, centred,
   opening 2.3's story view.

Gone from the card: the type label, "Post {n}", "Edited", the "Image
description" and its text, "Check that the image description still fits.",
"Save post image", "Save story image", "Copy caption". The alt text is still
made and kept; it just isn't shown or edited. 2.4's editor loses its alt
text field: "Edit the text" edits the caption and the hashtags.

**Without images** (an owner not on `IMAGE_OWNERS`, or images paused): the
card has no image, no "Create new image", no "See the story image", and one
step, "Copy the text", with no number; the how-to line becomes "In Instagram:
make a post with your own photo and paste the text." The empty note becomes
"Each suggestion is the text for a post, ready for Instagram. Pick the ones
you like and copy them." While a suggestion's image is being made or has
failed, "Save the 2 images" is disabled and 2.3's image state shows in its
place at the top of the card (builder's call after the builder check).

Everything a suggestion did in 2.4 and 2.5 that isn't listed as gone stays:
2.5's automatic caption update (newest attempt on screen only), "Rewrite this
one too", the editor's checks and the 2,200-character limit, 2.3's image
states ("Making the image…", failures and "Try again", "Make the images").

### Image file names

> Changed by `platform/one-daily-reset` (2026-10-26): the day starts at Google's reset, midnight Pacific, not at 3am on the phone's clock.

`{name}-{YYYY-MM-DD}-attempt-{a}-suggestion-{n}-post.jpg` and `…-story.jpg`,
with 2.4's folded name and the date of the attempt's day: the day that starts
at 3am on the phone's clock, so an attempt made at 00:10 carries the previous
date like the attempts before it (builder's call after the builder check), for
example
`sen-2026-10-26-attempt-2-suggestion-3-post.jpg`. Photos on iPhone and most
Android galleries don't show file names; the two images still arrive side by
side, one near-square and one tall.

### Suggestions last until 3am

> Changed by `platform/one-daily-reset` (2026-10-26): the day starts at Google's reset, midnight Pacific, not at 3am on the phone's clock.

Suggestions are kept on the phone, as today, so a trip to Instagram or a
reload never loses them. But **each day starts empty**: the screen shows only
the attempts made since the most recent **3am on the phone's clock** (3am,
not midnight, so the reset happens while the owner sleeps).

- On opening "Create your posts", attempts made before that 3am are no longer
  shown, and their images and translations are deleted from the phone.
- Their topics are kept, only so that the next attempts don't repeat them
  (2.2's `recent`, at most `POSTS_LIMITS.recent` posts); nothing else of
  theirs is shown or used. (Builder's call: keep the old attempt records
  without their images, pruned to what `recentPosts` needs, or a smaller
  record of topics.)
- 2.5's automatic caption update only ever rewrites the newest attempt **on
  screen**; with nothing on screen, nothing is rewritten.
- A WhatsApp edit still updates every kept call to action.
- The check runs when the posts section loads; an app left open across 3am
  clears at its next load, not mid-use.

### A faster language switch

Tapping EN, VI or ID feels slow on the deployment. The builder **measures
first**, on a production build (`pnpm build && pnpm start`) in Playwright's
Chromium at the phone viewport, with the CPU slowed 4× and every request
delayed by 150 ms (about a round trip from Da Nang or Bali to Vercel's
Singapore region), from the tap to the screen in the new language, on the
home screen with six suggestions and their images on the phone. Then they fix
the cause found, and record the before and after numbers in the journal. The
deployment isn't measured from here: it sits behind the pilot passphrase
(builder's call after the builder check).

- Target: under those conditions, the new language shows within 1 second of
  the tap.
- Unchanged: the switch still works without JavaScript, sets the same
  cookie, and keeps the owner on the same screen. With JavaScript, the open
  tab and anything being made carry on (as 2.5's switching tabs).
- If the time is spent where code can't help (a cold server function on
  Vercel), the journal says so with numbers, and the fix covers what code
  can.

### Strings

New or changed, in English, Indonesian and Vietnamese (the developer's
translations; the owners read them back during the pilot):

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `posts.make` | Make 6 suggestions | Buat 6 saran | Tạo 6 gợi ý |
| `posts.makeMore` | Make 6 new suggestions | Buat 6 saran baru | Tạo 6 gợi ý mới |
| `posts.moreBelow` | They go on top. Attempt {n} stays below. | Saran baru muncul di atas. Percobaan {n} tetap di bawah. | Gợi ý mới nằm ở trên. Lần thử {n} vẫn ở bên dưới. |
| `posts.emptyTextOnly` | Each suggestion is the text for a post, ready for Instagram. Pick the ones you like and copy them. | Setiap saran berisi teks untuk postingan, siap untuk Instagram. Pilih yang Anda suka dan salin. | Mỗi gợi ý là phần chữ cho một bài đăng, sẵn sàng cho Instagram. Chọn những gợi ý bạn thích và sao chép. |
| `posts.howToTextOnly` | In Instagram: make a post with your own photo and paste the text. | Di Instagram: buat postingan dengan foto Anda sendiri dan tempel teksnya. | Trên Instagram: tạo bài đăng với ảnh của bạn và dán phần chữ. |
| `posts.empty` | Each suggestion is 2 images (1 for the post, 1 for the story) and the text for the post, ready for Instagram. Pick the ones you like and save them to your phone. | Setiap saran berisi 2 gambar (1 untuk postingan, 1 untuk story) dan teks untuk postingan, siap untuk Instagram. Pilih yang Anda suka dan simpan di ponsel Anda. | Mỗi gợi ý gồm 2 hình (1 cho bài đăng, 1 cho story) và phần chữ cho bài đăng, sẵn sàng cho Instagram. Chọn những gợi ý bạn thích và lưu vào điện thoại. |
| `posts.attempt` | Attempt {n} | Percobaan {n} | Lần thử {n} |
| `posts.attemptCount` | {count, plural, one {# suggestion} other {# suggestions}} | {count} saran | {count} gợi ý |
| `posts.saveImages` | Save the 2 images | Simpan 2 gambar | Lưu 2 hình |
| `posts.copyText` | Copy the text | Salin teks | Sao chép chữ |
| `posts.howTo` | In Instagram: make a post with the post image and paste the text, then a story with the story image. | Di Instagram: buat postingan dengan gambar postingan dan tempel teksnya, lalu buat story dengan gambar story. | Trên Instagram: tạo bài đăng với hình bài đăng và dán phần chữ, rồi tạo story với hình story. |
| `posts.seeStory` | See the story image | Lihat gambar story | Xem hình story |
| `posts.editText` | Edit the text | Ubah teks | Sửa chữ |
| `posts.newImage` | Create new image | Buat gambar baru | Tạo hình mới |
| `posts.flags.price` | This price isn't on your website: {text}. Check it before posting. | Harga ini tidak ada di situs Anda: {text}. Periksa sebelum memposting. | Giá này không có trên trang web của bạn: {text}. Hãy kiểm tra trước khi đăng. |
| `posts.flags.duration` | This duration isn't on your website: {text}. Check it before posting. | Durasi ini tidak ada di situs Anda: {text}. Periksa sebelum memposting. | Thời lượng này không có trên trang web của bạn: {text}. Hãy kiểm tra trước khi đăng. |
| `posts.flags.banned` | Instagram may not allow "{text}". Better to change it. | Instagram mungkin tidak mengizinkan "{text}". Sebaiknya diganti. | Instagram có thể không cho phép "{text}". Nên đổi từ này. |

Strings that no longer show are removed from the three files (the feed
preview's, "Image description", the first-line flag, "Edited", "Post {n}",
the old save and copy labels, "fewer", the type labels where nothing else
uses them).

### The roadmap

This item is **2.6 `posts/suggestions`**. Reviews move to 2.7, usage
counters to 2.8 and the owner guide to 2.9; number references in the specs
and decisions follow, as 2.5 did. The PR that ships it marks 2.6 `done`.

### Tests

- Vitest:
  - the 3am boundary: for a phone clock at 02:59, 03:00 and 15:00 (time zone
    set), which attempts are on screen; old attempts' images and
    translations deleted; their topics still sent as `recent`;
  - attempt numbers: oldest of the day is 1, newest on top;
  - the button's two labels and the "stays below" line;
  - a card shows the image, the text block, the plain-word warnings, the two
    links, the two steps, the how-to line and "See the story image", and none
    of what's gone;
  - "Save the 2 images" shares both files in one call, post first, with the
    new names; without file sharing it downloads both;
  - "Copy the text" copies `postText`;
  - the editor has no alt text field;
  - the automatic update leaves an attempt from before 3am alone.
- Playwright at the phone viewport, routes mocked: make six, see "Attempt 1";
  make six more, see "Attempt 2" on top and "Attempt 1" below; reload and see
  both; move the phone's clock past 3am (`page.clock`) and see the empty
  note; "Save the 2 images" downloads both files with their names; switching
  language keeps the open tab.
- The journal records the language switch timings, before and after.

## Acceptance criteria

```gherkin
Scenario: The first open of the day is empty
  Given the owner made suggestions yesterday at 18:00
  When they open "Create your posts" today at 08:00
  Then no suggestion is shown
  And the button reads "Make 6 suggestions"
  And the note explains what a suggestion is

Scenario: Attempts stack, newest on top
  Given "Attempt 1" is on screen
  When the owner taps "Make 6 new suggestions"
  Then "Attempt 2" and its suggestions show on top
  And "Attempt 1" stays below

Scenario: A reload keeps today's suggestions
  Given two attempts made today
  When the page reloads before 3am
  Then both attempts show, with their images

Scenario: 3am, not midnight
  Given suggestions made at 23:30
  When the owner opens the app at 02:30 the same night
  Then the suggestions are still there
  When the owner opens the app at 03:10
  Then none is shown

Scenario: One suggestion, saved
  Given a suggestion with its two images
  When the owner taps "Save the 2 images"
  Then one share sheet opens with "sen-2026-10-26-attempt-1-suggestion-3-post.jpg" and "sen-2026-10-26-attempt-1-suggestion-3-story.jpg"
  When the owner taps "Copy the text"
  Then the clipboard holds the caption, the call to action and the hashtags

Scenario: Nothing extra on a card
  Then a suggestion shows no type label, no "Post 1", no image description and no first-line warning

Scenario: A price the site doesn't show
  Given a suggestion whose text says "990k"
  And the website has no such price
  Then the card says "This price isn't on your website: 990k. Check it before posting."

Scenario: The language switch is fast
  Given the home screen with six suggestions
  When the owner taps "VI"
  Then the screen shows in Vietnamese within 1 second on a warm server
  And "Create your posts" is still open
```

## Known limits

- File names rarely show in phone galleries; the two images are recognised by
  arriving together and by their shapes.
- Saving both images in one share sheet and copying the text are two taps; a
  single tap doing both isn't reliable across phones.
- An owner who opens the app at 2:55am and comes back at 3:05am finds it
  empty.
- The 1-second target holds for a warm server; a cold Vercel function can
  take longer, outside code's reach.

## Out of scope

- Reviews and their tab: 2.7 `reviews/reply-drafts`.
- Keeping suggestions across days, or a history.
- Posting from the app (Phase 6).
- The remaining minors from 2.4's and 2.5's reviews, unless the rework above
  removes them along the way.
