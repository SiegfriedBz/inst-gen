---
title: "Two images an attempt"
description: "An attempt of six suggestions gets two images instead of six, to cut the image spend by two thirds: the two offer posts when there is an offer, otherwise one day and one night post; the other four are text, and the owner can create an image for any of them from the day's new images; the owner guide says so in its three languages."
status: draft
date: "2026-11-08"
---

# Two images an attempt

## Goal

Today every attempt (a round of six suggestions) asks the image model for six
images, one per suggestion (`posts/generate-images`). At about $0.05 an image
(decision 0004), an attempt costs about $0.30, and two spas making their three
attempts a day could spend the month's $8 in under a week.

The maintainer's words: "To reduce the images gen costs, I want to lower the
number of images generated from 6 to 2 per round in production. Also update
the guide accordingly."

This item makes **two images an attempt**. The other four suggestions come
as text, and the owner can still create an image for any of them, from the
day's new images. The owner guide says what the app now does, in English,
Indonesian and Vietnamese.

Success: an attempt asks for two images, not six, so its images cost about
$0.10 instead of $0.30; an owner who wants a picture on another suggestion
gets one in two taps; and nothing in the app or the guide still promises six
images.

Why now: the pilot is running, and images are the only thing the app pays
for.

## Behaviour

### Which two suggestions get an image

Code picks them once the attempt's six suggestions are saved, from the
suggestions alone, so the same attempt always gives the same two:

1. **An attempt with a special offer** (`posts/special-offer`): the two
   suggestions that carry it, the ones with the offer badge. If fewer than
   two carry it (the plan's check records "fewer than 2 offer posts"), rule 2
   fills the rest.
2. **Otherwise, or to make up two**: **one day and one night** suggestion
   (`posts/day-and-night-images`): the first suggestion whose image set-up is
   a day, and the first whose set-up is a night, in the attempt's order,
   skipping a light the picked ones already have.
3. If that gives fewer than two (a suggestion saved with no light counts as a
   day, `lib/posts/setup.ts`), the first suggestions not yet picked, in order,
   make up two.

(Builder's call: the offer posts are why the owner set an offer today, so
they get the pictures; without one, a day and a night keep 2.14's balance on
the owner's feed. The set-ups are dealt as today, three days and three
nights, so recorded plans replay unchanged.)

The number is one constant in code, `IMAGES_PER_ATTEMPT = 2`: changing it is
a one-line change and its test, like the limits in `lib/usage/limits.ts`.

### Everywhere the app runs

The rule holds wherever the app runs: production, preview deployments,
`pnpm dev` and the Playwright tests. Every deployment with
`GOOGLE_IMAGE_API_KEY` spends the same prepaid balance, so none of them gets
six. `pnpm eval:images` still makes the six images of each fixture's recorded
posts: it judges the image prompts, is run by hand, and is only run after
asking (AGENTS.md). (Builder's call.)

### When the images are made

As today, automatically once the attempt's suggestions are saved, but only
for the two picked: two image requests, at once, in one run of kind
`images` (decision 0005). The "keep this page open" line and the wake lock
last until both end.

- **"Make the images"**, shown above an attempt with no image made or being
  made (an older attempt, or one whose images all failed), asks for the same
  two, not six.
- **"Try again"** on a failed image of the two asks for that one again, as
  today.
- A lost image step is asked for again when the owner comes back, as today;
  only steps that were asked for exist, so the other four are never asked for
  by a resume.
- While the suggestions stream in, their tiles look as today. Once the
  attempt is kept, the two picked show "Making the image…" and the other four
  become text tiles.

### The other four

- **Tile.** The text tile `platform/friendlier-home` already uses when images
  are off: the caption in a box, with the offer badge and the tick as for any
  tile.
- **Sheet.** The "Images" part shows one muted line, "Only 2 suggestions of
  each attempt come with images. Create one for this suggestion, or use a
  photo of your own.", then the **"Create new image"** link, with its
  optional hint, as on a suggestion that has an image. No save button while
  there is no image.
- **Creating one** counts as a **new image**: one of the owner's 10 a day
  (`platform/usage-counters`), sent with `first: false`. It shows
  "Making the image…" in the sheet and on the tile, then the image, the story
  image and the save button, as for the two picked. A failure shows its
  message and "Try again", which is another new image, as for "Create new
  image" today; a failure that isn't the owner's gives the count back, as
  today.
- At the day's limit of new images, the link is disabled with "You've made
  today's 10 new images. More at {time}.", as today. With the image month
  full, the line is "No new images until {date}." and there is no link, as
  today.
- **The tick.** With no image, copying the text alone ticks the suggestion,
  as for images off. Once the owner creates its image, it needs both steps,
  as any suggestion with an image.

### Usage

- Per owner a day, nothing changes: 3 attempts and 10 new images. An attempt
  now covers its **two** first images and their "Try again". An image for one
  of the other four is a new image.
- The phone says which request is a first image (`first: true`): only the two
  picked, while they have no image on the phone. Any other image request is
  `first: false`. The server still trusts the phone, as
  `platform/usage-counters` says.
- The image month stays at $8 (158 images), counted as today. Decision 0004
  is unchanged: same model, same price, same cap. Its expected volume only
  goes down: three attempts a day for two spas now ask for at most 12 first
  images a day, not 36.
- The usage bar is unchanged: "Left today: 3 attempts, 10 new images · Resets
  at 15:00".

### The empty posts tab

The line shown before the first attempt of the day changes, since a
suggestion no longer always comes with two images:

"You get 6 suggestions, each with the text for a post and a short text for a
story, ready for Instagram; 2 of them also come with a post image and a story
image. Pick the ones you like and save them to your phone."

The text-only line, for images off, is unchanged.

### The owner guide

The `/guide` page and its three PDFs (`pnpm guide:pdf`) say what the app now
does. Changed lines, in "Making your posts" and "Posting on Instagram":

- **Making your posts:** "You get 6 suggestions, each with the text for the
  post and a short text for the story. Two of them also come with a post
  image and a story image."
- **Editing:** "Create new image" is for a different picture, or for one on a
  suggestion that has none, and each one uses one of the day's new images.
- **The offer:** the two suggestions that tell the offer are the two with
  images.
- **No picture:** "No picture on a suggestion? Post a photo of your own…",
  about one suggestion instead of all of them.

"Your daily allowance" is unchanged: it already lists the attempts and the
new images, and the month's budget.

### Strings

Changed or new, in the same commit as the code. The Indonesian and Vietnamese
are the developer's; the owners read them back during the pilot.

| Key | English | Indonesian | Vietnamese |
|---|---|---|---|
| `posts.empty` (changed) | You get 6 suggestions, each with the text for a post and a short text for a story, ready for Instagram; 2 of them also come with a post image and a story image. Pick the ones you like and save them to your phone. | Anda mendapat 6 saran, masing-masing dengan teks untuk postingan dan teks singkat untuk story, siap untuk Instagram; 2 di antaranya juga dilengkapi gambar postingan dan gambar story. Pilih yang Anda suka dan simpan di ponsel Anda. | Bạn nhận 6 gợi ý, mỗi gợi ý có phần chữ cho bài đăng và một dòng chữ ngắn cho story, sẵn sàng cho Instagram; 2 gợi ý trong số đó có thêm hình bài đăng và hình story. Chọn những gợi ý bạn thích và lưu vào điện thoại. |
| `posts.images.none` (new) | Only 2 suggestions of each attempt come with images. Create one for this suggestion, or use a photo of your own. | Hanya 2 saran di setiap percobaan yang dilengkapi gambar. Buat gambar untuk saran ini, atau pakai foto Anda sendiri. | Mỗi lần thử chỉ có 2 gợi ý kèm hình. Hãy tạo hình cho gợi ý này, hoặc dùng ảnh của bạn. |
| `guide.posts.make` (changed) | In {tab}, tap {button}. You get 6 suggestions, each with the text for the post and a short text for the story. Two of them also come with a post image and a story image. | Di {tab}, ketuk {button}. Anda mendapat 6 saran, masing-masing dengan teks postingan dan teks singkat untuk story. Dua di antaranya juga dilengkapi gambar postingan dan gambar story. | Trong {tab}, chạm {button}. Bạn nhận 6 gợi ý, mỗi gợi ý có chữ cho bài đăng và một dòng chữ ngắn cho story. Hai gợi ý trong số đó có thêm hình bài đăng và hình story. |
| `guide.posts.edit` (changed) | Tap {button} to change a suggestion's words, and {image} for a different picture, or for one on a suggestion that has none; you can add a short hint. Each one uses one of the day's new images. The story text can't be changed here: change it in Instagram after pasting, if you like. | Ketuk {button} untuk mengubah kata-kata sebuah saran, dan {image} untuk gambar lain, atau untuk saran yang belum punya gambar; Anda bisa menambahkan petunjuk singkat. Setiap gambar memakai satu jatah gambar baru hari ini. Teks story tidak bisa diubah di sini: ubah di Instagram setelah ditempel, jika mau. | Chạm {button} để đổi lời của một gợi ý, và {image} để có hình khác, hoặc để tạo hình cho gợi ý chưa có hình; bạn có thể thêm mô tả ngắn. Mỗi hình dùng một lượt hình mới của hôm nay. Chữ story không sửa được ở đây: nếu muốn, hãy sửa trên Instagram sau khi dán. |
| `guide.posts.offerDone` (changed) | Tap {done}. Two of your next 6 suggestions tell the offer and are marked {badge} (or {free}), and they are the two with images; the other four don't. | Ketuk {done}. Dua dari 6 saran berikutnya menyebutkan promo dan bertanda {badge} (atau {free}), dan keduanya yang dilengkapi gambar; empat lainnya tidak. | Chạm {done}. Hai trong 6 gợi ý tiếp theo nhắc đến ưu đãi và có dấu {badge} (hoặc {free}), và đó là hai gợi ý có hình; bốn gợi ý còn lại thì không. |
| `guide.instagram.noImages` (changed) | No picture on a suggestion? Post a photo of your own and paste the text, and the same for a story with the story text. | Saran tanpa gambar? Posting foto Anda sendiri dan tempel teksnya, begitu juga untuk story dengan teks story. | (unchanged) Gợi ý không có hình? Hãy đăng ảnh của bạn và dán chữ, story cũng vậy với chữ story. |

The guide keys keep their `<b>` tags around `{tab}`, `{button}`, `{image}`,
`{done}`, `{badge}` and `{free}`, as today.

### Other documents

The PR that ships this item:

- adds its row to `docs/roadmap.md` and marks it `done`;
- adds a dated note, "> Changed by `posts/two-images` (2026-11-08): …", at
  the passages it changes in `posts/generate-images` ("When images are
  made"), `posts/day-and-night-images` (three day and three night images a
  batch), `platform/usage-counters` (an attempt's first images) and
  `guide/owner-guide` (what a suggestion comes with); their status and
  approval untouched;
- leaves decision 0004 and `.env.example` as they are.

### Tests

- Vitest:
  - the pick: an attempt with an offer gives its two offer posts; with one
    offer post, that one and the first suggestion of the other light; without an
    offer, the first day and the first night; all days, or no lights, the
    first two; always two different suggestions, in the attempt's order;
  - after an attempt is kept, exactly two image requests, both
    `first: true`, for the picked posts; the other four tiles are text
    tiles; "Make the images" asks for the same two; a resume asks only for
    lost steps of the two;
  - a text-only suggestion's sheet: the line, "Create new image", no save
    button; creating sends `first: false`, then shows the image and the save
    button; at the day's limit the link is disabled with its line; with the
    month full, the month line and no link;
  - the tick of a text-only suggestion after copying its text;
  - "Try again" on a failed image of the two sends `first: true`; on a failed
    created image, `first: false`;
  - the empty line and the guide's changed lines in the three languages (the
    strings check in `pnpm check`).
- Playwright at the phone viewport, image route mocked (`images.spec.ts` and
  the other specs that count six images): an attempt shows two images and
  four text tiles; open a text tile, create its image, see it on the tile;
  with an offer, the two badged tiles are the two with images; the guide
  page shows the new "Making your posts" line.
- `pnpm guide:pdf` writes the three PDFs; the developer reads the changed
  lines in each before the PR.

## Acceptance criteria

```gherkin
Scenario: An attempt asks for two images
  Given Sen's owner has images on and no special offer
  When they tap "Make 6 suggestions" and the six suggestions are saved
  Then two image requests start, both as first images
  And they are for the first day suggestion and the first night suggestion
  And the other four tiles show their captions as text

Scenario: The offer posts get the images
  Given Svarga's owner has set a 15% offer
  When an attempt's six suggestions are saved
  Then the two images are asked for the two suggestions with the offer badge

Scenario: An image for a text suggestion
  Given an attempt whose third suggestion has no image
  When the owner opens it
  Then the sheet shows "Only 2 suggestions of each attempt come with images. Create one for this suggestion, or use a photo of your own."
  And "Create new image" is there, and no save button
  When they tap "Create new image", then "Make it"
  Then one image is asked for, as a new image, not a first one
  And the bar reads "Left today: 2 attempts, 9 new images · Resets at 15:00"

Scenario: No new images left
  Given Sen's owner has made 10 new images today
  When they open a suggestion with no image
  Then "Create new image" is disabled
  And "You've made today's 10 new images. More at 15:00." shows under it

Scenario: An older attempt gets two images
  Given an attempt with no image made
  When the owner taps "Make the images"
  Then two images are asked for, the same two the attempt picks

Scenario: A text suggestion is ticked by its text
  Given a suggestion with no image
  When the owner copies its text
  Then its tile shows "Copied"

Scenario: The guide says two
  Given the screen is in Vietnamese
  When the owner opens the guide
  Then "Making your posts" says that two of the 6 suggestions come with a post image and a story image
```

## Known limits

- **The phone decides which images are first images,** and the server trusts
  it, as `platform/usage-counters` already says. A changed phone could ask
  for more; the image month and the prepaid balance still cap the spend.
- **An owner who wants six pictures** spends four of the day's 10 new
  images on one attempt.
- **The two are picked by rule, not by quality:** a caption the owner likes
  better may be a text one. They create its image, from the day's new
  images.
- **Attempts made before this ships** keep their six images until the day's
  reset clears them.
- An attempt's grid mixes image tiles and text tiles.

## Out of scope

- The owner choosing the two before any image is made: not now; the
  automatic two keep "Make 6 suggestions" one tap.
- Cheaper images, such as Nano Banana 2.1 at 1K ($0.034 instead of $0.050,
  decision 0004): a new decision if wanted, after a look at the 4:5 crop's
  sharpness.
- A lower image month cap or a change to the daily new images: the limits
  stay as `platform/usage-counters` set them.
- `pnpm eval:images`, which still makes six images a fixture.
